import React from 'react';
import {
  Award,
  Bell,
  BookOpen,
  CalendarDays,
  CheckSquare,
  Cloud,
  DownloadCloud,
  FileSpreadsheet,
  GitCommitHorizontal,
  HardDrive,
  HardDriveDownload,
  Home,
  LayoutGrid,
  RefreshCw,
  Shield,
  Sparkles,
  UserCog,
  Users,
} from 'lucide-react';
import { AppDatabase, AppMode, NavTab } from '../types';
import { BrandLogo } from './BrandLogo';
import { OfflineIndicator, PWAInstallButton } from './PWAInstallButton';

interface LayoutProps {
  db: AppDatabase;
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenProfileModal: () => void;
  onSelectMode: (mode: AppMode) => void;
  isSyncing: boolean;
  upgradedFrom: string | null;
  onDismissUpgrade: () => void;
  children: React.ReactNode;
}

const PAGE_TITLES: Record<NavTab, string> = {
  dashboard: 'Beranda',
  schedule: 'Jadwal Mengajar',
  attendance: 'Absensi Santri',
  grades: 'Daftar Nilai',
  journal: 'Jurnal Mengajar',
  students: 'Data Siswa',
  extracurricular: 'Ekstrakurikuler & Les',
  reminders: 'Catatan & Pengingat',
  reports: 'Rekap & Unduh Resmi',
  backup: 'Cadangan & Pulihkan',
  admin: 'Panel Admin',
  versions: 'Riwayat Versi Aplikasi',
  more: 'Menu Lainnya',
};

const SIDEBAR_GROUPS: Array<{
  heading: string;
  items: Array<{ id: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }>;
}> = [
  {
    heading: 'Kegiatan Mengajar',
    items: [
      { id: 'dashboard', label: 'Beranda', icon: Home },
      { id: 'schedule', label: 'Jadwal Mengajar', icon: CalendarDays },
      { id: 'attendance', label: 'Absensi', icon: CheckSquare },
      { id: 'grades', label: 'Daftar Nilai', icon: Award },
      { id: 'journal', label: 'Jurnal Mengajar', icon: BookOpen },
      { id: 'students', label: 'Data Siswa', icon: Users },
    ],
  },
  {
    heading: 'Di Luar Mengajar & Data',
    items: [
      { id: 'extracurricular', label: 'Ekskul & Les', icon: Sparkles },
      { id: 'reminders', label: 'Catatan & Pengingat', icon: Bell },
      { id: 'reports', label: 'Rekap & Unduh', icon: FileSpreadsheet },
      { id: 'backup', label: 'Cadangan & Pulihkan', icon: HardDriveDownload },
    ],
  },
  {
    heading: 'Sistem & Pengelolaan',
    items: [
      { id: 'admin', label: 'Panel Admin', icon: Shield },
      { id: 'versions', label: 'Riwayat Versi', icon: GitCommitHorizontal },
    ],
  },
];

const MOBILE_BOTTOM_TABS: Array<{
  id: NavTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'dashboard', label: 'Beranda', icon: Home },
  { id: 'schedule', label: 'Jadwal', icon: CalendarDays },
  { id: 'attendance', label: 'Absensi', icon: CheckSquare },
  { id: 'grades', label: 'Nilai', icon: Award },
  { id: 'more', label: 'Lainnya', icon: LayoutGrid },
];

export const Layout: React.FC<LayoutProps> = ({
  db,
  activeTab,
  onSelectTab,
  onOpenProfileModal,
  onSelectMode,
  isSyncing,
  upgradedFrom,
  onDismissUpgrade,
  children,
}) => {
  const isMoreSection = [
    'more',
    'journal',
    'students',
    'extracurricular',
    'reminders',
    'reports',
    'backup',
    'admin',
    'versions',
  ].includes(activeTab);

  return (
    <div className="min-h-screen bg-[#F6F8F7] text-slate-900 flex">
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-68 lg:fixed lg:inset-y-0 bg-white border-r border-slate-200/90 z-30">
        <div className="px-5 py-4 border-b border-slate-200/80 flex items-center gap-3">
          <BrandLogo logoDataUrl={db.branding.logoDataUrl} size="md" />
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-slate-900 truncate leading-tight">
              {db.branding.appName}
            </h1>
            <p className="text-xs text-slate-500 truncate mt-0.5">
              v{db.installedAppVersion} ·{' '}
              {db.syncConfig.mode === 'online' ? 'Mode Online (GitHub)' : 'Mode Offline (Perangkat)'}
            </p>
          </div>
        </div>

        {/* Dual Mode Switcher in Sidebar */}
        <div className="px-4 pt-3 pb-1">
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200/80">
            <button
              type="button"
              onClick={() => onSelectMode('offline')}
              className={`min-h-[36px] rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                db.syncConfig.mode === 'offline'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5 shrink-0" />
              Offline
            </button>
            <button
              type="button"
              onClick={() => onSelectMode('online')}
              disabled={isSyncing}
              className={`min-h-[36px] rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                db.syncConfig.mode === 'online'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isSyncing ? (
                <RefreshCw className="w-3.5 h-3.5 shrink-0 animate-spin" />
              ) : (
                <Cloud className="w-3.5 h-3.5 shrink-0" />
              )}
              Online
            </button>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5" aria-label="Navigasi utama">
          {SIDEBAR_GROUPS.map((group) => (
            <div key={group.heading}>
              <p className="px-3 mb-1.5 text-[11px] font-semibold text-slate-400 tracking-wide">
                {group.heading}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectTab(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                        active
                          ? 'bg-emerald-800 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-200/80 space-y-2.5">
          <PWAInstallButton />
          <button
            type="button"
            onClick={onOpenProfileModal}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-left transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0">
              <UserCog className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-900 truncate">{db.profile.nickName}</p>
              <p className="text-[11px] text-slate-500 truncate">{db.profile.schoolName}</p>
            </div>
          </button>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <div className="flex-1 lg:pl-68 flex flex-col min-w-0">
        {/* Compact Mobile Top App Bar (52px) */}
        <header className="lg:hidden sticky top-0 z-30 h-[52px] bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <BrandLogo logoDataUrl={db.branding.logoDataUrl} size="sm" />
            <span className="text-sm font-bold text-slate-900 truncate">
              {activeTab === 'dashboard' ? db.branding.appName : PAGE_TITLES[activeTab]}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <PWAInstallButton compact />
            <button
              type="button"
              onClick={onOpenProfileModal}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100"
              aria-label="Biodata & Pengaturan Guru"
            >
              <UserCog className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Automatic Version Update Notification Banner */}
        {upgradedFrom && (
          <div className="bg-emerald-900 text-white px-4 py-2.5 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <DownloadCloud className="w-4 h-4 text-amber-300 shrink-0" />
              <span>
                Aplikasi otomatis diperbarui dari <strong>v{upgradedFrom}</strong> ke{' '}
                <strong>v{db.installedAppVersion}</strong> dan tercatat di Riwayat Versi.
              </span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  onDismissUpgrade();
                  onSelectTab('versions');
                }}
                className="underline font-medium text-amber-300 hover:text-amber-200 whitespace-nowrap"
              >
                Lihat Detail
              </button>
              <button
                type="button"
                onClick={onDismissUpgrade}
                className="text-emerald-200 hover:text-white"
              >
                Tutup
              </button>
            </div>
          </div>
        )}

        {/* Primary Content Container */}
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 pb-24 lg:pb-10">
          {children}
        </main>
      </div>

      {/* Mobile Fixed Bottom Tab Bar (60px) */}
      <nav
        aria-label="Navigasi bawah"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 pb-safe"
      >
        <div className="grid grid-cols-5 h-[60px]">
          {MOBILE_BOTTOM_TABS.map((tab) => {
            const Icon = tab.icon;
            const active =
              tab.id === 'more' ? isMoreSection : activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  active ? 'text-emerald-800' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'stroke-[2.3]' : 'stroke-[1.8]'}`} />
                <span className={`text-[10px] leading-tight ${active ? 'font-bold' : 'font-medium'}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <OfflineIndicator />
    </div>
  );
};
