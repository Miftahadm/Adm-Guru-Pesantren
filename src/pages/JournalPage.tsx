import React, { useMemo, useState } from 'react';
import {
  Bell,
  BookOpen,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Plus,
  Settings2,
  Trash2,
  X,
} from 'lucide-react';
import { AppDatabase, JournalCategory, JournalEntry } from '../types';
import { DEFAULT_SUBJECTS, formatLocalDateISO } from '../data/defaultData';
import { exportJournalsOfficial, formatIndonesianDate } from '../utils/exportOfficial';
import { ExportButtons } from '../components/ExportButtons';

interface JournalPageProps {
  db: AppDatabase;
  onUpdateJournals: (next: JournalEntry[]) => void;
  onUpdateNonClassTypes: (next: string[]) => void;
}

const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const WEEKDAY_LABELS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

export const JournalPage: React.FC<JournalPageProps> = ({
  db,
  onUpdateJournals,
  onUpdateNonClassTypes,
}) => {
  const todayISO = formatLocalDateISO();
  const [selectedDate, setSelectedDate] = useState(todayISO);
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const [filterCategory, setFilterCategory] = useState<'all' | JournalCategory>('all');

  // Entry modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [category, setCategory] = useState<JournalCategory>('in_class');
  const [classId, setClassId] = useState(db.classes[0]?.id || '');
  const [subject, setSubject] = useState(db.classes[0]?.subjects[0] || 'IPA');
  const [material, setMaterial] = useState('');
  const [nonClassType, setNonClassType] = useState(db.nonClassTypes[0] || 'Piket Guru & Kedisiplinan');
  const [location, setLocation] = useState('Lingkungan Pesantren Trubus Iman');
  const [startTime, setStartTime] = useState('07:30');
  const [endTime, setEndTime] = useState('08:50');
  const [activity, setActivity] = useState('');
  const [notes, setNotes] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderDate, setReminderDate] = useState(todayISO);
  const [reminderTime, setReminderTime] = useState('06:30');

  // Manage Non-Class Activity Types Modal (Add / Edit / Delete customizable non-class types)
  const [typesModalOpen, setTypesModalOpen] = useState(false);
  const [newTypeInput, setNewTypeInput] = useState('');
  const [editingTypeIndex, setEditingTypeIndex] = useState<number | null>(null);
  const [editingTypeValue, setEditingTypeValue] = useState('');

  // Calendar grid computation
  const calendarCells = useMemo(() => {
    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const startWeekday = (firstOfMonth.getDay() + 6) % 7; // 0 = Monday
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: Array<{ iso: string | null; day: number | null }> = [];
    for (let i = 0; i < startWeekday; i++) cells.push({ iso: null, day: null });
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ iso, day: d });
    }
    return cells;
  }, [viewYear, viewMonth]);

  // Index dates that have journals
  const journalsByDate = useMemo(() => {
    const map = new Map<string, { inClass: number; nonClass: number }>();
    db.journals.forEach((j) => {
      const cur = map.get(j.date) || { inClass: 0, nonClass: 0 };
      if (j.category === 'in_class') cur.inClass++;
      else cur.nonClass++;
      map.set(j.date, cur);
    });
    return map;
  }, [db.journals]);

  const selectedDateJournals = db.journals
    .filter((j) => j.date === selectedDate && (filterCategory === 'all' || j.category === filterCategory))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const shiftMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const openNewEntry = (defaultCategory: JournalCategory = 'in_class') => {
    setEditingId(null);
    setCategory(defaultCategory);
    setClassId(db.classes[0]?.id || '');
    setSubject(db.classes[0]?.subjects[0] || 'IPA');
    setMaterial('');
    setNonClassType(db.nonClassTypes[0] || 'Piket Guru & Kedisiplinan');
    setLocation('Lingkungan Pesantren Trubus Iman');
    setStartTime('07:30');
    setEndTime('08:50');
    setActivity('');
    setNotes('');
    setReminderEnabled(false);
    setReminderDate(selectedDate);
    setReminderTime('06:30');
    setModalOpen(true);
  };

  const openEditEntry = (entry: JournalEntry) => {
    setEditingId(entry.id);
    setCategory(entry.category);
    setClassId(entry.classId || db.classes[0]?.id || '');
    setSubject(entry.subject || '');
    setMaterial(entry.material || '');
    setNonClassType(entry.nonClassType || db.nonClassTypes[0] || '');
    setLocation(entry.location || '');
    setStartTime(entry.startTime);
    setEndTime(entry.endTime);
    setActivity(entry.activity);
    setNotes(entry.notes);
    setReminderEnabled(entry.reminderEnabled);
    setReminderDate(entry.reminderDate || entry.date);
    setReminderTime(entry.reminderTime || '06:30');
    setModalOpen(true);
  };

  const handleSaveEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const nowIso = new Date().toISOString();
    const cls = db.classes.find((c) => c.id === classId);
    const trimmedNonClass = nonClassType.trim() || 'Kegiatan Non Kelas';

    // Automatically register new custom non-class activity type if typed directly
    if (category === 'non_class' && !db.nonClassTypes.includes(trimmedNonClass)) {
      onUpdateNonClassTypes([...db.nonClassTypes, trimmedNonClass]);
    }

    const payload: JournalEntry = {
      id: editingId || `jrn_${Date.now()}`,
      date: selectedDate,
      category,
      classId: category === 'in_class' ? classId : undefined,
      className: category === 'in_class' ? cls?.name || 'Kelas' : undefined,
      subject: category === 'in_class' ? subject.trim() || 'Mata Pelajaran' : undefined,
      material: category === 'in_class' ? material.trim() : undefined,
      nonClassType: category === 'non_class' ? trimmedNonClass : undefined,
      location: category === 'non_class' ? location.trim() : undefined,
      startTime,
      endTime,
      activity: activity.trim(),
      notes: notes.trim(),
      reminderEnabled,
      reminderDate: reminderEnabled ? reminderDate : undefined,
      reminderTime: reminderEnabled ? reminderTime : undefined,
      createdAt: editingId
        ? db.journals.find((j) => j.id === editingId)?.createdAt || nowIso
        : nowIso,
      updatedAt: nowIso,
    };

    if (editingId) {
      onUpdateJournals(db.journals.map((j) => (j.id === editingId ? payload : j)));
    } else {
      onUpdateJournals([...db.journals, payload]);
    }
    setModalOpen(false);
  };

  const handleDeleteEntry = (id: string) => {
    onUpdateJournals(db.journals.filter((j) => j.id !== id));
  };

  // CRUD for Non-Class Activity Types
  const handleAddType = () => {
    const clean = newTypeInput.trim();
    if (!clean || db.nonClassTypes.includes(clean)) return;
    onUpdateNonClassTypes([...db.nonClassTypes, clean]);
    setNewTypeInput('');
  };

  const handleSaveEditType = (idx: number) => {
    const clean = editingTypeValue.trim();
    if (!clean) return;
    const oldVal = db.nonClassTypes[idx];
    const updatedTypes = db.nonClassTypes.map((t, i) => (i === idx ? clean : t));
    onUpdateNonClassTypes(updatedTypes);
    // Sync existing journals using old type label
    if (oldVal && oldVal !== clean) {
      onUpdateJournals(
        db.journals.map((j) =>
          j.category === 'non_class' && j.nonClassType === oldVal ? { ...j, nonClassType: clean } : j
        )
      );
    }
    setEditingTypeIndex(null);
    setEditingTypeValue('');
  };

  const handleDeleteType = (idx: number) => {
    if (db.nonClassTypes.length <= 1) return;
    onUpdateNonClassTypes(db.nonClassTypes.filter((_, i) => i !== idx));
  };

  const handleExport = (format: 'pdf' | 'excel') => {
    exportJournalsOfficial({
      format,
      categoryFilter: filterCategory,
      branding: db.branding,
      profile: db.profile,
      journals: db.journals,
    });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Jurnal Mengajar</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Catat kegiatan mengajar Di Kelas maupun kegiatan guru Non Kelas
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportButtons
            compact
            onExportPDF={() => handleExport('pdf')}
            onExportExcel={() => handleExport('excel')}
          />
        </div>
      </div>

      {/* Mode Filter & Non-Class Category Manager */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white border border-slate-200/90 w-fit">
          {[
            { id: 'all' as const, label: 'Semua Jurnal' },
            { id: 'in_class' as const, label: 'Di Kelas' },
            { id: 'non_class' as const, label: 'Non Kelas' },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilterCategory(f.id)}
              className={`min-h-[38px] px-3.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                filterCategory === f.id
                  ? 'bg-emerald-800 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setTypesModalOpen(true)}
            className="min-h-[40px] px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <Settings2 className="w-4 h-4 text-amber-700" />
            Kelola Jenis Non Kelas
          </button>
          <button
            type="button"
            onClick={() => openNewEntry(filterCategory === 'non_class' ? 'non_class' : 'in_class')}
            className="min-h-[40px] px-4 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Tulis Jurnal
          </button>
        </div>
      </div>

      {/* Main Split: Calendar (Left) + Daily Journal Entries (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Monthly Calendar Card */}
        <div className="lg:col-span-5 rounded-2xl bg-white border border-slate-200/90 p-5 h-fit">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="w-10 h-10 rounded-xl border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600"
              aria-label="Bulan sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="text-sm font-bold text-slate-900">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </h2>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="w-10 h-10 rounded-xl border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600"
              aria-label="Bulan berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {WEEKDAY_LABELS.map((w) => (
              <span key={w} className="text-[11px] font-semibold text-slate-400 py-1">
                {w}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((cell, idx) => {
              if (!cell.iso || !cell.day) {
                return <div key={`empty_${idx}`} className="h-11" />;
              }
              const isSelected = cell.iso === selectedDate;
              const isToday = cell.iso === todayISO;
              const marks = journalsByDate.get(cell.iso);
              return (
                <button
                  key={cell.iso}
                  type="button"
                  onClick={() => setSelectedDate(cell.iso!)}
                  className={`h-11 rounded-xl flex flex-col items-center justify-center relative transition-colors font-mono text-xs tabular-nums ${
                    isSelected
                      ? 'bg-emerald-800 text-white font-bold'
                      : isToday
                        ? 'bg-emerald-50 text-emerald-900 font-bold border border-emerald-200'
                        : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>{cell.day}</span>
                  {marks && (
                    <span className="flex items-center gap-0.5 mt-0.5">
                      {marks.inClass > 0 && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isSelected ? 'bg-emerald-200' : 'bg-emerald-600'
                          }`}
                        />
                      )}
                      {marks.nonClass > 0 && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isSelected ? 'bg-amber-300' : 'bg-amber-500'
                          }`}
                        />
                      )}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              Di Kelas
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Non Kelas
            </span>
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                setViewYear(now.getFullYear());
                setViewMonth(now.getMonth());
                setSelectedDate(todayISO);
              }}
              className="font-semibold text-emerald-800 hover:underline"
            >
              Hari Ini
            </button>
          </div>
        </div>

        {/* Selected Date Entries */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {formatIndonesianDate(selectedDate)}
              </h2>
              <p className="text-xs text-slate-500 tabular-nums">
                {selectedDateJournals.length} catatan jurnal
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openNewEntry('in_class')}
                className="min-h-[38px] px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <BookOpen className="w-3.5 h-3.5" />+ Di Kelas
              </button>
              <button
                type="button"
                onClick={() => openNewEntry('non_class')}
                className="min-h-[38px] px-3 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Briefcase className="w-3.5 h-3.5" />+ Non Kelas
              </button>
            </div>
          </div>

          {selectedDateJournals.length === 0 ? (
            <div className="rounded-2xl bg-white border border-slate-200/90 p-8 text-center">
              <p className="text-sm font-semibold text-slate-700">
                Belum ada jurnal pada {formatIndonesianDate(selectedDate)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Pilih <strong>+ Di Kelas</strong> untuk catatan mengajar atau <strong>+ Non Kelas</strong> untuk kegiatan guru di luar kelas.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedDateJournals.map((entry) => {
                const isInClass = entry.category === 'in_class';
                return (
                  <article
                    key={entry.id}
                    className="rounded-2xl bg-white border border-slate-200/90 p-5 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 tabular-nums">
                          <span className={isInClass ? 'text-emerald-800' : 'text-amber-700'}>
                            {isInClass ? 'Di Kelas' : 'Non Kelas'}
                          </span>
                          {' · '}
                          {entry.startTime}–{entry.endTime}
                          {entry.reminderEnabled && entry.reminderTime
                            ? ` · Pengingat ${entry.reminderTime}`
                            : ''}
                        </p>
                        <h3 className="text-base font-bold text-slate-900 mt-0.5">
                          {isInClass
                            ? `${entry.className} · ${entry.subject}`
                            : entry.nonClassType}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditEntry(entry)}
                          className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-500"
                          aria-label="Edit jurnal"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="w-9 h-9 rounded-xl hover:bg-rose-50 hover:text-rose-700 flex items-center justify-center text-slate-400"
                          aria-label="Hapus jurnal"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="font-semibold text-slate-500">
                          {isInClass ? 'Materi Pokok' : 'Lokasi / Unit'}
                        </p>
                        <p className="text-slate-900 mt-1 leading-relaxed">
                          {isInClass ? entry.material || '-' : entry.location || '-'}
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="font-semibold text-slate-500">Kegiatan</p>
                        <p className="text-slate-900 mt-1 leading-relaxed">
                          {entry.activity || '-'}
                        </p>
                      </div>
                    </div>

                    {entry.notes && (
                      <p className="text-xs text-slate-600 leading-relaxed pt-1 border-t border-slate-100">
                        <strong className="text-slate-700">Catatan:</strong> {entry.notes}
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Journal Modal with 2 Modes: Di Kelas vs Non Kelas */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4 overflow-y-auto">
          <form
            onSubmit={handleSaveEntry}
            className="w-full max-w-lg rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden my-auto"
          >
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingId ? 'Edit Catatan Jurnal' : 'Tulis Jurnal Baru'}
                </h3>
                <p className="text-xs text-slate-500">{formatIndonesianDate(selectedDate)}</p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[72vh] overflow-y-auto">
              {/* Dual Category Switcher */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Pilihan Kategori Jurnal
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100">
                  <button
                    type="button"
                    onClick={() => setCategory('in_class')}
                    className={`min-h-[42px] rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors ${
                      category === 'in_class'
                        ? 'bg-emerald-800 text-white shadow-xs'
                        : 'text-slate-600'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    Di Kelas (Mengajar)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategory('non_class')}
                    className={`min-h-[42px] rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors ${
                      category === 'non_class'
                        ? 'bg-amber-700 text-white shadow-xs'
                        : 'text-slate-600'
                    }`}
                  >
                    <Briefcase className="w-4 h-4" />
                    Non Kelas (Selain Mengajar)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Jam Mulai
                  </label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full min-h-[42px] rounded-xl border border-slate-200 px-3 text-sm font-mono focus:border-emerald-700 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Jam Selesai
                  </label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full min-h-[42px] rounded-xl border border-slate-200 px-3 text-sm font-mono focus:border-emerald-700 focus:outline-none"
                  />
                </div>
              </div>

              {category === 'in_class' ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">
                        Kelas
                      </label>
                      <select
                        value={classId}
                        onChange={(e) => setClassId(e.target.value)}
                        className="w-full min-h-[44px] rounded-xl border border-slate-200 px-3 text-sm bg-white focus:border-emerald-700 focus:outline-none"
                      >
                        {db.classes.map((cls) => (
                          <option key={cls.id} value={cls.id}>
                            {cls.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">
                        Mata Pelajaran
                      </label>
                      <input
                        type="text"
                        required
                        list="subject-suggestions"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Nama mata pelajaran"
                        className="w-full min-h-[44px] rounded-xl border border-slate-200 px-3 text-sm focus:border-emerald-700 focus:outline-none"
                      />
                      <datalist id="subject-suggestions">
                        {DEFAULT_SUBJECTS.map((s) => (
                          <option key={s} value={s} />
                        ))}
                      </datalist>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      Materi Pembelajaran
                    </label>
                    <input
                      type="text"
                      required
                      value={material}
                      onChange={(e) => setMaterial(e.target.value)}
                      placeholder="Contoh: Makna Sila Pertama / Hukum Tajwid Mad"
                      className="w-full min-h-[44px] rounded-xl border border-slate-200 px-3.5 text-sm focus:border-emerald-700 focus:outline-none"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium text-slate-600">
                        Jenis Kegiatan Non Kelas (bisa pilih atau ketik baru)
                      </label>
                      <button
                        type="button"
                        onClick={() => setTypesModalOpen(true)}
                        className="text-[11px] font-semibold text-amber-800 hover:underline"
                      >
                        Edit / Hapus Daftar
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      value={nonClassType}
                      onChange={(e) => setNonClassType(e.target.value)}
                      placeholder="Ketik kegiatan guru selain mengajar..."
                      className="w-full min-h-[44px] rounded-xl border border-slate-200 px-3.5 text-sm focus:border-amber-700 focus:outline-none"
                    />
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {db.nonClassTypes.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setNonClassType(t)}
                          className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${
                            nonClassType === t
                              ? 'border-amber-700 bg-amber-50 text-amber-950 font-semibold'
                              : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      Lokasi / Bagian Terkait
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Contoh: Ruang Guru, Masjid, Asrama Putra"
                      className="w-full min-h-[44px] rounded-xl border border-slate-200 px-3.5 text-sm focus:border-amber-700 focus:outline-none"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  {category === 'in_class' ? 'Kegiatan Pembelajaran' : 'Uraian Kegiatan Non Kelas'}
                </label>
                <textarea
                  rows={3}
                  required
                  value={activity}
                  onChange={(e) => setActivity(e.target.value)}
                  placeholder={
                    category === 'in_class'
                      ? 'Contoh: Tanya jawab, praktik kelompok, dan evaluasi tugas.'
                      : 'Contoh: Mendampingi kegiatan shalat dhuha, evaluasi kedisiplinan asrama, atau penyusunan soal ujian.'
                  }
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-emerald-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Catatan / Tindak Lanjut (opsional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Catatan khusus untuk pertemuan atau kegiatan berikutnya"
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-emerald-700 focus:outline-none"
                />
              </div>

              {/* Reminder Toggle */}
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3.5 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-amber-700" />
                    <span className="text-xs font-semibold text-slate-800">
                      Aktifkan Pengingat Pertemuan Berikutnya
                    </span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={reminderEnabled}
                    onClick={() => setReminderEnabled((v) => !v)}
                    className={`w-11 h-6 rounded-full p-0.5 transition-colors ${
                      reminderEnabled ? 'bg-emerald-700' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                        reminderEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {reminderEnabled && (
                  <div className="grid grid-cols-2 gap-2.5">
                    <input
                      type="date"
                      value={reminderDate}
                      onChange={(e) => setReminderDate(e.target.value)}
                      className="min-h-[40px] rounded-xl border border-slate-200 bg-white px-3 text-xs"
                    />
                    <input
                      type="time"
                      value={reminderTime}
                      onChange={(e) => setReminderTime(e.target.value)}
                      className="min-h-[40px] rounded-xl border border-slate-200 bg-white px-3 text-xs font-mono"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="min-h-[44px] px-4 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700"
              >
                Batal
              </button>
              <button
                type="submit"
                className="min-h-[44px] px-6 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-sm font-semibold"
              >
                Simpan Jurnal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Manage Customizable Non-Class Activity Types Modal */}
      {typesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Kelola Jenis Kegiatan Non Kelas
                </h3>
                <p className="text-xs text-slate-500">
                  Tambah, ubah, atau hapus pilihan kegiatan guru selain mengajar
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTypesModalOpen(false)}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTypeInput}
                  onChange={(e) => setNewTypeInput(e.target.value)}
                  placeholder="Contoh: Bimbingan Tahfidz Pagi"
                  className="flex-1 min-h-[42px] rounded-xl border border-slate-200 px-3 text-sm focus:border-emerald-700 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddType}
                  className="min-h-[42px] px-4 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold whitespace-nowrap"
                >
                  Tambah
                </button>
              </div>

              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 rounded-2xl border border-slate-200">
                {db.nonClassTypes.map((typeItem, idx) => (
                  <div key={`${typeItem}_${idx}`} className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                    {editingTypeIndex === idx ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="text"
                          value={editingTypeValue}
                          onChange={(e) => setEditingTypeValue(e.target.value)}
                          className="flex-1 min-h-[36px] rounded-lg border border-emerald-600 px-2.5 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEditType(idx)}
                          className="min-h-[36px] px-3 rounded-lg bg-emerald-800 text-white text-xs font-semibold"
                        >
                          Simpan
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-xs font-medium text-slate-800 truncate">{typeItem}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTypeIndex(idx);
                              setEditingTypeValue(typeItem);
                            }}
                            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"
                            aria-label={`Edit ${typeItem}`}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={db.nonClassTypes.length <= 1}
                            onClick={() => handleDeleteType(idx)}
                            className="w-8 h-8 rounded-lg hover:bg-rose-50 hover:text-rose-700 disabled:opacity-30 flex items-center justify-center text-slate-400"
                            aria-label={`Hapus ${typeItem}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
