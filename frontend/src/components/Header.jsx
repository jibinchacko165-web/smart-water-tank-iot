import React from 'react';
import { Wifi, WifiOff, RefreshCw, Activity, Layers, Server } from 'lucide-react';

export default function Header({
  deviceStatus,
  refreshInterval,
  onRefreshIntervalChange,
  onManualRefresh,
  isRefreshing,
}) {
  const isOnline = deviceStatus?.status === 'ONLINE';
  const secondsSince = deviceStatus?.seconds_since_last_reading;

  return (
    <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
      {/* Brand & System Title */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-teal-400 p-0.5 shadow-lg shadow-cyan-500/20">
          <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-cyan-400">
            <Activity className="w-6 h-6" />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Smart Water Tank Level System
            </h1>
            <span className="hidden sm:inline-flex px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              ESP32 + HC-SR04
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time IoT Telemetry & Industrial Liquid Level Monitoring
          </p>
        </div>
      </div>

      {/* Connectivity & Refresh Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Device Status Badge */}
        <div
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold tracking-wide ${
            isOnline
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
          }`}
        >
          {isOnline ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Wifi className="w-3.5 h-3.5" />
              <span>ESP32 ONLINE</span>
              {secondsSince !== null && (
                <span className="text-[10px] text-emerald-500/80 font-mono">
                  ({secondsSince}s ago)
                </span>
              )}
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-rose-500"></span>
              <WifiOff className="w-3.5 h-3.5" />
              <span>ESP32 OFFLINE</span>
              {secondsSince !== null && (
                <span className="text-[10px] text-rose-400/80 font-mono">
                  ({secondsSince}s ago)
                </span>
              )}
            </>
          )}
        </div>

        {/* Polling Rate Selector */}
        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1 text-xs text-slate-300">
          <span className="text-slate-500">Poll:</span>
          <select
            value={refreshInterval}
            onChange={(e) => onRefreshIntervalChange(Number(e.target.value))}
            className="bg-transparent text-cyan-400 font-mono font-medium focus:outline-none cursor-pointer"
          >
            <option value={2000} className="bg-slate-900 text-white">2s</option>
            <option value={5000} className="bg-slate-900 text-white">5s</option>
            <option value={10000} className="bg-slate-900 text-white">10s</option>
            <option value={0} className="bg-slate-900 text-white">Paused</option>
          </select>
        </div>

        {/* Manual Refresh Button */}
        <button
          onClick={onManualRefresh}
          disabled={isRefreshing}
          title="Force manual refresh"
          className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
        </button>
      </div>
    </header>
  );
}

