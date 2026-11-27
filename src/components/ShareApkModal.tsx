import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  FileCode2,
  MessageCircle,
  Share2,
  Shield,
  Smartphone,
  X,
} from 'lucide-react';
import { AppDatabase } from '../types';
import { downloadTwaManifest, loadApkBlob } from '../utils/storage';

interface ShareApkModalProps {
  open: boolean;
  db: AppDatabase;
  onClose: () => void;
  onOpenAdmin: () => void;
}

function triggerFileDownload(href: string, filename: string): void {
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export const ShareApkModal: React.FC<ShareApkModalProps> = ({
  open,
  db,
  onClose,
  onOpenAdmin,
}) => {
  const [apkBlob, setApkBlob] = useState<Blob | null>(null);
  const [checkingApk, setCheckingApk] = useState(false);
  const [autoDownloaded, setAutoDownloaded] = useState(false);
  const [statusNote, setStatusNote] = useState('');
  const [copied, setCopied] = useState(false);

  const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const apkFileName =
    db.branding.apkFileName ||
    `Adm_Guru_Pesantren_Trubus_Iman_v${db.installedAppVersion}.apk`;
  const hasRemoteApk = Boolean(db.branding.apkDownloadUrl);
  const hasAnyApk = Boolean(apkBlob || hasRemoteApk);

  // Check IndexedDB for uploaded signed APK and auto-trigger download when modal opens
  useEffect(() => {
    if (!open) {
      setAutoDownloaded(false);
      setStatusNote('');
      return;
    }

    let cancelled = false;
    setCheckingApk(true);

    loadApkBlob().then((blob) => {
      if (cancelled) return;
      setApkBlob(blob);
      setCheckingApk(false);

      // Automatically trigger APK download when a valid APK source is configured
      if (blob) {
        const objectUrl = URL.createObjectURL(blob);
        triggerFileDownload(objectUrl, apkFileName);
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
        setAutoDownloaded(true);
        setStatusNote(
          `File "${apkFileName}" otomatis diunduh ke perangkat Anda. Lampirkan file ini atau ketuk tombol WhatsApp di bawah untuk membagikannya.`
        );
      } else if (db.branding.apkDownloadUrl) {
        triggerFileDownload(db.branding.apkDownloadUrl, apkFileName);
        setAutoDownloaded(true);
        setStatusNote(
          `Unduhan file "${apkFileName}" otomatis dimulai. Gunakan tombol WhatsApp di bawah untuk membagikan ke grup/rekan guru.`
        );
      }
    });

    return () => {
      cancelled = true;
    };
  }, [open, apkFileName, db.branding.apkDownloadUrl]);

  if (!open) return null;

  const shareMessage = hasRemoteApk
    ? `Assalamu'alaikum Bapak/Ibu Guru ${db.branding.institutionName},\n\nSilakan unduh dan pasang aplikasi *${db.branding.appName}* (v${db.installedAppVersion}) untuk jadwal & alarm mengajar, absensi, nilai, dan jurnal di kelas/non kelas:\n\nUnduh APK Android:\n${db.branding.apkDownloadUrl}\n\nAtau buka langsung versi Web/PWA:\n${appUrl}`
    : `Assalamu'alaikum Bapak/Ibu Guru ${db.branding.institutionName},\n\nBerikut aplikasi *${db.branding.appName}* (v${db.installedAppVersion}) untuk administrasi guru offline di HP (Jadwal, Absensi, Nilai, Jurnal Di Kelas & Non Kelas, dan Laporan Resmi PDF/Excel):\n\nBuka & Pasang di HP:\n${appUrl}\n\n(Jika file ${apkFileName} sudah terunduh, silakan lampirkan langsung di chat WhatsApp ini.)`;

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;

  const handleManualDownloadApk = () => {
    if (apkBlob) {
      const objectUrl = URL.createObjectURL(apkBlob);
      triggerFileDownload(objectUrl, apkFileName);
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
      setAutoDownloaded(true);
      setStatusNote(`File "${apkFileName}" berhasil diunduh ulang.`);
    } else if (db.branding.apkDownloadUrl) {
      triggerFileDownload(db.branding.apkDownloadUrl, apkFileName);
      setAutoDownloaded(true);
      setStatusNote(`Mengunduh "${apkFileName}" dari tautan resmi Admin...`);
    }
  };

  /**
   * Uses native Android Web Share API with file attachment when supported
   * so users can pick WhatsApp and send the `.apk` file directly in one tap.
   */
  const handleNativeShareFile = async () => {
    if (!navigator.share) return;
    try {
      if (apkBlob) {
        const file = new File([apkBlob], apkFileName, {
          type: 'application/vnd.android.package-archive',
        });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: db.branding.appName,
            text: shareMessage,
            files: [file],
          });
          return;
        }
      }
      await navigator.share({
        title: db.branding.appName,
        text: shareMessage,
        url: db.branding.apkDownloadUrl || appUrl,
      });
    } catch {
      // User cancelled native share sheet
    }
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(shareMessage);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard API unavailable
    }
  };

  const sizeMB = apkBlob
    ? `${(apkBlob.size / (1024 * 1024)).toFixed(2)} MB`
    : db.branding.apkFileSize
      ? `${(db.branding.apkFileSize / (1024 * 1024)).toFixed(2)} MB`
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="px-6 py-4 bg-emerald-900 text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold truncate">Bagikan APK Android via WhatsApp</h2>
              <p className="text-xs text-emerald-200 truncate">
                {db.branding.appName} · v{db.installedAppVersion}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-emerald-100 hover:bg-white/10 shrink-0"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {checkingApk ? (
            <p className="text-sm text-slate-500 text-center py-4">
              Memeriksa paket APK Android di perangkat...
            </p>
          ) : hasAnyApk ? (
            <>
              {statusNote && (
                <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                  <div className="text-xs text-emerald-950 leading-relaxed">
                    <p className="font-semibold">
                      {autoDownloaded ? 'Unduhan APK Otomatis Dimulai' : 'Paket APK Siap Dibagikan'}
                    </p>
                    <p className="mt-0.5">{statusNote}</p>
                  </div>
                </div>
              )}

              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-500">File Paket Android</p>
                  <p className="text-sm font-bold text-slate-900 truncate mt-0.5">{apkFileName}</p>
                  <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                    {apkBlob ? 'Tersimpan lokal di perangkat' : 'Tautan unduh langsung Admin'}
                    {sizeMB ? ` · ${sizeMB}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleManualDownloadApk}
                  className="min-h-[40px] px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-800 inline-flex items-center gap-1.5 shrink-0"
                >
                  <Download className="w-4 h-4" />
                  Unduh Ulang
                </button>
              </div>

              <div className="space-y-2.5">
                {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
                  <button
                    type="button"
                    onClick={handleNativeShareFile}
                    className="w-full min-h-[46px] rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    Kirim File APK Langsung (Share HP / WA)
                  </button>
                )}

                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full min-h-[46px] rounded-xl bg-[#15803D] hover:bg-[#166534] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  Buka WhatsApp &amp; Bagikan Pesan
                </a>

                <button
                  type="button"
                  onClick={handleCopyMessage}
                  className="w-full min-h-[42px] rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                >
                  <Copy className="w-4 h-4" />
                  {copied ? 'Pesan Undangan Tersalin!' : 'Salin Pesan & Tautan WhatsApp'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 space-y-2">
                <p className="text-sm font-bold text-amber-950">
                  Paket File .APK Resmi Belum Diunggah oleh Admin
                </p>
                <p className="text-xs text-amber-900 leading-relaxed">
                  File <strong>.apk</strong> Android asli memerlukan penandatanganan digital (keystore) agar tidak gagal dipasang di HP. Anda tetap bisa langsung membagikan aplikasi via WhatsApp sekarang (rekan guru dapat langsung memasangnya sebagai aplikasi HP / PWA), atau unggah file <strong>.apk</strong> resmi di Panel Admin agar terunduh otomatis dari tombol ini.
                </p>
              </div>

              {/* Primary immediate action: Share via WhatsApp */}
              <div className="space-y-2.5">
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full min-h-[46px] rounded-xl bg-[#15803D] hover:bg-[#166534] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  Bagikan Aplikasi via WhatsApp Sekarang
                </a>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAdmin();
                    }}
                    className="min-h-[44px] px-3.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                  >
                    <Shield className="w-4 h-4" />
                    Unggah / Tautkan APK (Admin)
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      downloadTwaManifest(db.branding.appName, db.installedAppVersion, appUrl)
                    }
                    className="min-h-[44px] px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                  >
                    <FileCode2 className="w-4 h-4 text-emerald-800" />
                    Unduh twa-manifest.json
                  </button>
                </div>

                <a
                  href={`https://www.pwabuilder.com/reportcard?site=${encodeURIComponent(appUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full min-h-[42px] rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium inline-flex items-center justify-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Kompilasi APK Resmi via PWABuilder (Gratis)
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
