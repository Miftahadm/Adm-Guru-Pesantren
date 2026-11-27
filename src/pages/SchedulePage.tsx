import React, { useState } from 'react';
import { Bell, Copy, Edit3, Plus, Trash2, Volume2, X } from 'lucide-react';
import { AppDatabase, DayOfWeek, ScheduleItem, ScheduleType } from '../types';
import { DAY_NAMES, DEFAULT_SUBJECTS, getTodayDayOfWeek, SHORT_DAY_NAMES } from '../data/defaultData';
import { buildAlarmSpeechText, playAlarmChime, speakIndonesian } from '../utils/audioAlarm';
import { exportScheduleOfficial } from '../utils/exportOfficial';
import { ExportButtons } from '../components/ExportButtons';

interface SchedulePageProps {
  db: AppDatabase;
  onUpdateSchedules: (next: ScheduleItem[]) => void;
  onTriggerAlarmPreview: (schedule: ScheduleItem) => void;
}

const DAYS: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 7];

export const SchedulePage: React.FC<SchedulePageProps> = ({
  db,
  onUpdateSchedules,
  onTriggerAlarmPreview,
}) => {
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(() => getTodayDayOfWeek());
  const [modalOpen, setModalOpen] = useState(false);
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [type, setType] = useState<ScheduleType>('mengajar');
  const [startTime, setStartTime] = useState('07:30');
  const [endTime, setEndTime] = useState('08:50');
  const [classId, setClassId] = useState(db.classes[0]?.id || '');
  const [subject, setSubject] = useState('Matematika');
  const [alarmLeadMinutes, setAlarmLeadMinutes] = useState<0 | 5 | 10 | 15>(5);
  const [active, setActive] = useState(true);
  const [notes, setNotes] = useState('');
  const [copyTargets, setCopyTargets] = useState<DayOfWeek[]>([]);

  const daySchedules = db.schedules
    .filter((s) => s.dayOfWeek === selectedDay)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const openNewModal = () => {
    setEditingId(null);
    setType('mengajar');
    setStartTime('07:30');
    setEndTime('08:50');
    setClassId(db.classes[0]?.id || '');
    setSubject(db.classes[0]?.subjects[0] || 'Matematika');
    setAlarmLeadMinutes(5);
    setActive(true);
    setNotes('');
    setModalOpen(true);
  };

  const openEditModal = (item: ScheduleItem) => {
    setEditingId(item.id);
    setType(item.type);
    setStartTime(item.startTime);
    setEndTime(item.endTime);
    setClassId(item.classId || db.classes[0]?.id || '');
    setSubject(item.subject || '');
    setAlarmLeadMinutes(item.alarmLeadMinutes);
    setActive(item.active);
    setNotes(item.notes || '');
    setModalOpen(true);
  };

  const draftPreviewItem: ScheduleItem = {
    id: editingId || 'preview',
    dayOfWeek: selectedDay,
    type,
    startTime,
    endTime,
    classId: type === 'mengajar' ? classId : undefined,
    className:
      type === 'mengajar' ? db.classes.find((c) => c.id === classId)?.name || 'Kelas' : undefined,
    subject: type === 'mengajar' ? subject : undefined,
    alarmLeadMinutes,
    active,
    notes,
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cls = db.classes.find((c) => c.id === classId);
    const payload: ScheduleItem = {
      id: editingId || `sch_${Date.now()}`,
      dayOfWeek: selectedDay,
      type,
      startTime,
      endTime,
      classId: type === 'mengajar' ? classId : undefined,
      className: type === 'mengajar' ? cls?.name || 'Kelas' : undefined,
      subject: type === 'mengajar' ? subject.trim() || 'Mata Pelajaran' : undefined,
      alarmLeadMinutes,
      active,
      notes: notes.trim() || undefined,
    };

    if (editingId) {
      onUpdateSchedules(db.schedules.map((s) => (s.id === editingId ? payload : s)));
    } else {
      onUpdateSchedules([...db.schedules, payload]);
    }
    setModalOpen(false);
  };

  const handleToggleActive = (id: string) => {
    onUpdateSchedules(db.schedules.map((s) => (s.id === id ? { ...s, active: !s.active } : s)));
  };

  const handleDelete = (id: string) => {
    onUpdateSchedules(db.schedules.filter((s) => s.id !== id));
  };

  const handleCopySchedule = () => {
    if (copyTargets.length === 0 || daySchedules.length === 0) return;
    const preserved = db.schedules.filter((s) => !copyTargets.includes(s.dayOfWeek));
    const clones: ScheduleItem[] = [];
    copyTargets.forEach((targetDay) => {
      daySchedules.forEach((item, idx) => {
        clones.push({
          ...item,
          id: `sch_${Date.now()}_${targetDay}_${idx}`,
          dayOfWeek: targetDay,
        });
      });
    });
    onUpdateSchedules([...preserved, ...clones]);
    setCopyTargets([]);
    setCopyModalOpen(false);
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Jadwal Mengajar</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Alarm suara otomatis menyapa nama Anda sebelum jam masuk
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportButtons
            compact
            onExportPDF={() =>
              exportScheduleOfficial({
                format: 'pdf',
                branding: db.branding,
                profile: db.profile,
                schedules: db.schedules,
              })
            }
            onExportExcel={() =>
              exportScheduleOfficial({
                format: 'excel',
                branding: db.branding,
                profile: db.profile,
                schedules: db.schedules,
              })
            }
          />
          <button
            type="button"
            onClick={openNewModal}
            className="min-h-[42px] px-4 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Tambah Jadwal
          </button>
        </div>
      </div>

      {/* Horizontal Day Selector */}
      <div className="rounded-2xl bg-white border border-slate-200/90 p-2 flex items-center gap-1.5 overflow-x-auto">
        {DAYS.map((day) => {
          const count = db.schedules.filter((s) => s.dayOfWeek === day).length;
          const isSelected = selectedDay === day;
          return (
            <button
              key={day}
              type="button"
              onClick={() => setSelectedDay(day)}
              className={`flex-1 min-w-[68px] min-h-[54px] rounded-xl px-2 py-2 text-center transition-colors ${
                isSelected
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <p className={`text-[11px] font-medium ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>
                {SHORT_DAY_NAMES[day]}
              </p>
              <p className="text-xs font-bold mt-0.5 tabular-nums">{count} sesi</p>
            </button>
          );
        })}
      </div>

      {/* Day Header & Copy Action */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-slate-700">
          Hari {DAY_NAMES[selectedDay]} · {daySchedules.length} jadwal
        </h2>
        {daySchedules.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setCopyTargets([]);
              setCopyModalOpen(true);
            }}
            className="min-h-[38px] px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 inline-flex items-center gap-1.5"
          >
            <Copy className="w-3.5 h-3.5" />
            Salin jadwal {DAY_NAMES[selectedDay]} ke hari lain
          </button>
        )}
      </div>

      {/* Schedule List */}
      {daySchedules.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-200/90 p-10 text-center">
          <p className="text-sm font-semibold text-slate-700">
            Belum ada jadwal untuk hari {DAY_NAMES[selectedDay]}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Ketuk tombol Tambah Jadwal untuk memasukkan jam mengajar, istirahat, atau waktu pulang.
          </p>
          <button
            type="button"
            onClick={openNewModal}
            className="mt-4 min-h-[44px] px-5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-sm font-semibold inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Tambah Jadwal {DAY_NAMES[selectedDay]}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {daySchedules.map((item) => {
            const isBreak = item.type === 'istirahat';
            const isHome = item.type === 'pulang';
            return (
              <div
                key={item.id}
                className={`rounded-2xl border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-opacity ${
                  isBreak
                    ? 'bg-amber-50/70 border-amber-200/80'
                    : isHome
                      ? 'bg-slate-50 border-slate-200'
                      : 'bg-white border-slate-200/90'
                } ${item.active ? '' : 'opacity-60'}`}
              >
                <div className="flex items-start gap-4 min-w-0">
                  <div className="font-mono text-left shrink-0 min-w-[64px]">
                    <p className="text-base font-bold text-slate-900 tabular-nums">{item.startTime}</p>
                    <p className="text-xs text-slate-400 tabular-nums">{item.endTime}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-base font-bold text-slate-900">
                      {item.type === 'mengajar'
                        ? `${item.className} · ${item.subject}`
                        : item.type === 'istirahat'
                          ? 'Istirahat'
                          : 'Waktu Pulang'}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {item.notes ? `${item.notes} · ` : ''}
                      {item.alarmLeadMinutes === 0
                        ? 'Alarm tepat waktu'
                        : `Alarm ${item.alarmLeadMinutes} menit sebelumnya`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onTriggerAlarmPreview(item)}
                    className="min-h-[40px] px-3 rounded-xl border border-slate-200 bg-white hover:bg-emerald-50 hover:text-emerald-900 text-xs font-medium text-slate-700 inline-flex items-center gap-1.5"
                    title="Uji tampilan & suara alarm"
                  >
                    <Bell className="w-3.5 h-3.5" />
                    Uji Alarm
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditModal(item)}
                    className="w-10 h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600"
                    aria-label="Edit jadwal"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="w-10 h-10 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-700 flex items-center justify-center text-slate-500"
                    aria-label="Hapus jadwal"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={item.active}
                    onClick={() => handleToggleActive(item.id)}
                    className={`w-12 h-7 rounded-full p-0.5 transition-colors ${
                      item.active ? 'bg-emerald-700' : 'bg-slate-300'
                    }`}
                    title={item.active ? 'Nonaktifkan alarm' : 'Aktifkan alarm'}
                  >
                    <span
                      className={`block w-6 h-6 rounded-full bg-white shadow-xs transition-transform ${
                        item.active ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Schedule Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4 overflow-y-auto">
          <form
            onSubmit={handleSave}
            className="w-full max-w-lg rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden my-auto"
          >
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                {editingId ? 'Edit Jadwal' : 'Tambah Jadwal'} · {DAY_NAMES[selectedDay]}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[72vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Jenis</label>
                <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-slate-100">
                  {(['mengajar', 'istirahat', 'pulang'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={`min-h-[40px] rounded-lg text-xs font-semibold capitalize transition-colors ${
                        type === t ? 'bg-white text-emerald-900 shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Jam Mulai</label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl border border-slate-200 px-3 text-sm font-mono focus:border-emerald-700 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Jam Selesai</label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl border border-slate-200 px-3 text-sm font-mono focus:border-emerald-700 focus:outline-none"
                  />
                </div>
              </div>

              {type === 'mengajar' ? (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Kelas</label>
                    <div className="flex flex-wrap gap-2">
                      {db.classes.map((cls) => (
                        <button
                          key={cls.id}
                          type="button"
                          onClick={() => setClassId(cls.id)}
                          className={`min-h-[40px] px-3.5 rounded-xl border text-xs font-semibold ${
                            classId === cls.id
                              ? 'border-emerald-700 bg-emerald-800 text-white'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {cls.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      Mata Pelajaran
                    </label>
                    <input
                      type="text"
                      required
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Ketik atau pilih mata pelajaran"
                      className="w-full min-h-[44px] rounded-xl border border-slate-200 px-3.5 text-sm focus:border-emerald-700 focus:outline-none"
                    />
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {DEFAULT_SUBJECTS.slice(0, 8).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSubject(s)}
                          className={`px-2.5 py-1 rounded-lg text-xs border ${
                            subject === s
                              ? 'border-emerald-700 bg-emerald-50 text-emerald-900 font-medium'
                              : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Keterangan (opsional)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Contoh: Istirahat & Shalat Dhuha"
                    className="w-full min-h-[44px] rounded-xl border border-slate-200 px-3.5 text-sm focus:border-emerald-700 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Bunyikan Alarm
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {([0, 5, 10, 15] as const).map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setAlarmLeadMinutes(mins)}
                      className={`min-h-[42px] rounded-xl border text-xs font-semibold ${
                        alarmLeadMinutes === mins
                          ? 'border-emerald-700 bg-emerald-50 text-emerald-900'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      {mins === 0 ? 'Tepat waktu' : `${mins} menit sebelum`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3.5 space-y-2">
                <p className="text-[11px] font-semibold text-slate-500">Yang akan diucapkan alarm:</p>
                <p className="text-xs italic text-slate-800">
                  “{buildAlarmSpeechText(draftPreviewItem, db.profile)}”
                </p>
                <button
                  type="button"
                  onClick={() => {
                    playAlarmChime(db.profile.alarmVolume);
                    window.setTimeout(() => {
                      speakIndonesian(
                        buildAlarmSpeechText(draftPreviewItem, db.profile),
                        db.profile.alarmVolume,
                        db.profile.voiceRate
                      );
                    }, 500);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-950"
                >
                  <Volume2 className="w-4 h-4" />
                  Dengarkan Pratinjau Suara
                </button>
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
                Simpan Jadwal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Copy Schedule to Other Days Modal */}
      {copyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Salin Jadwal Hari {DAY_NAMES[selectedDay]}
            </h3>
            <p className="text-xs text-slate-500">
              Pilih hari tujuan. Jadwal yang sudah ada di hari tujuan akan diganti dengan jadwal hari {DAY_NAMES[selectedDay]}.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {DAYS.filter((d) => d !== selectedDay).map((d) => {
                const checked = copyTargets.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() =>
                      setCopyTargets((prev) =>
                        checked ? prev.filter((x) => x !== d) : [...prev, d]
                      )
                    }
                    className={`min-h-[42px] rounded-xl border text-xs font-semibold ${
                      checked
                        ? 'border-emerald-700 bg-emerald-800 text-white'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    {DAY_NAMES[d]}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCopyModalOpen(false)}
                className="min-h-[42px] px-4 rounded-xl border border-slate-200 text-xs font-medium text-slate-700"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={copyTargets.length === 0}
                onClick={handleCopySchedule}
                className="min-h-[42px] px-5 rounded-xl bg-emerald-800 disabled:opacity-50 text-white text-xs font-semibold"
              >
                Salin ke {copyTargets.length} Hari
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
