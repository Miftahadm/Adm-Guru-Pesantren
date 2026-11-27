import React, { useEffect, useState } from 'react';
import { Bell, Clock, Volume2, X } from 'lucide-react';
import { ScheduleItem, TeacherProfile } from '../types';
import { buildAlarmSpeechText, playAlarmChime, speakIndonesian, stopSpeech } from '../utils/audioAlarm';
import { formatTodayIndonesian } from '../utils/exportOfficial';

interface AlarmModalProps {
  schedule: ScheduleItem | null;
  profile: TeacherProfile;
  onDismiss: () => void;
  onSnooze: (minutes: number) => void;
}

export const AlarmModal: React.FC<AlarmModalProps> = ({
  schedule,
  profile,
  onDismiss,
  onSnooze,
}) => {
  const [clockText, setClockText] = useState('');

  useEffect(() => {
    if (!schedule) return;
    const updateClock = () => {
      const now = new Date();
      setClockText(
        `${String(now.getHours()).padStart(2, '0')}.${String(now.getMinutes()).padStart(2, '0')}`
      );
    };
    updateClock();
    const timer = window.setInterval(updateClock, 1000);

    const speechText = buildAlarmSpeechText(schedule, profile);
    playAlarmChime(profile.alarmVolume);
    const speakTimer = window.setTimeout(() => {
      speakIndonesian(speechText, profile.alarmVolume, profile.voiceRate);
    }, 650);

    return () => {
      window.clearInterval(timer);
      window.clearTimeout(speakTimer);
      stopSpeech();
    };
  }, [schedule, profile]);

  if (!schedule) return null;

  const speechText = buildAlarmSpeechText(schedule, profile);
  const heading =
    schedule.type === 'istirahat'
      ? 'Waktunya Istirahat'
      : schedule.type === 'pulang'
        ? 'Waktunya Pulang'
        : 'Waktunya Mengajar';

  const subtitle =
    schedule.type === 'mengajar'
      ? `${schedule.className || 'Kelas'} · ${schedule.subject || 'Mata Pelajaran'} · mulai ${schedule.startTime}`
      : `${schedule.notes || heading} · ${schedule.startTime}`;

  const handleReplay = () => {
    playAlarmChime(profile.alarmVolume);
    window.setTimeout(() => {
      speakIndonesian(speechText, profile.alarmVolume, profile.voiceRate);
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#042F2E]/95 backdrop-blur-md p-4 text-white">
      <div className="w-full max-w-md rounded-3xl bg-gradient-to-b from-emerald-900 to-[#052E24] border border-emerald-700/60 p-7 text-center shadow-2xl">
        <p className="font-mono text-5xl font-bold tracking-tight tabular-nums text-white">
          {clockText}
        </p>
        <p className="mt-1.5 text-sm text-emerald-200">{formatTodayIndonesian()}</p>

        <div className="my-7 flex justify-center">
          <div className="w-24 h-24 rounded-full bg-emerald-800/80 border border-amber-400/50 flex items-center justify-center shadow-inner">
            <Bell className="w-11 h-11 text-amber-400" />
          </div>
        </div>

        <p className="text-xs font-medium tracking-wide text-amber-300">{heading}</p>
        <h2 className="mt-1.5 text-2xl font-bold text-white">{heading}</h2>
        <p className="mt-1 text-sm text-emerald-100">{subtitle}</p>

        <div className="mt-5 rounded-2xl bg-black/20 border border-white/10 p-4">
          <p className="text-sm italic text-emerald-50 leading-relaxed">“{speechText}”</p>
          <button
            type="button"
            onClick={handleReplay}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-amber-300 hover:text-amber-200 min-h-[36px] px-3"
          >
            <Volume2 className="w-4 h-4" />
            Putar Ulang Suara Pengingat
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              stopSpeech();
              onSnooze(5);
            }}
            className="min-h-[46px] rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-sm font-medium text-white flex items-center justify-center gap-1.5 transition-colors"
          >
            <Clock className="w-4 h-4" />
            Tunda 5 mnt
          </button>
          <button
            type="button"
            onClick={() => {
              stopSpeech();
              onSnooze(10);
            }}
            className="min-h-[46px] rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-sm font-medium text-white flex items-center justify-center gap-1.5 transition-colors"
          >
            <Clock className="w-4 h-4" />
            Tunda 10 mnt
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            stopSpeech();
            onDismiss();
          }}
          className="mt-3 w-full min-h-[48px] rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          <X className="w-4 h-4" />
          Matikan Alarm
        </button>

        <p className="mt-4 text-xs text-emerald-300/80">
          Adm Guru Pesantren Trubus Iman
        </p>
      </div>
    </div>
  );
};
