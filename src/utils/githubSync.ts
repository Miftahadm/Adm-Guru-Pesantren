/**
 * Dual Mode GitHub Synchronization Engine
 * - Mode Offline: 100% local device database (IndexedDB + localStorage), zero network calls.
 * - Mode Online: Automatically syncs with GitHub repository (or fallback local central manifest):
 *   1. Checks PWA Service Worker update & GitHub Releases API for newer app/APK releases.
 *   2. Non-destructively merges core school data (classes, students, nonClassTypes, optional letterhead).
 *   3. Pulls central announcements (Pengumuman / Info Pusat Pesantren).
 *   4. Automatically logs new version updates to Version History.
 */

import {
  AdminBranding,
  AppDatabase,
  CentralAnnouncement,
  ClassRoom,
  Student,
} from '../types';
import { appendAutomatedVersionRecord, compareSemVer } from './versioning';

export interface RemoteCentralManifest {
  appVersion?: string;
  releasedAt?: string;
  releaseTitle?: string;
  releaseNotes?: string[];
  apkDownloadUrl?: string | null;
  branding?: Partial<AdminBranding>;
  classes?: ClassRoom[];
  students?: Student[];
  nonClassTypes?: string[];
  announcements?: CentralAnnouncement[];
}

export interface SyncExecutionResult {
  success: boolean;
  updatedDb: AppDatabase;
  summary: string;
  sourceLabel: string;
  swUpdateFound: boolean;
  newStudentsAdded: number;
  studentsUpdated: number;
  newClassesAdded: number;
  announcementsCount: number;
  remoteVersion: string | null;
}

const SAFE_GITHUB_SEGMENT = /^[a-zA-Z0-9._-]+$/;

/**
 * Validates and builds the raw GitHub manifest URL from Admin config.
 * Falls back to the bundled `/sync/central-data.json` when no external repo is configured yet.
 */
export function resolveSyncEndpoint(config: AppDatabase['syncConfig']): {
  manifestUrl: string;
  releasesApiUrl: string | null;
  sourceLabel: string;
} {
  if (config.customSyncUrl && config.customSyncUrl.startsWith('https://')) {
    return {
      manifestUrl: config.customSyncUrl,
      releasesApiUrl: null,
      sourceLabel: 'URL Sinkronisasi Kustom',
    };
  }

  const owner = config.repoOwner.trim();
  const repo = config.repoName.trim();
  const branch = config.branch.trim() || 'main';
  const path = (config.manifestPath.trim() || 'public/sync/central-data.json').replace(/^\/+/, '');

  if (owner && repo && SAFE_GITHUB_SEGMENT.test(owner) && SAFE_GITHUB_SEGMENT.test(repo)) {
    return {
      manifestUrl: `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(
        branch
      )}/${path}`,
      releasesApiUrl: `https://api.github.com/repos/${owner}/${repo}/releases/latest`,
      sourceLabel: `GitHub (${owner}/${repo}@${branch})`,
    };
  }

  return {
    manifestUrl: '/sync/central-data.json',
    releasesApiUrl: null,
    sourceLabel: 'Data Pusat Bawaan (Atur Repo GitHub di Panel Admin)',
  };
}

/**
 * Triggers browser Service Worker update check so any newly deployed web/PWA build is fetched.
 */
async function triggerServiceWorkerUpdateCheck(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return false;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    let updateDetected = false;
    for (const reg of registrations) {
      await reg.update();
      if (reg.waiting || reg.installing) {
        updateDetected = true;
      }
    }
    return updateDetected;
  } catch {
    return false;
  }
}

/**
 * Non-destructive smart merge of core school data from central GitHub manifest
 * into the teacher's local device database. Preserves teacher's local attendance,
 * grades, journals, schedules, and personal notes.
 */
function mergeRemotePayloadIntoDatabase(
  prev: AppDatabase,
  payload: RemoteCentralManifest,
  extras: {
    sourceLabel: string;
    latestReleaseUrl: string | null;
    latestReleaseApkUrl: string | null;
    latestReleaseTag: string | null;
  }
): {
  nextDb: AppDatabase;
  newStudentsAdded: number;
  studentsUpdated: number;
  newClassesAdded: number;
  announcementsCount: number;
} {
  // 1. Merge classes (by id or normalized name)
  const mergedClasses = [...prev.classes];
  let newClassesAdded = 0;
  if (Array.isArray(payload.classes)) {
    for (const remoteCls of payload.classes) {
      if (!remoteCls?.id || !remoteCls?.name) continue;
      const idx = mergedClasses.findIndex(
        (c) => c.id === remoteCls.id || c.name.toLowerCase() === remoteCls.name.toLowerCase()
      );
      if (idx === -1) {
        mergedClasses.push(remoteCls);
        newClassesAdded++;
      } else {
        // Merge subjects union
        const existingSubjects = new Set(mergedClasses[idx].subjects || []);
        (remoteCls.subjects || []).forEach((s) => existingSubjects.add(s));
        mergedClasses[idx] = {
          ...mergedClasses[idx],
          subjects: Array.from(existingSubjects),
        };
      }
    }
  }

  // 2. Merge core students (match by NIS if present, otherwise by id)
  const mergedStudents = [...prev.students];
  let newStudentsAdded = 0;
  let studentsUpdated = 0;
  if (Array.isArray(payload.students)) {
    for (const remoteStu of payload.students) {
      if (!remoteStu?.name || !remoteStu?.classId) continue;
      const idx = mergedStudents.findIndex(
        (s) =>
          (remoteStu.nis && s.nis && s.nis === remoteStu.nis) ||
          s.id === remoteStu.id
      );
      if (idx === -1) {
        mergedStudents.push({
          id: remoteStu.id || `stu_sync_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
          classId: remoteStu.classId,
          nis: remoteStu.nis || '',
          name: remoteStu.name,
          gender: remoteStu.gender === 'P' ? 'P' : 'L',
        });
        newStudentsAdded++;
      } else {
        const cur = mergedStudents[idx];
        if (cur.name !== remoteStu.name || cur.classId !== remoteStu.classId) {
          mergedStudents[idx] = {
            ...cur,
            name: remoteStu.name,
            classId: remoteStu.classId,
            gender: remoteStu.gender === 'P' ? 'P' : 'L',
          };
          studentsUpdated++;
        }
      }
    }
  }

  // 3. Merge Non-Class Activity Types (union)
  const typeSet = new Set(prev.nonClassTypes);
  if (Array.isArray(payload.nonClassTypes)) {
    payload.nonClassTypes.forEach((t) => {
      if (typeof t === 'string' && t.trim()) typeSet.add(t.trim());
    });
  }

  // 4. Sync Central Announcements (newest first)
  let mergedAnnouncements = [...prev.announcements];
  if (Array.isArray(payload.announcements) && payload.announcements.length > 0) {
    const map = new Map<string, CentralAnnouncement>();
    payload.announcements.forEach((a) => {
      if (a?.id && a?.title) {
        map.set(a.id, {
          id: a.id,
          title: a.title,
          body: a.body || '',
          date: a.date || new Date().toISOString().slice(0, 10),
          priority: a.priority === 'penting' ? 'penting' : 'info',
          author: a.author || 'Pusat Pesantren Trubus Iman',
        });
      }
    });
    mergedAnnouncements = Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
  }

  // 5. Optional branding / APK URL update from central GitHub
  const nextApkUrl =
    extras.latestReleaseApkUrl ||
    (payload.apkDownloadUrl && payload.apkDownloadUrl.startsWith('https://')
      ? payload.apkDownloadUrl
      : prev.branding.apkDownloadUrl);

  const nextBranding: AdminBranding = {
    ...prev.branding,
    ...(payload.branding?.foundationName ? { foundationName: payload.branding.foundationName } : {}),
    ...(payload.branding?.institutionName ? { institutionName: payload.branding.institutionName } : {}),
    ...(payload.branding?.address ? { address: payload.branding.address } : {}),
    ...(payload.branding?.contactInfo ? { contactInfo: payload.branding.contactInfo } : {}),
    apkDownloadUrl: nextApkUrl,
  };

  const remoteVersion =
    (extras.latestReleaseTag ? extras.latestReleaseTag.replace(/^v/i, '') : null) ||
    payload.appVersion ||
    null;

  const nowIso = new Date().toISOString();
  let nextDb: AppDatabase = {
    ...prev,
    classes: mergedClasses,
    students: mergedStudents,
    nonClassTypes: Array.from(typeSet),
    announcements: mergedAnnouncements,
    branding: nextBranding,
    syncConfig: {
      ...prev.syncConfig,
      mode: 'online',
      lastSyncAt: nowIso,
      lastSyncedRemoteVersion: remoteVersion || prev.installedAppVersion,
      lastSyncStatus: 'success',
      latestReleaseUrl: extras.latestReleaseUrl || prev.syncConfig.latestReleaseUrl,
    },
  };

  // 6. Automatically record version history if remote GitHub version is newer
  if (remoteVersion && compareSemVer(remoteVersion, prev.installedAppVersion) > 0) {
    nextDb = appendAutomatedVersionRecord(nextDb, {
      bump: 'minor',
      title: payload.releaseTitle || `Sinkronisasi Pembaruan GitHub v${remoteVersion}`,
      source: 'auto_migration',
      changes:
        Array.isArray(payload.releaseNotes) && payload.releaseNotes.length > 0
          ? payload.releaseNotes.map((note) => ({ type: 'Updated' as const, summary: note }))
          : [
              {
                type: 'Updated',
                summary: `Sinkronisasi otomatis dari ${extras.sourceLabel} (v${remoteVersion}).`,
              },
            ],
    });
  }

  return {
    nextDb,
    newStudentsAdded,
    studentsUpdated,
    newClassesAdded,
    announcementsCount: mergedAnnouncements.length,
  };
}

/**
 * Executes full Online GitHub Synchronization.
 */
export async function runGitHubSync(currentDb: AppDatabase): Promise<SyncExecutionResult> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const failedDb: AppDatabase = {
      ...currentDb,
      syncConfig: {
        ...currentDb.syncConfig,
        lastSyncStatus: 'error',
        lastSyncMessage: 'Perangkat sedang tidak terhubung ke internet. Tetap menggunakan data Offline perangkat.',
      },
    };
    return {
      success: false,
      updatedDb: failedDb,
      summary: failedDb.syncConfig.lastSyncMessage || 'Tidak ada koneksi internet.',
      sourceLabel: 'Offline',
      swUpdateFound: false,
      newStudentsAdded: 0,
      studentsUpdated: 0,
      newClassesAdded: 0,
      announcementsCount: currentDb.announcements.length,
      remoteVersion: null,
    };
  }

  const { manifestUrl, releasesApiUrl, sourceLabel } = resolveSyncEndpoint(currentDb.syncConfig);

  try {
    // Run Service Worker update check and central manifest fetch concurrently
    const cacheBuster = `${manifestUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
    const [swUpdateFound, manifestRes, releaseInfo] = await Promise.all([
      triggerServiceWorkerUpdateCheck(),
      fetch(`${manifestUrl}${cacheBuster}`, { cache: 'no-store' }),
      releasesApiUrl
        ? fetch(releasesApiUrl, {
            headers: { Accept: 'application/vnd.github+json' },
            cache: 'no-store',
          })
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null)
        : Promise.resolve(null),
    ]);

    if (!manifestRes.ok) {
      throw new Error(`Server/GitHub mengembalikan status ${manifestRes.status}. Periksa nama repo, branch, dan path file JSON.`);
    }

    const payload = (await manifestRes.json()) as RemoteCentralManifest;

    // Extract optional GitHub Release APK download link & version tag
    let latestReleaseUrl: string | null = null;
    let latestReleaseApkUrl: string | null = null;
    let latestReleaseTag: string | null = null;
    if (releaseInfo && typeof releaseInfo === 'object') {
      latestReleaseUrl = typeof releaseInfo.html_url === 'string' ? releaseInfo.html_url : null;
      latestReleaseTag = typeof releaseInfo.tag_name === 'string' ? releaseInfo.tag_name : null;
      if (Array.isArray(releaseInfo.assets)) {
        const apkAsset = releaseInfo.assets.find(
          (a: { name?: string; browser_download_url?: string }) =>
            typeof a?.name === 'string' && a.name.toLowerCase().endsWith('.apk')
        );
        if (apkAsset?.browser_download_url) {
          latestReleaseApkUrl = apkAsset.browser_download_url;
        }
      }
    }

    const merged = mergeRemotePayloadIntoDatabase(currentDb, payload, {
      sourceLabel,
      latestReleaseUrl,
      latestReleaseApkUrl,
      latestReleaseTag,
    });

    const parts: string[] = [];
    if (merged.newStudentsAdded > 0) parts.push(`+${merged.newStudentsAdded} santri baru`);
    if (merged.studentsUpdated > 0) parts.push(`${merged.studentsUpdated} santri diperbarui`);
    if (merged.newClassesAdded > 0) parts.push(`+${merged.newClassesAdded} kelas baru`);
    parts.push(`${merged.announcementsCount} info pusat`);
    if (swUpdateFound) parts.push('pembaruan aplikasi siap diterapkan');

    const summary = `Tersinkron dengan ${sourceLabel}: ${parts.join(' · ')}.`;
    merged.nextDb.syncConfig.lastSyncMessage = summary;

    return {
      success: true,
      updatedDb: merged.nextDb,
      summary,
      sourceLabel,
      swUpdateFound,
      newStudentsAdded: merged.newStudentsAdded,
      studentsUpdated: merged.studentsUpdated,
      newClassesAdded: merged.newClassesAdded,
      announcementsCount: merged.announcementsCount,
      remoteVersion: merged.nextDb.syncConfig.lastSyncedRemoteVersion,
    };
  } catch (err) {
    const message =
      err instanceof Error
        ? `Gagal sinkron dari ${sourceLabel}: ${err.message}`
        : `Gagal menyinkronkan data dari ${sourceLabel}.`;

    const failedDb: AppDatabase = {
      ...currentDb,
      syncConfig: {
        ...currentDb.syncConfig,
        lastSyncStatus: 'error',
        lastSyncMessage: message,
      },
    };

    return {
      success: false,
      updatedDb: failedDb,
      summary: message,
      sourceLabel,
      swUpdateFound: false,
      newStudentsAdded: 0,
      studentsUpdated: 0,
      newClassesAdded: 0,
      announcementsCount: currentDb.announcements.length,
      remoteVersion: null,
    };
  }
}

/**
 * Exports a ready-to-commit `central-data.json` from the current database
 * so Admin can push core classes, students, letterhead, and central announcements directly to GitHub.
 */
export function downloadCentralSyncJson(db: AppDatabase): void {
  const payload: RemoteCentralManifest = {
    appVersion: db.installedAppVersion,
    releasedAt: new Date().toISOString().slice(0, 10),
    releaseTitle: db.versionHistory[0]?.title || `Pembaruan Pusat v${db.installedAppVersion}`,
    releaseNotes: (db.versionHistory[0]?.changes || []).map((c) => c.summary),
    apkDownloadUrl: db.branding.apkDownloadUrl,
    branding: {
      foundationName: db.branding.foundationName,
      institutionName: db.branding.institutionName,
      address: db.branding.address,
      contactInfo: db.branding.contactInfo,
    },
    classes: db.classes,
    students: db.students,
    nonClassTypes: db.nonClassTypes,
    announcements: db.announcements,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'central-data.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
