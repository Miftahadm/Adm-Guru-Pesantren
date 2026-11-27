import React from 'react';
import {
  AlertCircle,
  Award,
  Bell,
  BookOpen,
  CalendarDays,
  CheckSquare,
  ChevronRight,
  Clock,
  Cloud,
  FileSpreadsheet,
  HardDrive,
  Megaphone,
  RefreshCw,
  Share2,
  Shield,
  Sparkles,
  Users,
  Volume2,
} from 'lucide-react';
import { AppDatabase, AppMode, NavTab, ScheduleItem } from '../types';
import { DAY_NAMES, formatLocalDateISO, getTodayDayOfWeek } from '../data/defaultData';
import { formatIndonesianDate, formatTodayIndonesian } from '../utils/exportOfficial';
import { BrandLogo } from '../components/BrandLogo';
import { ShareApkModal } from '../components/ShareApkModal';

interface DashboardPageProps {
  db: AppDatabase;
  onNavigate: (tab: NavTab) => void;
  onTriggerAlarmPreview: (schedule: ScheduleItem) => void;
  onOpenProfile: () => void;
  onSelectMode: (mode: AppMode) => void;
  onSyncNow: () => void;
  isSyncing: boolean;
  swUpdateReady: boolean;
}

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 11) return 'Selamat pagi,';
  if (hour < 15) return 'Selamat siang,';
  if (hour < 18) return 'Selamat sore,';
  return 'Selamat malam,';
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  db,
  onNavigate,
  onTriggerAlarmPreview,
  onOpenProfile,
  onSelectMode,
  onSyncNow,
  isSyncing,
  swUpdateReady,
}) => {
  const [shareModalOpen, setShareModalOpen] = React.useState(false);
  const todayDow = getTodayDayOfWeek();
  const todayISO = formatLocalDateISO();
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const todaySchedules = db.schedules
    .filter((s) => s.dayOfWeek === todayDow && s.active)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const teachingTodayCount = todaySchedules.filter((s) => s.type === 'mengajar').length;

  const nextSchedule =
    todaySchedules.find((s) => {
      const [h, m] = s.startTime.split(':').map(Number);
      return h * 60 + m >= nowMinutes;
    }) || todaySchedules[0];

  // Check if any class has missing attendance today
  const classMissingAttendance = db.classes.find(
    (cls) => !db.attendances.some((att) => att.classId === cls.id && att.date === todayISO)
  );

  const todayJournals = db.journals.filter((j) => j.date === todayISO);
  const inClassCount = db.journals.filter((j) => j.category === 'in_class').length;
  const nonClassCount = db.journals.filter((j) => j.category === 'non_class').length;

  const backupSummary = db.lastBackupAt
    ? `Cadangan terakhir ${new Date(db.lastBackupAt).toLocaleDateString('id-ID')}`
    : 'Data di perangkat · belum dicadangkan';

  return (
    <div className="space-y-6">
      {/* Hero Greeting Card (Pesantren Trubus Iman Emerald Header) */}
      <section className="rounded-3xl bg-gradient-to-br from-[#064E3B] via-[#065F46] to-[#047857] text-white p-6 sm:p-7 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <BrandLogo
              logoDataUrl={db.branding.logoDataUrl}
              size="lg"
              className="ring-2 ring-white/20"
            />
            <div>
              <div className="flex items-center gap-2 text-xs text-emerald-200">
                <HardDrive className="w-3.5 h-3.5 shrink-0" />
                <span>{backupSummary}</span>
              </div>
              <p className="mt-2 text-sm text-emerald-100">{getTimeGreeting()}</p>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                {db.profile.nickName || db.profile.fullName}
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-emerald-100/90">
                {db.profile.schoolName} · {DAY_NAMES[todayDow]}, {formatTodayIndonesian()}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShareModalOpen(true)}
              className="min-h-[42px] px-4 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-xs sm:text-sm font-semibold text-white inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <Share2 className="w-4 h-4 text-amber-300" />
              Share APK (WA)
            </button>
            <button
              type="button"
              onClick={onOpenProfile}
              className="min-h-[42px] px-4 rounded-xl bg-white/15 hover:bg-white/25 border border-white/15 text-xs sm:text-sm font-medium text-white transition-colors whitespace-nowrap"
            >
              Edit Biodata
            </button>
            <button
              type="button"
              onClick={() => onNavigate('reports')}
              className="min-h-[42px] px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap"
            >
              Rekap Resmi
            </button>
          </div>
        </div>

        {/* Next Schedule Highlight inside Hero */}
        {nextSchedule ? (
          <div className="mt-6 rounded-2xl bg-white text-slate-900 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-emerald-50 border border-emerald-200/80 px-3.5 py-2.5 text-center shrink-0 min-w-[74px]">
                <p className="text-[10px] font-semibold text-emerald-800">Nanti</p>
                <p className="font-mono text-lg font-bold text-emerald-950 tabular-nums leading-tight">
                  {nextSchedule.startTime}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-base font-bold text-slate-900 truncate">
                  {nextSchedule.type === 'mengajar'
                    ? `${nextSchedule.className} · ${nextSchedule.subject}`
                    : nextSchedule.type === 'istirahat'
                      ? 'Waktu Istirahat'
                      : 'Waktu Pulang'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {nextSchedule.startTime}–{nextSchedule.endTime} ·{' '}
                  {nextSchedule.alarmLeadMinutes === 0
                    ? 'Alarm tepat waktu'
                    : `Alarm ${nextSchedule.alarmLeadMinutes} menit sebelumnya`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onTriggerAlarmPreview(nextSchedule)}
                className="min-h-[42px] px-3.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <Volume2 className="w-4 h-4" />
                Uji Alarm Suara
              </button>
              <button
                type="button"
                onClick={() => onNavigate('schedule')}
                className="min-h-[42px] px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium inline-flex items-center gap-1 whitespace-nowrap"
              >
                Semua Jadwal
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl bg-white/10 border border-white/15 p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-emerald-200 shrink-0" />
              <p className="text-sm text-emerald-50">
                Belum ada jadwal aktif untuk hari {DAY_NAMES[todayDow]}.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('schedule')}
              className="min-h-[40px] px-3.5 rounded-xl bg-white text-emerald-950 text-xs font-semibold whitespace-nowrap"
            >
              Atur Jadwal
            </button>
          </div>
        )}
      </section>

      {/* Dual Mode Bar: Offline (Perangkat/APK) vs Online (Sinkronisasi GitHub) */}
      <section className="rounded-2xl bg-white border border-slate-200/90 p-4 sm:p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900">
              Mode Operasi:{' '}
              <span className={db.syncConfig.mode === 'online' ? 'text-emerald-800' : 'text-slate-700'}>
                {db.syncConfig.mode === 'online'
                  ? 'Online (Sinkronisasi GitHub)'
                  : 'Offline (Penyimpanan Perangkat)'}
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              {db.syncConfig.mode === 'online'
                ? 'Terhubung ke pusat GitHub untuk pembaruan aplikasi, data santri inti, dan pengumuman resmi.'
                : 'Berjalan 100% lokal di perangkat Android/HP Anda tanpa internet. Klik Online kapan saja untuk menyinkronkan update GitHub.'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200">
              <button
                type="button"
                onClick={() => onSelectMode('offline')}
                className={`min-h-[40px] px-3.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  db.syncConfig.mode === 'offline'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <HardDrive className="w-4 h-4 shrink-0" />
                Offline
              </button>
              <button
                type="button"
                onClick={() => onSelectMode('online')}
                disabled={isSyncing}
                className={`min-h-[40px] px-3.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  db.syncConfig.mode === 'online'
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isSyncing ? (
                  <RefreshCw className="w-4 h-4 shrink-0 animate-spin" />
                ) : (
                  <Cloud className="w-4 h-4 shrink-0" />
                )}
                {isSyncing ? 'Menyinkronkan...' : 'Online'}
              </button>
            </div>

            {db.syncConfig.mode === 'online' && (
              <button
                type="button"
                onClick={onSyncNow}
                disabled={isSyncing}
                className="min-h-[42px] px-3 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
                title="Sinkron ulang dari GitHub sekarang"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Sinkron Ulang</span>
              </button>
            )}
          </div>
        </div>

        {/* Sync Feedback Line */}
        {(db.syncConfig.lastSyncMessage || db.syncConfig.lastSyncAt || swUpdateReady) && (
          <div className="pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <p
              className={
                db.syncConfig.lastSyncStatus === 'error'
                  ? 'text-rose-700 font-medium'
                  : 'text-slate-600'
              }
            >
              {db.syncConfig.lastSyncMessage || 'Belum pernah disinkronkan dengan GitHub.'}
              {db.syncConfig.lastSyncAt && (
                <span className="text-slate-400 tabular-nums">
                  {' · '}
                  Terakhir: {new Date(db.syncConfig.lastSyncAt).toLocaleString('id-ID')}
                </span>
              )}
            </p>
            {swUpdateReady && (
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="min-h-[34px] px-3 rounded-lg bg-emerald-800 text-white text-xs font-semibold whitespace-nowrap self-start sm:self-auto"
              >
                Muat Ulang Versi Baru
              </button>
            )}
          </div>
        )}
      </section>

      {/* Missing Attendance Alert Banner */}
      {classMissingAttendance && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200/90 px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-700 shrink-0" />
            <p className="text-sm text-amber-950">
              Absensi <strong>{classMissingAttendance.name}</strong> hari ini belum diisi.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('attendance')}
            className="min-h-[40px] px-4 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold transition-colors whitespace-nowrap self-start sm:self-auto"
          >
            Isi sekarang
          </button>
        </div>
      )}

      {/* Main Content Two-Column Desktop Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Kegiatan Belajar Mengajar */}
        <div className="lg:col-span-8 space-y-6">
          <div>
            <h2 className="text-sm font-semibold text-slate-500 mb-3">
              Kegiatan Belajar Mengajar
            </h2>
            <div className="grid grid-cols-2 gap-3.5 sm:gap-4">
              <button
                type="button"
                onClick={() => onNavigate('schedule')}
                className="text-left rounded-2xl bg-white border border-slate-200/90 p-4 sm:p-5 hover:border-emerald-300 hover:shadow-xs transition-all group"
              >
                <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <h3 className="mt-3.5 text-base font-bold text-slate-900 group-hover:text-emerald-900">
                  Jadwal
                </h3>
                <p className="mt-1 text-xs text-slate-500 tabular-nums">
                  {teachingTodayCount} jam mengajar hari ini
                </p>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('attendance')}
                className="text-left rounded-2xl bg-white border border-slate-200/90 p-4 sm:p-5 hover:border-emerald-300 hover:shadow-xs transition-all group"
              >
                <div className="w-11 h-11 rounded-xl bg-sky-50 text-sky-800 flex items-center justify-center">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <h3 className="mt-3.5 text-base font-bold text-slate-900 group-hover:text-emerald-900">
                  Absensi
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Hadir, sakit, izin, alpa
                </p>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('grades')}
                className="text-left rounded-2xl bg-white border border-slate-200/90 p-4 sm:p-5 hover:border-emerald-300 hover:shadow-xs transition-all group"
              >
                <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <h3 className="mt-3.5 text-base font-bold text-slate-900 group-hover:text-emerald-900">
                  Daftar Nilai
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Tugas, PH, UTS &amp; UAS
                </p>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('journal')}
                className="text-left rounded-2xl bg-white border border-slate-200/90 p-4 sm:p-5 hover:border-emerald-300 hover:shadow-xs transition-all group"
              >
                <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h3 className="mt-3.5 text-base font-bold text-slate-900 group-hover:text-emerald-900">
                  Jurnal Mengajar
                </h3>
                <p className="mt-1 text-xs text-slate-500 tabular-nums">
                  {inClassCount} Di Kelas · {nonClassCount} Non Kelas
                </p>
              </button>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-slate-500 mb-3">
              Di Luar Mengajar &amp; Administrasi
            </h2>
            <div className="rounded-2xl bg-white border border-slate-200/90 divide-y divide-slate-100">
              {[
                {
                  id: 'students' as NavTab,
                  title: 'Data Santri / Siswa',
                  desc: `${db.students.length} santri di ${db.classes.length} kelas · Impor Excel`,
                  icon: Users,
                },
                {
                  id: 'extracurricular' as NavTab,
                  title: 'Ekstrakurikuler & Les',
                  desc: `${db.extracurriculars.length} program aktif · Absensi & jurnal`,
                  icon: Sparkles,
                },
                {
                  id: 'reminders' as NavTab,
                  title: 'Catatan & Pengingat',
                  desc: `${db.reminders.filter((r) => r.active).length} pengingat aktif`,
                  icon: Bell,
                },
                {
                  id: 'reports' as NavTab,
                  title: 'Rekap & Unduh Resmi Pesantren Trubus Iman',
                  desc: 'Ekspor PDF ber-Kop Surat & Excel untuk semua data',
                  icon: FileSpreadsheet,
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onNavigate(item.id)}
                    className="w-full px-4 sm:px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
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
        </div>

        {/* Right Summary Panel */}
        <div className="lg:col-span-4 space-y-5">
          {/* Pengumuman & Info Pusat Pesantren (Synced from GitHub) */}
          <div className="rounded-2xl bg-white border border-slate-200/90 p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-emerald-800 shrink-0" />
                <h3 className="text-sm font-bold text-slate-900">Info &amp; Pengumuman Pusat</h3>
              </div>
              <button
                type="button"
                onClick={() => onSelectMode('online')}
                disabled={isSyncing}
                className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 whitespace-nowrap"
              >
                {isSyncing ? 'Memuat...' : 'Perbarui'}
              </button>
            </div>
            {db.announcements.length === 0 ? (
              <p className="mt-3 text-xs text-slate-500">
                Belum ada pengumuman pusat. Aktifkan mode Online untuk mengambil pengumuman dari GitHub.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {db.announcements.slice(0, 3).map((ann) => (
                  <div
                    key={ann.id}
                    className="pb-3 last:pb-0 border-b last:border-b-0 border-slate-100"
                  >
                    <p className="text-[11px] text-slate-500 tabular-nums">
                      <span
                        className={
                          ann.priority === 'penting'
                            ? 'font-bold text-amber-800'
                            : 'font-semibold text-emerald-800'
                        }
                      >
                        {ann.priority === 'penting' ? 'Penting' : 'Info Pusat'}
                      </span>
                      {' · '}
                      {formatIndonesianDate(ann.date)}
                    </p>
                    <p className="text-sm font-semibold text-slate-900 mt-0.5 leading-snug">
                      {ann.title}
                    </p>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{ann.body}</p>
                    <p className="text-[11px] text-slate-400 mt-1">{ann.author}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ringkasan Jurnal Hari Ini */}
          <div className="rounded-2xl bg-white border border-slate-200/90 p-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900">Jurnal Hari Ini</h3>
              <button
                type="button"
                onClick={() => onNavigate('journal')}
                className="text-xs font-semibold text-emerald-800 hover:text-emerald-950"
              >
                Buka Jurnal
              </button>
            </div>
            {todayJournals.length === 0 ? (
              <p className="mt-3 text-xs text-slate-500 leading-relaxed">
                Belum ada catatan jurnal untuk hari ini. Anda dapat mencatat kegiatan mengajar Di Kelas maupun kegiatan guru Non Kelas.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {todayJournals.slice(0, 3).map((j) => (
                  <div
                    key={j.id}
                    className="pb-3 last:pb-0 border-b last:border-b-0 border-slate-100"
                  >
                    <p className="text-xs text-slate-500 tabular-nums">
                      {j.category === 'in_class' ? 'Di Kelas' : 'Non Kelas'} · {j.startTime}–{j.endTime}
                    </p>
                    <p className="text-sm font-semibold text-slate-900 mt-0.5">
                      {j.category === 'in_class'
                        ? `${j.className} · ${j.subject}`
                        : j.nonClassType}
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{j.activity}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info Versi & Panel Admin */}
          <div className="rounded-2xl bg-white border border-slate-200/90 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Status Aplikasi</span>
              <span className="font-mono text-xs font-semibold text-emerald-800">
                v{db.installedAppVersion}
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Seluruh perubahan versi dicatat otomatis dari masa ke masa. Pengaturan logo, thumbnail online, dan kop surat dikelola melalui Panel Admin.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => onNavigate('admin')}
                className="min-h-[40px] px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-800 inline-flex items-center justify-center gap-1.5"
              >
                <Shield className="w-3.5 h-3.5 text-emerald-800" />
                Panel Admin
              </button>
              <button
                type="button"
                onClick={() => onNavigate('versions')}
                className="min-h-[40px] px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-800"
              >
                Riwayat Versi
              </button>
            </div>
          </div>
        </div>
      </div>
      <ShareApkModal
        open={shareModalOpen}
        db={db}
        onClose={() => setShareModalOpen(false)}
        onOpenAdmin={() => onNavigate('admin')}
      />
    </div>
  );
};
