import { AppDatabase, VersionChangeItem, VersionRecord } from '../types';
import {
  CURRENT_APP_VERSION,
  CURRENT_SCHEMA_VERSION,
  SYSTEM_RELEASE_MANIFEST,
} from '../data/defaultData';

/**
 * Compares two semantic version strings (e.g., "1.2.0" vs "1.1.5").
 * Returns 1 if a > b, -1 if a < b, 0 if equal.
 */
export function compareSemVer(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

/**
 * Increments a semantic version string based on bump level.
 */
export function bumpSemVer(version: string, level: 'patch' | 'minor' | 'major'): string {
  const parts = version.split('.').map((n) => parseInt(n, 10) || 0);
  const [major = 1, minor = 0, patch = 0] = parts;
  if (level === 'major') return `${major + 1}.0.0`;
  if (level === 'minor') return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

/**
 * Automated Version Reconciliation & Migration Engine.
 * Runs on every app startup to ensure:
 * 1. Missing official release notes are merged chronologically.
 * 2. If the running app binary is newer than the device's stored `installedAppVersion`,
 *    an automatic upgrade log is recorded with exact device timestamp.
 * 3. Missing new fields from schema updates are safely defaulted without data loss.
 */
export function reconcileAppVersion(db: AppDatabase): {
  database: AppDatabase;
  upgradedFrom: string | null;
} {
  const nowIso = new Date().toISOString();
  const existingHistory = Array.isArray(db.versionHistory) ? [...db.versionHistory] : [];
  const recordedVersions = new Set(existingHistory.map((v) => v.version));

  // Merge any official system releases not yet logged on this device
  for (const manifestEntry of SYSTEM_RELEASE_MANIFEST) {
    if (!recordedVersions.has(manifestEntry.version)) {
      existingHistory.push({
        ...manifestEntry,
        recordedOnDeviceAt: nowIso,
      });
      recordedVersions.add(manifestEntry.version);
    }
  }

  let upgradedFrom: string | null = null;
  const previousVersion = db.installedAppVersion || '1.0.0';

  if (compareSemVer(CURRENT_APP_VERSION, previousVersion) > 0) {
    upgradedFrom = previousVersion;
    // Ensure migration audit note is attached if not already noted
    const latestEntry = existingHistory.find((v) => v.version === CURRENT_APP_VERSION);
    if (latestEntry) {
      const hasMigrationNote = latestEntry.changes.some((c) =>
        c.summary.includes('Otomatis diperbarui dari v')
      );
      if (!hasMigrationNote) {
        latestEntry.changes = [
          ...latestEntry.changes,
          {
            type: 'Updated',
            summary: `Otomatis diperbarui dari v${previousVersion} ke v${CURRENT_APP_VERSION} di perangkat ini.`,
          },
        ];
      }
      latestEntry.recordedOnDeviceAt = nowIso;
    }
  }

  // Sort version history descending (newest version first)
  existingHistory.sort((a, b) => {
    const cmp = compareSemVer(b.version, a.version);
    if (cmp !== 0) return cmp;
    return b.recordedOnDeviceAt.localeCompare(a.recordedOnDeviceAt);
  });

  // Highest recorded version (supports Admin-created newer minor/patch versions too)
  const effectiveVersion =
    existingHistory.length > 0 && compareSemVer(existingHistory[0].version, CURRENT_APP_VERSION) > 0
      ? existingHistory[0].version
      : CURRENT_APP_VERSION;

  const migratedDb: AppDatabase = {
    ...db,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    installedAppVersion: effectiveVersion,
    versionHistory: existingHistory,
    nonClassTypes:
      Array.isArray(db.nonClassTypes) && db.nonClassTypes.length > 0
        ? db.nonClassTypes
        : [
            'Piket Guru & Kedisiplinan',
            'Rapat Dewan Asatidz',
            'Pembinaan Asrama Santri',
            'Kunjungan / Komunikasi Wali Santri',
            'Penyusunan Modul & Administrasi',
          ],
  };

  return {
    database: migratedDb,
    upgradedFrom,
  };
}

/**
 * Automatically creates and prepends a new version entry whenever Admin
 * updates branding/assets or publishes a custom release record.
 */
export function appendAutomatedVersionRecord(
  db: AppDatabase,
  params: {
    bump: 'patch' | 'minor' | 'major';
    title: string;
    source: 'admin_update' | 'auto_migration' | 'system_release';
    changes: VersionChangeItem[];
  }
): AppDatabase {
  const nowIso = new Date().toISOString();
  const nextVersion = bumpSemVer(db.installedAppVersion || CURRENT_APP_VERSION, params.bump);
  const newRecord: VersionRecord = {
    version: nextVersion,
    releasedAt: nowIso.slice(0, 10),
    recordedOnDeviceAt: nowIso,
    title: params.title,
    source: params.source,
    changes: params.changes,
  };

  return {
    ...db,
    installedAppVersion: nextVersion,
    versionHistory: [newRecord, ...db.versionHistory],
  };
}
