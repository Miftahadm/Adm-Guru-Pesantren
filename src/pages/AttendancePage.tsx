import React, { useState } from 'react';
import { CheckCheck, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { AppDatabase, AttendanceRecord, AttendanceStatus } from '../types';
import { formatLocalDateISO } from '../data/defaultData';
import { exportAttendanceOfficial, formatIndonesianDate } from '../utils/exportOfficial';
import { ExportButtons } from '../components/ExportButtons';

interface AttendancePageProps {
  db: AppDatabase;
  onUpdateAttendances: (next: AttendanceRecord[]) => void;
  onOpenStudents: () => void;
}

const STATUSES: Array<{ code: AttendanceStatus; label: string; activeClass: string }> = [
  { code: 'H', label: 'Hadir', activeClass: 'bg-emerald-700 text-white border-emerald-700' },
  { code: 'S', label: 'Sakit', activeClass: 'bg-sky-700 text-white border-sky-700' },
  { code: 'I', label: 'Izin', activeClass: 'bg-amber-600 text-white border-amber-600' },
  { code: 'A', label: 'Alpa', activeClass: 'bg-rose-700 text-white border-rose-700' },
];

export const AttendancePage: React.FC<AttendancePageProps> = ({
  db,
  onUpdateAttendances,
  onOpenStudents,
}) => {
  const [selectedClassId, setSelectedClassId] = useState(db.classes[0]?.id || '');
  const [selectedSubject, setSelectedSubject] = useState('Harian');
  const [dateISO, setDateISO] = useState(() => formatLocalDateISO());

  const activeClass = db.classes.find((c) => c.id === selectedClassId) || db.classes[0];
  const classStudents = db.students
    .filter((s) => s.classId === activeClass?.id)
    .sort((a, b) => a.name.localeCompare(b.name));

  const subjectOptions = ['Harian', ...(activeClass?.subjects || [])];
  const recordId = `${dateISO}_${activeClass?.id || ''}_${selectedSubject}`;
  const currentRecord = db.attendances.find((a) => a.id === recordId);
  const entries = currentRecord?.entries || {};

  const shiftDate = (days: number) => {
    const d = new Date(`${dateISO}T12:00:00`);
    d.setDate(d.getDate() + days);
    setDateISO(formatLocalDateISO(d));
  };

  const saveEntries = (nextEntries: Record<string, AttendanceStatus>) => {
    if (!activeClass) return;
    const updated: AttendanceRecord = {
      id: recordId,
      date: dateISO,
      classId: activeClass.id,
      subject: selectedSubject,
      entries: nextEntries,
      updatedAt: new Date().toISOString(),
    };
    const exists = db.attendances.some((a) => a.id === recordId);
    if (exists) {
      onUpdateAttendances(db.attendances.map((a) => (a.id === recordId ? updated : a)));
    } else {
      onUpdateAttendances([...db.attendances, updated]);
    }
  };

  const handleMarkStatus = (studentId: string, status: AttendanceStatus) => {
    saveEntries({ ...entries, [studentId]: status });
  };

  const handleMarkAllPresent = () => {
    const all: Record<string, AttendanceStatus> = {};
    classStudents.forEach((s) => {
      all[s.id] = 'H';
    });
    saveEntries(all);
  };

  const counts = { H: 0, S: 0, I: 0, A: 0 };
  classStudents.forEach((s) => {
    const st = entries[s.id];
    if (st) counts[st]++;
  });

  const handleExport = (format: 'pdf' | 'excel') => {
    if (!activeClass) return;
    exportAttendanceOfficial({
      format,
      mode: 'summary',
      branding: db.branding,
      profile: db.profile,
      classRoom: activeClass,
      subject: selectedSubject,
      students: classStudents,
      records: db.attendances,
      startDate: dateISO,
      endDate: dateISO,
    });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Absensi {activeClass?.name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 tabular-nums">
            {classStudents.length} santri · {selectedSubject} · Tersimpan otomatis di perangkat
          </p>
        </div>

        <ExportButtons
          compact
          onExportPDF={() => handleExport('pdf')}
          onExportExcel={() => handleExport('excel')}
        />
      </div>

      {/* Filters Card */}
      <div className="rounded-2xl bg-white border border-slate-200/90 p-4 space-y-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-500 mr-1">Kelas:</span>
          {db.classes.map((cls) => (
            <button
              key={cls.id}
              type="button"
              onClick={() => {
                setSelectedClassId(cls.id);
                setSelectedSubject('Harian');
              }}
              className={`min-h-[38px] px-3.5 rounded-xl text-xs font-semibold transition-colors ${
                activeClass?.id === cls.id
                  ? 'bg-emerald-800 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {cls.name}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
          <span className="text-xs font-medium text-slate-500 shrink-0 mr-1">Mapel:</span>
          {subjectOptions.map((subj) => (
            <button
              key={subj}
              type="button"
              onClick={() => setSelectedSubject(subj)}
              className={`min-h-[36px] px-3 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                selectedSubject === subj
                  ? 'bg-emerald-100 text-emerald-950 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {subj}
            </button>
          ))}
        </div>

        {/* Date Selector */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
          <button
            type="button"
            onClick={() => shiftDate(-1)}
            className="w-10 h-10 rounded-xl border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600"
            aria-label="Hari sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateISO}
              onChange={(e) => setDateISO(e.target.value)}
              className="min-h-[40px] rounded-xl border border-slate-200 px-3 text-xs sm:text-sm font-medium text-slate-800 focus:border-emerald-700 focus:outline-none"
            />
            <span className="hidden sm:inline text-xs text-slate-500">
              {formatIndonesianDate(dateISO)}
            </span>
          </div>

          <button
            type="button"
            onClick={() => shiftDate(1)}
            className="w-10 h-10 rounded-xl border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600"
            aria-label="Hari berikutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Live Counters (H / S / I / A) */}
      <div className="grid grid-cols-4 gap-2.5 sm:gap-3.5">
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200/80 p-3.5 text-center">
          <p className="font-mono text-2xl font-bold text-emerald-900 tabular-nums">{counts.H}</p>
          <p className="text-xs font-medium text-emerald-800 mt-0.5">Hadir</p>
        </div>
        <div className="rounded-2xl bg-sky-50 border border-sky-200/80 p-3.5 text-center">
          <p className="font-mono text-2xl font-bold text-sky-900 tabular-nums">{counts.S}</p>
          <p className="text-xs font-medium text-sky-800 mt-0.5">Sakit</p>
        </div>
        <div className="rounded-2xl bg-amber-50 border border-amber-200/80 p-3.5 text-center">
          <p className="font-mono text-2xl font-bold text-amber-900 tabular-nums">{counts.I}</p>
          <p className="text-xs font-medium text-amber-800 mt-0.5">Izin</p>
        </div>
        <div className="rounded-2xl bg-rose-50 border border-rose-200/80 p-3.5 text-center">
          <p className="font-mono text-2xl font-bold text-rose-900 tabular-nums">{counts.A}</p>
          <p className="text-xs font-medium text-rose-800 mt-0.5">Alpa</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={handleMarkAllPresent}
          className="min-h-[44px] rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
        >
          <CheckCheck className="w-4 h-4" />
          Semua Hadir
        </button>
        <button
          type="button"
          onClick={onOpenStudents}
          className="min-h-[44px] rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
        >
          <Users className="w-4 h-4" />
          Kelola Siswa
        </button>
      </div>

      {/* Attendance Tap List */}
      <div className="rounded-2xl bg-white border border-slate-200/90 overflow-hidden">
        {classStudents.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-semibold text-slate-700">Belum ada santri di kelas ini</p>
            <button
              type="button"
              onClick={onOpenStudents}
              className="mt-3 min-h-[42px] px-4 rounded-xl bg-emerald-800 text-white text-xs font-semibold"
            >
              Tambah / Impor Data Santri
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {classStudents.map((stu, idx) => {
              const currentStatus = entries[stu.id];
              return (
                <div
                  key={stu.id}
                  className="px-4 py-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-xs text-slate-400 w-5 text-right tabular-nums shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{stu.name}</p>
                      <p className="text-[11px] text-slate-500">
                        {stu.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {STATUSES.map((st) => {
                      const active = currentStatus === st.code;
                      return (
                        <button
                          key={st.code}
                          type="button"
                          onClick={() => handleMarkStatus(stu.id, st.code)}
                          aria-label={`${stu.name} ${st.label}`}
                          className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl border text-xs font-bold transition-colors ${
                            active
                              ? st.activeClass
                              : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {st.code}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
