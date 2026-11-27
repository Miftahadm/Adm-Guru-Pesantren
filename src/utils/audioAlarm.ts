import { ScheduleItem, TeacherProfile } from '../types';

/**
 * Builds natural Indonesian voice alarm script matching the video workflow.
 * Example: "Bu Sari, lima menit lagi waktunya mengajar kelas 7A, IPA."
 */
export function buildAlarmSpeechText(item: ScheduleItem, profile: TeacherProfile): string {
  const name = profile.nickName?.trim() || profile.fullName?.trim() || 'Bapak Ibu Guru';
  const leadPhrase =
    item.alarmLeadMinutes === 0
      ? 'sekarang'
      : item.alarmLeadMinutes === 5
        ? 'lima menit lagi'
        : item.alarmLeadMinutes === 10
          ? 'sepuluh menit lagi'
          : 'lima belas menit lagi';

  if (item.type === 'istirahat') {
    return `${name}, ${leadPhrase} waktunya istirahat.`;
  }
  if (item.type === 'pulang') {
    return `${name}, ${leadPhrase} waktunya pulang dan mengakhiri kegiatan belajar mengajar.`;
  }

  const cls = item.className || 'kelas';
  const subj = item.subject ? `, mata pelajaran ${item.subject}` : '';
  return `${name}, ${leadPhrase} waktunya mengajar ${cls}${subj}.`;
}

/**
 * Plays a clean two-tone school chime using Web Audio API (works completely offline).
 */
export function playAlarmChime(volume: number = 0.8): void {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99]; // C5 - E5 - G5 pleasant bell triad

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.16);
      gain.gain.setValueAtTime(0.0001, now + idx * 0.16);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.05, volume * 0.25), now + idx * 0.16 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.16 + 0.55);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.16);
      osc.stop(now + idx * 0.16 + 0.6);
    });
  } catch {
    // Audio playback may be blocked until user interaction
  }
}

/**
 * Speaks Indonesian text via Web Speech API (id-ID).
 */
export function speakIndonesian(text: string, volume: number = 0.9, rate: number = 1.0): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    utterance.volume = Math.min(1, Math.max(0.1, volume));
    utterance.rate = Math.min(1.4, Math.max(0.7, rate));

    const voices = window.speechSynthesis.getVoices();
    const idVoice =
      voices.find((v) => v.lang.toLowerCase().startsWith('id')) ||
      voices.find((v) => v.lang.toLowerCase().includes('ms'));
    if (idVoice) {
      utterance.voice = idVoice;
    }

    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    return false;
  }
}

export function stopSpeech(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

export async function requestNotificationPermission(): Promise<'granted' | 'denied' | 'default'> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch {
    return 'default';
  }
}

export function sendBrowserNotification(title: string, body: string): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/pwa-192x192.png',
      });
    } catch {
      // Ignore in restricted iframe contexts
    }
  }
}
