import React from 'react';
import { Droplet, AlertCircle, ShieldAlert, Volume2, VolumeX } from 'lucide-react';

export default function WaterTank({ percentage = 0, waterLevelCm = 0, tankHeightCm = 100, status = 'NORMAL', buzzerStatus = false }) {
  const clampedPct = Math.min(100, Math.max(0, percentage));
  const isHighWater = clampedPct >= 90.0 || status === 'FULL' || status === 'HIGH' || buzzerStatus;

  // Determine color theme based on status
  const getTheme = () => {
    switch (status?.toUpperCase()) {
      case 'EMPTY':
        return {
          waterGrad: 'from-rose-600/90 to-red-500/90',
          waterGlow: 'shadow-[0_0_30px_rgba(244,63,94,0.35)]',
          borderGrad: 'border-rose-500/40',
          badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
          textColor: 'text-rose-400',
        };
      case 'LOW':
        return {
          waterGrad: 'from-amber-600/90 to-yellow-500/90',
          waterGlow: 'shadow-[0_0_30px_rgba(245,158,11,0.35)]',
          borderGrad: 'border-amber-500/40',
          badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          textColor: 'text-amber-400',
        };
      case 'FULL':
        return {
          waterGrad: 'from-violet-600/90 to-indigo-500/90',
          waterGlow: 'shadow-[0_0_30px_rgba(139,92,246,0.35)]',
          borderGrad: 'border-violet-500/40',
          badgeBg: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
          textColor: 'text-violet-400',
        };
      case 'HIGH':
        return {
          waterGrad: 'from-blue-600/90 to-cyan-500/90',
          waterGlow: 'shadow-[0_0_30px_rgba(59,130,246,0.35)]',
          borderGrad: 'border-blue-500/40',
          badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
          textColor: 'text-blue-400',
        };
      default: // NORMAL
        return {
          waterGrad: 'from-cyan-600/90 to-teal-400/90',
          waterGlow: 'shadow-[0_0_30px_rgba(6,182,212,0.35)]',
          borderGrad: 'border-cyan-500/40',
          badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
          textColor: 'text-cyan-400',
        };
    }
  };

  const theme = getTheme();

  return (
    <div className="relative flex flex-col items-center p-6 bg-slate-900/60 rounded-3xl border border-slate-800 shadow-2xl backdrop-blur-xl">
      <div className="w-full flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Droplet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-200">Main Tank Reservoir</h3>
            <p className="text-xs text-slate-400">Total Height: {tankHeightCm} cm</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {buzzerStatus && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
              <Volume2 className="w-3.5 h-3.5 text-rose-400" />
              BUZZER ON
            </span>
          )}
          <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border ${theme.badgeBg}`}>
            {status}
          </span>
        </div>
      </div>

      {/* Cylindrical Tank Outer Frame */}
      <div className="relative w-56 h-80 sm:w-64 sm:h-96 rounded-b-[40px] rounded-t-[20px] bg-gradient-to-b from-slate-950/90 to-slate-900/90 border-2 border-slate-700/60 overflow-hidden shadow-inner flex flex-col justify-end p-2">
        {/* Tank Rim Top */}
        <div className="absolute top-0 left-0 right-0 h-4 bg-slate-800/80 border-b border-slate-700/80 z-20 flex items-center justify-center">
          <div className="w-20 h-1 bg-cyan-500/40 rounded-full" />
        </div>

        {/* Ultrasonic Sensor Representation At Top */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center">
          <div className="px-2 py-0.5 rounded bg-slate-800 border border-slate-600 text-[10px] font-mono text-cyan-400 flex items-center gap-1 shadow-md">
            <span>HC-SR04</span>
          </div>
          <div className="w-0.5 h-3 bg-cyan-400/40" />
        </div>

        {/* Level Measurement Graduation Lines */}
        <div className="absolute inset-y-6 right-3 z-10 flex flex-col justify-between text-[10px] font-mono text-slate-500 pointer-events-none select-none">
          <span className="flex items-center gap-1">--- 100% ({tankHeightCm}cm)</span>
          <span className="flex items-center gap-1 text-rose-400 font-bold">--- 90% (Buzzer &ge;{tankHeightCm * 0.9}cm)</span>
          <span className="flex items-center gap-1">--- 75% ({tankHeightCm * 0.75}cm)</span>
          <span className="flex items-center gap-1">--- 50% ({tankHeightCm * 0.50}cm)</span>
          <span className="flex items-center gap-1">--- 0% (0cm)</span>
        </div>

        {/* Dynamic Water Volume */}
        <div
          className={`relative w-full rounded-b-[32px] bg-gradient-to-t ${theme.waterGrad} ${theme.waterGlow} transition-all duration-1000 ease-out overflow-hidden`}
          style={{ height: `${clampedPct}%` }}
        >
          {/* Surface Rippling Water Wave */}
          <div className="absolute top-0 left-0 right-0 h-3 bg-white/20 blur-[1px] animate-wave" />
          <div className="absolute top-1 left-0 right-0 h-1 bg-white/30" />

          {/* Submerged bubble effervescence */}
          <div className="absolute bottom-2 left-6 w-2 h-2 rounded-full bg-white/20 animate-ping" />
          <div className="absolute bottom-8 right-8 w-1.5 h-1.5 rounded-full bg-white/20 animate-pulse" />
        </div>

        {/* Central Prominent Percentage Readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20">
          <div className="bg-slate-950/75 backdrop-blur-md px-5 py-3 rounded-2xl border border-slate-800 shadow-xl flex flex-col items-center">
            <span className="text-3xl sm:text-4xl font-extrabold tracking-tight font-mono text-white">
              {clampedPct.toFixed(1)}%
            </span>
            <span className="text-xs sm:text-sm font-medium text-slate-300 mt-0.5">
              {waterLevelCm.toFixed(1)} cm / {tankHeightCm} cm
            </span>
          </div>
        </div>
      </div>

      {/* Automatic High Water Buzzer Alert Warning Banner */}
      {isHighWater && (
        <div className="w-full mt-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center justify-between gap-2 shadow-lg animate-pulse">
          <div className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 shrink-0 text-rose-400" />
            <div>
              <div className="font-bold text-rose-200">HIGH WATER WARNING &bull; BUZZER ACTIVE</div>
              <div className="text-[11px] text-rose-300/80">Water level &ge; 90%. Overflow alert sounding on GPIO 23.</div>
            </div>
          </div>
          <span className="px-2 py-0.5 bg-rose-500/30 text-rose-200 rounded font-mono text-[10px] font-bold">
            GPIO 23 ON
          </span>
        </div>
      )}

      {status === 'FULL' && (
        <div className="w-full mt-4 p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0 text-violet-400" />
          <span>Notice: Tank capacity reached (&ge;95%). Turn off pump.</span>
        </div>
      )}
    </div>
  );
}
