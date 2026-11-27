import React from 'react';
import {
  Bell,
  BookOpen,
  ChevronRight,
  FileSpreadsheet,
  GitCommitHorizontal,
  HardDriveDownload,
  Shield,
  Sparkles,
  UserCog,
  Users,
  Volume2,
} from 'lucide-react';
import { AppDatabase, NavTab } from '../types';
import { playAlarmChime, speakIndonesian } from '../utils/audioAlarm';
import { PWAInstallButton } from '../components/PWAInstallButton';

interface MoreMenuPageProps {
  db: AppDatabase;
  onNavigate: (tab: NavTab) => void;
  onOpenProfile: () => void;
}

export const MoreMenuPage: React.FC<MoreMenuPageProps> = ({
  db,
  onNavigate,
  onOpenProfile,
}) => {
  const sections = [
    {
      heading: 'Mengajar',
      items: [
        {
          id: 'journal' as NavTab,
          title: 'Jurnal Mengajar (Di Kelas & Non Kelas)',
          desc: 'Kalender catatan mengajar & kegiatan non kelas + PDF/Excel',
          icon: BookOpen,
        },
        {
          id: 'students' as NavTab,
          title: 'Data Santri / Siswa',
          desc: 'Kelola daftar santri per kelas & impor dari Excel',
          icon: Users,
        },
      ],
    },
    {
      heading: 'Di Luar Mengajar',
      items: [
        {
          id: 'extracurricular' as NavTab,
          title: 'Ekstrakurikuler & Les',
          desc: 'Absensi anggota dan jurnal kegiatan ekskul/halaqah',
          icon: Sparkles,
        },
        {
          id: 'reminders' as NavTab,
          title: 'Catatan & Pengingat',
          desc: 'Pengingat sekali, harian, atau mingguan',
          icon: Bell,
        },
      ],
    },
    {
      heading: 'Data & Dokumen Resmi',
      items: [
        {
          id: 'reports' as NavTab,
          title: 'Rekap & Unduh Resmi Pesantren Trubus Iman',
          desc: 'Ekspor PDF ber-Kop Surat & Excel untuk semua fitur data',
          icon: FileSpreadsheet,
        },
        {
          id: 'backup' as NavTab,
          title: 'Cadangan & Pulihkan',
          desc: 'Simpan semua data lokal ke file & pulihkan di HP baru',
          icon: HardDriveDownload,
        },
      ],
    },
    {
      heading: 'Aplikasi & Admin',
      items: [
        {
          id: 'admin' as NavTab,
          title: 'Panel Admin (Password 2011)',
          desc: 'Edit gambar Logo Aplikasi, Thumbnail Online & Kop Surat',
          icon: Shield,
        },
        {
          id: 'versions' as NavTab,
          title: 'Riwayat Versi & Pembaruan Otomatis',
          desc: `Versi aktif v${db.installedAppVersion} · Catatan perubahan dari masa ke masa`,
          icon: GitCommitHorizontal,
        },
      ],
    },
  ];

  const handleTestSound = () => {
    playAlarmChime(db.profile.alarmVolume);
    window.setTimeout(() => {
      speakIndonesian(
        `Assalamualaikum ${db.profile.nickName}, suara pengingat Adm Guru Pesantren Trubus Iman aktif dan siap digunakan.`,
        db.profile.alarmVolume,
        db.profile.voiceRate
      );
    }, 550);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Menu Lainnya</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {db.branding.appName} · v{db.installedAppVersion}
          </p>
        </div>
        <PWAInstallButton compact />
      </div>

      {sections.map((section) => (
        <div key={section.heading} className="space-y-2">
          <h2 className="text-xs font-semibold text-slate-500 px-1">{section.heading}</h2>
          <div className="rounded-2xl bg-white border border-slate-200/90 divide-y divide-slate-100 overflow-hidden">
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className="w-full px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 text-left transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{item.title}</p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Quick Settings Actions */}
      <div className="space-y-2">
        <h2 className="text-xs font-semibold text-slate-500 px-1">Pengaturan Perangkat</h2>
        <div className="rounded-2xl bg-white border border-slate-200/90 divide-y divide-slate-100 overflow-hidden">
          <button
            type="button"
            onClick={onOpenProfile}
            className="w-full px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 text-left"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <UserCog className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Pengaturan Biodata &amp; Kelas</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {db.profile.fullName} · {db.classes.length} kelas diampu
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          </button>

          <button
            type="button"
            onClick={handleTestSound}
            className="w-full px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 text-left"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center shrink-0">
                <Volume2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Uji Suara Pengingat</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tes nada bel &amp; suara Bahasa Indonesia di perangkat ini
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
};
