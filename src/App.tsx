/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';
import { AppMode, NavTab, ScheduleItem } from './types';
import { getTodayDayOfWeek } from './data/defaultData';
import { useAppStore } from './hooks/useAppStore';
import { buildAlarmSpeechText, sendBrowserNotification } from './utils/audioAlarm';
import { runGitHubSync } from './utils/githubSync';
import { Layout } from './components/Layout';
import { AlarmModal } from './components/AlarmModal';
import { OnboardingModal } from './components/OnboardingModal';
import { DashboardPage } from './pages/DashboardPage';
import { SchedulePage } from './pages/SchedulePage';
import { StudentsPage } from './pages/StudentsPage';
import { AttendancePage } from './pages/AttendancePage';
import { GradesPage } from './pages/GradesPage';
import { JournalPage } from './pages/JournalPage';
import { ExtracurricularPage } from './pages/ExtracurricularPage';
import { RemindersPage } from './pages/RemindersPage';
import { ReportsPage } from './pages/ReportsPage';
import { BackupPage } from './pages/BackupPage';
import { AdminPanelPage } from './pages/AdminPanelPage';
import { VersionHistoryPage } from './pages/VersionHistoryPage';
import { MoreMenuPage } from './pages/MoreMenuPage';

export default function App() {
  const { db, loaded, upgradedFrom, updateDb, replaceDb, dismissUpgradeNotice } = useAppStore();
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [activeAlarm, setActiveAlarm] = useState<ScheduleItem | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [swUpdateReady, setSwUpdateReady] = useState(false);

  const triggeredKeyRef = useRef<Set<string>>(new Set());
  const snoozeTimerRef = useRef<number | null>(null);

  const handleSyncNow = useCallback(async () => {
    setIsSyncing(true);
    try {
      const result = await runGitHubSync(db);
      replaceDb(result.updatedDb);
      if (result.swUpdateFound) {
        setSwUpdateReady(true);
      }
    } finally {
      setIsSyncing(false);
    }
  }, [db, replaceDb]);

  const handleSelectMode = useCallback(
    async (mode: AppMode) => {
      if (mode === 'offline') {
        updateDb((prev) => ({
          ...prev,
          syncConfig: {
            ...prev.syncConfig,
            mode: 'offline',
            lastSyncMessage: 'Mode Offline aktif · Seluruh data disimpan & diproses langsung di perangkat.',
          },
        }));
        return;
      }

      // Mode Online selected: switch mode and automatically synchronize with GitHub
      setIsSyncing(true);
      try {
        const result = await runGitHubSync({
          ...db,
          syncConfig: {
            ...db.syncConfig,
            mode: 'online',
            lastSyncStatus: 'syncing',
          },
        });
        replaceDb(result.updatedDb);
        if (result.swUpdateFound) {
          setSwUpdateReady(true);
        }
      } finally {
        setIsSyncing(false);
      }
    },
    [db, replaceDb, updateDb]
  );

  // Register PWA Service Worker for full offline caching & automatic updates
  useEffect(() => {
    try {
      registerSW({ immediate: true });
    } catch {
      // Safe fallback in environments where service worker registration is restricted
    }
  }, []);

  // Background real-time teaching schedule alarm watcher (checks every 15 seconds)
  useEffect(() => {
    if (!loaded || !db.profile.alarmSoundEnabled) return;

    const checkAlarms = () => {
      const now = new Date();
      const todayDow = getTodayDayOfWeek(now);
      const nowTotalMinutes = now.getHours() * 60 + now.getMinutes();
      const dayStamp = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;

      for (const item of db.schedules) {
        if (!item.active || item.dayOfWeek !== todayDow) continue;
        const [h, m] = item.startTime.split(':').map(Number);
        if (Number.isNaN(h) || Number.isNaN(m)) continue;

        const targetMinute = h * 60 + m - item.alarmLeadMinutes;
        const triggerKey = `${dayStamp}_${item.id}_${targetMinute}`;

        if (nowTotalMinutes === targetMinute && !triggeredKeyRef.current.has(triggerKey)) {
          triggeredKeyRef.current.add(triggerKey);
          setActiveAlarm(item);
          sendBrowserNotification(
            'Pengingat Jadwal · Adm Guru Pesantren Trubus Iman',
            buildAlarmSpeechText(item, db.profile)
          );
          break;
        }
      }
    };

    const intervalId = window.setInterval(checkAlarms, 15000);
    return () => window.clearInterval(intervalId);
  }, [loaded, db.schedules, db.profile]);

  // Clear pending snooze timers on unmount
  useEffect(() => {
    return () => {
      if (snoozeTimerRef.current) {
        window.clearTimeout(snoozeTimerRef.current);
      }
    };
  }, []);

  const handleSnoozeAlarm = (minutes: number) => {
    const snoozedItem = activeAlarm;
    setActiveAlarm(null);
    if (!snoozedItem) return;
    if (snoozeTimerRef.current) window.clearTimeout(snoozeTimerRef.current);
    snoozeTimerRef.current = window.setTimeout(() => {
      setActiveAlarm(snoozedItem);
    }, minutes * 60 * 1000);
  };

  if (!loaded) {
    return (
      <div className="min-h-screen bg-[#F6F8F7] flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-800 mx-auto animate-pulse" />
          <p className="text-sm font-semibold text-slate-700">
            Memuat data dari perangkat...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Layout
        db={db}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenProfileModal={() => setProfileModalOpen(true)}
        onSelectMode={handleSelectMode}
        isSyncing={isSyncing}
        upgradedFrom={upgradedFrom}
        onDismissUpgrade={dismissUpgradeNotice}
      >
        {activeTab === 'dashboard' && (
          <DashboardPage
            db={db}
            onNavigate={setActiveTab}
            onTriggerAlarmPreview={(sch) => setActiveAlarm(sch)}
            onOpenProfile={() => setProfileModalOpen(true)}
            onSelectMode={handleSelectMode}
            onSyncNow={handleSyncNow}
            isSyncing={isSyncing}
            swUpdateReady={swUpdateReady}
          />
        )}

        {activeTab === 'schedule' && (
          <SchedulePage
            db={db}
            onUpdateSchedules={(schedules) => updateDb((prev) => ({ ...prev, schedules }))}
            onTriggerAlarmPreview={(sch) => setActiveAlarm(sch)}
          />
        )}

        {activeTab === 'students' && (
          <StudentsPage
            db={db}
            onUpdateStudents={(students) => updateDb((prev) => ({ ...prev, students }))}
          />
        )}

        {activeTab === 'attendance' && (
          <AttendancePage
            db={db}
            onUpdateAttendances={(attendances) => updateDb((prev) => ({ ...prev, attendances }))}
            onOpenStudents={() => setActiveTab('students')}
          />
        )}

        {activeTab === 'grades' && (
          <GradesPage
            db={db}
            onUpdateGradeSheets={(gradeSheets) => updateDb((prev) => ({ ...prev, gradeSheets }))}
          />
        )}

        {activeTab === 'journal' && (
          <JournalPage
            db={db}
            onUpdateJournals={(journals) => updateDb((prev) => ({ ...prev, journals }))}
            onUpdateNonClassTypes={(nonClassTypes) =>
              updateDb((prev) => ({ ...prev, nonClassTypes }))
            }
          />
        )}

        {activeTab === 'extracurricular' && (
          <ExtracurricularPage
            db={db}
            onUpdateExtracurriculars={(extracurriculars) =>
              updateDb((prev) => ({ ...prev, extracurriculars }))
            }
          />
        )}

        {activeTab === 'reminders' && (
          <RemindersPage
            db={db}
            onUpdateReminders={(reminders) => updateDb((prev) => ({ ...prev, reminders }))}
          />
        )}

        {activeTab === 'reports' && <ReportsPage db={db} />}

        {activeTab === 'backup' && (
          <BackupPage
            db={db}
            onMarkBackedUp={() =>
              updateDb((prev) => ({ ...prev, lastBackupAt: new Date().toISOString() }))
            }
            onRestoreDatabase={replaceDb}
          />
        )}

        {activeTab === 'admin' && (
          <AdminPanelPage
            db={db}
            onUpdateDatabase={updateDb}
            onSyncNow={handleSyncNow}
            isSyncing={isSyncing}
          />
        )}

        {activeTab === 'versions' && (
          <VersionHistoryPage db={db} onOpenAdmin={() => setActiveTab('admin')} />
        )}

        {activeTab === 'more' && (
          <MoreMenuPage
            db={db}
            onNavigate={setActiveTab}
            onOpenProfile={() => setProfileModalOpen(true)}
          />
        )}
      </Layout>

      <OnboardingModal
        open={profileModalOpen}
        profile={db.profile}
        classes={db.classes}
        onClose={() => setProfileModalOpen(false)}
        onSave={(profile, classes) =>
          updateDb((prev) => ({
            ...prev,
            profile,
            classes,
          }))
        }
      />

      <AlarmModal
        schedule={activeAlarm}
        profile={db.profile}
        onDismiss={() => setActiveAlarm(null)}
        onSnooze={handleSnoozeAlarm}
      />
    </>
  );
}
