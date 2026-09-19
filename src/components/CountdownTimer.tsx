import React, { useEffect, useState } from 'react';
import { Timer, Pause } from 'lucide-react';

interface CountdownTimerProps {
  timerEndsAt?: string | null;
  paused?: boolean;
  totalDurationSeconds?: number;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  timerEndsAt,
  paused = false,
  totalDurationSeconds = 15,
}) => {
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    if (!timerEndsAt) return totalDurationSeconds;
    const diff = Math.ceil((new Date(timerEndsAt).getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
  });

  useEffect(() => {
    if (!timerEndsAt || paused) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const end = new Date(timerEndsAt).getTime();
      const left = Math.max(0, Math.ceil((end - now) / 1000));
      setSecondsLeft(left);
    }, 200);

    return () => clearInterval(interval);
  }, [timerEndsAt, paused]);

  if (paused) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-950/60 border border-amber-500/40 text-amber-300 font-mono">
        <Pause className="w-5 h-5 animate-pulse" />
        <span className="text-sm font-bold tracking-widest uppercase">AUCTION PAUSED</span>
      </div>
    );
  }

  if (!timerEndsAt) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 font-mono text-xs">
        <Timer className="w-4 h-4" />
        <span>WAITING FOR BID</span>
      </div>
    );
  }

  const isUrgent = secondsLeft <= 3;
  const isWarning = secondsLeft <= 7 && secondsLeft > 3;

  return (
    <div
      id="countdown-timer"
      className={`flex items-center gap-2.5 px-4 py-2 rounded-2xl border font-mono transition-all ${
        isUrgent
          ? 'bg-rose-950/80 border-rose-500 text-rose-300 animate-pulse shadow-lg shadow-rose-950/50 scale-105'
          : isWarning
          ? 'bg-amber-950/60 border-amber-500/60 text-amber-300'
          : 'bg-slate-900/90 border-slate-700/80 text-emerald-400'
      }`}
    >
      <Timer className={`w-5 h-5 ${isUrgent ? 'text-rose-400 animate-spin' : ''}`} />
      <div className="flex items-baseline gap-1">
        <span className="text-2xl sm:text-3xl font-extrabold tracking-tighter leading-none">
          {secondsLeft}
        </span>
        <span className="text-xs font-semibold uppercase opacity-75">s</span>
      </div>
    </div>
  );
};
