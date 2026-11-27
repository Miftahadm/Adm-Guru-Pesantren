/**
 * Official Pesantren Trubus Iman PDF & Excel Exporter + Student Excel Importer
 * Generates formatted official school documents with:
 * - Kop Surat Resmi Pondok Pesantren Trubus Iman (including custom Admin Logo if set)
 * - Document Metadata (Teacher, Subject, Class, Semester, Academic Year, Period)
 * - Structured Data Tables
 * - Official Signature Block (Pimpinan/Kepala Sekolah & Guru Pengampu)
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import {
  AdminBranding,
  AttendanceRecord,
  ClassRoom,
  ExportOptions,
  ExtracurricularProgram,
  Gender,
  GradeSheet,
  JournalCategory,
  JournalEntry,
  ReminderNote,
  ScheduleItem,
  Student,
  TeacherProfile,
  VersionRecord,
} from '../types';
import { DAY_NAMES } from '../data/defaultData';

const BULAN_ID = [
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

export function formatIndonesianDate(isoDate: string): string {
  if (!isoDate) return '-';
  const parts = isoDate.slice(0, 10).split('-');
  if (parts.length !== 3) return isoDate;
  const y = Number(parts[0]);
  const m = Number(parts[1]) - 1;
  const d = Number(parts[2]);
  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return isoDate;
  return `${d} ${BULAN_ID[m] ?? ''} ${y}`;
}

export function formatTodayIndonesian(): string {
  const now = new Date();
  return `${now.getDate()} ${BULAN_ID[now.getMonth()]} ${now.getFullYear()}`;
}

/**
 * Returns jsPDF format dimensions in mm for A4 or F4 (Folio Indonesia: 215 x 330 mm).
 */
function getPaperFormat(paperSize: 'a4' | 'f4'): string | [number, number] {
  return paperSize === 'f4' ? [215, 330] : 'a4';
}

/**
 * Renders the Official Pesantren Trubus Iman Letterhead (Kop Surat) onto a jsPDF document.
 * Returns the Y cursor position where body content should begin.
 */
function renderOfficialKopSurat(
  doc: jsPDF,
  branding: AdminBranding,
  documentTitle: string,
  metaLines: Array<[string, string]>
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 14;
  let y = 12;

  // Optional logo on top-left of Kop Surat
  const hasLogo = Boolean(branding.logoDataUrl && branding.logoDataUrl.startsWith('data:image/'));
  if (hasLogo && branding.logoDataUrl) {
    try {
      const format = branding.logoDataUrl.includes('image/png') ? 'PNG' : 'JPEG';
      doc.addImage(branding.logoDataUrl, format, marginX, y, 18, 18);
    } catch {
      // Fallback gracefully if unsupported image format
    }
  } else {
    // Draw subtle official emerald crest box as vector emblem
    doc.setFillColor(6, 95, 70);
    doc.roundedRect(marginX, y + 1, 16, 16, 3, 3, 'F');
    doc.setTextColor(245, 158, 11);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('TI', marginX + 8, y + 11.2, { align: 'center' });
  }

  const centerX = pageWidth / 2 + 5;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text((branding.foundationName || 'YAYASAN PENDIDIKAN ISLAM TRUBUS IMAN').toUpperCase(), centerX, y + 4, {
    align: 'center',
  });

  doc.setTextColor(6, 95, 70);
  doc.setFontSize(13.5);
  doc.text((branding.institutionName || 'PONDOK PESANTREN TRUBUS IMAN').toUpperCase(), centerX, y + 9.8, {
    align: 'center',
  });

  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(branding.address || '', centerX, y + 14.3, { align: 'center' });
  doc.text(branding.contactInfo || '', centerX, y + 18.2, { align: 'center' });

  // Double official horizontal separator line
  const lineY = y + 21.5;
  doc.setDrawColor(6, 95, 70);
  doc.setLineWidth(0.9);
  doc.line(marginX, lineY, pageWidth - marginX, lineY);
  doc.setLineWidth(0.3);
  doc.line(marginX, lineY + 1.2, pageWidth - marginX, lineY + 1.2);

  // Document Title
  let cursorY = lineY + 8;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(documentTitle.toUpperCase(), pageWidth / 2, cursorY, { align: 'center' });
  cursorY += 6;

  // Two-column metadata block
  if (metaLines.length > 0) {
    doc.setFontSize(8.5);
    const half = Math.ceil(metaLines.length / 2);
    const col2X = pageWidth / 2 + 4;
    for (let i = 0; i < half; i++) {
      const left = metaLines[i];
      const right = metaLines[i + half];
      if (left) {
        doc.setFont('helvetica', 'bold');
        doc.text(`${left[0]}`, marginX, cursorY);
        doc.setFont('helvetica', 'normal');
        doc.text(`: ${left[1]}`, marginX + 30, cursorY);
      }
      if (right) {
        doc.setFont('helvetica', 'bold');
        doc.text(`${right[0]}`, col2X, cursorY);
        doc.setFont('helvetica', 'normal');
        doc.text(`: ${right[1]}`, col2X + 32, cursorY);
      }
      cursorY += 4.6;
    }
    cursorY += 2;
  }

  return cursorY;
}

/**
 * Renders the Official Signature Block (Mengetahui Pimpinan & Guru Pengampu).
 */
function renderOfficialSignature(
  doc: jsPDF,
  branding: AdminBranding,
  profile: TeacherProfile,
  afterTableY: number
): void {
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = afterTableY + 12;

  if (y + 36 > pageHeight - 12) {
    doc.addPage();
    y = 22;
  }

  const leftX = 24;
  const rightX = pageWidth - 78;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);

  doc.text('Mengetahui,', leftX, y);
  doc.text(`${branding.city || 'Tanah Grogot'}, ${formatTodayIndonesian()}`, rightX, y);

  doc.text(branding.principalTitle || 'Pimpinan / Kepala Sekolah', leftX, y + 4.5);
  doc.text('Guru Pengampu,', rightX, y + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.text(branding.principalName || 'Pimpinan Pesantren Trubus Iman', leftX, y + 23);
  doc.text(profile.fullName || 'Guru Pengampu', rightX, y + 23);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  if (branding.principalNip) {
    doc.text(branding.principalNip, leftX, y + 27.5);
  }
  if (profile.nipNiy) {
    doc.text(profile.nipNiy, rightX, y + 27.5);
  }

  // Page footer credit on every page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Dokumen Resmi ${branding.institutionName || 'Pesantren Trubus Iman'} · Dicetak melalui ${branding.appName}`,
      14,
      doc.internal.pageSize.getHeight() - 7
    );
    doc.text(
      `Halaman ${i} dari ${pageCount}`,
      pageWidth - 14,
      doc.internal.pageSize.getHeight() - 7,
      { align: 'right' }
    );
  }
}

/**
 * Helper to generate an official Excel workbook with Pesantren Trubus Iman Kop Surat header & signature footer.
 */
function saveOfficialExcel(params: {
  branding: AdminBranding;
  profile: TeacherProfile;
  sheetName: string;
  documentTitle: string;
  metaLines: Array<[string, string]>;
  headers: string[];
  rows: Array<Array<string | number>>;
  filename: string;
}): void {
  const { branding, profile, sheetName, documentTitle, metaLines, headers, rows, filename } = params;
  const colCount = Math.max(headers.length, 4);

  const aoa: Array<Array<string | number>> = [
    [(branding.foundationName || 'YAYASAN PENDIDIKAN ISLAM TRUBUS IMAN').toUpperCase()],
    [(branding.institutionName || 'PONDOK PESANTREN TRUBUS IMAN').toUpperCase()],
    [`${branding.address || ''} · ${branding.contactInfo || ''}`],
    [],
    [documentTitle.toUpperCase()],
    [],
    ...metaLines.map(([k, v]) => [k, `: ${v}`]),
    [],
    headers,
    ...rows,
    [],
    [],
    ['Mengetahui,', '', '', `${branding.city || 'Tanah Grogot'}, ${formatTodayIndonesian()}`],
    [branding.principalTitle || 'Pimpinan / Kepala Sekolah', '', '', 'Guru Pengampu'],
    [],
    [],
    [branding.principalName || '', '', '', profile.fullName || ''],
    [branding.principalNip || '', '', '', profile.nipNiy || ''],
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Merge top Kop Surat title rows across all table columns
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: colCount - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: colCount - 1 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: colCount - 1 } },
  ];

  // Auto-size columns reasonably
  ws['!cols'] = headers.map((h, idx) => {
    const maxDataLen = rows.reduce((max, r) => Math.max(max, String(r[idx] ?? '').length), h.length);
    return { wch: Math.min(44, Math.max(10, maxDataLen + 3)) };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, filename);
}

/**
 * Core table PDF builder wrapping Kop Surat + AutoTable + Signature.
 */
function buildAndSaveOfficialPDF(params: {
  branding: AdminBranding;
  profile: TeacherProfile;
  documentTitle: string;
  metaLines: Array<[string, string]>;
  headers: string[];
  rows: Array<Array<string | number>>;
  filename: string;
  options?: ExportOptions;
}): void {
  const {
    branding,
    profile,
    documentTitle,
    metaLines,
    headers,
    rows,
    filename,
    options = { paperSize: 'a4', orientation: 'portrait', includeSignature: true },
  } = params;

  const doc = new jsPDF({
    orientation: options.orientation,
    unit: 'mm',
    format: getPaperFormat(options.paperSize),
  });

  const startY = renderOfficialKopSurat(doc, branding, documentTitle, metaLines);

  autoTable(doc, {
    startY,
    head: [headers],
    body: rows.length > 0 ? rows : [headers.map((_, i) => (i === 0 ? 'Belum ada data tercatat.' : ''))],
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2.2,
      textColor: [15, 23, 42],
      lineColor: [203, 213, 225],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [6, 95, 70],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 14, right: 14, bottom: 16 },
  });

  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? startY + 20;
  if (options.includeSignature !== false) {
    renderOfficialSignature(doc, branding, profile, finalY);
  }

  doc.save(filename);
}

/* ============================================================================
 * 1. EXPORT ABSENSI (RINGKAS & MATRIKS PER TANGGAL)
 * ============================================================================ */
export function exportAttendanceOfficial(params: {
  format: 'pdf' | 'excel';
  mode: 'summary' | 'matrix';
  branding: AdminBranding;
  profile: TeacherProfile;
  classRoom: ClassRoom;
  subject: string;
  students: Student[];
  records: AttendanceRecord[];
  startDate: string;
  endDate: string;
  options?: ExportOptions;
}): void {
  const { format, mode, branding, profile, classRoom, subject, students, records, startDate, endDate, options } = params;
  const filteredRecords = records
    .filter(
      (r) =>
        r.classId === classRoom.id &&
        (subject === 'Semua' || r.subject === subject) &&
        r.date >= startDate &&
        r.date <= endDate
    )
    .sort((a, b) => a.date.localeCompare(b.date));

  const metaLines: Array<[string, string]> = [
    ['Guru Pengampu', profile.fullName],
    ['Kelas', classRoom.name],
    ['Mata Pelajaran', subject],
    ['Semester / TA', `${profile.semester} / ${profile.academicYear}`],
    ['Periode', `${formatIndonesianDate(startDate)} s.d. ${formatIndonesianDate(endDate)}`],
    ['Total Pertemuan', `${filteredRecords.length} hari/pertemuan`],
  ];

  let headers: string[];
  let rows: Array<Array<string | number>>;

  if (mode === 'matrix' && filteredRecords.length > 0) {
    const dateCols = filteredRecords.map((r) => r.date.slice(5)); // MM-DD
    headers = ['No', 'NIS', 'Nama Santri', 'L/P', ...dateCols, 'H', 'S', 'I', 'A'];
    rows = students.map((stu, idx) => {
      let h = 0, s = 0, iCount = 0, a = 0;
      const statuses = filteredRecords.map((rec) => {
        const st = rec.entries[stu.id] || '-';
        if (st === 'H') h++;
        if (st === 'S') s++;
        if (st === 'I') iCount++;
        if (st === 'A') a++;
        return st;
      });
      return [idx + 1, stu.nis || '-', stu.name, stu.gender, ...statuses, h, s, iCount, a];
    });
  } else {
    headers = ['No', 'NIS', 'Nama Santri', 'L/P', 'Hadir (H)', 'Sakit (S)', 'Izin (I)', 'Alpa (A)', '% Hadir'];
    rows = students.map((stu, idx) => {
      let h = 0, s = 0, iCount = 0, a = 0;
      filteredRecords.forEach((rec) => {
        const st = rec.entries[stu.id];
        if (st === 'H') h++;
        else if (st === 'S') s++;
        else if (st === 'I') iCount++;
        else if (st === 'A') a++;
      });
      const total = h + s + iCount + a;
      const pct = total > 0 ? `${Math.round((h / total) * 100)}%` : '-';
      return [idx + 1, stu.nis || '-', stu.name, stu.gender, h, s, iCount, a, pct];
    });
  }

  const title = mode === 'matrix' ? 'Daftar Hadir Santri Per Tanggal' : 'Rekapitulasi Absensi Santri';
  const slug = `${classRoom.name.replace(/\s+/g, '_')}_${subject.replace(/\s+/g, '_')}`;

  if (format === 'pdf') {
    buildAndSaveOfficialPDF({
      branding,
      profile,
      documentTitle: title,
      metaLines,
      headers,
      rows,
      filename: `Absensi_${slug}_Trubus_Iman.pdf`,
      options: options || {
        paperSize: 'a4',
        orientation: mode === 'matrix' ? 'landscape' : 'portrait',
      },
    });
  } else {
    saveOfficialExcel({
      branding,
      profile,
      sheetName: 'Rekap Absensi',
      documentTitle: title,
      metaLines,
      headers,
      rows,
      filename: `Absensi_${slug}_Trubus_Iman.xlsx`,
    });
  }
}

/* ============================================================================
 * 2. EXPORT DAFTAR NILAI
 * ============================================================================ */
export function exportGradesOfficial(params: {
  format: 'pdf' | 'excel';
  branding: AdminBranding;
  profile: TeacherProfile;
  classRoom: ClassRoom;
  students: Student[];
  sheet: GradeSheet;
  options?: ExportOptions;
}): void {
  const { format, branding, profile, classRoom, students, sheet, options } = params;

  const metaLines: Array<[string, string]> = [
    ['Guru Pengampu', profile.fullName],
    ['Kelas', classRoom.name],
    ['Mata Pelajaran', sheet.subject],
    ['Semester', sheet.semester],
    ['Tahun Pelajaran', sheet.academicYear],
    ['Jumlah Santri', `${students.length} santri`],
  ];

  const headers = [
    'No',
    'Nama Santri',
    ...sheet.taskColumns.map((c) => c.label),
    'Rata Tugas',
    ...sheet.dailyColumns.map((c) => c.label),
    'Rata PH',
    'UTS',
    'UAS',
    'Nilai Akhir',
  ];

  const calcAvg = (vals: Array<number | null | undefined>): number | null => {
    const valid = vals.filter((v): v is number => typeof v === 'number' && !Number.isNaN(v));
    if (valid.length === 0) return null;
    return valid.reduce((a, b) => a + b, 0) / valid.length;
  };

  const rows = students.map((stu, idx) => {
    const tScores = sheet.taskColumns.map((c) => sheet.taskScores[stu.id]?.[c.id] ?? null);
    const phScores = sheet.dailyColumns.map((c) => sheet.dailyScores[stu.id]?.[c.id] ?? null);
    const exam = sheet.examScores[stu.id] || { uts: null, uas: null };

    const avgT = calcAvg(tScores);
    const avgPH = calcAvg(phScores);
    const finalParts = [avgT, avgPH, exam.uts, exam.uas].filter((v): v is number => v !== null);
    const finalScore = finalParts.length > 0 ? finalParts.reduce((a, b) => a + b, 0) / finalParts.length : null;

    return [
      idx + 1,
      stu.name,
      ...tScores.map((v) => (v === null ? '-' : v)),
      avgT === null ? '-' : avgT.toFixed(1),
      ...phScores.map((v) => (v === null ? '-' : v)),
      avgPH === null ? '-' : avgPH.toFixed(1),
      exam.uts === null ? '-' : exam.uts,
      exam.uas === null ? '-' : exam.uas,
      finalScore === null ? '-' : finalScore.toFixed(1),
    ];
  });

  const slug = `${classRoom.name.replace(/\s+/g, '_')}_${sheet.subject.replace(/\s+/g, '_')}`;

  if (format === 'pdf') {
    buildAndSaveOfficialPDF({
      branding,
      profile,
      documentTitle: 'Daftar Nilai Santri',
      metaLines,
      headers,
      rows,
      filename: `Daftar_Nilai_${slug}_Trubus_Iman.pdf`,
      options: options || { paperSize: 'a4', orientation: 'landscape' },
    });
  } else {
    saveOfficialExcel({
      branding,
      profile,
      sheetName: 'Daftar Nilai',
      documentTitle: 'Daftar Nilai Santri',
      metaLines,
      headers,
      rows,
      filename: `Daftar_Nilai_${slug}_Trubus_Iman.xlsx`,
    });
  }
}

/* ============================================================================
 * 3. EXPORT JURNAL MENGAJAR (DI KELAS / NON KELAS / GABUNGAN)
 * ============================================================================ */
export function exportJournalsOfficial(params: {
  format: 'pdf' | 'excel';
  categoryFilter: 'all' | JournalCategory;
  branding: AdminBranding;
  profile: TeacherProfile;
  journals: JournalEntry[];
  startDate?: string;
  endDate?: string;
  options?: ExportOptions;
}): void {
  const { format, categoryFilter, branding, profile, journals, startDate, endDate, options } = params;

  const filtered = journals
    .filter((j) => {
      if (categoryFilter !== 'all' && j.category !== categoryFilter) return false;
      if (startDate && j.date < startDate) return false;
      if (endDate && j.date > endDate) return false;
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

  const categoryLabel =
    categoryFilter === 'in_class'
      ? 'Kegiatan Mengajar Di Kelas'
      : categoryFilter === 'non_class'
        ? 'Kegiatan Guru Non Kelas'
        : 'Gabungan (Di Kelas & Non Kelas)';

  const metaLines: Array<[string, string]> = [
    ['Guru Pengampu', profile.fullName],
    ['Kategori Jurnal', categoryLabel],
    ['Semester / TA', `${profile.semester} / ${profile.academicYear}`],
    [
      'Periode',
      startDate && endDate
        ? `${formatIndonesianDate(startDate)} s.d. ${formatIndonesianDate(endDate)}`
        : 'Semua Tanggal Tercatat',
    ],
    ['Jumlah Entri', `${filtered.length} catatan`],
  ];

  let headers: string[];
  let rows: Array<Array<string | number>>;

  if (categoryFilter === 'in_class') {
    headers = ['No', 'Tanggal', 'Waktu', 'Kelas', 'Mata Pelajaran', 'Materi Pokok', 'Kegiatan Pembelajaran', 'Catatan'];
    rows = filtered.map((j, idx) => [
      idx + 1,
      formatIndonesianDate(j.date),
      `${j.startTime} - ${j.endTime}`,
      j.className || '-',
      j.subject || '-',
      j.material || '-',
      j.activity || '-',
      j.notes || '-',
    ]);
  } else if (categoryFilter === 'non_class') {
    headers = ['No', 'Tanggal', 'Waktu', 'Jenis Kegiatan Non Kelas', 'Lokasi / Unit', 'Uraian Kegiatan', 'Catatan / Tindak Lanjut'];
    rows = filtered.map((j, idx) => [
      idx + 1,
      formatIndonesianDate(j.date),
      `${j.startTime} - ${j.endTime}`,
      j.nonClassType || '-',
      j.location || '-',
      j.activity || '-',
      j.notes || '-',
    ]);
  } else {
    headers = ['No', 'Tanggal', 'Waktu', 'Kategori', 'Kelas/Mapel atau Jenis Kegiatan', 'Materi / Lokasi', 'Uraian Kegiatan', 'Catatan'];
    rows = filtered.map((j, idx) => [
      idx + 1,
      formatIndonesianDate(j.date),
      `${j.startTime} - ${j.endTime}`,
      j.category === 'in_class' ? 'Di Kelas' : 'Non Kelas',
      j.category === 'in_class' ? `${j.className || '-'} · ${j.subject || '-'}` : j.nonClassType || '-',
      j.category === 'in_class' ? j.material || '-' : j.location || '-',
      j.activity || '-',
      j.notes || '-',
    ]);
  }

  const title =
    categoryFilter === 'non_class'
      ? 'Jurnal Kegiatan Guru (Non Kelas)'
      : categoryFilter === 'in_class'
        ? 'Jurnal Mengajar Guru (Di Kelas)'
        : 'Jurnal Mengajar & Kegiatan Guru';

  const slug =
    categoryFilter === 'in_class' ? 'Di_Kelas' : categoryFilter === 'non_class' ? 'Non_Kelas' : 'Lengkap';

  if (format === 'pdf') {
    buildAndSaveOfficialPDF({
      branding,
      profile,
      documentTitle: title,
      metaLines,
      headers,
      rows,
      filename: `Jurnal_Mengajar_${slug}_Trubus_Iman.pdf`,
      options: options || { paperSize: 'a4', orientation: 'landscape' },
    });
  } else {
    saveOfficialExcel({
      branding,
      profile,
      sheetName: `Jurnal ${slug}`,
      documentTitle: title,
      metaLines,
      headers,
      rows,
      filename: `Jurnal_Mengajar_${slug}_Trubus_Iman.xlsx`,
    });
  }
}

/* ============================================================================
 * 4. EXPORT JADWAL MENGAJAR
 * ============================================================================ */
export function exportScheduleOfficial(params: {
  format: 'pdf' | 'excel';
  branding: AdminBranding;
  profile: TeacherProfile;
  schedules: ScheduleItem[];
  options?: ExportOptions;
}): void {
  const { format, branding, profile, schedules, options } = params;
  const sorted = [...schedules].sort(
    (a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime)
  );

  const metaLines: Array<[string, string]> = [
    ['Guru Pengampu', profile.fullName],
    ['Semester / TA', `${profile.semester} / ${profile.academicYear}`],
    ['Total Sesi', `${sorted.length} jadwal`],
  ];

  const headers = ['No', 'Hari', 'Waktu', 'Jenis', 'Kelas', 'Mata Pelajaran / Keterangan', 'Pengingat Alarm', 'Status'];
  const rows = sorted.map((s, idx) => [
    idx + 1,
    DAY_NAMES[s.dayOfWeek] || '-',
    `${s.startTime} - ${s.endTime}`,
    s.type === 'mengajar' ? 'Mengajar' : s.type === 'istirahat' ? 'Istirahat' : 'Pulang',
    s.className || '-',
    s.type === 'mengajar' ? s.subject || '-' : s.notes || '-',
    s.alarmLeadMinutes === 0 ? 'Tepat waktu' : `${s.alarmLeadMinutes} mnt sebelum`,
    s.active ? 'Aktif' : 'Nonaktif',
  ]);

  if (format === 'pdf') {
    buildAndSaveOfficialPDF({
      branding,
      profile,
      documentTitle: 'Jadwal Mengajar Guru',
      metaLines,
      headers,
      rows,
      filename: 'Jadwal_Mengajar_Trubus_Iman.pdf',
      options: options || { paperSize: 'a4', orientation: 'portrait' },
    });
  } else {
    saveOfficialExcel({
      branding,
      profile,
      sheetName: 'Jadwal Mengajar',
      documentTitle: 'Jadwal Mengajar Guru',
      metaLines,
      headers,
      rows,
      filename: 'Jadwal_Mengajar_Trubus_Iman.xlsx',
    });
  }
}

/* ============================================================================
 * 5. EXPORT DATA SISWA
 * ============================================================================ */
export function exportStudentsOfficial(params: {
  format: 'pdf' | 'excel';
  branding: AdminBranding;
  profile: TeacherProfile;
  classRoom: ClassRoom | null;
  students: Student[];
  classes: ClassRoom[];
  options?: ExportOptions;
}): void {
  const { format, branding, profile, classRoom, students, classes, options } = params;
  const classMap = new Map(classes.map((c) => [c.id, c.name]));
  const filtered = classRoom ? students.filter((s) => s.classId === classRoom.id) : students;

  const maleCount = filtered.filter((s) => s.gender === 'L').length;
  const femaleCount = filtered.filter((s) => s.gender === 'P').length;

  const metaLines: Array<[string, string]> = [
    ['Guru Pengampu', profile.fullName],
    ['Kelas', classRoom ? classRoom.name : 'Semua Kelas'],
    ['Tahun Pelajaran', profile.academicYear],
    ['Komposisi', `${filtered.length} santri (${maleCount} Laki-laki, ${femaleCount} Perempuan)`],
  ];

  const headers = ['No', 'NIS', 'Nama Lengkap Santri', 'Jenis Kelamin', 'Kelas'];
  const rows = filtered.map((s, idx) => [
    idx + 1,
    s.nis || '-',
    s.name,
    s.gender === 'L' ? 'Laki-laki' : 'Perempuan',
    classMap.get(s.classId) || '-',
  ]);

  const slug = classRoom ? classRoom.name.replace(/\s+/g, '_') : 'Semua_Kelas';

  if (format === 'pdf') {
    buildAndSaveOfficialPDF({
      branding,
      profile,
      documentTitle: 'Daftar Data Santri / Siswa',
      metaLines,
      headers,
      rows,
      filename: `Data_Siswa_${slug}_Trubus_Iman.pdf`,
      options: options || { paperSize: 'a4', orientation: 'portrait' },
    });
  } else {
    saveOfficialExcel({
      branding,
      profile,
      sheetName: 'Data Siswa',
      documentTitle: 'Daftar Data Santri / Siswa',
      metaLines,
      headers,
      rows,
      filename: `Data_Siswa_${slug}_Trubus_Iman.xlsx`,
    });
  }
}

/* ============================================================================
 * 6. EXPORT EKSTRAKURIKULER & LES
 * ============================================================================ */
export function exportExtracurricularOfficial(params: {
  format: 'pdf' | 'excel';
  branding: AdminBranding;
  profile: TeacherProfile;
  program: ExtracurricularProgram;
  options?: ExportOptions;
}): void {
  const { format, branding, profile, program, options } = params;

  const metaLines: Array<[string, string]> = [
    ['Nama Kegiatan', program.name],
    ['Jenis Program', program.type],
    ['Pembimbing', program.mentorName || profile.fullName],
    ['Jadwal Rutin', program.scheduleText || '-'],
    ['Jumlah Anggota', `${program.members.length} santri`],
    ['Total Jurnal', `${program.journals.length} pertemuan`],
  ];

  const headers = ['No', 'Tanggal', 'Topik / Materi Kegiatan', 'Uraian Kegiatan', 'Kehadiran', 'Catatan'];
  const rows = program.journals.map((j, idx) => {
    const att = program.attendance.find((a) => a.date === j.date);
    const hadir = att ? Object.values(att.entries).filter((v) => v === 'H').length : 0;
    const total = program.members.length;
    return [
      idx + 1,
      formatIndonesianDate(j.date),
      j.topic,
      j.activity,
      att ? `${hadir}/${total} hadir` : '-',
      j.notes || '-',
    ];
  });

  const slug = program.name.replace(/\s+/g, '_').slice(0, 28);

  if (format === 'pdf') {
    buildAndSaveOfficialPDF({
      branding,
      profile,
      documentTitle: `Laporan ${program.type} - ${program.name}`,
      metaLines,
      headers,
      rows,
      filename: `Laporan_${slug}_Trubus_Iman.pdf`,
      options: options || { paperSize: 'a4', orientation: 'landscape' },
    });
  } else {
    saveOfficialExcel({
      branding,
      profile,
      sheetName: 'Ekskul & Les',
      documentTitle: `Laporan ${program.type} - ${program.name}`,
      metaLines,
      headers,
      rows,
      filename: `Laporan_${slug}_Trubus_Iman.xlsx`,
    });
  }
}

/* ============================================================================
 * 7. EXPORT CATATAN & PENGINGAT
 * ============================================================================ */
export function exportRemindersOfficial(params: {
  format: 'pdf' | 'excel';
  branding: AdminBranding;
  profile: TeacherProfile;
  reminders: ReminderNote[];
  options?: ExportOptions;
}): void {
  const { format, branding, profile, reminders, options } = params;

  const metaLines: Array<[string, string]> = [
    ['Guru Pengampu', profile.fullName],
    ['Tahun Pelajaran', profile.academicYear],
    ['Total Catatan', `${reminders.length} catatan`],
  ];

  const headers = ['No', 'Judul Catatan', 'Deskripsi', 'Frekuensi', 'Jadwal / Waktu', 'Status'];
  const rows = reminders.map((r, idx) => {
    const freqLabel =
      r.frequency === 'once' ? 'Sekali' : r.frequency === 'daily' ? 'Harian' : 'Mingguan';
    const sched =
      r.frequency === 'once'
        ? `${formatIndonesianDate(r.date || '')}, ${r.time}`
        : r.frequency === 'weekly'
          ? `Setiap ${DAY_NAMES[r.dayOfWeek || 1]}, ${r.time}`
          : `Setiap hari, ${r.time}`;
    return [idx + 1, r.title, r.description || '-', freqLabel, sched, r.active ? 'Aktif' : 'Nonaktif'];
  });

  if (format === 'pdf') {
    buildAndSaveOfficialPDF({
      branding,
      profile,
      documentTitle: 'Daftar Catatan & Pengingat Guru',
      metaLines,
      headers,
      rows,
      filename: 'Catatan_Pengingat_Trubus_Iman.pdf',
      options: options || { paperSize: 'a4', orientation: 'portrait' },
    });
  } else {
    saveOfficialExcel({
      branding,
      profile,
      sheetName: 'Catatan Pengingat',
      documentTitle: 'Daftar Catatan & Pengingat Guru',
      metaLines,
      headers,
      rows,
      filename: 'Catatan_Pengingat_Trubus_Iman.xlsx',
    });
  }
}

/* ============================================================================
 * 8. EXPORT RIWAYAT VERSI APLIKASI (AUTO-CHANGELOG)
 * ============================================================================ */
export function exportVersionHistoryOfficial(params: {
  format: 'pdf' | 'excel';
  branding: AdminBranding;
  profile: TeacherProfile;
  versions: VersionRecord[];
  options?: ExportOptions;
}): void {
  const { format, branding, profile, versions, options } = params;

  const metaLines: Array<[string, string]> = [
    ['Nama Aplikasi', branding.appName],
    ['Versi Aktif', `v${versions[0]?.version || '1.0.0'}`],
    ['Total Catatan Versi', `${versions.length} rilis`],
  ];

  const headers = ['Versi', 'Tanggal Rilis', 'Sumber', 'Judul Pembaruan', 'Detail Perubahan & Penambahan'];
  const rows = versions.map((v) => [
    `v${v.version}`,
    formatIndonesianDate(v.releasedAt),
    v.source === 'admin_update' ? 'Update Admin' : v.source === 'auto_migration' ? 'Otomasi Sistem' : 'Rilis Sistem',
    v.title,
    v.changes.map((c) => `[${c.type}] ${c.summary}`).join(' ; '),
  ]);

  if (format === 'pdf') {
    buildAndSaveOfficialPDF({
      branding,
      profile,
      documentTitle: 'Riwayat Versi & Pembaruan Aplikasi',
      metaLines,
      headers,
      rows,
      filename: 'Riwayat_Versi_Adm_Trubus_Iman.pdf',
      options: options || { paperSize: 'a4', orientation: 'landscape' },
    });
  } else {
    saveOfficialExcel({
      branding,
      profile,
      sheetName: 'Riwayat Versi',
      documentTitle: 'Riwayat Versi & Pembaruan Aplikasi',
      metaLines,
      headers,
      rows,
      filename: 'Riwayat_Versi_Adm_Trubus_Iman.xlsx',
    });
  }
}

/* ============================================================================
 * 9. TEMPLATE EXCEL SISWA & PARSER IMPOR EXCEL (.xlsx / .csv)
 * ============================================================================ */
export function downloadStudentExcelTemplate(): void {
  const rows = [
    ['No', 'NIS', 'Nama', 'Jenis Kelamin (L/P)'],
    [1, '20260801', 'Alif Ramadhan', 'L'],
    [2, '20260802', 'Bella Kusuma', 'P'],
    [3, '20260803', 'Chandra Wijaya', 'L'],
    [4, '20260804', 'Dewi Anggraini', 'P'],
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 6 }, { wch: 14 }, { wch: 28 }, { wch: 22 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Daftar Siswa');
  XLSX.writeFile(wb, 'template_siswa_trubus_iman.xlsx');
}

export interface ParsedStudentRow {
  rowNumber: number;
  nis: string;
  name: string;
  gender: Gender | null;
  valid: boolean;
  error?: string;
}

export async function parseStudentsFromExcel(file: File): Promise<ParsedStudentRow[]> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];

  const ws = wb.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<Array<string | number>>(ws, { header: 1 });
  if (matrix.length <= 1) return [];

  // Detect column positions from header row
  const header = (matrix[0] || []).map((cell) => String(cell ?? '').toLowerCase().trim());
  let nameIdx = header.findIndex((h) => h.includes('nama'));
  let genderIdx = header.findIndex((h) => h.includes('kelamin') || h === 'l/p' || h === 'jk' || h === 'gender');
  let nisIdx = header.findIndex((h) => h.includes('nis'));

  // Fallback for standard template: No | Nama | L/P or No | NIS | Nama | L/P
  if (nameIdx === -1) nameIdx = header.length >= 4 ? 2 : 1;
  if (genderIdx === -1) genderIdx = header.length >= 4 ? 3 : 2;

  const parsed: ParsedStudentRow[] = [];

  for (let i = 1; i < matrix.length; i++) {
    const row = matrix[i];
    if (!row || row.every((c) => String(c ?? '').trim() === '')) continue;

    const rawName = String(row[nameIdx] ?? '').trim();
    const rawNis = nisIdx >= 0 ? String(row[nisIdx] ?? '').trim() : '';
    const rawGender = String(row[genderIdx] ?? '').trim().toUpperCase();

    let gender: Gender | null = null;
    if (rawGender === 'L' || rawGender.startsWith('LAKI') || rawGender === 'M') gender = 'L';
    else if (rawGender === 'P' || rawGender.startsWith('PEREM') || rawGender === 'W' || rawGender === 'F')
      gender = 'P';

    if (!rawName) {
      parsed.push({
        rowNumber: i + 1,
        nis: rawNis,
        name: '(Nama kosong)',
        gender,
        valid: false,
        error: 'Nama santri kosong',
      });
    } else if (!gender) {
      parsed.push({
        rowNumber: i + 1,
        nis: rawNis,
        name: rawName,
        gender: null,
        valid: false,
        error: 'Jenis kelamin harus L atau P',
      });
    } else {
      parsed.push({
        rowNumber: i + 1,
        nis: rawNis,
        name: rawName,
        gender,
        valid: true,
      });
    }
  }

  return parsed;
}
