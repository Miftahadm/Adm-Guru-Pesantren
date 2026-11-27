import { AppDatabase } from '../types';
import { createInitialDatabase } from '../data/defaultData';
import { reconcileAppVersion } from './versioning';

const LS_KEY = 'adm_guru_trubus_iman_db_v2';
const IDB_NAME = 'AdmGuruTrubusImanDB';
const IDB_STORE = 'app_state';
const IDB_APK_STORE = 'apk_assets';
const IDB_RECORD_KEY = 'primary_database';
const IDB_APK_KEY = 'official_android_apk';

/**
 * Opens IndexedDB for high-capacity offline storage (supports large uploaded
 * Admin logo/thumbnail data URLs and official signed Android APK binaries).
 */
function openIDB(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(IDB_NAME, 2);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
        if (!db.objectStoreNames.contains(IDB_APK_STORE)) {
          db.createObjectStore(IDB_APK_STORE);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function saveApkBlob(file: Blob): Promise<boolean> {
  const db = await openIDB();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_APK_STORE, 'readwrite');
      tx.objectStore(IDB_APK_STORE).put(file, IDB_APK_KEY);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

export async function loadApkBlob(): Promise<Blob | null> {
  const db = await openIDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_APK_STORE, 'readonly');
      const req = tx.objectStore(IDB_APK_STORE).get(IDB_APK_KEY);
      req.onsuccess = () => resolve((req.result as Blob) || null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function deleteApkBlob(): Promise<void> {
  const db = await openIDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_APK_STORE, 'readwrite');
      tx.objectStore(IDB_APK_STORE).delete(IDB_APK_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * Generates a valid Bubblewrap / PWABuilder `twa-manifest.json` so Admin
 * can compile a genuine signed Android APK wrapper for this PWA in one step.
 */
export function downloadTwaManifest(appName: string, version: string, originUrl: string): void {
  const parsed = new URL(originUrl);
  const manifest = {
    packageId: 'id.ponpes.trubusiman.admguru',
    host: parsed.host,
    name: appName || 'Adm Guru Pesantren Trubus Iman',
    launcherName: 'Adm Trubus',
    display: 'standalone',
    themeColor: '#065F46',
    themeColorDark: '#042F2E',
    navigationColor: '#065F46',
    backgroundColor: '#F6F8F7',
    enableNotifications: true,
    startUrl: '/',
    iconUrl: `${parsed.origin}/pwa-512x512.png`,
    maskableIconUrl: `${parsed.origin}/pwa-maskable-512x512.png`,
    appVersionName: version,
    appVersionCode: Math.max(1, Number(version.replace(/\./g, '')) || 130),
    webManifestUrl: `${parsed.origin}/manifest.webmanifest`,
    fallbackType: 'customtabs',
    orientation: 'portrait',
  };
  const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'twa-manifest.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function readFromIDB(): Promise<AppDatabase | null> {
  const db = await openIDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(IDB_RECORD_KEY);
      req.onsuccess = () => resolve((req.result as AppDatabase) || null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function writeToIDB(data: AppDatabase): Promise<void> {
  const db = await openIDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put(data, IDB_RECORD_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * Loads the persisted database from IndexedDB (primary) or localStorage (fallback),
 * automatically runs version reconciliation & schema migration.
 */
export async function loadDatabase(): Promise<{
  database: AppDatabase;
  upgradedFrom: string | null;
}> {
  let raw: AppDatabase | null = await readFromIDB();

  if (!raw) {
    try {
      const lsRaw = localStorage.getItem(LS_KEY);
      if (lsRaw) {
        raw = JSON.parse(lsRaw) as AppDatabase;
      }
    } catch {
      raw = null;
    }
  }

  if (!raw || typeof raw !== 'object' || !raw.profile) {
    const initial = createInitialDatabase();
    await saveDatabase(initial);
    return { database: initial, upgradedFrom: null };
  }

  const defaults = createInitialDatabase();
  // Safe shallow merge to ensure newly added collections always exist
  const merged: AppDatabase = {
    ...defaults,
    ...raw,
    profile: { ...defaults.profile, ...(raw.profile || {}) },
    branding: { ...defaults.branding, ...(raw.branding || {}) },
    syncConfig: { ...defaults.syncConfig, ...(raw.syncConfig || {}) },
    announcements: Array.isArray(raw.announcements) ? raw.announcements : defaults.announcements,
    classes: Array.isArray(raw.classes) ? raw.classes : defaults.classes,
    students: Array.isArray(raw.students) ? raw.students : defaults.students,
    schedules: Array.isArray(raw.schedules) ? raw.schedules : defaults.schedules,
    attendances: Array.isArray(raw.attendances) ? raw.attendances : [],
    gradeSheets: Array.isArray(raw.gradeSheets) ? raw.gradeSheets : [],
    journals: Array.isArray(raw.journals) ? raw.journals : [],
    nonClassTypes:
      Array.isArray(raw.nonClassTypes) && raw.nonClassTypes.length > 0
        ? raw.nonClassTypes
        : defaults.nonClassTypes,
    extracurriculars: Array.isArray(raw.extracurriculars) ? raw.extracurriculars : [],
    reminders: Array.isArray(raw.reminders) ? raw.reminders : [],
    versionHistory: Array.isArray(raw.versionHistory) ? raw.versionHistory : defaults.versionHistory,
  };

  const reconciled = reconcileAppVersion(merged);
  await saveDatabase(reconciled.database);
  return reconciled;
}

/**
 * Persists database to IndexedDB and mirrors to localStorage (gracefully
 * handling QuotaExceededError if large custom images are stored in IDB).
 */
export async function saveDatabase(data: AppDatabase): Promise<void> {
  await writeToIDB(data);
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch {
    // If localStorage quota is exceeded (e.g., high-res logo/thumbnail), store light mirror in LS
    try {
      const lightCopy: AppDatabase = {
        ...data,
        branding: {
          ...data.branding,
          logoDataUrl: null,
          thumbnailDataUrl: null,
        },
      };
      localStorage.setItem(LS_KEY, JSON.stringify(lightCopy));
    } catch {
      // IndexedDB already holds the full authoritative copy
    }
  }
}

/**
 * Exports full device database as a downloadable `.agti.json` backup file.
 */
export function downloadBackupFile(data: AppDatabase): string {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate()
  ).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(
    2,
    '0'
  )}`;
  const payload = {
    app: 'Adm Guru Pesantren Trubus Iman',
    exportedAt: now.toISOString(),
    appVersion: data.installedAppVersion,
    data,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const filename = `cadangan_adm_trubus_iman_${stamp}.agti.json`;
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return filename;
}

/**
 * Validates and parses an uploaded `.agti.json` or `.json` backup file.
 */
export async function parseBackupFile(file: File): Promise<AppDatabase> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('File cadangan rusak atau bukan format JSON yang valid.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Struktur file cadangan tidak dikenali.');
  }

  const candidate =
    'data' in parsed && parsed.data && typeof parsed.data === 'object'
      ? (parsed.data as Partial<AppDatabase>)
      : (parsed as Partial<AppDatabase>);

  if (!candidate.profile || !Array.isArray(candidate.classes)) {
    throw new Error('File bukan cadangan resmi Adm Guru Pesantren Trubus Iman.');
  }

  const defaults = createInitialDatabase();
  const restored: AppDatabase = {
    ...defaults,
    ...candidate,
    profile: { ...defaults.profile, ...candidate.profile },
    branding: { ...defaults.branding, ...(candidate.branding || {}) },
    syncConfig: { ...defaults.syncConfig, ...(candidate.syncConfig || {}) },
    announcements: Array.isArray(candidate.announcements)
      ? candidate.announcements
      : defaults.announcements,
    classes: candidate.classes,
    students: Array.isArray(candidate.students) ? candidate.students : [],
    schedules: Array.isArray(candidate.schedules) ? candidate.schedules : [],
    attendances: Array.isArray(candidate.attendances) ? candidate.attendances : [],
    gradeSheets: Array.isArray(candidate.gradeSheets) ? candidate.gradeSheets : [],
    journals: Array.isArray(candidate.journals) ? candidate.journals : [],
    nonClassTypes:
      Array.isArray(candidate.nonClassTypes) && candidate.nonClassTypes.length > 0
        ? candidate.nonClassTypes
        : defaults.nonClassTypes,
    extracurriculars: Array.isArray(candidate.extracurriculars) ? candidate.extracurriculars : [],
    reminders: Array.isArray(candidate.reminders) ? candidate.reminders : [],
    versionHistory: Array.isArray(candidate.versionHistory)
      ? candidate.versionHistory
      : defaults.versionHistory,
  };

  return reconcileAppVersion(restored).database;
}

/**
 * Dynamically applies Admin custom Logo (favicon) and Online Thumbnail (og:image & twitter:image)
 * to the document head so social preview and browser tabs reflect Admin edits immediately.
 */
export function applyBrandingToDocument(branding: AppDatabase['branding']): void {
  if (typeof document === 'undefined') return;

  if (branding.appName) {
    document.title = branding.appName;
  }

  const iconHref = branding.logoDataUrl || '/icon.svg';
  let favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!favicon) {
    favicon = document.createElement('link');
    favicon.rel = 'icon';
    document.head.appendChild(favicon);
  }
  favicon.href = iconHref;

  const thumbHref = branding.thumbnailDataUrl || '/og-thumbnail.png';
  const metaSelectors = ['meta[property="og:image"]', 'meta[name="twitter:image"]'];
  for (const selector of metaSelectors) {
    const tag = document.querySelector<HTMLMetaElement>(selector);
    if (tag) {
      tag.content = thumbHref;
    }
  }
}
