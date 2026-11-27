import { useCallback, useEffect, useState } from 'react';
import { AppDatabase } from '../types';
import { createInitialDatabase } from '../data/defaultData';
import { applyBrandingToDocument, loadDatabase, saveDatabase } from '../utils/storage';

export function useAppStore() {
  const [db, setDb] = useState<AppDatabase>(() => createInitialDatabase());
  const [loaded, setLoaded] = useState(false);
  const [upgradedFrom, setUpgradedFrom] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadDatabase().then(({ database, upgradedFrom: prev }) => {
      if (!active) return;
      setDb(database);
      setUpgradedFrom(prev);
      setLoaded(true);
      applyBrandingToDocument(database.branding);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    applyBrandingToDocument(db.branding);
  }, [db.branding, loaded]);

  const updateDb = useCallback((updater: (prev: AppDatabase) => AppDatabase) => {
    setDb((prev) => {
      const next = updater(prev);
      void saveDatabase(next);
      return next;
    });
  }, []);

  const replaceDb = useCallback((next: AppDatabase) => {
    setDb(next);
    void saveDatabase(next);
    applyBrandingToDocument(next.branding);
  }, []);

  const dismissUpgradeNotice = useCallback(() => {
    setUpgradedFrom(null);
  }, []);

  return {
    db,
    loaded,
    upgradedFrom,
    updateDb,
    replaceDb,
    dismissUpgradeNotice,
  };
}
