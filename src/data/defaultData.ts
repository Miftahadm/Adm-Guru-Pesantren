import { AppDatabase, VersionRecord } from '../types';

export const CURRENT_APP_VERSION = '1.4.0';
export const CURRENT_SCHEMA_VERSION = 3;

export const DAY_NAMES: Record<number, string> = {
  1: 'Senin',
  2: 'Selasa',
  3: 'Rabu',
  4: 'Kamis',
  5: 'Jumat',
  6: 'Sabtu',
  7: 'Ahad',
};

export const SHORT_DAY_NAMES: Record<number, string> = {
  1: 'Sen',
  2: 'Sel',
  3: 'Rab',
  4: 'Kam',
  5: 'Jum',
  6: 'Sab',
  7: 'Ahd',
};

export const DEFAULT_SUBJECTS = [
  'Matematika',
  'Bahasa Indonesia',
  'Bahasa Arab',
  'Bahasa Inggris',
  'IPA',
  'IPS',
  'Fiqih',
  'Aqidah Akhlak',
  'Tahfidz Al-Quran',
  'Pendidikan Pancasila',
  'PJOK',
  'Seni Budaya',
];

export const DEFAULT_NON_CLASS_TYPES = [
  'Piket Guru & Kedisiplinan',
  'Rapat Dewan Asatidz',
  'Pembinaan Asrama Santri',
  'Kunjungan / Komunikasi Wali Santri',
  'Penyusunan Modul & Administrasi',
  'Pelatihan / MGMP / KKG',
  'Pendampingan Lomba / Kegiatan Pesantren',
];

/**
 * Official chronological release manifest.
 * On each new deployment, adding a release entry here automatically triggers
 * the device version tracker & changelog logger upon app startup.
 */
export const SYSTEM_RELEASE_MANIFEST: Omit<VersionRecord, 'recordedOnDeviceAt'>[] = [
  {
    version: '1.0.0',
    releasedAt: '2026-10-01',
    title: 'Rilis Perdana Administrasi Guru Offline-First',
    source: 'system_release',
    changes: [
      { type: 'Added', summary: 'Biodata guru, pengaturan kelas & rombel (PAUD hingga Kelas 12 / KMI).' },
      { type: 'Added', summary: 'Jadwal mengajar harian dengan alarm suara berbahasa Indonesia (TTS) & notifikasi.' },
      { type: 'Added', summary: 'Data siswa per kelas dengan fitur impor Excel (.xlsx/.csv) dan template unduhan.' },
      { type: 'Added', summary: 'Absensi harian & per mata pelajaran dengan tombol cepat Semua Hadir dan simpan otomatis.' },
      { type: 'Added', summary: 'Daftar Nilai lengkap (Tugas, Penilaian Harian, UTS & UAS) dengan rata-rata otomatis.' },
    ],
  },
  {
    version: '1.1.0',
    releasedAt: '2026-11-05',
    title: 'Jurnal Mengajar Dual-Mode (Di Kelas & Non Kelas) & Ekstrakurikuler',
    source: 'system_release',
    changes: [
      { type: 'Added', summary: 'Jurnal Mengajar berbasis kalender dengan 2 kategori: Di Kelas dan Non Kelas (kegiatan selain mengajar yang dapat ditambah, diedit, dan dihapus).' },
      { type: 'Added', summary: 'Pengelolaan jenis kegiatan Non Kelas kustom oleh guru.' },
      { type: 'Added', summary: 'Modul Ekstrakurikuler & Les lengkap dengan absensi peserta dan jurnal kegiatan.' },
      { type: 'Added', summary: 'Modul Catatan & Pengingat (Sekali, Harian, Mingguan) serta Cadangan & Pulihkan file lokal.' },
    ],
  },
  {
    version: '1.2.0',
    releasedAt: '2026-11-27',
    title: 'Ekspor Resmi Pesantren Trubus Iman, Panel Admin & Otomasi Versi',
    source: 'system_release',
    changes: [
      { type: 'Added', summary: 'Format ekspor resmi PDF (Kop Surat + Blok Tanda Tangan) & Excel (.xlsx) Pesantren Trubus Iman di seluruh modul data.' },
      { type: 'Added', summary: 'Panel Admin terproteksi password untuk kustomisasi Logo Aplikasi, Thumbnail Online (OG), dan Identitas Kop Surat.' },
      { type: 'Added', summary: 'Otomasi pencatatan riwayat versi & audit perubahan aplikasi dari masa ke masa.' },
      { type: 'Updated', summary: 'Dukungan penuh Progressive Web App (PWA) dengan Service Worker offline dan tombol Install Aplikasi.' },
    ],
  },
  {
    version: '1.3.0',
    releasedAt: '2026-11-27',
    title: 'Fitur Share & Unduh APK Android untuk WhatsApp di Beranda',
    source: 'system_release',
    changes: [
      { type: 'Added', summary: 'Tombol Share APK (WA) pada Beranda untuk mengunduh file APK Android otomatis dan membagikannya via WhatsApp.' },
      { type: 'Added', summary: 'Pengelolaan file/tautan APK Android resmi di Panel Admin (Password 2011) dengan penyimpanan biner IndexedDB.' },
      { type: 'Added', summary: 'Ekspor konfigurasi twa-manifest.json siap pakai untuk kompilasi APK resmi melalui PWABuilder / Bubblewrap.' },
    ],
  },
  {
    version: '1.4.0',
    releasedAt: '2026-11-27',
    title: 'Dual Mode Offline (Perangkat/APK) & Online (Sinkronisasi GitHub)',
    source: 'system_release',
    changes: [
      { type: 'Added', summary: 'Switcher Dual Mode (Offline & Online) di Beranda dan Navigasi: mode Offline memakai database perangkat lokal secara penuh, mode Online menyinkronkan pembaruan dari GitHub otomatis.' },
      { type: 'Added', summary: 'Sinkronisasi otomatis dari GitHub meliputi pembaruan Service Worker/aplikasi, rilis APK terbaru, data inti (kelas, santri, jenis kegiatan non-kelas), dan pengumuman pusat pesantren.' },
      { type: 'Added', summary: 'Pengaturan Repository GitHub & ekspor central-data.json di Panel Admin (Password 2011).' },
    ],
  },
];

export function formatLocalDateISO(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getTodayDayOfWeek(date: Date = new Date()): 1 | 2 | 3 | 4 | 5 | 6 | 7 {
  const jsDay = date.getDay(); // 0 = Sunday, 1 = Monday ... 6 = Saturday
  return (jsDay === 0 ? 7 : jsDay) as 1 | 2 | 3 | 4 | 5 | 6 | 7;
}

export function createInitialDatabase(): AppDatabase {
  const today = formatLocalDateISO();
  const nowIso = new Date().toISOString();
  const todayDow = getTodayDayOfWeek();

  const class7AId = 'cls_7a';
  const class7BId = 'cls_7b';

  const students = [
    { id: 'stu_1', classId: class7AId, nis: '20260701', name: 'Aisyah Putri Rahmawati', gender: 'P' as const },
    { id: 'stu_2', classId: class7AId, nis: '20260702', name: 'Bima Saputra Pratama', gender: 'L' as const },
    { id: 'stu_3', classId: class7AId, nis: '20260703', name: 'Citra Lestari', gender: 'P' as const },
    { id: 'stu_4', classId: class7AId, nis: '20260704', name: 'Dafa Pratama Putra', gender: 'L' as const },
    { id: 'stu_5', classId: class7AId, nis: '20260705', name: 'Elisa Maharani', gender: 'P' as const },
    { id: 'stu_6', classId: class7AId, nis: '20260706', name: 'Fajar Nugroho', gender: 'L' as const },
    { id: 'stu_7', classId: class7AId, nis: '20260707', name: 'Gita Anjani', gender: 'P' as const },
    { id: 'stu_8', classId: class7AId, nis: '20260708', name: 'Hafiz Maulana', gender: 'L' as const },
    { id: 'stu_9', classId: class7BId, nis: '20260721', name: 'Arif Kurniawan', gender: 'L' as const },
    { id: 'stu_10', classId: class7BId, nis: '20260722', name: 'Bunga Melati', gender: 'P' as const },
    { id: 'stu_11', classId: class7BId, nis: '20260723', name: 'Cahyo Utomo', gender: 'L' as const },
    { id: 'stu_12', classId: class7BId, nis: '20260724', name: 'Nadia Rahma', gender: 'P' as const },
    { id: 'stu_13', classId: class7BId, nis: '20260725', name: 'Raka Firmansyah', gender: 'L' as const },
    { id: 'stu_14', classId: class7BId, nis: '20260726', name: 'Salsa Amelia', gender: 'P' as const },
  ];

  const versionHistory: VersionRecord[] = SYSTEM_RELEASE_MANIFEST.map((r) => ({
    ...r,
    recordedOnDeviceAt: nowIso,
  }));

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    installedAppVersion: CURRENT_APP_VERSION,
    lastBackupAt: null,
    profile: {
      fullName: 'Ustadzah Sari Wulandari, S.Pd.',
      nickName: 'Bu Sari',
      gender: 'P',
      nipNiy: 'NIY. 2011.04.018',
      schoolName: 'Pesantren Trubus Iman',
      academicYear: '2026/2027',
      semester: 'Ganjil',
      onboardingCompleted: true,
      alarmSoundEnabled: true,
      alarmVolume: 0.9,
      voiceRate: 1.0,
      notificationPermission: 'default',
    },
    classes: [
      {
        id: class7AId,
        level: 'Kelas 7',
        rombel: 'A',
        name: 'Kelas 7A',
        subjects: ['Matematika', 'IPA', 'Bahasa Indonesia', 'Bahasa Arab'],
      },
      {
        id: class7BId,
        level: 'Kelas 7',
        rombel: 'B',
        name: 'Kelas 7B',
        subjects: ['Matematika', 'IPA', 'Pendidikan Pancasila'],
      },
    ],
    students,
    schedules: [
      {
        id: 'sch_1',
        dayOfWeek: todayDow,
        type: 'mengajar',
        startTime: '07:30',
        endTime: '08:50',
        classId: class7AId,
        className: 'Kelas 7A',
        subject: 'IPA',
        alarmLeadMinutes: 5,
        active: true,
      },
      {
        id: 'sch_2',
        dayOfWeek: todayDow,
        type: 'mengajar',
        startTime: '08:50',
        endTime: '09:50',
        classId: class7AId,
        className: 'Kelas 7A',
        subject: 'Matematika',
        alarmLeadMinutes: 5,
        active: true,
      },
      {
        id: 'sch_3',
        dayOfWeek: todayDow,
        type: 'istirahat',
        startTime: '09:50',
        endTime: '10:15',
        alarmLeadMinutes: 0,
        active: true,
        notes: 'Istirahat & Shalat Dhuha',
      },
      {
        id: 'sch_4',
        dayOfWeek: todayDow,
        type: 'mengajar',
        startTime: '10:15',
        endTime: '11:35',
        classId: class7BId,
        className: 'Kelas 7B',
        subject: 'Matematika',
        alarmLeadMinutes: 5,
        active: true,
      },
      {
        id: 'sch_5',
        dayOfWeek: todayDow,
        type: 'pulang',
        startTime: '13:30',
        endTime: '13:45',
        alarmLeadMinutes: 0,
        active: true,
        notes: 'Selesai KBM & Shalat Dzuhur Berjamaah',
      },
    ],
    attendances: [],
    gradeSheets: [
      {
        id: `${class7AId}_IPA_Ganjil_2026/2027`,
        classId: class7AId,
        subject: 'IPA',
        semester: 'Ganjil',
        academicYear: '2026/2027',
        taskColumns: [
          { id: 't1', label: 'T1', title: 'Pengukuran Besaran', date: today },
          { id: 't2', label: 'T2', title: 'Klasifikasi Makhluk Hidup', date: today },
          { id: 't3', label: 'T3', title: 'Zat dan Perubahannya', date: today },
        ],
        dailyColumns: [
          { id: 'ph1', label: 'PH1', title: 'Penilaian Harian Bab 1', date: today },
          { id: 'ph2', label: 'PH2', title: 'Penilaian Harian Bab 2', date: today },
        ],
        taskScores: {
          stu_1: { t1: 88, t2: 92, t3: 87 },
          stu_2: { t1: 78, t2: 80, t3: 75 },
          stu_3: { t1: 94, t2: 90, t3: 92 },
          stu_4: { t1: 85, t2: 85, t3: 88 },
          stu_5: { t1: 82, t2: 86, t3: 84 },
          stu_6: { t1: 92, t2: 90, t3: 95 },
          stu_7: { t1: 88, t2: 94, t3: 93 },
          stu_8: { t1: 80, t2: 84, t3: 86 },
        },
        dailyScores: {
          stu_1: { ph1: 90, ph2: 88 },
          stu_2: { ph1: 76, ph2: 82 },
          stu_3: { ph1: 92, ph2: 94 },
          stu_4: { ph1: 84, ph2: 86 },
          stu_5: { ph1: 80, ph2: 85 },
          stu_6: { ph1: 90, ph2: 92 },
          stu_7: { ph1: 91, ph2: 90 },
          stu_8: { ph1: 83, ph2: 85 },
        },
        examScores: {
          stu_1: { uts: 86, uas: 90 },
          stu_2: { uts: 75, uas: 80 },
          stu_3: { uts: 90, uas: 93 },
          stu_4: { uts: 86, uas: 84 },
          stu_5: { uts: 82, uas: 84 },
          stu_6: { uts: 90, uas: 92 },
          stu_7: { uts: 89, uas: 91 },
          stu_8: { uts: 82, uas: 86 },
        },
        updatedAt: nowIso,
      },
    ],
    journals: [
      {
        id: 'jrn_1',
        date: today,
        category: 'in_class',
        classId: class7AId,
        className: 'Kelas 7A',
        subject: 'IPA',
        material: 'Pengukuran Besaran Pokok & Turunan',
        startTime: '07:30',
        endTime: '08:50',
        activity: 'Praktik pengukuran menggunakan jangka sorong & diskusi kelompok santri.',
        notes: 'Seluruh santri aktif; lanjutkan latihan konversi satuan pekan depan.',
        reminderEnabled: true,
        reminderDate: today,
        reminderTime: '07:00',
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      {
        id: 'jrn_2',
        date: today,
        category: 'non_class',
        nonClassType: 'Rapat Dewan Asatidz',
        location: 'Aula Kantor Pesantren Trubus Iman',
        startTime: '13:45',
        endTime: '15:00',
        activity: 'Evaluasi kedisiplinan santri bulan berjalan dan persiapan Pekan Ujian Tengah Semester.',
        notes: 'Soal UTS dikumpulkan maksimal hari Jumat ke Bagian Kurikulum.',
        reminderEnabled: false,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
    ],
    nonClassTypes: [...DEFAULT_NON_CLASS_TYPES],
    extracurriculars: [
      {
        id: 'eks_1',
        name: 'Karya Ilmiah Remaja & Sains Santri',
        type: 'Ekstrakurikuler',
        scheduleText: 'Kamis, 15:30 - 17:00',
        mentorName: 'Ustadzah Sari Wulandari, S.Pd.',
        members: [
          { id: 'em_1', name: 'Aisyah Putri Rahmawati', className: 'Kelas 7A', gender: 'P' },
          { id: 'em_2', name: 'Fajar Nugroho', className: 'Kelas 7A', gender: 'L' },
          { id: 'em_3', name: 'Nadia Rahma', className: 'Kelas 7B', gender: 'P' },
        ],
        attendance: [
          {
            id: 'ea_1',
            date: today,
            entries: { em_1: 'H', em_2: 'H', em_3: 'H' },
          },
        ],
        journals: [
          {
            id: 'ej_1',
            date: today,
            topic: 'Pengenalan Metode Ilmiah & Pengamatan Ekosistem Kebun Pesantren',
            activity: 'Observasi tanaman toga pesantren dan pencatatan klasifikasi awal.',
            notes: 'Kelompok sudah memilih topik riset masing-masing.',
          },
        ],
      },
    ],
    reminders: [
      {
        id: 'rem_1',
        title: 'Kumpulkan Modul Ajar & RPP',
        description: 'Setor perangkat pembelajaran ke Wakil Kepala Bidang Kurikulum',
        frequency: 'weekly',
        dayOfWeek: 5,
        time: '14:00',
        active: true,
        createdAt: nowIso,
      },
      {
        id: 'rem_2',
        title: 'Rapat Koordinasi Asatidz',
        description: 'Membawa rekap absensi dan daftar nilai tengah semester',
        frequency: 'once',
        date: today,
        time: '13:30',
        active: true,
        createdAt: nowIso,
      },
    ],
    branding: {
      appName: 'Adm Guru Pesantren Trubus Iman',
      logoDataUrl: null,
      thumbnailDataUrl: null,
      foundationName: 'YAYASAN PENDIDIKAN ISLAM TRUBUS IMAN',
      institutionName: 'PONDOK PESANTREN TRUBUS IMAN',
      institutionSubtitle: 'Lembaga Pendidikan Islam Terpadu · Berilmu, Beramal, Berakhlakul Karimah',
      address: 'Jl. Padang Pangrapat, Kec. Tanah Grogot, Kab. Paser, Kalimantan Timur',
      contactInfo: 'Telp. (0543) 21000 · Website: trubusiman.ponpes.id · Email: admin@trubusiman.ponpes.id',
      principalName: 'KH. Pimpinan Pesantren Trubus Iman',
      principalTitle: 'Pimpinan / Kepala Sekolah',
      principalNip: 'NIY. 2011.01.001',
      city: 'Tanah Grogot',
      apkDownloadUrl: null,
      apkFileName: 'Adm_Guru_Pesantren_Trubus_Iman.apk',
      apkUploadedAt: null,
      apkFileSize: null,
      updatedAt: nowIso,
    },
    syncConfig: {
      mode: 'offline',
      repoOwner: '',
      repoName: '',
      branch: 'main',
      manifestPath: 'public/sync/central-data.json',
      customSyncUrl: null,
      lastSyncAt: null,
      lastSyncedRemoteVersion: null,
      lastSyncStatus: 'idle',
      lastSyncMessage: null,
      latestReleaseUrl: null,
    },
    announcements: [
      {
        id: 'ann_default_1',
        title: 'Selamat Datang di Adm Guru Pesantren Trubus Iman',
        body: 'Aplikasi berjalan penuh secara Offline di perangkat Anda. Klik tombol "Online" kapan saja untuk menyinkronkan data santri inti, pembaruan aplikasi, dan pengumuman resmi dari GitHub pusat.',
        date: today,
        priority: 'info',
        author: 'Admin Pusat Pesantren Trubus Iman',
      },
    ],
    versionHistory,
  };
}
