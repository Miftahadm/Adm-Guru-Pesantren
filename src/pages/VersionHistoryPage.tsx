import React from 'react';
import { GitCommitHorizontal, Shield } from 'lucide-react';
import { AppDatabase, VersionChangeType } from '../types';
import { exportVersionHistoryOfficial, formatIndonesianDate } from '../utils/exportOfficial';
import { ExportButtons } from '../components/ExportButtons';

interface VersionHistoryPageProps {
  db: AppDatabase;
  onOpenAdmin: () => void;
}

const CHANGE_LABELS: Record<VersionChangeType, { label: string; textClass: string }> = {
  Added: { label: 'Penambahan', textClass: 'text-emerald-800' },
  Updated: { label: 'Pembaruan', textClass: 'text-sky-800' },
  Fixed: { label: 'Perbaikan', textClass: 'text-amber-800' },
  Admin: { label: 'Konfigurasi Admin', textClass: 'text-slate-800' },
};

export const VersionHistoryPage: React.FC<VersionHistoryPageProps> = ({ db, onOpenAdmin }) => {
  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Riwayat Versi &amp; Otomasi Pembaruan
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 tabular-nums">
            Versi aktif v{db.installedAppVersion} · {db.versionHistory.length} catatan versi tersimpan otomatis di perangkat
          </p>
        </div>

        <ExportButtons
          compact
          onExportPDF={() =>
            exportVersionHistoryOfficial({
              format: 'pdf',
              branding: db.branding,
              profile: db.profile,
              versions: db.versionHistory,
            })
          }
          onExportExcel={() =>
            exportVersionHistoryOfficial({
              format: 'excel',
              branding: db.branding,
              profile: db.profile,
              versions: db.versionHistory,
            })
          }
        />
      </div>

      {/* Automation explanation */}
      <div className="rounded-2xl bg-white border border-slate-200/90 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0">
            <GitCommitHorizontal className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Pencatatan Versi Otomatis dari Masa ke Masa
            </h2>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
              Setiap pembaruan sistem (rilis baru), migrasi data perangkat, maupun perubahan Logo/Thumbnail/Kop Surat oleh Admin otomatis direkam lengkap dengan nomor versi SemVer, tanggal rilis, dan detail perubahannya.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenAdmin}
          className="min-h-[40px] px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-800 inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap"
        >
          <Shield className="w-3.5 h-3.5 text-emerald-800" />
          Kelola di Panel Admin
        </button>
      </div>

      {/* Chronological Timeline */}
      <div className="space-y-4">
        {db.versionHistory.map((record, idx) => {
          const isCurrent = idx === 0;
          const sourceLabel =
            record.source === 'admin_update'
              ? 'Update Admin'
              : record.source === 'auto_migration'
                ? 'Otomasi Migrasi'
                : 'Rilis Sistem';

          return (
            <article
              key={`${record.version}_${idx}`}
              className="rounded-2xl bg-white border border-slate-200/90 p-5 space-y-3"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <p className="text-xs text-slate-500 tabular-nums">
                    <span className="font-mono font-bold text-emerald-900 text-sm">
                      v{record.version}
                    </span>
                    {' · '}
                    {formatIndonesianDate(record.releasedAt)}
                    {' · '}
                    <span>{sourceLabel}</span>
                    {isCurrent && (
                      <>
                        {' · '}
                        <span className="font-semibold text-emerald-700">Versi Aktif</span>
                      </>
                    )}
                  </p>
                  <h3 className="text-base font-bold text-slate-900 mt-1">{record.title}</h3>
                </div>
                <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                  Tercatat: {new Date(record.recordedOnDeviceAt).toLocaleDateString('id-ID')}
                </span>
              </div>

              <ul className="space-y-2 text-xs sm:text-sm text-slate-700">
                {record.changes.map((c, cIdx) => {
                  const meta = CHANGE_LABELS[c.type] || CHANGE_LABELS.Updated;
                  return (
                    <li key={cIdx} className="leading-relaxed">
                      <span className={`font-semibold ${meta.textClass}`}>{meta.label}:</span>{' '}
                      <span>{c.summary}</span>
                    </li>
                  );
                })}
              </ul>
            </article>
          );
        })}
      </div>
    </div>
  );
};
