import React, { useRef, useState } from 'react';
import {
  CheckCircle2,
  Cloud,
  Download,
  Eye,
  EyeOff,
  FileCode2,
  Globe,
  Image as ImageIcon,
  Lock,
  LogOut,
  Megaphone,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Shield,
  Smartphone,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  AdminBranding,
  AppDatabase,
  CentralAnnouncement,
  GitHubSyncConfig,
  VersionChangeItem,
  VersionChangeType,
} from '../types';
import { appendAutomatedVersionRecord } from '../utils/versioning';
import { deleteApkBlob, downloadTwaManifest, loadApkBlob, saveApkBlob } from '../utils/storage';
import { downloadCentralSyncJson, resolveSyncEndpoint } from '../utils/githubSync';
import { BrandLogo } from '../components/BrandLogo';

interface AdminPanelPageProps {
  db: AppDatabase;
  onUpdateDatabase: (updater: (prev: AppDatabase) => AppDatabase) => void;
  onSyncNow: () => void;
  isSyncing: boolean;
}

const ADMIN_PASSCODE = '2011';

/**
 * Compresses an uploaded image file cleanly to a web-safe Data URL using HTMLCanvasElement
 * so it persists reliably in offline IndexedDB/LocalStorage and embeds cleanly into PDFs.
 */
async function readAndOptimizeImage(file: File, maxDim: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.onload = () => {
      const result = String(reader.result || '');
      if (file.type === 'image/svg+xml') {
        resolve(result);
        return;
      }
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(result);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const outputMime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        resolve(canvas.toDataURL(outputMime, 0.88));
      };
      img.onerror = () => resolve(result);
      img.src = result;
    };
    reader.readAsDataURL(file);
  });
}

export const AdminPanelPage: React.FC<AdminPanelPageProps> = ({
  db,
  onUpdateDatabase,
  onSyncNow,
  isSyncing,
}) => {
  const [authenticated, setAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');

  // Editable branding & GitHub sync draft
  const [draft, setDraft] = useState<AdminBranding>(db.branding);
  const [syncDraft, setSyncDraft] = useState<GitHubSyncConfig>(db.syncConfig);
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [annPriority, setAnnPriority] = useState<'penting' | 'info'>('info');
  const [logoUrlInput, setLogoUrlInput] = useState('');
  const [thumbUrlInput, setThumbUrlInput] = useState('');
  const [hasLocalApkBlob, setHasLocalApkBlob] = useState(false);
  const [feedback, setFeedback] = useState('');

  // Manual Admin Release Note builder (auto-increments SemVer)
  const [bumpType, setBumpType] = useState<'patch' | 'minor' | 'major'>('patch');
  const [releaseTitle, setReleaseTitle] = useState('');
  const [changeType, setChangeType] = useState<VersionChangeType>('Updated');
  const [changeText, setChangeText] = useState('');
  const [pendingChanges, setPendingChanges] = useState<VersionChangeItem[]>([]);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);
  const apkInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!authenticated) return;
    loadApkBlob().then((b) => setHasLocalApkBlob(Boolean(b)));
  }, [authenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput.trim() === ADMIN_PASSCODE) {
      setAuthenticated(true);
      setAuthError('');
      setPasswordInput('');
      setDraft(db.branding);
      setSyncDraft(db.syncConfig);
    } else {
      setAuthError('Password Admin salah. Masukkan kode akses resmi Admin.');
    }
  };

  const handleLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readAndOptimizeImage(file, 512);
      setDraft((prev) => ({ ...prev, logoDataUrl: dataUrl }));
      setFeedback('Pratinjau logo diperbarui. Klik "Simpan Perubahan Branding" untuk menerapkan.');
    } catch {
      setFeedback('Gagal memproses file logo.');
    }
    e.target.value = '';
  };

  const handleThumbFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readAndOptimizeImage(file, 1200);
      setDraft((prev) => ({ ...prev, thumbnailDataUrl: dataUrl }));
      setFeedback('Pratinjau thumbnail online diperbarui. Klik "Simpan Perubahan Branding" untuk menerapkan.');
    } catch {
      setFeedback('Gagal memproses file thumbnail.');
    }
    e.target.value = '';
  };

  const handleApkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ok = await saveApkBlob(file);
    if (ok) {
      const nowIso = new Date().toISOString();
      const updatedBranding: AdminBranding = {
        ...draft,
        apkFileName: file.name.endsWith('.apk') ? file.name : `${file.name}.apk`,
        apkFileSize: file.size,
        apkUploadedAt: nowIso,
        updatedAt: nowIso,
      };
      setDraft(updatedBranding);
      setHasLocalApkBlob(true);
      onUpdateDatabase((prev) =>
        appendAutomatedVersionRecord(
          { ...prev, branding: updatedBranding },
          {
            bump: 'patch',
            title: 'Unggah File APK Android Resmi',
            source: 'admin_update',
            changes: [
              {
                type: 'Admin',
                summary: `Admin mengunggah file APK "${updatedBranding.apkFileName}" (${(
                  file.size /
                  (1024 * 1024)
                ).toFixed(2)} MB) untuk fitur Share APK (WA) di Beranda.`,
              },
            ],
          }
        )
      );
      setFeedback(`File APK "${updatedBranding.apkFileName}" berhasil disimpan di perangkat dan siap diunduh otomatis dari tombol Share APK (WA) di Beranda.`);
    } else {
      setFeedback('Gagal menyimpan file APK ke penyimpanan perangkat (IndexedDB).');
    }
    e.target.value = '';
  };

  const handleDeleteApk = async () => {
    await deleteApkBlob();
    setHasLocalApkBlob(false);
    const updatedBranding: AdminBranding = {
      ...draft,
      apkDownloadUrl: null,
      apkUploadedAt: null,
      apkFileSize: null,
      updatedAt: new Date().toISOString(),
    };
    setDraft(updatedBranding);
    onUpdateDatabase((prev) => ({ ...prev, branding: updatedBranding }));
    setFeedback('File/tautan APK Android berhasil dihapus dari konfigurasi Admin.');
  };

  const handleSaveBranding = () => {
    const changes: VersionChangeItem[] = [];
    if (draft.logoDataUrl !== db.branding.logoDataUrl) {
      changes.push({
        type: 'Admin',
        summary: draft.logoDataUrl
          ? 'Admin memperbarui gambar Logo Aplikasi dan Kop Surat.'
          : 'Admin mengembalikan Logo Aplikasi ke logo default Pesantren Trubus Iman.',
      });
    }
    if (draft.thumbnailDataUrl !== db.branding.thumbnailDataUrl) {
      changes.push({
        type: 'Admin',
        summary: draft.thumbnailDataUrl
          ? 'Admin memperbarui gambar Thumbnail Online (OG Share Preview) aplikasi.'
          : 'Admin mengembalikan Thumbnail Online ke bawaan.',
      });
    }
    if (
      draft.institutionName !== db.branding.institutionName ||
      draft.foundationName !== db.branding.foundationName ||
      draft.address !== db.branding.address ||
      draft.principalName !== db.branding.principalName ||
      draft.appName !== db.branding.appName
    ) {
      changes.push({
        type: 'Updated',
        summary: 'Admin memperbarui identitas resmi Kop Surat & tanda tangan Pesantren Trubus Iman.',
      });
    }
    if (
      draft.apkDownloadUrl !== db.branding.apkDownloadUrl ||
      draft.apkFileName !== db.branding.apkFileName
    ) {
      changes.push({
        type: 'Admin',
        summary: 'Admin memperbarui tautan unduhan/nama file APK Android untuk fitur Share WA.',
      });
    }

    const finalBranding: AdminBranding = {
      ...draft,
      updatedAt: new Date().toISOString(),
    };

    onUpdateDatabase((prev) => {
      const updatedDb = { ...prev, branding: finalBranding };
      if (changes.length > 0) {
        return appendAutomatedVersionRecord(updatedDb, {
          bump: 'patch',
          title: 'Pembaruan Branding & Konfigurasi Admin',
          source: 'admin_update',
          changes,
        });
      }
      return updatedDb;
    });

    setFeedback(
      changes.length > 0
        ? 'Perubahan branding berhasil disimpan dan otomatis dicatat ke Riwayat Versi Aplikasi.'
        : 'Konfigurasi berhasil disimpan.'
    );
  };

  const handleSaveGitHubConfig = () => {
    onUpdateDatabase((prev) =>
      appendAutomatedVersionRecord(
        {
          ...prev,
          syncConfig: {
            ...prev.syncConfig,
            repoOwner: syncDraft.repoOwner.trim(),
            repoName: syncDraft.repoName.trim(),
            branch: syncDraft.branch.trim() || 'main',
            manifestPath: syncDraft.manifestPath.trim() || 'public/sync/central-data.json',
            customSyncUrl: syncDraft.customSyncUrl?.trim() || null,
          },
        },
        {
          bump: 'patch',
          title: 'Konfigurasi Sinkronisasi GitHub Pusat',
          source: 'admin_update',
          changes: [
            {
              type: 'Admin',
              summary: `Admin memperbarui sumber sinkronisasi Mode Online: ${
                resolveSyncEndpoint(syncDraft).sourceLabel
              }.`,
            },
          ],
        }
      )
    );
    setFeedback('Konfigurasi Repository GitHub untuk Mode Online berhasil disimpan.');
  };

  const handleAddAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annBody.trim()) return;
    const created: CentralAnnouncement = {
      id: `ann_${Date.now()}`,
      title: annTitle.trim(),
      body: annBody.trim(),
      date: new Date().toISOString().slice(0, 10),
      priority: annPriority,
      author: `Admin ${draft.institutionName || 'Pesantren Trubus Iman'}`,
    };
    onUpdateDatabase((prev) => ({
      ...prev,
      announcements: [created, ...prev.announcements],
    }));
    setAnnTitle('');
    setAnnBody('');
    setFeedback('Pengumuman pusat ditambahkan. Unduh central-data.json untuk diunggah ke GitHub agar diterima semua guru.');
  };

  const handleDeleteAnnouncement = (id: string) => {
    onUpdateDatabase((prev) => ({
      ...prev,
      announcements: prev.announcements.filter((a) => a.id !== id),
    }));
  };

  const handleAddPendingChange = () => {
    if (!changeText.trim()) return;
    setPendingChanges((prev) => [...prev, { type: changeType, summary: changeText.trim() }]);
    setChangeText('');
  };

  const handlePublishCustomRelease = (e: React.FormEvent) => {
    e.preventDefault();
    if (!releaseTitle.trim() || pendingChanges.length === 0) return;
    onUpdateDatabase((prev) =>
      appendAutomatedVersionRecord(prev, {
        bump: bumpType,
        title: releaseTitle.trim(),
        source: 'admin_update',
        changes: pendingChanges,
      })
    );
    setReleaseTitle('');
    setPendingChanges([]);
    setFeedback('Versi pembaruan baru berhasil dicatat otomatis ke Riwayat Versi Aplikasi.');
  };

  if (!authenticated) {
    return (
      <div className="max-w-md mx-auto py-8">
        <form
          onSubmit={handleLogin}
          className="rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-7 shadow-sm space-y-5"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-900 text-amber-400 flex items-center justify-center shrink-0">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Panel Admin Aplikasi</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Kelola Logo Aplikasi, Thumbnail Online &amp; Kop Surat Resmi
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Password Admin
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                inputMode="numeric"
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setAuthError('');
                }}
                placeholder="Masukkan password admin"
                className="w-full min-h-[46px] rounded-xl border border-slate-200 pl-4 pr-12 text-sm font-mono tracking-widest focus:border-emerald-700 focus:outline-none"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700"
                aria-label="Tampilkan password"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {authError && <p className="mt-2 text-xs font-medium text-rose-700">{authError}</p>}
          </div>

          <button
            type="submit"
            className="w-full min-h-[46px] rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-sm font-semibold transition-colors"
          >
            Masuk Panel Admin
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-900 text-amber-400 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Panel Admin</h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Mode Administrator aktif · Perubahan otomatis tercatat di Riwayat Versi (v{db.installedAppVersion})
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setAuthenticated(false)}
          className="min-h-[42px] px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 self-start sm:self-auto"
        >
          <LogOut className="w-4 h-4" />
          Kunci Panel Admin
        </button>
      </div>

      {feedback && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-300 px-4 py-3 text-xs sm:text-sm text-emerald-950 flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Visual Branding Grid: Logo + Online OG Thumbnail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Edit Gambar Logo Aplikasi */}
        <section className="rounded-2xl bg-white border border-slate-200/90 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Gambar Logo Aplikasi</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Tampil di Header, Beranda, Favicon, dan Kop Surat PDF Resmi
              </p>
            </div>
            <ImageIcon className="w-5 h-5 text-emerald-800 shrink-0" />
          </div>

          <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <BrandLogo logoDataUrl={draft.logoDataUrl} size="xl" />
            <div className="space-y-2 flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-700">
                {draft.logoDataUrl ? 'Menggunakan Logo Kustom Admin' : 'Menggunakan Logo Bawaan Trubus Iman'}
              </p>
              <div className="flex flex-wrap gap-2">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleLogoFile}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="min-h-[38px] px-3.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Unggah Logo
                </button>
                {draft.logoDataUrl && (
                  <button
                    type="button"
                    onClick={() => setDraft((prev) => ({ ...prev, logoDataUrl: null }))}
                    className="min-h-[38px] px-3 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-100 inline-flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="url"
              value={logoUrlInput}
              onChange={(e) => setLogoUrlInput(e.target.value)}
              placeholder="Atau tempel URL gambar logo (https://...)"
              className="flex-1 min-h-[42px] rounded-xl border border-slate-200 px-3 text-xs focus:border-emerald-700 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => {
                if (!logoUrlInput.trim()) return;
                setDraft((prev) => ({ ...prev, logoDataUrl: logoUrlInput.trim() }));
                setLogoUrlInput('');
              }}
              className="min-h-[42px] px-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-800 whitespace-nowrap"
            >
              Terapkan URL
            </button>
          </div>
        </section>

        {/* 2. Edit Thumbnail Gambar Online Aplikasi */}
        <section className="rounded-2xl bg-white border border-slate-200/90 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Thumbnail Gambar Online (OG)</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Pratinjau tautan saat dibagikan via WhatsApp, Telegram, atau media sosial
              </p>
            </div>
            <Globe className="w-5 h-5 text-emerald-800 shrink-0" />
          </div>

          {/* Live Social Share Card Preview */}
          <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50">
            <div className="aspect-[1200/630] bg-emerald-900 relative overflow-hidden">
              <img
                src={draft.thumbnailDataUrl || '/og-thumbnail.png'}
                alt="Thumbnail Online Aplikasi"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-3 bg-white border-t border-slate-200">
              <p className="text-xs font-bold text-slate-900 truncate">{draft.appName}</p>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                {draft.institutionName} · Aplikasi Administrasi Guru Offline-First
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <input
              ref={thumbInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleThumbFile}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => thumbInputRef.current?.click()}
              className="min-h-[40px] px-3.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              Unggah Thumbnail (16:9)
            </button>
            {draft.thumbnailDataUrl && (
              <button
                type="button"
                onClick={() => setDraft((prev) => ({ ...prev, thumbnailDataUrl: null }))}
                className="min-h-[40px] px-3 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-100 inline-flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Default
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="url"
              value={thumbUrlInput}
              onChange={(e) => setThumbUrlInput(e.target.value)}
              placeholder="Atau tempel URL thumbnail online (https://...)"
              className="flex-1 min-h-[42px] rounded-xl border border-slate-200 px-3 text-xs focus:border-emerald-700 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => {
                if (!thumbUrlInput.trim()) return;
                setDraft((prev) => ({ ...prev, thumbnailDataUrl: thumbUrlInput.trim() }));
                setThumbUrlInput('');
              }}
              className="min-h-[42px] px-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-800 whitespace-nowrap"
            >
              Terapkan URL
            </button>
          </div>
        </section>
      </div>

      {/* 3. Kop Surat Resmi Pesantren Trubus Iman Settings */}
      <section className="rounded-2xl bg-white border border-slate-200/90 p-5 sm:p-6 space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Identitas Kop Surat &amp; Tanda Tangan Resmi
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Digunakan otomatis pada seluruh dokumen ekspor PDF dan Excel resmi Pesantren Trubus Iman
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nama Aplikasi</label>
            <input
              type="text"
              value={draft.appName}
              onChange={(e) => setDraft((p) => ({ ...p, appName: e.target.value }))}
              className="w-full min-h-[42px] rounded-xl border border-slate-200 px-3 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nama Yayasan (Kop Baris 1)</label>
            <input
              type="text"
              value={draft.foundationName}
              onChange={(e) => setDraft((p) => ({ ...p, foundationName: e.target.value }))}
              className="w-full min-h-[42px] rounded-xl border border-slate-200 px-3 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nama Pesantren / Sekolah (Kop Baris 2)</label>
            <input
              type="text"
              value={draft.institutionName}
              onChange={(e) => setDraft((p) => ({ ...p, institutionName: e.target.value }))}
              className="w-full min-h-[42px] rounded-xl border border-slate-200 px-3 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Kota / Kabupaten (Tanggal Tanda Tangan)</label>
            <input
              type="text"
              value={draft.city}
              onChange={(e) => setDraft((p) => ({ ...p, city: e.target.value }))}
              className="w-full min-h-[42px] rounded-xl border border-slate-200 px-3 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Alamat Lengkap</label>
            <input
              type="text"
              value={draft.address}
              onChange={(e) => setDraft((p) => ({ ...p, address: e.target.value }))}
              className="w-full min-h-[42px] rounded-xl border border-slate-200 px-3 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Kontak / Website / Email</label>
            <input
              type="text"
              value={draft.contactInfo}
              onChange={(e) => setDraft((p) => ({ ...p, contactInfo: e.target.value }))}
              className="w-full min-h-[42px] rounded-xl border border-slate-200 px-3 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nama Pimpinan / Kepala Sekolah</label>
            <input
              type="text"
              value={draft.principalName}
              onChange={(e) => setDraft((p) => ({ ...p, principalName: e.target.value }))}
              className="w-full min-h-[42px] rounded-xl border border-slate-200 px-3 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">NIY / NIP Pimpinan</label>
            <input
              type="text"
              value={draft.principalNip}
              onChange={(e) => setDraft((p) => ({ ...p, principalNip: e.target.value }))}
              className="w-full min-h-[42px] rounded-xl border border-slate-200 px-3 text-sm font-mono"
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={handleSaveBranding}
            className="min-h-[46px] px-6 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-sm font-semibold inline-flex items-center gap-2 shadow-xs"
          >
            <Save className="w-4 h-4" />
            Simpan Perubahan Branding, Kop Surat &amp; Tautan APK
          </button>
        </div>
      </section>

      {/* 3B. File APK Android Management for Dashboard Share (WA) */}
      <section className="rounded-2xl bg-white border border-slate-200/90 p-5 sm:p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Paket File APK Android (Tombol Share WA di Beranda)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Unggah file .apk resmi atau masukkan tautan unduhan langsung agar tombol Share APK (WA) di Beranda otomatis mengunduh file APK.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500">Status Paket APK Saat Ini</p>
            <p className="text-sm font-bold text-slate-900 truncate mt-0.5">
              {hasLocalApkBlob
                ? `${draft.apkFileName} (Tersimpan Lokal)`
                : draft.apkDownloadUrl
                  ? `${draft.apkFileName} (Tautan Unduhan Online)`
                  : 'Belum ada file .apk yang diunggah'}
            </p>
            {draft.apkFileSize && hasLocalApkBlob && (
              <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                Ukuran: {(draft.apkFileSize / (1024 * 1024)).toFixed(2)} MB
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <input
              ref={apkInputRef}
              type="file"
              accept=".apk,application/vnd.android.package-archive"
              onChange={handleApkUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => apkInputRef.current?.click()}
              className="min-h-[40px] px-4 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              Unggah File .APK
            </button>
            <button
              type="button"
              onClick={() =>
                downloadTwaManifest(
                  draft.appName,
                  db.installedAppVersion,
                  typeof window !== 'undefined' ? window.location.origin : 'https://trubusiman.ponpes.id'
                )
              }
              className="min-h-[40px] px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5"
            >
              <FileCode2 className="w-3.5 h-3.5" />
              twa-manifest.json
            </button>
            {(hasLocalApkBlob || draft.apkDownloadUrl) && (
              <button
                type="button"
                onClick={handleDeleteApk}
                className="min-h-[40px] px-3 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-xs font-semibold text-rose-700 inline-flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hapus
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Nama File Unduhan (.apk)
            </label>
            <input
              type="text"
              value={draft.apkFileName || ''}
              onChange={(e) => setDraft((p) => ({ ...p, apkFileName: e.target.value }))}
              placeholder="Adm_Guru_Pesantren_Trubus_Iman.apk"
              className="w-full min-h-[42px] rounded-xl border border-slate-200 px-3 text-xs font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Tautan Unduh Langsung APK Online (opsional)
            </label>
            <input
              type="url"
              value={draft.apkDownloadUrl || ''}
              onChange={(e) =>
                setDraft((p) => ({ ...p, apkDownloadUrl: e.target.value.trim() || null }))
              }
              placeholder="https://.../Adm_Guru_Pesantren_Trubus_Iman.apk"
              className="w-full min-h-[42px] rounded-xl border border-slate-200 px-3 text-xs"
            />
          </div>
        </div>

        <div className="pt-1">
          <button
            type="button"
            onClick={handleSaveBranding}
            className="min-h-[42px] px-5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            Simpan Pengaturan APK
          </button>
        </div>
      </section>

      {/* 3C. Dual Mode GitHub Online Sync & Central Announcements Publisher */}
      <section className="rounded-2xl bg-white border border-slate-200/90 p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Sinkronisasi GitHub &amp; Data Pusat (Mode Online)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Saat guru menekan tombol <strong>Online</strong>, aplikasi otomatis menarik pembaruan aplikasi, data santri inti, dan pengumuman pusat dari repository GitHub ini.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => downloadCentralSyncJson(db)}
            className="min-h-[40px] px-4 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Download className="w-4 h-4" />
            Unduh central-data.json untuk GitHub
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              GitHub Owner / Organisasi
            </label>
            <input
              type="text"
              value={syncDraft.repoOwner}
              onChange={(e) => setSyncDraft((p) => ({ ...p, repoOwner: e.target.value }))}
              placeholder="pesantren-trubus-iman"
              className="w-full min-h-[42px] rounded-xl border border-slate-200 px-3 text-xs font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Nama Repository
            </label>
            <input
              type="text"
              value={syncDraft.repoName}
              onChange={(e) => setSyncDraft((p) => ({ ...p, repoName: e.target.value }))}
              placeholder="adm-guru-trubus-iman"
              className="w-full min-h-[42px] rounded-xl border border-slate-200 px-3 text-xs font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Branch</label>
            <input
              type="text"
              value={syncDraft.branch}
              onChange={(e) => setSyncDraft((p) => ({ ...p, branch: e.target.value }))}
              placeholder="main"
              className="w-full min-h-[42px] rounded-xl border border-slate-200 px-3 text-xs font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Path Manifest JSON
            </label>
            <input
              type="text"
              value={syncDraft.manifestPath}
              onChange={(e) => setSyncDraft((p) => ({ ...p, manifestPath: e.target.value }))}
              placeholder="public/sync/central-data.json"
              className="w-full min-h-[42px] rounded-xl border border-slate-200 px-3 text-xs font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Atau URL JSON Sinkronisasi Langsung HTTPS (opsional, menimpa konfigurasi repo di atas)
          </label>
          <input
            type="url"
            value={syncDraft.customSyncUrl || ''}
            onChange={(e) =>
              setSyncDraft((p) => ({ ...p, customSyncUrl: e.target.value || null }))
            }
            placeholder="https://raw.githubusercontent.com/owner/repo/main/public/sync/central-data.json"
            className="w-full min-h-[42px] rounded-xl border border-slate-200 px-3 text-xs font-mono"
          />
          <p className="mt-1 text-[11px] text-slate-400">
            Sumber aktif: {resolveSyncEndpoint(syncDraft).sourceLabel}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSaveGitHubConfig}
            className="min-h-[42px] px-5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            Simpan Konfigurasi GitHub
          </button>
          <button
            type="button"
            onClick={onSyncNow}
            disabled={isSyncing}
            className="min-h-[42px] px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Menyinkronkan...' : 'Uji Sinkronisasi Sekarang'}
          </button>
        </div>

        {/* Central Announcements Manager */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-amber-700" />
            <h3 className="text-sm font-bold text-slate-900">
              Kelola Pengumuman / Info Pusat ({db.announcements.length})
            </h3>
          </div>

          <form onSubmit={handleAddAnnouncement} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            <select
              value={annPriority}
              onChange={(e) => setAnnPriority(e.target.value as 'penting' | 'info')}
              className="sm:col-span-3 min-h-[40px] rounded-xl border border-slate-200 px-3 text-xs bg-white"
            >
              <option value="info">Info Pusat</option>
              <option value="penting">Penting</option>
            </select>
            <input
              type="text"
              required
              value={annTitle}
              onChange={(e) => setAnnTitle(e.target.value)}
              placeholder="Judul pengumuman pusat..."
              className="sm:col-span-9 min-h-[40px] rounded-xl border border-slate-200 px-3 text-xs"
            />
            <textarea
              rows={2}
              required
              value={annBody}
              onChange={(e) => setAnnBody(e.target.value)}
              placeholder="Isi pengumuman atau informasi penting dari Pesantren Trubus Iman..."
              className="sm:col-span-10 rounded-xl border border-slate-200 p-2.5 text-xs"
            />
            <button
              type="submit"
              className="sm:col-span-2 min-h-[40px] rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
            >
              Tambah Info
            </button>
          </form>

          {db.announcements.length > 0 && (
            <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
              {db.announcements.map((a) => (
                <div key={a.id} className="px-3.5 py-2.5 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900">
                      [{a.priority === 'penting' ? 'Penting' : 'Info'}] {a.title}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{a.body}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteAnnouncement(a.id)}
                    className="w-8 h-8 rounded-lg hover:bg-rose-50 hover:text-rose-700 text-slate-400 flex items-center justify-center shrink-0"
                    aria-label="Hapus pengumuman"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 4. Catat Rilis Versi Baru (Auto-SemVer) */}
      <form
        onSubmit={handlePublishCustomRelease}
        className="rounded-2xl bg-white border border-slate-200/90 p-5 sm:p-6 space-y-4"
      >
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-5 h-5 text-amber-700" />
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Catat Pembaruan Versi Aplikasi (Otomasi SemVer)
            </h2>
            <p className="text-xs text-slate-500">
              Versi saat ini: <span className="font-mono font-semibold">v{db.installedAppVersion}</span> · Sistem otomatis menaikkan nomor versi dan mencatat tanggal rilis
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Tingkat Versi</label>
            <select
              value={bumpType}
              onChange={(e) => setBumpType(e.target.value as 'patch' | 'minor' | 'major')}
              className="w-full min-h-[42px] rounded-xl border border-slate-200 px-3 text-xs bg-white"
            >
              <option value="patch">Patch (Perbaikan / Update Kecil)</option>
              <option value="minor">Minor (Penambahan Fitur Baru)</option>
              <option value="major">Major (Pembaruan Besar)</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Judul Pembaruan</label>
            <input
              type="text"
              value={releaseTitle}
              onChange={(e) => setReleaseTitle(e.target.value)}
              placeholder="Contoh: Pembaruan Kurikulum Semester Genap & Format Kop Baru"
              className="w-full min-h-[42px] rounded-xl border border-slate-200 px-3 text-sm"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={changeType}
            onChange={(e) => setChangeType(e.target.value as VersionChangeType)}
            className="min-h-[42px] rounded-xl border border-slate-200 px-3 text-xs bg-white sm:w-36"
          >
            <option value="Added">Penambahan</option>
            <option value="Updated">Pembaruan</option>
            <option value="Fixed">Perbaikan</option>
            <option value="Admin">Admin</option>
          </select>
          <input
            type="text"
            value={changeText}
            onChange={(e) => setChangeText(e.target.value)}
            placeholder="Tulis detail perubahan lalu klik + Tambah Poin"
            className="flex-1 min-h-[42px] rounded-xl border border-slate-200 px-3 text-sm"
          />
          <button
            type="button"
            onClick={handleAddPendingChange}
            className="min-h-[42px] px-4 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-800 inline-flex items-center justify-center gap-1 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Tambah Poin
          </button>
        </div>

        {pendingChanges.length > 0 && (
          <ul className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-1.5 text-xs text-slate-700">
            {pendingChanges.map((item, i) => (
              <li key={i} className="flex items-center justify-between gap-2">
                <span>
                  <strong className="text-emerald-900">[{item.type}]</strong> {item.summary}
                </span>
                <button
                  type="button"
                  onClick={() => setPendingChanges((p) => p.filter((_, idx) => idx !== i))}
                  className="text-rose-600 hover:underline shrink-0"
                >
                  Hapus
                </button>
              </li>
            ))}
          </ul>
        )}

        <button
          type="submit"
          disabled={!releaseTitle.trim() || pendingChanges.length === 0}
          className="min-h-[44px] px-5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-semibold"
        >
          Terbitkan &amp; Catat Versi Baru
        </button>
      </form>
    </div>
  );
};
