import React, { useState } from 'react';
import { Download, Smartphone, WifiOff, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors whitespace-nowrap shrink-0 min-h-[40px] ${
          compact
            ? 'bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-2 text-xs'
            : 'bg-emerald-800 hover:bg-emerald-900 text-white px-4 py-2.5 text-sm shadow-sm'
        }`}
      >
        <Download className="w-4 h-4 shrink-0" />
        <span>{compact ? 'Install PWA' : 'Pasang di Perangkat'}</span>
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Pasang Aplikasi di Perangkat
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Akses penuh offline tanpa kuota internet
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100"
                aria-label="Tutup panduan"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm text-slate-600 leading-relaxed">
              {isIOS ? (
                <ol className="list-decimal pl-5 space-y-2">
                  <li>
                    Buka aplikasi ini menggunakan browser <strong>Safari</strong> di iPhone/iPad.
                  </li>
                  <li>
                    Ketuk ikon <strong>Bagikan (Share)</strong> di bilah bawah Safari.
                  </li>
                  <li>
                    Gulir ke bawah lalu pilih <strong>Tambahkan ke Layar Utama (Add to Home Screen)</strong>.
                  </li>
                </ol>
              ) : (
                <ol className="list-decimal pl-5 space-y-2">
                  <li>
                    Pada browser Chrome/Edge, klik ikon <strong>Install / Pasang</strong> di kanan bilah alamat atau buka menu titik tiga (<span className="font-mono">⋮</span>).
                  </li>
                  <li>
                    Pilih <strong>Tambahkan ke layar utama</strong> atau <strong>Install Adm Guru Pesantren Trubus Iman</strong>.
                  </li>
                  <li>
                    Setelah terpasang, seluruh data tersimpan aman langsung di perangkat Anda dan dapat digunakan tanpa internet.
                  </li>
                </ol>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-6 w-full min-h-[44px] rounded-xl bg-emerald-800 text-white text-sm font-medium hover:bg-emerald-900 transition-colors"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-20 lg:bottom-5 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-700 text-white px-3.5 py-2 text-xs font-medium shadow-lg"
    >
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>Mode Offline · Seluruh data tetap tersimpan di perangkat</span>
    </div>
  );
};
