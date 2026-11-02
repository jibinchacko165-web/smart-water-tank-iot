import React from 'react';
import { Radio, Gauge, ArrowDownUp, Clock, HardDrive, Hash, Volume2, VolumeX, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function MetricsGrid({ latestReading, statistics, deviceStatus }) {
  const distance = latestReading?.distance_cm != null ? `${latestReading.distance_cm.toFixed(1)} cm` : '--';
  const waterLevel = latestReading?.water_level_cm != null ? `${latestReading.water_level_cm.toFixed(1)} cm` : '--';
  const deviceId = latestReading?.device_id || deviceStatus?.device_id || 'ESP32_WATER_001';
  
  // Buzzer evaluation based on telemetry payload or fallback to water percentage >= 90%
  const isBuzzerActive = latestReading?.buzzer_status === true || 
    (latestReading?.water_percentage != null && latestReading.water_percentage >= 90.0);

  const hasReading = latestReading != null && latestReading.water_percentage != null;

  const formatTimestamp = (isoStr) => {
    if (!isoStr) return 'No readings yet';
    const d = new Date(isoStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) +
           ' (' + d.toLocaleDateString() + ')';
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Distance Measurement */}
      <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-md flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-semibold uppercase tracking-wider">Acoustic Distance</span>
          <Radio className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="mt-2">
          <div className="text-2xl font-bold font-mono text-white">{distance}</div>
          <p className="text-xs text-slate-400 mt-1">Sensor face to liquid surface</p>
        </div>
      </div>

      {/* Water Column Height */}
      <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-md flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-semibold uppercase tracking-wider">Water Level Height</span>
          <Gauge className="w-4 h-4 text-teal-400" />
        </div>
        <div className="mt-2">
          <div className="text-2xl font-bold font-mono text-white">{waterLevel}</div>
          <p className="text-xs text-slate-400 mt-1">Calculated column depth</p>
        </div>
      </div>

      {/* Dedicated Buzzer Alert Status (Hardware GPIO 23) */}
      <div className={`p-4 rounded-2xl border backdrop-blur-md flex flex-col justify-between transition-all ${
        !hasReading 
          ? 'bg-amber-950/20 border-amber-500/30' 
          : isBuzzerActive 
            ? 'bg-rose-950/30 border-rose-500/50 shadow-[0_0_25px_rgba(244,63,94,0.25)]' 
            : 'bg-slate-900/50 border-slate-800'
      }`}>
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-semibold uppercase tracking-wider">Buzzer Alert (GPIO 23)</span>
          {isBuzzerActive ? (
            <Volume2 className="w-4 h-4 text-rose-400 animate-pulse" />
          ) : (
            <VolumeX className="w-4 h-4 text-slate-500" />
          )}
        </div>
        <div className="mt-2">
          {!hasReading ? (
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-500/30">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                SENSOR ERROR
              </div>
              <p className="text-xs text-slate-400 mt-1.5">No valid telemetry received</p>
            </div>
          ) : isBuzzerActive ? (
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 text-xs font-bold border border-rose-500/40 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                HIGH WATER WARNING &bull; BUZZER ACTIVE
              </div>
              <p className="text-xs text-rose-400/90 font-medium mt-1.5">Overflow alert sounding locally (&ge; 90%)</p>
            </div>
          ) : (
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                NORMAL MONITORING &bull; BUZZER INACTIVE
              </div>
              <p className="text-xs text-slate-400 mt-1.5">Liquid level safe (&lt; 90%)</p>
            </div>
          )}
        </div>
      </div>

      {/* Device ID & Last Seen */}
      <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-md flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-semibold uppercase tracking-wider">Hardware Device</span>
          <HardDrive className="w-4 h-4 text-indigo-400" />
        </div>
        <div className="mt-2">
          <div className="text-lg font-bold font-mono text-indigo-300 truncate">{deviceId}</div>
          <p className="text-xs text-slate-400 mt-1 truncate">
            Last seen: {latestReading?.created_at ? formatTimestamp(latestReading.created_at) : 'Waiting for connection...'}
          </p>
        </div>
      </div>

      {/* Range Statistics: Min / Max Level */}
      <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-md flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-semibold uppercase tracking-wider">Water Level Range</span>
          <ArrowDownUp className="w-4 h-4 text-amber-400" />
        </div>
        <div className="mt-2 flex items-baseline gap-3">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Min: </span>
            <span className="text-lg font-mono font-bold text-slate-200">
              {statistics?.min_water_level_cm != null ? `${statistics.min_water_level_cm} cm` : '--'}
            </span>
          </div>
          <div className="text-slate-600">|</div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Max: </span>
            <span className="text-lg font-mono font-bold text-slate-200">
              {statistics?.max_water_level_cm != null ? `${statistics.max_water_level_cm} cm` : '--'}
            </span>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Avg: {statistics?.avg_water_level_cm != null ? `${statistics.avg_water_level_cm} cm` : '--'}
        </p>
      </div>

      {/* Total Data Records Logged */}
      <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-md flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-semibold uppercase tracking-wider">Readings Logged</span>
          <Clock className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="mt-2">
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {statistics?.total_count != null ? statistics.total_count : 0}
          </div>
          <p className="text-xs text-slate-400 mt-1">Stored in persistent PostgreSQL DB</p>
        </div>
      </div>
    </div>
  );
}
