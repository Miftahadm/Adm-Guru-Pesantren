import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { AppDatabase, GradeSheet } from '../types';
import { formatLocalDateISO } from '../data/defaultData';
import { exportGradesOfficial } from '../utils/exportOfficial';
import { ExportButtons } from '../components/ExportButtons';

interface GradesPageProps {
  db: AppDatabase;
  onUpdateGradeSheets: (next: GradeSheet[]) => void;
}

type GradeTab = 'tugas' | 'harian' | 'ujian';

function calcAvg(values: Array<number | null | undefined>): number | null {
  const valid = values.filter((v): v is number => typeof v === 'number' && !Number.isNaN(v));
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

export const GradesPage: React.FC<GradesPageProps> = ({ db, onUpdateGradeSheets }) => {
  const [selectedClassId, setSelectedClassId] = useState(db.classes[0]?.id || '');
  const activeClass = db.classes.find((c) => c.id === selectedClassId) || db.classes[0];
  const subjectOptions = activeClass?.subjects?.length ? activeClass.subjects : ['Umum'];

  const [selectedSubject, setSelectedSubject] = useState(subjectOptions[0] || 'IPA');
  const [semester, setSemester] = useState<'Ganjil' | 'Genap'>(db.profile.semester);
  const [academicYear, setAcademicYear] = useState(db.profile.academicYear);
  const [tab, setTab] = useState<GradeTab>('tugas');

  const classStudents = db.students
    .filter((s) => s.classId === activeClass?.id)
    .sort((a, b) => a.name.localeCompare(b.name));

  const sheetId = `${activeClass?.id || ''}_${selectedSubject}_${semester}_${academicYear}`;

  const getOrCreateSheet = (): GradeSheet => {
    const found = db.gradeSheets.find((g) => g.id === sheetId);
    if (found) return found;
    const today = formatLocalDateISO();
    return {
      id: sheetId,
      classId: activeClass?.id || '',
      subject: selectedSubject,
      semester,
      academicYear,
      taskColumns: [
        { id: 't1', label: 'T1', title: 'Tugas 1', date: today },
        { id: 't2', label: 'T2', title: 'Tugas 2', date: today },
      ],
      dailyColumns: [{ id: 'ph1', label: 'PH1', title: 'Penilaian Harian 1', date: today }],
      taskScores: {},
      dailyScores: {},
      examScores: {},
      updatedAt: new Date().toISOString(),
    };
  };

  const sheet = getOrCreateSheet();

  const persistSheet = (updated: GradeSheet) => {
    const withTimestamp = { ...updated, updatedAt: new Date().toISOString() };
    const exists = db.gradeSheets.some((g) => g.id === sheetId);
    if (exists) {
      onUpdateGradeSheets(db.gradeSheets.map((g) => (g.id === sheetId ? withTimestamp : g)));
    } else {
      onUpdateGradeSheets([...db.gradeSheets, withTimestamp]);
    }
  };

  const handleAddColumn = () => {
    const today = formatLocalDateISO();
    if (tab === 'tugas') {
      const nextNum = sheet.taskColumns.length + 1;
      persistSheet({
        ...sheet,
        taskColumns: [
          ...sheet.taskColumns,
          { id: `t_${Date.now()}`, label: `T${nextNum}`, title: `Tugas ${nextNum}`, date: today },
        ],
      });
    } else if (tab === 'harian') {
      const nextNum = sheet.dailyColumns.length + 1;
      persistSheet({
        ...sheet,
        dailyColumns: [
          ...sheet.dailyColumns,
          { id: `ph_${Date.now()}`, label: `PH${nextNum}`, title: `PH ${nextNum}`, date: today },
        ],
      });
    }
  };

  const handleRemoveColumn = (colId: string) => {
    if (tab === 'tugas' && sheet.taskColumns.length > 1) {
      persistSheet({
        ...sheet,
        taskColumns: sheet.taskColumns.filter((c) => c.id !== colId),
      });
    } else if (tab === 'harian' && sheet.dailyColumns.length > 1) {
      persistSheet({
        ...sheet,
        dailyColumns: sheet.dailyColumns.filter((c) => c.id !== colId),
      });
    }
  };

  const parseScoreInput = (val: string): number | null => {
    if (val.trim() === '') return null;
    const num = Number(val);
    if (Number.isNaN(num)) return null;
    return Math.min(100, Math.max(0, num));
  };

  const handleScoreChange = (studentId: string, colId: string, raw: string) => {
    const parsed = parseScoreInput(raw);
    if (tab === 'tugas') {
      persistSheet({
        ...sheet,
        taskScores: {
          ...sheet.taskScores,
          [studentId]: {
            ...(sheet.taskScores[studentId] || {}),
            [colId]: parsed,
          },
        },
      });
    } else if (tab === 'harian') {
      persistSheet({
        ...sheet,
        dailyScores: {
          ...sheet.dailyScores,
          [studentId]: {
            ...(sheet.dailyScores[studentId] || {}),
            [colId]: parsed,
          },
        },
      });
    }
  };

  const handleExamChange = (studentId: string, field: 'uts' | 'uas', raw: string) => {
    const parsed = parseScoreInput(raw);
    const current = sheet.examScores[studentId] || { uts: null, uas: null };
    persistSheet({
      ...sheet,
      examScores: {
        ...sheet.examScores,
        [studentId]: {
          ...current,
          [field]: parsed,
        },
      },
    });
  };

  const columns = tab === 'tugas' ? sheet.taskColumns : sheet.dailyColumns;
  const scoresMap = tab === 'tugas' ? sheet.taskScores : sheet.dailyScores;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Daftar Nilai {activeClass?.name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {selectedSubject} · Semester {semester} · TA {academicYear}
          </p>
        </div>

        <ExportButtons
          compact
          onExportPDF={() =>
            activeClass &&
            exportGradesOfficial({
              format: 'pdf',
              branding: db.branding,
              profile: db.profile,
              classRoom: activeClass,
              students: classStudents,
              sheet,
            })
          }
          onExportExcel={() =>
            activeClass &&
            exportGradesOfficial({
              format: 'excel',
              branding: db.branding,
              profile: db.profile,
              classRoom: activeClass,
              students: classStudents,
              sheet,
            })
          }
        />
      </div>

      {/* Filters */}
      <div className="rounded-2xl bg-white border border-slate-200/90 p-4 space-y-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-500 mr-1">Kelas:</span>
          {db.classes.map((cls) => (
            <button
              key={cls.id}
              type="button"
              onClick={() => {
                setSelectedClassId(cls.id);
                if (cls.subjects.length > 0 && !cls.subjects.includes(selectedSubject)) {
                  setSelectedSubject(cls.subjects[0]);
                }
              }}
              className={`min-h-[38px] px-3.5 rounded-xl text-xs font-semibold ${
                activeClass?.id === cls.id
                  ? 'bg-emerald-800 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {cls.name}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
          <span className="text-xs font-medium text-slate-500 shrink-0 mr-1">Mapel:</span>
          {subjectOptions.map((subj) => (
            <button
              key={subj}
              type="button"
              onClick={() => setSelectedSubject(subj)}
              className={`min-h-[36px] px-3 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 ${
                selectedSubject === subj
                  ? 'bg-emerald-100 text-emerald-950 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {subj}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100">
            {(['Ganjil', 'Genap'] as const).map((sem) => (
              <button
                key={sem}
                type="button"
                onClick={() => setSemester(sem)}
                className={`min-h-[36px] px-3.5 rounded-lg text-xs font-semibold ${
                  semester === sem ? 'bg-white text-emerald-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                {sem}
              </button>
            ))}
          </div>

          <input
            type="text"
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            aria-label="Tahun pelajaran"
            className="w-32 min-h-[38px] rounded-xl border border-slate-200 px-3 text-xs font-mono text-center text-slate-800 focus:border-emerald-700 focus:outline-none"
          />
        </div>
      </div>

      {/* Component Tabs + Add Column */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white border border-slate-200/90">
          {[
            { id: 'tugas' as GradeTab, label: 'Tugas' },
            { id: 'harian' as GradeTab, label: 'Harian (PH)' },
            { id: 'ujian' as GradeTab, label: 'UTS & UAS' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`min-h-[40px] px-4 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors ${
                tab === t.id ? 'bg-emerald-800 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab !== 'ujian' && (
          <button
            type="button"
            onClick={handleAddColumn}
            className="min-h-[40px] px-3.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Tambah Kolom {tab === 'tugas' ? 'Tugas' : 'PH'}
          </button>
        )}
      </div>

      {/* Score Table */}
      <div className="rounded-2xl bg-white border border-slate-200/90 overflow-x-auto">
        {classStudents.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Belum ada santri di {activeClass?.name}. Tambahkan santri di menu Data Siswa terlebih dahulu.
          </div>
        ) : tab !== 'ujian' ? (
          <table className="w-full text-left border-collapse min-w-[520px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4 sticky left-0 bg-slate-50 z-10 min-w-[180px]">
                  Nama Santri
                </th>
                {columns.map((col) => (
                  <th key={col.id} className="py-3 px-2 text-center min-w-[78px]">
                    <div className="inline-flex items-center gap-1">
                      <span>{col.label}</span>
                      {columns.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveColumn(col.id)}
                          className="text-slate-400 hover:text-rose-600"
                          title={`Hapus kolom ${col.label}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </th>
                ))}
                <th className="py-3 px-4 text-center bg-emerald-50/80 text-emerald-900 min-w-[84px]">
                  Rata²
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {classStudents.map((stu) => {
                const stuVals = columns.map((c) => scoresMap[stu.id]?.[c.id] ?? null);
                const avg = calcAvg(stuVals);
                return (
                  <tr key={stu.id} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-4 font-medium text-slate-900 sticky left-0 bg-white">
                      {stu.name}
                    </td>
                    {columns.map((col) => {
                      const val = scoresMap[stu.id]?.[col.id];
                      return (
                        <td key={col.id} className="py-2 px-1.5 text-center">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={val === null || val === undefined ? '' : val}
                            onChange={(e) => handleScoreChange(stu.id, col.id, e.target.value)}
                            placeholder="-"
                            className="w-16 min-h-[38px] rounded-lg border border-slate-200 text-center font-mono text-sm tabular-nums focus:border-emerald-700 focus:outline-none"
                          />
                        </td>
                      );
                    })}
                    <td className="py-2.5 px-4 text-center font-mono font-bold text-emerald-900 bg-emerald-50/40 tabular-nums">
                      {avg === null ? '-' : avg.toFixed(1)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left border-collapse min-w-[460px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4 min-w-[180px]">Nama Santri</th>
                <th className="py-3 px-3 text-center">UTS</th>
                <th className="py-3 px-3 text-center">UAS</th>
                <th className="py-3 px-4 text-center bg-emerald-50/80 text-emerald-900">
                  Nilai Akhir
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {classStudents.map((stu) => {
                const exam = sheet.examScores[stu.id] || { uts: null, uas: null };
                const avgT = calcAvg(
                  sheet.taskColumns.map((c) => sheet.taskScores[stu.id]?.[c.id] ?? null)
                );
                const avgPH = calcAvg(
                  sheet.dailyColumns.map((c) => sheet.dailyScores[stu.id]?.[c.id] ?? null)
                );
                const finalAvg = calcAvg([avgT, avgPH, exam.uts, exam.uas]);

                return (
                  <tr key={stu.id} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-4 font-medium text-slate-900">{stu.name}</td>
                    <td className="py-2 px-3 text-center">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={exam.uts === null ? '' : exam.uts}
                        onChange={(e) => handleExamChange(stu.id, 'uts', e.target.value)}
                        placeholder="-"
                        className="w-20 min-h-[40px] rounded-lg border border-slate-200 text-center font-mono text-sm tabular-nums focus:border-emerald-700 focus:outline-none"
                      />
                    </td>
                    <td className="py-2 px-3 text-center">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={exam.uas === null ? '' : exam.uas}
                        onChange={(e) => handleExamChange(stu.id, 'uas', e.target.value)}
                        placeholder="-"
                        className="w-20 min-h-[40px] rounded-lg border border-slate-200 text-center font-mono text-sm tabular-nums focus:border-emerald-700 focus:outline-none"
                      />
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono font-bold text-emerald-900 bg-emerald-50/40 tabular-nums">
                      {finalAvg === null ? '-' : finalAvg.toFixed(1)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
