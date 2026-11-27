import React, { useState } from 'react';
import { BookOpen, CheckSquare, Plus, Trash2, Users, X } from 'lucide-react';
import {
  AppDatabase,
  AttendanceStatus,
  ExtracurricularProgram,
  Gender,
} from '../types';
import { formatLocalDateISO } from '../data/defaultData';
import { exportExtracurricularOfficial, formatIndonesianDate } from '../utils/exportOfficial';
import { ExportButtons } from '../components/ExportButtons';

interface ExtracurricularPageProps {
  db: AppDatabase;
  onUpdateExtracurriculars: (next: ExtracurricularProgram[]) => void;
}

export const ExtracurricularPage: React.FC<ExtracurricularPageProps> = ({
  db,
  onUpdateExtracurriculars,
}) => {
  const [selectedId, setSelectedId] = useState(db.extracurriculars[0]?.id || '');
  const [subTab, setSubTab] = useState<'attendance' | 'journal' | 'members'>('attendance');
  const [dateISO, setDateISO] = useState(() => formatLocalDateISO());

  // New program modal
  const [programModalOpen, setProgramModalOpen] = useState(false);
  const [progName, setProgName] = useState('');
  const [progType, setProgType] = useState<'Ekstrakurikuler' | 'Les' | 'Halaqah'>('Ekstrakurikuler');
  const [progSchedule, setProgSchedule] = useState('Sabtu, 15:30 - 17:00');
  const [progMentor, setProgMentor] = useState(db.profile.fullName);

  // New member inline
  const [memberName, setMemberName] = useState('');
  const [memberClass, setMemberClass] = useState(db.classes[0]?.name || 'Kelas 7A');
  const [memberGender, setMemberGender] = useState<Gender>('L');

  // New journal inline
  const [journalTopic, setJournalTopic] = useState('');
  const [journalActivity, setJournalActivity] = useState('');
  const [journalNotes, setJournalNotes] = useState('');

  const activeProg = db.extracurriculars.find((e) => e.id === selectedId) || db.extracurriculars[0];

  const updateProgram = (updated: ExtracurricularProgram) => {
    onUpdateExtracurriculars(db.extracurriculars.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handleCreateProgram = (e: React.FormEvent) => {
    e.preventDefault();
    if (!progName.trim()) return;
    const created: ExtracurricularProgram = {
      id: `eks_${Date.now()}`,
      name: progName.trim(),
      type: progType,
      scheduleText: progSchedule.trim(),
      mentorName: progMentor.trim() || db.profile.fullName,
      members: [],
      attendance: [],
      journals: [],
    };
    onUpdateExtracurriculars([...db.extracurriculars, created]);
    setSelectedId(created.id);
    setProgName('');
    setProgramModalOpen(false);
  };

  const handleDeleteProgram = (id: string) => {
    const remaining = db.extracurriculars.filter((p) => p.id !== id);
    onUpdateExtracurriculars(remaining);
    if (selectedId === id) {
      setSelectedId(remaining[0]?.id || '');
    }
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProg || !memberName.trim()) return;
    updateProgram({
      ...activeProg,
      members: [
        ...activeProg.members,
        {
          id: `em_${Date.now()}`,
          name: memberName.trim(),
          className: memberClass.trim() || '-',
          gender: memberGender,
        },
      ],
    });
    setMemberName('');
  };

  const handleMarkAttendance = (memberId: string, status: AttendanceStatus) => {
    if (!activeProg) return;
    const existing = activeProg.attendance.find((a) => a.date === dateISO);
    if (existing) {
      updateProgram({
        ...activeProg,
        attendance: activeProg.attendance.map((a) =>
          a.date === dateISO ? { ...a, entries: { ...a.entries, [memberId]: status } } : a
        ),
      });
    } else {
      updateProgram({
        ...activeProg,
        attendance: [
          ...activeProg.attendance,
          { id: `ea_${Date.now()}`, date: dateISO, entries: { [memberId]: status } },
        ],
      });
    }
  };

  const handleAddJournal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProg || !journalTopic.trim()) return;
    updateProgram({
      ...activeProg,
      journals: [
        {
          id: `ej_${Date.now()}`,
          date: dateISO,
          topic: journalTopic.trim(),
          activity: journalActivity.trim(),
          notes: journalNotes.trim(),
        },
        ...activeProg.journals,
      ],
    });
    setJournalTopic('');
    setJournalActivity('');
    setJournalNotes('');
  };

  const todayAtt = activeProg?.attendance.find((a) => a.date === dateISO)?.entries || {};

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Ekstrakurikuler &amp; Les</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Kelola absensi dan jurnal kegiatan ekstrakurikuler, les, atau halaqah santri
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeProg && (
            <ExportButtons
              compact
              onExportPDF={() =>
                exportExtracurricularOfficial({
                  format: 'pdf',
                  branding: db.branding,
                  profile: db.profile,
                  program: activeProg,
                })
              }
              onExportExcel={() =>
                exportExtracurricularOfficial({
                  format: 'excel',
                  branding: db.branding,
                  profile: db.profile,
                  program: activeProg,
                })
              }
            />
          )}
          <button
            type="button"
            onClick={() => setProgramModalOpen(true)}
            className="min-h-[42px] px-4 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Program Baru
          </button>
        </div>
      </div>

      {/* Program Selector */}
      {db.extracurriculars.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-10 text-center">
          <p className="text-sm font-semibold text-slate-700">Belum ada program ekstrakurikuler atau les</p>
          <button
            type="button"
            onClick={() => setProgramModalOpen(true)}
            className="mt-4 min-h-[42px] px-5 rounded-xl bg-emerald-800 text-white text-xs font-semibold"
          >
            Buat Program Pertama
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {db.extracurriculars.map((prog) => (
              <button
                key={prog.id}
                type="button"
                onClick={() => setSelectedId(prog.id)}
                className={`min-h-[42px] px-4 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  activeProg?.id === prog.id
                    ? 'bg-emerald-800 text-white'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {prog.name}
              </button>
            ))}
          </div>

          {activeProg && (
            <div className="space-y-4">
              {/* Program Info Bar */}
              <div className="rounded-2xl bg-white border border-slate-200/90 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-emerald-800">
                    {activeProg.type} · {activeProg.scheduleText}
                  </p>
                  <h2 className="text-base font-bold text-slate-900 mt-0.5">{activeProg.name}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pembimbing: {activeProg.mentorName} · {activeProg.members.length} anggota
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteProgram(activeProg.id)}
                  className="min-h-[38px] px-3 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-medium inline-flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Hapus Program
                </button>
              </div>

              {/* Sub-tabs */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1 p-1 rounded-xl bg-white border border-slate-200/90">
                  {[
                    { id: 'attendance' as const, label: 'Absensi', icon: CheckSquare },
                    { id: 'journal' as const, label: 'Jurnal Kegiatan', icon: BookOpen },
                    { id: 'members' as const, label: `Anggota (${activeProg.members.length})`, icon: Users },
                  ].map((t) => {
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSubTab(t.id)}
                        className={`min-h-[40px] px-3.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap ${
                          subTab === t.id ? 'bg-emerald-800 text-white' : 'text-slate-600'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {t.label}
                      </button>
                    );
                  })}
                </div>

                {subTab !== 'members' && (
                  <input
                    type="date"
                    value={dateISO}
                    onChange={(e) => setDateISO(e.target.value)}
                    className="min-h-[40px] rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium"
                  />
                )}
              </div>

              {/* Attendance Tab */}
              {subTab === 'attendance' && (
                <div className="rounded-2xl bg-white border border-slate-200/90 divide-y divide-slate-100">
                  {activeProg.members.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500">
                      Tambahkan peserta di tab Anggota terlebih dahulu.
                    </div>
                  ) : (
                    activeProg.members.map((m, idx) => (
                      <div key={m.id} className="px-4 py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {idx + 1}. {m.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {m.className} · {m.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {(['H', 'S', 'I', 'A'] as const).map((code) => (
                            <button
                              key={code}
                              type="button"
                              onClick={() => handleMarkAttendance(m.id, code)}
                              className={`w-10 h-10 rounded-xl border text-xs font-bold ${
                                todayAtt[m.id] === code
                                  ? 'bg-emerald-800 text-white border-emerald-800'
                                  : 'bg-slate-50 border-slate-200 text-slate-600'
                              }`}
                            >
                              {code}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Journal Tab */}
              {subTab === 'journal' && (
                <div className="space-y-4">
                  <form
                    onSubmit={handleAddJournal}
                    className="rounded-2xl bg-white border border-slate-200/90 p-5 space-y-3"
                  >
                    <h3 className="text-sm font-bold text-slate-900">
                      Tambah Jurnal Kegiatan ({formatIndonesianDate(dateISO)})
                    </h3>
                    <input
                      type="text"
                      required
                      value={journalTopic}
                      onChange={(e) => setJournalTopic(e.target.value)}
                      placeholder="Topik / Materi pertemuan"
                      className="w-full min-h-[42px] rounded-xl border border-slate-200 px-3.5 text-sm focus:border-emerald-700 focus:outline-none"
                    />
                    <textarea
                      rows={2}
                      required
                      value={journalActivity}
                      onChange={(e) => setJournalActivity(e.target.value)}
                      placeholder="Uraian kegiatan yang dilakukan"
                      className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-emerald-700 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={journalNotes}
                      onChange={(e) => setJournalNotes(e.target.value)}
                      placeholder="Catatan tambahan (opsional)"
                      className="w-full min-h-[42px] rounded-xl border border-slate-200 px-3.5 text-sm focus:border-emerald-700 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="min-h-[42px] px-5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold"
                    >
                      Simpan Jurnal Ekskul
                    </button>
                  </form>

                  <div className="space-y-3">
                    {activeProg.journals.map((j) => (
                      <div
                        key={j.id}
                        className="rounded-2xl bg-white border border-slate-200/90 p-4 flex items-start justify-between gap-3"
                      >
                        <div>
                          <p className="text-xs font-semibold text-emerald-800">
                            {formatIndonesianDate(j.date)}
                          </p>
                          <p className="text-sm font-bold text-slate-900 mt-0.5">{j.topic}</p>
                          <p className="text-xs text-slate-600 mt-1">{j.activity}</p>
                          {j.notes && (
                            <p className="text-xs text-slate-500 mt-1">Catatan: {j.notes}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            updateProgram({
                              ...activeProg,
                              journals: activeProg.journals.filter((x) => x.id !== j.id),
                            })
                          }
                          className="w-9 h-9 rounded-xl hover:bg-rose-50 hover:text-rose-700 flex items-center justify-center text-slate-400 shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Members Tab */}
              {subTab === 'members' && (
                <div className="space-y-4">
                  <form
                    onSubmit={handleAddMember}
                    className="rounded-2xl bg-white border border-slate-200/90 p-4 grid grid-cols-1 sm:grid-cols-4 gap-2.5"
                  >
                    <input
                      type="text"
                      required
                      value={memberName}
                      onChange={(e) => setMemberName(e.target.value)}
                      placeholder="Nama santri peserta"
                      className="sm:col-span-2 min-h-[42px] rounded-xl border border-slate-200 px-3 text-sm"
                    />
                    <input
                      type="text"
                      value={memberClass}
                      onChange={(e) => setMemberClass(e.target.value)}
                      placeholder="Kelas"
                      className="min-h-[42px] rounded-xl border border-slate-200 px-3 text-sm"
                    />
                    <div className="flex gap-2">
                      <select
                        value={memberGender}
                        onChange={(e) => setMemberGender(e.target.value as Gender)}
                        className="min-h-[42px] rounded-xl border border-slate-200 px-2.5 text-sm bg-white"
                      >
                        <option value="L">L</option>
                        <option value="P">P</option>
                      </select>
                      <button
                        type="submit"
                        className="flex-1 min-h-[42px] rounded-xl bg-emerald-800 text-white text-xs font-semibold"
                      >
                        Tambah
                      </button>
                    </div>
                  </form>

                  <div className="rounded-2xl bg-white border border-slate-200/90 divide-y divide-slate-100">
                    {activeProg.members.map((m, idx) => (
                      <div key={m.id} className="px-4 py-3 flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {idx + 1}. {m.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {m.className} · {m.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            updateProgram({
                              ...activeProg,
                              members: activeProg.members.filter((x) => x.id !== m.id),
                            })
                          }
                          className="w-9 h-9 rounded-xl hover:bg-rose-50 hover:text-rose-700 flex items-center justify-center text-slate-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* New Program Modal */}
      {programModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4">
          <form
            onSubmit={handleCreateProgram}
            className="w-full max-w-md rounded-3xl bg-white border border-slate-200 p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Tambah Program Baru</h3>
              <button
                type="button"
                onClick={() => setProgramModalOpen(false)}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Nama Program</label>
              <input
                type="text"
                required
                value={progName}
                onChange={(e) => setProgName(e.target.value)}
                placeholder="Contoh: Pramuka / Tahfidz Intensif / Les Olimpiade"
                className="w-full min-h-[44px] rounded-xl border border-slate-200 px-3.5 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Kategori</label>
              <div className="grid grid-cols-3 gap-2">
                {(['Ekstrakurikuler', 'Les', 'Halaqah'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setProgType(t)}
                    className={`min-h-[40px] rounded-xl border text-xs font-semibold ${
                      progType === t
                        ? 'border-emerald-700 bg-emerald-50 text-emerald-900'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Jadwal Rutin</label>
              <input
                type="text"
                value={progSchedule}
                onChange={(e) => setProgSchedule(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-slate-200 px-3.5 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Pembimbing</label>
              <input
                type="text"
                value={progMentor}
                onChange={(e) => setProgMentor(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-slate-200 px-3.5 text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setProgramModalOpen(false)}
                className="min-h-[42px] px-4 rounded-xl border border-slate-200 text-xs font-medium"
              >
                Batal
              </button>
              <button
                type="submit"
                className="min-h-[42px] px-5 rounded-xl bg-emerald-800 text-white text-xs font-semibold"
              >
                Simpan Program
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
