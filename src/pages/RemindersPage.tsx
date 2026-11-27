import React, { useState } from 'react';
import { Bell, Edit3, Plus, Trash2, X } from 'lucide-react';
import { AppDatabase, DayOfWeek, ReminderFrequency, ReminderNote } from '../types';
import { DAY_NAMES, formatLocalDateISO } from '../data/defaultData';
import { exportRemindersOfficial, formatIndonesianDate } from '../utils/exportOfficial';
import { ExportButtons } from '../components/ExportButtons';

interface RemindersPageProps {
  db: AppDatabase;
  onUpdateReminders: (next: ReminderNote[]) => void;
}

export const RemindersPage: React.FC<RemindersPageProps> = ({ db, onUpdateReminders }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<ReminderFrequency>('once');
  const [date, setDate] = useState(() => formatLocalDateISO());
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>(5);
  const [time, setTime] = useState('14:00');

  const openNew = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setFrequency('once');
    setDate(formatLocalDateISO());
    setDayOfWeek(5);
    setTime('14:00');
    setModalOpen(true);
  };

  const openEdit = (note: ReminderNote) => {
    setEditingId(note.id);
    setTitle(note.title);
    setDescription(note.description);
    setFrequency(note.frequency);
    setDate(note.date || formatLocalDateISO());
    setDayOfWeek(note.dayOfWeek || 5);
    setTime(note.time);
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const payload: ReminderNote = {
      id: editingId || `rem_${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      frequency,
      date: frequency === 'once' ? date : undefined,
      dayOfWeek: frequency === 'weekly' ? dayOfWeek : undefined,
      time,
      active: editingId ? db.reminders.find((r) => r.id === editingId)?.active ?? true : true,
      createdAt: new Date().toISOString(),
    };
    if (editingId) {
      onUpdateReminders(db.reminders.map((r) => (r.id === editingId ? payload : r)));
    } else {
      onUpdateReminders([payload, ...db.reminders]);
    }
    setModalOpen(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Catatan &amp; Pengingat</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Pengingat sekali, harian, atau mingguan untuk tugas administrasi guru
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ExportButtons
            compact
            onExportPDF={() =>
              exportRemindersOfficial({
                format: 'pdf',
                branding: db.branding,
                profile: db.profile,
                reminders: db.reminders,
              })
            }
            onExportExcel={() =>
              exportRemindersOfficial({
                format: 'excel',
                branding: db.branding,
                profile: db.profile,
                reminders: db.reminders,
              })
            }
          />
          <button
            type="button"
            onClick={openNew}
            className="min-h-[42px] px-4 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Catatan Baru
          </button>
        </div>
      </div>

      {db.reminders.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-10 text-center">
          <p className="text-sm font-semibold text-slate-700">Belum ada catatan pengingat</p>
        </div>
      ) : (
        <div className="space-y-3">
          {db.reminders.map((note) => {
            const scheduleLabel =
              note.frequency === 'once'
                ? `Sekali · ${formatIndonesianDate(note.date || '')}, ${note.time}`
                : note.frequency === 'weekly'
                  ? `Setiap minggu · ${DAY_NAMES[note.dayOfWeek || 1]}, ${note.time}`
                  : `Setiap hari · ${note.time}`;

            return (
              <div
                key={note.id}
                className={`rounded-2xl bg-white border border-slate-200/90 p-4 sm:p-5 flex items-start justify-between gap-4 ${
                  note.active ? '' : 'opacity-60'
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">{note.title}</h3>
                    {note.description && (
                      <p className="text-xs text-slate-600 mt-0.5">{note.description}</p>
                    )}
                    <p className="text-xs font-medium text-emerald-800 mt-1.5 tabular-nums">
                      {scheduleLabel}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEdit(note)}
                    className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-500"
                    aria-label="Edit catatan"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateReminders(db.reminders.filter((r) => r.id !== note.id))}
                    className="w-9 h-9 rounded-xl hover:bg-rose-50 hover:text-rose-700 flex items-center justify-center text-slate-400"
                    aria-label="Hapus catatan"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={note.active}
                    onClick={() =>
                      onUpdateReminders(
                        db.reminders.map((r) => (r.id === note.id ? { ...r, active: !r.active } : r))
                      )
                    }
                    className={`w-11 h-6 rounded-full p-0.5 transition-colors ${
                      note.active ? 'bg-emerald-700' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                        note.active ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4">
          <form
            onSubmit={handleSave}
            className="w-full max-w-md rounded-3xl bg-white border border-slate-200 p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                {editingId ? 'Edit Catatan' : 'Tambah Catatan & Pengingat'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Judul</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Kumpulkan Modul Ajar"
                className="w-full min-h-[44px] rounded-xl border border-slate-200 px-3.5 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Keterangan</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Rincian tugas atau agenda"
                className="w-full rounded-xl border border-slate-200 p-3 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Frekuensi</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'once' as const, label: 'Sekali' },
                  { id: 'daily' as const, label: 'Harian' },
                  { id: 'weekly' as const, label: 'Mingguan' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFrequency(f.id)}
                    className={`min-h-[40px] rounded-xl border text-xs font-semibold ${
                      frequency === f.id
                        ? 'border-emerald-700 bg-emerald-50 text-emerald-900'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {frequency === 'once' && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Tanggal</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full min-h-[42px] rounded-xl border border-slate-200 px-3 text-xs"
                  />
                </div>
              )}
              {frequency === 'weekly' && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Hari</label>
                  <select
                    value={dayOfWeek}
                    onChange={(e) => setDayOfWeek(Number(e.target.value) as DayOfWeek)}
                    className="w-full min-h-[42px] rounded-xl border border-slate-200 px-3 text-xs bg-white"
                  >
                    {([1, 2, 3, 4, 5, 6, 7] as DayOfWeek[]).map((d) => (
                      <option key={d} value={d}>
                        {DAY_NAMES[d]}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className={frequency === 'daily' ? 'col-span-2' : ''}>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Jam</label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full min-h-[42px] rounded-xl border border-slate-200 px-3 text-sm font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="min-h-[42px] px-4 rounded-xl border border-slate-200 text-xs font-medium"
              >
                Batal
              </button>
              <button
                type="submit"
                className="min-h-[42px] px-5 rounded-xl bg-emerald-800 text-white text-xs font-semibold"
              >
                Simpan
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
