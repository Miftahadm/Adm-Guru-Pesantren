import React, { useState } from 'react';
import { FileSpreadsheet, FileText, Printer } from 'lucide-react';
import {
  AppDatabase,
  JournalCategory,
  PageOrientation,
  PaperSize,
} from '../types';
import { formatLocalDateISO } from '../data/defaultData';
import {
  exportAttendanceOfficial,
  exportExtracurricularOfficial,
  exportGradesOfficial,
  exportJournalsOfficial,
  exportRemindersOfficial,
  exportScheduleOfficial,
  exportStudentsOfficial,
  exportVersionHistoryOfficial,
  formatTodayIndonesian,
} from '../utils/exportOfficial';
import { BrandLogo } from '../components/BrandLogo';

interface ReportsPageProps {
  db: AppDatabase;
}

type ReportModule =
  | 'attendance'
  | 'grades'
  | 'journal'
  | 'schedule'
  | 'students'
  | 'extracurricular'
  | 'reminders'
  | 'versions';

export const ReportsPage: React.FC<ReportsPageProps> = ({ db }) => {
  const todayISO = formatLocalDateISO();
  const firstOfMonth = `${todayISO.slice(0, 7)}-01`;

  const [moduleType, setModuleType] = useState<ReportModule>('attendance');
  const [selectedClassId, setSelectedClassId] = useState(db.classes[0]?.id || '');
  const [selectedSubject, setSelectedSubject] = useState('Harian');
  const [attendanceMode, setAttendanceMode] = useState<'summary' | 'matrix'>('summary');
  const [journalFilter, setJournalFilter] = useState<'all' | JournalCategory>('all');
  const [selectedEkskulId, setSelectedEkskulId] = useState(db.extracurriculars[0]?.id || '');
  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(todayISO);
  const [paperSize, setPaperSize] = useState<PaperSize>('a4');
  const [orientation, setOrientation] = useState<PageOrientation>('portrait');

  const activeClass = db.classes.find((c) => c.id === selectedClassId) || db.classes[0];
  const classStudents = db.students
    .filter((s) => s.classId === activeClass?.id)
    .sort((a, b) => a.name.localeCompare(b.name));

  const setQuickRange = (range: 'week' | 'month' | 'semester') => {
    const now = new Date();
    const end = formatLocalDateISO(now);
    const start = new Date(now);
    if (range === 'week') start.setDate(now.getDate() - 7);
    else if (range === 'month') start.setDate(1);
    else start.setMonth(now.getMonth() - 5);
    setStartDate(formatLocalDateISO(start));
    setEndDate(end);
  };

  const runExport = (format: 'pdf' | 'excel') => {
    const opts = { paperSize, orientation, includeSignature: true };

    switch (moduleType) {
      case 'attendance':
        if (!activeClass) return;
        exportAttendanceOfficial({
          format,
          mode: attendanceMode,
          branding: db.branding,
          profile: db.profile,
          classRoom: activeClass,
          subject: selectedSubject,
          students: classStudents,
          records: db.attendances,
          startDate,
          endDate,
          options: opts,
        });
        break;
      case 'grades': {
        if (!activeClass) return;
        const subj = selectedSubject === 'Harian' ? activeClass.subjects[0] || 'IPA' : selectedSubject;
        const sheet = db.gradeSheets.find(
          (g) => g.classId === activeClass.id && g.subject === subj
        ) || {
          id: 'empty',
          classId: activeClass.id,
          subject: subj,
          semester: db.profile.semester,
          academicYear: db.profile.academicYear,
          taskColumns: [{ id: 't1', label: 'T1', title: 'Tugas 1', date: todayISO }],
          dailyColumns: [{ id: 'ph1', label: 'PH1', title: 'PH 1', date: todayISO }],
          taskScores: {},
          dailyScores: {},
          examScores: {},
          updatedAt: new Date().toISOString(),
        };
        exportGradesOfficial({
          format,
          branding: db.branding,
          profile: db.profile,
          classRoom: activeClass,
          students: classStudents,
          sheet,
          options: opts,
        });
        break;
      }
      case 'journal':
        exportJournalsOfficial({
          format,
          categoryFilter: journalFilter,
          branding: db.branding,
          profile: db.profile,
          journals: db.journals,
          startDate,
          endDate,
          options: opts,
        });
        break;
      case 'schedule':
        exportScheduleOfficial({
          format,
          branding: db.branding,
          profile: db.profile,
          schedules: db.schedules,
          options: opts,
        });
        break;
      case 'students':
        exportStudentsOfficial({
          format,
          branding: db.branding,
          profile: db.profile,
          classRoom: activeClass || null,
          students: db.students,
          classes: db.classes,
          options: opts,
        });
        break;
      case 'extracurricular': {
        const prog = db.extracurriculars.find((e) => e.id === selectedEkskulId) || db.extracurriculars[0];
        if (!prog) return;
        exportExtracurricularOfficial({
          format,
          branding: db.branding,
          profile: db.profile,
          program: prog,
          options: opts,
        });
        break;
      }
      case 'reminders':
        exportRemindersOfficial({
          format,
          branding: db.branding,
          profile: db.profile,
          reminders: db.reminders,
          options: opts,
        });
        break;
      case 'versions':
        exportVersionHistoryOfficial({
          format,
          branding: db.branding,
          profile: db.profile,
          versions: db.versionHistory,
          options: opts,
        });
        break;
    }
  };

  const MODULE_OPTIONS: Array<{ id: ReportModule; label: string }> = [
    { id: 'attendance', label: 'Absensi KBM' },
    { id: 'grades', label: 'Daftar Nilai' },
    { id: 'journal', label: 'Jurnal Mengajar' },
    { id: 'schedule', label: 'Jadwal Mengajar' },
    { id: 'students', label: 'Data Siswa' },
    { id: 'extracurricular', label: 'Ekskul & Les' },
    { id: 'reminders', label: 'Catatan & Pengingat' },
    { id: 'versions', label: 'Riwayat Versi' },
  ];

  const previewTitle =
    moduleType === 'attendance'
      ? attendanceMode === 'matrix'
        ? 'DAFTAR HADIR SANTRI PER TANGGAL'
        : 'REKAPITULASI ABSENSI SANTRI'
      : moduleType === 'grades'
        ? 'DAFTAR NILAI SANTRI'
        : moduleType === 'journal'
          ? journalFilter === 'non_class'
            ? 'JURNAL KEGIATAN GURU (NON KELAS)'
            : journalFilter === 'in_class'
              ? 'JURNAL MENGAJAR GURU (DI KELAS)'
              : 'JURNAL MENGAJAR & KEGIATAN GURU'
          : moduleType === 'schedule'
            ? 'JADWAL MENGAJAR GURU'
            : moduleType === 'students'
              ? 'DAFTAR DATA SANTRI / SISWA'
              : moduleType === 'extracurricular'
                ? 'LAPORAN EKSTRAKURIKULER & LES'
                : moduleType === 'reminders'
                  ? 'DAFTAR CATATAN & PENGINGAT GURU'
                  : 'RIWAYAT VERSI & PEMBARUAN APLIKASI';

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
          Rekap &amp; Unduh Dokumen Resmi
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Ekspor seluruh data aplikasi dalam format resmi PDF (Kop Surat + Tanda Tangan) &amp; Excel Pesantren Trubus Iman
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Report Builder Form */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-2xl bg-white border border-slate-200/90 p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">
                Data yang Direkap
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {MODULE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setModuleType(opt.id)}
                    className={`min-h-[42px] px-2.5 rounded-xl border text-xs font-semibold transition-colors ${
                      moduleType === opt.id
                        ? 'border-emerald-800 bg-emerald-800 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {(moduleType === 'attendance' || moduleType === 'grades' || moduleType === 'students') && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Kelas</label>
                <div className="flex flex-wrap gap-2">
                  {db.classes.map((cls) => (
                    <button
                      key={cls.id}
                      type="button"
                      onClick={() => {
                        setSelectedClassId(cls.id);
                        setSelectedSubject(moduleType === 'attendance' ? 'Harian' : cls.subjects[0] || 'IPA');
                      }}
                      className={`min-h-[38px] px-3.5 rounded-xl text-xs font-semibold ${
                        activeClass?.id === cls.id
                          ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {cls.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(moduleType === 'attendance' || moduleType === 'grades') && activeClass && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Mata Pelajaran
                </label>
                <div className="flex flex-wrap gap-2">
                  {(moduleType === 'attendance'
                    ? ['Harian', ...activeClass.subjects]
                    : activeClass.subjects
                  ).map((subj) => (
                    <button
                      key={subj}
                      type="button"
                      onClick={() => setSelectedSubject(subj)}
                      className={`min-h-[36px] px-3 rounded-lg text-xs font-medium ${
                        selectedSubject === subj
                          ? 'bg-emerald-800 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {subj}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {moduleType === 'attendance' && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Bentuk Rekap Absensi
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAttendanceMode('summary')}
                    className={`min-h-[42px] rounded-xl border text-xs font-semibold ${
                      attendanceMode === 'summary'
                        ? 'border-emerald-700 bg-emerald-50 text-emerald-950'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    Ringkas (Jumlah H, S, I, A &amp; %)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttendanceMode('matrix')}
                    className={`min-h-[42px] rounded-xl border text-xs font-semibold ${
                      attendanceMode === 'matrix'
                        ? 'border-emerald-700 bg-emerald-50 text-emerald-950'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    Per Tanggal (Matriks Hadir)
                  </button>
                </div>
              </div>
            )}

            {moduleType === 'journal' && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Kategori Jurnal Mengajar
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'all' as const, label: 'Gabungan' },
                    { id: 'in_class' as const, label: 'Di Kelas Saja' },
                    { id: 'non_class' as const, label: 'Non Kelas Saja' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setJournalFilter(f.id)}
                      className={`min-h-[42px] rounded-xl border text-xs font-semibold ${
                        journalFilter === f.id
                          ? 'border-emerald-700 bg-emerald-50 text-emerald-950'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {moduleType === 'extracurricular' && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Pilih Program Ekskul / Les
                </label>
                <select
                  value={selectedEkskulId}
                  onChange={(e) => setSelectedEkskulId(e.target.value)}
                  className="w-full min-h-[42px] rounded-xl border border-slate-200 px-3 text-sm bg-white"
                >
                  {db.extracurriculars.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.type})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {(moduleType === 'attendance' || moduleType === 'journal') && (
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-600">Rentang Tanggal</label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="min-h-[42px] rounded-xl border border-slate-200 px-3 text-xs"
                  />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="min-h-[42px] rounded-xl border border-slate-200 px-3 text-xs"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'week' as const, label: 'Minggu ini' },
                    { id: 'month' as const, label: 'Bulan ini' },
                    { id: 'semester' as const, label: 'Semester ini' },
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setQuickRange(r.id)}
                      className="min-h-[34px] px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-700"
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Paper & Orientation Options */}
            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Ukuran Kertas PDF
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['a4', 'f4'] as const).map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setPaperSize(sz)}
                      className={`min-h-[40px] rounded-xl border text-xs font-semibold uppercase ${
                        paperSize === sz
                          ? 'border-emerald-700 bg-emerald-50 text-emerald-950'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      {sz === 'f4' ? 'F4 (Folio)' : 'A4'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Orientasi PDF
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'portrait' as const, label: 'Potret' },
                    { id: 'landscape' as const, label: 'Lanskap' },
                  ].map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setOrientation(o.id)}
                      className={`min-h-[40px] rounded-xl border text-xs font-semibold ${
                        orientation === o.id
                          ? 'border-emerald-700 bg-emerald-50 text-emerald-950'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Download Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => runExport('pdf')}
                className="min-h-[48px] rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                <FileText className="w-4 h-4" />
                Unduh PDF Resmi ({paperSize.toUpperCase()})
              </button>
              <button
                type="button"
                onClick={() => runExport('excel')}
                className="min-h-[48px] rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Unduh Excel Resmi (.xlsx)
              </button>
            </div>
          </div>
        </div>

        {/* Right: Live Official Letterhead Preview */}
        <div className="lg:col-span-5">
          <div className="rounded-2xl bg-white border border-slate-200/90 p-5 space-y-4 sticky top-6">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-500">Pratinjau Format Resmi Sekolah</p>
              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-400">
                <Printer className="w-3.5 h-3.5" />
                {paperSize.toUpperCase()} · {orientation === 'portrait' ? 'Potret' : 'Lanskap'}
              </span>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs text-[10px] text-slate-800 space-y-3">
              {/* Mini Official Kop Surat */}
              <div className="flex items-center gap-3 pb-2.5 border-b-2 border-emerald-900">
                <BrandLogo logoDataUrl={db.branding.logoDataUrl} size="md" />
                <div className="flex-1 text-center leading-tight">
                  <p className="font-bold text-[9px] text-slate-700 uppercase">
                    {db.branding.foundationName}
                  </p>
                  <p className="font-bold text-xs text-emerald-900 uppercase mt-0.5">
                    {db.branding.institutionName}
                  </p>
                  <p className="text-[8px] text-slate-500 mt-0.5">{db.branding.address}</p>
                </div>
              </div>

              <p className="text-center font-bold text-[11px] text-slate-900 pt-1">
                {previewTitle}
              </p>

              <div className="grid grid-cols-2 gap-1 text-[9px] text-slate-600">
                <p>
                  <strong>Guru:</strong> {db.profile.fullName}
                </p>
                <p>
                  <strong>TA:</strong> {db.profile.semester} / {db.profile.academicYear}
                </p>
              </div>

              {/* Representative Skeleton Table Lines */}
              <div className="border border-slate-200 rounded overflow-hidden">
                <div className="bg-emerald-900 text-white px-2.5 py-1.5 grid grid-cols-4 font-semibold text-[8.5px]">
                  <span>No</span>
                  <span className="col-span-2">Uraian / Nama Santri</span>
                  <span className="text-right">Keterangan</span>
                </div>
                <div className="divide-y divide-slate-100 text-[8.5px] text-slate-500">
                  <div className="px-2.5 py-1.5 grid grid-cols-4">
                    <span>1</span>
                    <span className="col-span-2">Data tersinkron otomatis dari perangkat</span>
                    <span className="text-right font-mono">Resmi</span>
                  </div>
                  <div className="px-2.5 py-1.5 grid grid-cols-4 bg-slate-50">
                    <span>2</span>
                    <span className="col-span-2">Siap dicetak atau dibagikan langsung</span>
                    <span className="text-right font-mono">Resmi</span>
                  </div>
                </div>
              </div>

              {/* Signature Preview */}
              <div className="pt-4 grid grid-cols-2 gap-4 text-[8.5px] text-slate-700">
                <div>
                  <p>Mengetahui,</p>
                  <p>{db.branding.principalTitle}</p>
                  <p className="mt-6 font-bold text-slate-900">{db.branding.principalName}</p>
                  <p className="text-slate-500">{db.branding.principalNip}</p>
                </div>
                <div className="text-right">
                  <p>
                    {db.branding.city}, {formatTodayIndonesian()}
                  </p>
                  <p>Guru Pengampu,</p>
                  <p className="mt-6 font-bold text-slate-900">{db.profile.fullName}</p>
                  <p className="text-slate-500">{db.profile.nipNiy}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
