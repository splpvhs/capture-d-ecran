import React, { useState, useEffect } from 'react';
import { Wifi, BatteryMedium, Sparkles, Smartphone, Cpu } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface AndroidHeaderProps {
  isRecording?: boolean;
  recordingDuration?: number;
  onOpenSettings?: () => void;
  onOpenAndroidGuide?: () => void;
  onOpenAndroidStudioGuide?: () => void;
}

export const AndroidHeader: React.FC<AndroidHeaderProps> = ({
  isRecording = false,
  recordingDuration = 0,
  onOpenAndroidGuide,
  onOpenAndroidStudioGuide,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainingSec = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSec.toString().padStart(2, '0')}`;
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/60 select-none">
      {/* Android System Status Bar */}
      <div className="flex items-center justify-between px-4 py-1.5 text-xs text-slate-400 font-medium">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-slate-200 tracking-tight">{timeStr || '12:00'}</span>
          {isRecording && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 text-[11px] font-bold animate-pulse">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>REC {formatDuration(recordingDuration)}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Wifi className="w-3.5 h-3.5 text-slate-300" />
            <div className="flex items-center gap-0.5">
              <BatteryMedium className="w-4 h-4 text-emerald-400" />
              <span className="text-[11px] text-slate-300 font-mono">98%</span>
            </div>
          </div>
        </div>
      </div>

      {/* App Branding & Quick Actions */}
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-rose-500 p-0.5 shadow-md shadow-indigo-500/25 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-indigo-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-bold text-white tracking-tight leading-none">
                Screen<span className="text-indigo-400">Droid</span>
              </h1>
              <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">Capture &amp; Enregistreur Haute Définition</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {onOpenAndroidStudioGuide && (
            <button
              onClick={onOpenAndroidStudioGuide}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-500/20 border border-indigo-500/35 hover:bg-indigo-500/30 text-indigo-300 text-xs font-semibold transition active:scale-95 shadow-sm"
              title="Guide Android Studio, GitHub et VS Code"
            >
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Android Studio</span>
              <span className="sm:hidden">Studio</span>
            </button>
          )}

          {onOpenAndroidGuide && (
            <button
              onClick={onOpenAndroidGuide}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 text-emerald-300 text-xs font-semibold transition active:scale-95 shadow-sm"
              title="Guide d'installation Android & QR Code"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Guide Mobile</span>
            </button>
          )}

          <PWAInstallButton variant="compact" />
        </div>
      </div>
    </header>
  );
};
