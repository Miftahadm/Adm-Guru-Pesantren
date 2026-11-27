/**
 * Core Domain Types for Adm Guru Pesantren Trubus Iman
 * All records are stored locally on the user's device (offline-first).
 */

export type Gender = 'L' | 'P';

export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7; // 1 = Senin ... 7 = Ahad

export type NavTab =
  | 'dashboard'
  | 'schedule'
  | 'attendance'
  | 'grades'
  | 'more'
  | 'journal'
  | 'students'
  | 'extracurricular'
  | 'reminders'
  | 'reports'
  | 'backup'
  | 'admin'
  | 'versions';

export interface TeacherProfile {
  fullName: string;
  nickName: string; // Used in greetings & voice alarm TTS
  gender: Gender;
  nipNiy: string;
  schoolName: string;
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  onboardingCompleted: boolean;
  alarmSoundEnabled: boolean;
  alarmVolume: number; // 0 to 1
  voiceRate: number; // 0.7 to 1.3
  notificationPermission: 'default' | 'granted' | 'denied';
}

export interface ClassRoom {
  id: string;
  level: string; // e.g., "Kelas 7", "Kelas 10", "KMI 1"
  rombel: string; // e.g., "A", "B", "IPA 1", or ""
  name: string; // Computed display name e.g., "Kelas 7A"
  subjects: string[]; // Subjects taught in this class
}

export interface Student {
  id: string;
  classId: string;
  nis: string;
  name: string;
  gender: Gender;
}

export type ScheduleType = 'mengajar' | 'istirahat' | 'pulang';

export interface ScheduleItem {
  id: string;
  dayOfWeek: DayOfWeek;
  type: ScheduleType;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  classId?: string;
  className?: string;
  subject?: string;
  alarmLeadMinutes: 0 | 5 | 10 | 15;
  active: boolean;
  notes?: string;
}

export type AttendanceStatus = 'H' | 'S' | 'I' | 'A';

export interface AttendanceRecord {
  id: string; // `${date}_${classId}_${subject}`
  date: string; // "YYYY-MM-DD"
  classId: string;
  subject: string; // "Harian" or subject name
  entries: Record<string, AttendanceStatus>; // studentId -> status
  updatedAt: string;
}

export interface GradeColumn {
  id: string;
  label: string; // e.g., "T1", "T2", "PH1"
  title: string; // Optional description e.g., "Latihan Bab 1"
  date: string;
}

export interface GradeSheet {
  id: string; // `${classId}_${subject}_${semester}_${academicYear}`
  classId: string;
  subject: string;
  semester: 'Ganjil' | 'Genap';
  academicYear: string;
  taskColumns: GradeColumn[];
  dailyColumns: GradeColumn[];
  taskScores: Record<string, Record<string, number | null>>; // studentId -> columnId -> score
  dailyScores: Record<string, Record<string, number | null>>; // studentId -> columnId -> score
  examScores: Record<string, { uts: number | null; uas: number | null }>; // studentId -> UTS/UAS
  updatedAt: string;
}

/**
 * Jurnal Mengajar supports 2 distinct modes:
 * 1. 'in_class' ("Di Kelas"): standard classroom teaching journal
 * 2. 'non_class' ("Non Kelas"): editable/addable/deletable non-teaching teacher activities
 */
export type JournalCategory = 'in_class' | 'non_class';

export interface JournalEntry {
  id: string;
  date: string; // "YYYY-MM-DD"
  category: JournalCategory;
  // Fields for 'in_class'
  classId?: string;
  className?: string;
  subject?: string;
  material?: string;
  // Fields for 'non_class'
  nonClassType?: string; // e.g., "Piket Guru", "Rapat Dewan Asatidz", "Pembinaan Asrama"
  location?: string;
  // Shared fields
  startTime: string;
  endTime: string;
  activity: string;
  notes: string;
  reminderEnabled: boolean;
  reminderDate?: string;
  reminderTime?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExtracurricularProgram {
  id: string;
  name: string;
  type: 'Ekstrakurikuler' | 'Les' | 'Halaqah';
  scheduleText: string;
  mentorName: string;
  members: Array<{
    id: string;
    name: string;
    className: string;
    gender: Gender;
  }>;
  attendance: Array<{
    id: string;
    date: string;
    entries: Record<string, AttendanceStatus>;
  }>;
  journals: Array<{
    id: string;
    date: string;
    topic: string;
    activity: string;
    notes: string;
  }>;
}

export type ReminderFrequency = 'once' | 'daily' | 'weekly';

export interface ReminderNote {
  id: string;
  title: string;
  description: string;
  frequency: ReminderFrequency;
  date?: string; // For 'once'
  dayOfWeek?: DayOfWeek; // For 'weekly'
  time: string; // "HH:mm"
  active: boolean;
  createdAt: string;
}

/**
 * Admin-managed branding and official school letterhead (Kop Surat)
 * Protected by password "2011"
 */
export interface AdminBranding {
  appName: string;
  logoDataUrl: string | null; // Custom uploaded/URL app logo
  thumbnailDataUrl: string | null; // Custom uploaded/URL online OG thumbnail
  foundationName: string; // Kop Surat line 1
  institutionName: string; // Kop Surat line 2
  institutionSubtitle: string; // Kop Surat line 3
  address: string;
  contactInfo: string;
  principalName: string;
  principalTitle: string;
  principalNip: string;
  city: string;
  updatedAt: string;
}

export type VersionChangeType = 'Added' | 'Updated' | 'Fixed' | 'Admin';

export interface VersionChangeItem {
  type: VersionChangeType;
  summary: string;
}

export interface VersionRecord {
  version: string; // Semantic version e.g., "1.2.0"
  releasedAt: string; // ISO date or timestamp
  recordedOnDeviceAt: string; // Automated local device timestamp
  title: string;
  source: 'system_release' | 'auto_migration' | 'admin_update';
  changes: VersionChangeItem[];
}

export interface AppDatabase {
  schemaVersion: number;
  installedAppVersion: string;
  lastBackupAt: string | null;
  profile: TeacherProfile;
  classes: ClassRoom[];
  students: Student[];
  schedules: ScheduleItem[];
  attendances: AttendanceRecord[];
  gradeSheets: GradeSheet[];
  journals: JournalEntry[];
  nonClassTypes: string[]; // Customizable list of non-class activity types (editable/addable/deletable)
  extracurriculars: ExtracurricularProgram[];
  reminders: ReminderNote[];
  branding: AdminBranding;
  versionHistory: VersionRecord[];
}

export type PaperSize = 'a4' | 'f4';
export type PageOrientation = 'portrait' | 'landscape';

export interface ExportOptions {
  paperSize: PaperSize;
  orientation: PageOrientation;
  includeSignature?: boolean;
}
