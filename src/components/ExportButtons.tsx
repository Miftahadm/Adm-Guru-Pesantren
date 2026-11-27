import React from 'react';
import { FileSpreadsheet, FileText } from 'lucide-react';

interface ExportButtonsProps {
  onExportPDF: () => void;
  onExportExcel: () => void;
  labelPrefix?: string;
  compact?: boolean;
}

export const ExportButtons: React.FC<ExportButtonsProps> = ({
  onExportPDF,
  onExportExcel,
  labelPrefix,
  compact = false,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onExportPDF}
        title="Unduh Dokumen PDF Resmi Pesantren Trubus Iman"
        className={`inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/80 text-rose-800 hover:bg-rose-100 font-medium transition-colors whitespace-nowrap shrink-0 ${
          compact ? 'px-3 py-2 text-xs min-h-[40px]' : 'px-3.5 py-2 text-xs sm:text-sm min-h-[42px]'
        }`}
      >
        <FileText className="w-4 h-4 shrink-0" />
        <span>{labelPrefix ? `PDF ${labelPrefix}` : 'Unduh PDF Resmi'}</span>
      </button>
      <button
        type="button"
        onClick={onExportExcel}
        title="Unduh Dokumen Excel Resmi Pesantren Trubus Iman"
        className={`inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/80 text-emerald-900 hover:bg-emerald-100 font-medium transition-colors whitespace-nowrap shrink-0 ${
          compact ? 'px-3 py-2 text-xs min-h-[40px]' : 'px-3.5 py-2 text-xs sm:text-sm min-h-[42px]'
        }`}
      >
        <FileSpreadsheet className="w-4 h-4 shrink-0" />
        <span>{labelPrefix ? `Excel ${labelPrefix}` : 'Unduh Excel Resmi'}</span>
      </button>
    </div>
  );
};
