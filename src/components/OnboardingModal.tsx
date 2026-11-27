import React, { useState } from 'react';
import { Bell, Check, Plus, ShieldCheck, Volume2, X } from 'lucide-react';
import { ClassRoom, Gender, TeacherProfile } from '../types';
import { DEFAULT_SUBJECTS } from '../data/defaultData';
import { playAlarmChime, requestNotificationPermission, speakIndonesian } from '../utils/audioAlarm';

interface OnboardingModalProps {
  open: boolean;
  profile: TeacherProfile;
  classes: ClassRoom[];
  onClose: () => void;
  onSave: (profile: TeacherProfile, classes: ClassRoom[]) => void;
}

const LEVELS = [
  'PAUD',
  'TK A',
  'TK B',
  'Kelas 1',
  'Kelas 2',
  'Kelas 3',
  'Kelas 4',
  'Kelas 5',
  'Kelas 6',
  'Kelas 7',
  'Kelas 8',
  'Kelas 9',
  'Kelas 10',
  'Kelas 11',
  'Kelas 12',
];

const ROMBELS = ['Tanpa rombel', 'A', 'B', 'C', 'D', 'E', 'F'];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  open,
  profile,
  classes,
  onClose,
  onSave,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fullName, setFullName] = useState(profile.fullName);
  const [nickName, setNickName] = useState(profile.nickName);
  const [gender, setGender] = useState<Gender>(profile.gender);
  const [nipNiy, setNipNiy] = useState(profile.nipNiy);
  const [schoolName, setSchoolName] = useState(profile.schoolName);
  const [academicYear, setAcademicYear] = useState(profile.academicYear);
  const [semester, setSemester] = useState<'Ganjil' | 'Genap'>(profile.semester);

  const [classList, setClassList] = useState<ClassRoom[]>(classes);
  const [selectedLevel, setSelectedLevel] = useState<string>('Kelas 7');
  const [customRombel, setCustomRombel] = useState('');
  const [notifStatus, setNotifStatus] = useState<'default' | 'granted' | 'denied'>(
    typeof Notification !== 'undefined' ? Notification.permission : profile.notificationPermission
  );

  if (!open) return null;

  const hasClass = (level: string, rombel: string) => {
    const cleanRombel = rombel === 'Tanpa rombel' ? '' : rombel;
    return classList.some((c) => c.level === level && c.rombel === cleanRombel);
  };

  const toggleClass = (level: string, rombel: string) => {
    const cleanRombel = rombel === 'Tanpa rombel' ? '' : rombel;
    const exists = classList.find((c) => c.level === level && c.rombel === cleanRombel);
    if (exists) {
      if (classList.length <= 1) return; // keep at least 1 class
      setClassList((prev) => prev.filter((c) => c.id !== exists.id));
    } else {
      const displayName = cleanRombel ? `${level}${cleanRombel.length === 1 ? '' : ' '}${cleanRombel}` : level;
      setClassList((prev) => [
        ...prev,
        {
          id: `cls_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          level,
          rombel: cleanRombel,
          name: displayName,
          subjects: DEFAULT_SUBJECTS.slice(0, 4),
        },
      ]);
    }
  };

  const handleAddCustomRombel = () => {
    const trimmed = customRombel.trim();
    if (!trimmed) return;
    if (!hasClass(selectedLevel, trimmed)) {
      toggleClass(selectedLevel, trimmed);
    }
    setCustomRombel('');
  };

  const handleEnableNotification = async () => {
    const res = await requestNotificationPermission();
    setNotifStatus(res);
  };

  const handleTestVoice = () => {
    playAlarmChime(0.9);
    window.setTimeout(() => {
      speakIndonesian(
        `${nickName || fullName || 'Ustadz'}, lima menit lagi waktunya mengajar ${
          classList[0]?.name || 'Kelas 7A'
        }.`,
        0.9,
        1.0
      );
    }, 550);
  };

  const handleFinish = () => {
    const updatedProfile: TeacherProfile = {
      ...profile,
      fullName: fullName.trim() || profile.fullName,
      nickName: nickName.trim() || fullName.trim() || profile.nickName,
      gender,
      nipNiy: nipNiy.trim(),
      schoolName: schoolName.trim() || 'Pesantren Trubus Iman',
      academicYear: academicYear.trim() || '2026/2027',
      semester,
      onboardingCompleted: true,
      notificationPermission: notifStatus,
    };
    onSave(updatedProfile, classList);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-xl rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden my-auto">
        <div className="flex items-center justify-between px-6 py-4 bg-emerald-900 text-white">
          <div>
            <p className="text-xs text-emerald-200">
              Langkah {step} dari 3
            </p>
            <h2 className="text-lg font-semibold">
              {step === 1
                ? 'Biodata Guru & Lembaga'
                : step === 2
                  ? 'Pilih Kelas & Rombel Diampu'
                  : 'Pengaturan Alarm & Suara Pengingat'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-emerald-100 hover:bg-white/10"
            aria-label="Tutup pengaturan"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 max-h-[72vh] overflow-y-auto space-y-5">
          {step === 1 && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Nama Lengkap Guru (termasuk gelar)
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Contoh: Ustadzah Sari Wulandari, S.Pd."
                  className="w-full min-h-[44px] rounded-xl border border-slate-200 px-3.5 text-sm focus:border-emerald-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Nama Panggilan (untuk sapaan & suara alarm)
                </label>
                <input
                  type="text"
                  value={nickName}
                  onChange={(e) => setNickName(e.target.value)}
                  placeholder="Contoh: Bu Sari / Ustadz Ahmad"
                  className="w-full min-h-[44px] rounded-xl border border-slate-200 px-3.5 text-sm focus:border-emerald-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Jenis Kelamin
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setGender('L')}
                    className={`min-h-[44px] rounded-xl border text-sm font-medium transition-colors ${
                      gender === 'L'
                        ? 'border-emerald-700 bg-emerald-50 text-emerald-900'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Laki-laki
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender('P')}
                    className={`min-h-[44px] rounded-xl border text-sm font-medium transition-colors ${
                      gender === 'P'
                        ? 'border-emerald-700 bg-emerald-50 text-emerald-900'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Perempuan
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    NIP / NIY (opsional untuk tanda tangan)
                  </label>
                  <input
                    type="text"
                    value={nipNiy}
                    onChange={(e) => setNipNiy(e.target.value)}
                    placeholder="NIY. 2011.04.018"
                    className="w-full min-h-[44px] rounded-xl border border-slate-200 px-3.5 text-sm focus:border-emerald-700 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Nama Sekolah / Unit
                  </label>
                  <input
                    type="text"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder="Pesantren Trubus Iman"
                    className="w-full min-h-[44px] rounded-xl border border-slate-200 px-3.5 text-sm focus:border-emerald-700 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Tahun Pelajaran
                  </label>
                  <input
                    type="text"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    placeholder="2026/2027"
                    className="w-full min-h-[44px] rounded-xl border border-slate-200 px-3.5 text-sm font-mono focus:border-emerald-700 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Semester Aktif
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['Ganjil', 'Genap'] as const).map((sem) => (
                      <button
                        key={sem}
                        type="button"
                        onClick={() => setSemester(sem)}
                        className={`min-h-[44px] rounded-xl border text-sm font-medium ${
                          semester === sem
                            ? 'border-emerald-700 bg-emerald-50 text-emerald-900'
                            : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        {sem}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <p className="text-xs font-medium text-slate-600 mb-2">
                  Pilih Jenjang / Tingkat Kelas (PAUD s.d. Kelas 12)
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {LEVELS.map((lvl) => {
                    const countInLevel = classList.filter((c) => c.level === lvl).length;
                    const active = selectedLevel === lvl;
                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setSelectedLevel(lvl)}
                        className={`min-h-[42px] rounded-xl border px-2 text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                          active
                            ? 'border-emerald-700 bg-emerald-800 text-white'
                            : countInLevel > 0
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {countInLevel > 0 && <Check className="w-3.5 h-3.5 shrink-0" />}
                        <span className="truncate">{lvl}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-3">
                <p className="text-xs font-semibold text-slate-700">
                  Rombel untuk {selectedLevel}
                </p>
                <div className="flex flex-wrap gap-2">
                  {ROMBELS.map((r) => {
                    const checked = hasClass(selectedLevel, r);
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => toggleClass(selectedLevel, r)}
                        className={`min-h-[40px] px-3.5 rounded-xl border text-xs font-medium transition-colors flex items-center gap-1.5 ${
                          checked
                            ? 'border-emerald-700 bg-emerald-700 text-white'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {checked && <Check className="w-3.5 h-3.5" />}
                        <span>{r}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={customRombel}
                    onChange={(e) => setCustomRombel(e.target.value)}
                    placeholder="Rombel lain (mis. IPA 1, Putra, Putri)"
                    className="flex-1 min-h-[42px] rounded-xl border border-slate-200 bg-white px-3 text-sm focus:border-emerald-700 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomRombel}
                    className="min-h-[42px] px-4 rounded-xl bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    Tambah
                  </button>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-600 mb-2">
                  Kelas Dipilih ({classList.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {classList.map((cls) => (
                    <span
                      key={cls.id}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-900"
                    >
                      {cls.name}
                      {classList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setClassList((prev) => prev.filter((c) => c.id !== cls.id))}
                          className="text-emerald-700 hover:text-rose-700"
                          aria-label={`Hapus ${cls.name}`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 p-4 flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">Notifikasi Jadwal</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Supaya pengingat kelas muncul tepat pada menitnya.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleEnableNotification}
                  className={`min-h-[40px] px-3.5 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 ${
                    notifStatus === 'granted'
                      ? 'bg-emerald-100 text-emerald-900'
                      : 'bg-emerald-800 text-white hover:bg-emerald-900'
                  }`}
                >
                  {notifStatus === 'granted' ? 'Diizinkan' : 'Izinkan'}
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4 flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center shrink-0">
                    <Volume2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">
                      Suara Bahasa Indonesia (TTS)
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Alarm akan menyapa: “{nickName || 'Bu Sari'}, lima menit lagi waktunya mengajar...”
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleTestVoice}
                  className="min-h-[40px] px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-800 whitespace-nowrap shrink-0"
                >
                  Uji Suara
                </button>
              </div>

              <div className="rounded-2xl bg-emerald-50/70 border border-emerald-200/80 p-4 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-800 shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-950 leading-relaxed">
                  <strong>Data Tersimpan di Perangkat Anda:</strong> Seluruh data administrasi guru tersimpan langsung secara offline di HP/komputer ini. Buat cadangan rutin lewat menu <em>Cadangan &amp; Pulihkan</em> agar aman saat ganti perangkat.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
              className="min-h-[44px] px-4 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Kembali
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
              className="min-h-[44px] px-6 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-sm font-semibold transition-colors"
            >
              Lanjut
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              className="min-h-[44px] px-6 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-sm font-semibold transition-colors"
            >
              Simpan &amp; Mulai Pakai
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
