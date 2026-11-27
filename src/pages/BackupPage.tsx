import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  HardDrive,
  RotateCcw,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { AppDatabase } from '../types';
import { createInitialDatabase } from '../data/defaultData';
import { downloadBackupFile, parseBackupFile } from '../utils/storage';

interface BackupPageProps {
  db: AppDatabase;
  onMarkBackedUp: () => void;
  onRestoreDatabase: (restored: AppDatabase) => void;
}

export const BackupPage: React.FC<BackupPageProps> = ({
  db,
  onMarkBackedUp,
  onRestoreDatabase,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const handleDownloadBackup = () => {
    try {
      const filename = downloadBackupFile(db);
      onMarkBackedUp();
      setStatusMessage({
        type: 'success',
        text: `File cadangan "${filename}" berhasil disimpan. Simpan di Google Drive atau kirim ke WhatsApp sendiri agar aman saat ganti perangkat.`,
      });
    } catch {
      setStatusMessage({
        type: 'error',
        text: 'Gagal membuat file cadangan. Coba ulangi beberapa saat lagi.',
      });
    }
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatusMessage(null);
    try {
      const restored = await parseBackupFile(file);
      onRestoreDatabase(restored);
      setStatusMessage({
        type: 'success',
        text: `Data dari "${file.name}" berhasil dipulihkan (${restored.students.length} santri, ${restored.journals.length} jurnal, ${restored.schedules.length} jadwal).`,
      });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal memulihkan file cadangan.',
      });
    }
    e.target.value = '';
  };

  const handleResetDemo = () => {
    const fresh = createInitialDatabase();
    onRestoreDatabase(fresh);
    setConfirmReset(false);
    setStatusMessage({
      type: 'success',
      text: 'Seluruh data di perangkat telah diatur ulang ke contoh awal Pesantren Trubus Iman.',
    });
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Cadangan &amp; Pulihkan</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Seluruh data tersimpan offline di perangkat Anda — buat cadangan rutin untuk pindah HP
        </p>
      </div>

      {/* Info Banner */}
      <div className="rounded-2xl bg-emerald-50 border border-emerald-200/80 p-4 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-800 shrink-0 mt-0.5" />
        <p className="text-xs sm:text-sm text-emerald-950 leading-relaxed">
          Semua data administrasi guru tersimpan langsung di perangkat ini (IndexedDB &amp; LocalStorage) tanpa bergantung pada server luar. Buat cadangan secara rutin minimal seminggu sekali agar data tetap aman bila perangkat rusak, hilang, atau berganti HP baru.
        </p>
      </div>

      {statusMessage && (
        <div
          className={`rounded-2xl border p-4 flex items-start gap-3 text-xs sm:text-sm ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
              : 'bg-rose-50 border-rose-300 text-rose-950'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Create Backup Card */}
      <div className="rounded-2xl bg-white border border-slate-200/90 p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Buat Cadangan (.agti.json)</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {db.lastBackupAt
                  ? `Terakhir dicadangkan: ${new Date(db.lastBackupAt).toLocaleString('id-ID')}`
                  : 'Belum pernah dicadangkan pada perangkat ini'}
              </p>
              <p className="text-xs text-slate-500 mt-1 tabular-nums">
                Mencakup {db.classes.length} kelas · {db.students.length} santri · {db.schedules.length}{' '}
                jadwal · {db.journals.length} jurnal · branding admin &amp; riwayat versi
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDownloadBackup}
          className="w-full min-h-[46px] rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
        >
          <Download className="w-4 h-4" />
          Simpan File Cadangan ke Perangkat
        </button>
      </div>

      {/* Restore Backup Card */}
      <div className="rounded-2xl bg-white border border-slate-200/90 p-5 space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Pulihkan dari File Cadangan</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Data saat ini di perangkat akan diganti dengan isi file cadangan (.agti.json / .json).
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.agti.json"
          onChange={handleRestoreFile}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full min-h-[46px] rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
        >
          <Upload className="w-4 h-4" />
          Pilih File Cadangan (.agti.json)
        </button>
      </div>

      {/* Reset Local Data */}
      <div className="rounded-2xl bg-white border border-slate-200/90 p-5 space-y-3">
        <h2 className="text-sm font-bold text-slate-900">Atur Ulang Data Perangkat</h2>
        <p className="text-xs text-slate-500">
          Mengembalikan aplikasi ke data contoh awal Pesantren Trubus Iman. Pastikan Anda sudah menyimpan cadangan terlebih dahulu.
        </p>
        {!confirmReset ? (
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="min-h-[42px] px-4 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4" />
            Reset ke Data Awal
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleResetDemo}
              className="min-h-[42px] px-4 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold"
            >
              Ya, Reset Semua Data Sekarang
            </button>
            <button
              type="button"
              onClick={() => setConfirmReset(false)}
              className="min-h-[42px] px-4 rounded-xl border border-slate-200 text-xs font-medium text-slate-700"
            >
              Batal
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
