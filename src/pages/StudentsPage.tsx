import React, { useRef, useState } from 'react';
import {
  CheckCircle2,
  Download,
  Edit3,
  FileSpreadsheet,
  Plus,
  Trash2,
  Upload,
  X,
  AlertTriangle,
} from 'lucide-react';
import { AppDatabase, Gender, Student } from '../types';
import {
  downloadStudentExcelTemplate,
  exportStudentsOfficial,
  ParsedStudentRow,
  parseStudentsFromExcel,
} from '../utils/exportOfficial';
import { ExportButtons } from '../components/ExportButtons';

interface StudentsPageProps {
  db: AppDatabase;
  onUpdateStudents: (next: Student[]) => void;
}

export const StudentsPage: React.FC<StudentsPageProps> = ({ db, onUpdateStudents }) => {
  const [selectedClassId, setSelectedClassId] = useState(db.classes[0]?.id || '');
  const [modalOpen, setModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [nis, setNis] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>('L');

  // Excel import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importFilename, setImportFilename] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedStudentRow[]>([]);
  const [importError, setImportError] = useState('');

  const activeClass = db.classes.find((c) => c.id === selectedClassId) || db.classes[0];
  const classStudents = db.students
    .filter((s) => s.classId === activeClass?.id)
    .sort((a, b) => a.name.localeCompare(b.name));

  const maleCount = classStudents.filter((s) => s.gender === 'L').length;
  const femaleCount = classStudents.filter((s) => s.gender === 'P').length;

  const openAddModal = () => {
    setEditingId(null);
    setNis('');
    setName('');
    setGender('L');
    setModalOpen(true);
  };

  const openEditModal = (stu: Student) => {
    setEditingId(stu.id);
    setNis(stu.nis);
    setName(stu.name);
    setGender(stu.gender);
    setModalOpen(true);
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClass || !name.trim()) return;
    if (editingId) {
      onUpdateStudents(
        db.students.map((s) =>
          s.id === editingId ? { ...s, nis: nis.trim(), name: name.trim(), gender } : s
        )
      );
    } else {
      onUpdateStudents([
        ...db.students,
        {
          id: `stu_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
          classId: activeClass.id,
          nis: nis.trim(),
          name: name.trim(),
          gender,
        },
      ]);
    }
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    onUpdateStudents(db.students.filter((s) => s.id !== id));
  };

  const handleExcelFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError('');
    setImportFilename(file.name);
    try {
      const rows = await parseStudentsFromExcel(file);
      if (rows.length === 0) {
        setImportError('File tidak memiliki baris data santri di bawah header.');
        setParsedRows([]);
      } else {
        setParsedRows(rows);
      }
    } catch {
      setImportError('Gagal membaca file Excel. Pastikan format .xlsx atau .csv valid.');
      setParsedRows([]);
    }
    e.target.value = '';
  };

  const validRows = parsedRows.filter((r) => r.valid && r.gender);
  const invalidRows = parsedRows.filter((r) => !r.valid);

  const handleCommitImport = () => {
    if (!activeClass || validRows.length === 0) return;
    const newStudents: Student[] = validRows.map((row, idx) => ({
      id: `stu_${Date.now()}_${idx}`,
      classId: activeClass.id,
      nis: row.nis,
      name: row.name,
      gender: row.gender as Gender,
    }));
    onUpdateStudents([...db.students, ...newStudents]);
    setParsedRows([]);
    setImportFilename('');
    setImportModalOpen(false);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Data Santri / Siswa {activeClass?.name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 tabular-nums">
            {classStudents.length} santri · {maleCount} laki-laki · {femaleCount} perempuan
          </p>
        </div>

        <ExportButtons
          compact
          onExportPDF={() =>
            exportStudentsOfficial({
              format: 'pdf',
              branding: db.branding,
              profile: db.profile,
              classRoom: activeClass || null,
              students: db.students,
              classes: db.classes,
            })
          }
          onExportExcel={() =>
            exportStudentsOfficial({
              format: 'excel',
              branding: db.branding,
              profile: db.profile,
              classRoom: activeClass || null,
              students: db.students,
              classes: db.classes,
            })
          }
        />
      </div>

      {/* Class Filter Tabs & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {db.classes.map((cls) => (
            <button
              key={cls.id}
              type="button"
              onClick={() => setSelectedClassId(cls.id)}
              className={`min-h-[42px] px-4 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-colors ${
                activeClass?.id === cls.id
                  ? 'bg-emerald-800 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {cls.name}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={openAddModal}
            className="min-h-[42px] px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs sm:text-sm font-semibold text-slate-800 inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Tambah Manual
          </button>
          <button
            type="button"
            onClick={() => {
              setParsedRows([]);
              setImportFilename('');
              setImportError('');
              setImportModalOpen(true);
            }}
            className="min-h-[42px] px-4 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Impor Excel
          </button>
        </div>
      </div>

      {/* Student List */}
      <div className="rounded-2xl bg-white border border-slate-200/90 overflow-hidden">
        {classStudents.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-semibold text-slate-700">
              Belum ada data santri di {activeClass?.name}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Tambahkan manual satu per satu atau impor sekaligus dari file Excel (.xlsx).
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {classStudents.map((stu, idx) => (
              <div
                key={stu.id}
                className="px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/70"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <span className="font-mono text-xs font-semibold text-slate-400 w-6 text-right tabular-nums shrink-0">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{stu.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                      {stu.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
                      {stu.nis ? ` · NIS ${stu.nis}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEditModal(stu)}
                    className="w-10 h-10 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-500"
                    aria-label={`Edit ${stu.name}`}
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(stu.id)}
                    className="w-10 h-10 rounded-xl hover:bg-rose-50 hover:text-rose-700 flex items-center justify-center text-slate-400"
                    aria-label={`Hapus ${stu.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Student Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4">
          <form
            onSubmit={handleSaveStudent}
            className="w-full max-w-md rounded-3xl bg-white border border-slate-200 p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                {editingId ? 'Edit Data Santri' : `Tambah Santri · ${activeClass?.name}`}
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
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Nama Lengkap Santri
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Alif Ramadhan"
                className="w-full min-h-[44px] rounded-xl border border-slate-200 px-3.5 text-sm focus:border-emerald-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                NIS / Nomor Induk (opsional)
              </label>
              <input
                type="text"
                value={nis}
                onChange={(e) => setNis(e.target.value)}
                placeholder="Contoh: 20260715"
                className="w-full min-h-[44px] rounded-xl border border-slate-200 px-3.5 text-sm font-mono focus:border-emerald-700 focus:outline-none"
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
                  className={`min-h-[44px] rounded-xl border text-sm font-medium ${
                    gender === 'L'
                      ? 'border-emerald-700 bg-emerald-50 text-emerald-900'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  Laki-laki (L)
                </button>
                <button
                  type="button"
                  onClick={() => setGender('P')}
                  className={`min-h-[44px] rounded-xl border text-sm font-medium ${
                    gender === 'P'
                      ? 'border-emerald-700 bg-emerald-50 text-emerald-900'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  Perempuan (P)
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="min-h-[44px] px-4 rounded-xl border border-slate-200 text-sm font-medium text-slate-700"
              >
                Batal
              </button>
              <button
                type="submit"
                className="min-h-[44px] px-6 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-sm font-semibold"
              >
                Simpan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Import from Excel 3-Step Modal (matching video Langkah 5) */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden my-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Impor Santri dari Excel
                </h3>
                <p className="text-xs text-slate-500">Tujuan: {activeClass?.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setImportModalOpen(false)}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Step 1 */}
              <div className="rounded-2xl border border-slate-200 p-4 space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-emerald-800 text-white text-xs font-bold flex items-center justify-center shrink-0">
                    1
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Unduh template</p>
                    <p className="text-xs text-slate-500">Kolom: No, NIS, Nama, Jenis Kelamin (L/P)</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={downloadStudentExcelTemplate}
                  className="w-full min-h-[42px] rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 text-xs font-semibold inline-flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Unduh template_siswa_trubus_iman.xlsx
                </button>
              </div>

              {/* Step 2 */}
              <div className="rounded-2xl border border-slate-200 p-4 space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-emerald-800 text-white text-xs font-bold flex items-center justify-center shrink-0">
                    2
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Pilih file yang sudah diisi</p>
                    <p className="text-xs text-slate-500">Isi di Excel/WPS/Google Sheets, lalu pilih file .xlsx atau .csv</p>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleExcelFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full min-h-[42px] rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold inline-flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  {importFilename ? `File dipilih: ${importFilename}` : 'Pilih file .xlsx atau .csv'}
                </button>
                {importError && (
                  <p className="text-xs text-rose-700 font-medium">{importError}</p>
                )}
              </div>

              {/* Step 3: Validation Preview */}
              {parsedRows.length > 0 && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-emerald-800 text-white text-xs font-bold flex items-center justify-center shrink-0">
                        3
                      </span>
                      <p className="text-sm font-semibold text-slate-900">
                        Periksa sebelum dimasukkan
                      </p>
                    </div>
                    <p className="text-xs font-semibold tabular-nums">
                      <span className="text-emerald-800">{validRows.length} siap</span>
                      {invalidRows.length > 0 && (
                        <span className="text-amber-700"> · {invalidRows.length} perlu diperbaiki</span>
                      )}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={validRows.length === 0}
                    onClick={handleCommitImport}
                    className="w-full min-h-[44px] rounded-xl bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
                  >
                    Masukkan {validRows.length} santri ke {activeClass?.name}
                  </button>

                  <div className="max-h-48 overflow-y-auto rounded-xl bg-white border border-slate-200 divide-y divide-slate-100">
                    {parsedRows.map((row) => (
                      <div
                        key={row.rowNumber}
                        className="px-3 py-2 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate">{row.name}</p>
                          <p className="text-slate-500">
                            Baris {row.rowNumber} · {row.gender || '?'} {row.nis ? `· ${row.nis}` : ''}
                          </p>
                        </div>
                        {row.valid ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            OK
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-700 font-medium shrink-0">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {row.error}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
