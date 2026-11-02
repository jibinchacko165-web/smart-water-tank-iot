import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import WaterTank from './components/WaterTank';
import MetricsGrid from './components/MetricsGrid';
import HistoricalCharts from './components/HistoricalCharts';
import { AlertCircle, Server, Database, Cpu, Wifi, Volume2 } from 'lucide-react';

export default function App() {
  const [latestReading, setLatestReading] = useState(null);
  const [deviceStatus, setDeviceStatus] = useState(null);
  const [historyData, setHistoryData] = useState({ readings: [], statistics: {} });
  const [selectedHours, setSelectedHours] = useState('');
  const [refreshInterval, setRefreshInterval] = useState(3000);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [backendError, setBackendError] = useState(null);
  const [tankHeightCm, setTankHeightCm] = useState(100.0);

  // Fetch all endpoints concurrently
  const fetchData = useCallback(async () => {
    try {
      const [latestRes, statusRes, historyRes] = await Promise.all([
        fetch('/api/readings/latest/').catch(() => null),
        fetch('/api/device/status/').catch(() => null),
        fetch(`/api/readings/history/${selectedHours ? `?hours=${selectedHours}` : ''}`).catch(() => null),
      ]);

      let hasSuccess = false;

      if (latestRes && latestRes.ok) {
        const latestJson = await latestRes.json();
        setLatestReading(latestJson);
        hasSuccess = true;
      }

      if (statusRes && statusRes.ok) {
        const statusJson = await statusRes.json();
        setDeviceStatus(statusJson);
        hasSuccess = true;
      }

      if (historyRes && historyRes.ok) {
        const historyJson = await historyRes.json();
        setHistoryData(historyJson);
        hasSuccess = true;
      }

      if (hasSuccess) {
        setBackendError(null);
      } else {
        setBackendError('Unable to connect to Django REST API at port 8000.');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setBackendError('Network error connecting to backend service.');
    }
  }, [selectedHours]);

  // Periodic polling hook
  useEffect(() => {
    fetchData();

    if (refreshInterval > 0) {
      const timer = setInterval(() => {
        fetchData();
      }, refreshInterval);
      return () => clearInterval(timer);
    }
  }, [fetchData, refreshInterval]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const isBuzzerActive = latestReading?.buzzer_status === true || 
    (latestReading?.water_percentage != null && latestReading.water_percentage >= 90.0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="space-y-6">
        {/* Navigation & Header */}
        <Header
          deviceStatus={deviceStatus}
          refreshInterval={refreshInterval}
          onRefreshIntervalChange={setRefreshInterval}
          onManualRefresh={handleManualRefresh}
          isRefreshing={isRefreshing}
        />

        {/* High Water & Audible Buzzer Alert Banner */}
        {latestReading && isBuzzerActive && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-950/80 to-amber-950/80 border-2 border-rose-500/60 text-white flex items-center justify-between shadow-[0_0_30px_rgba(244,63,94,0.3)] animate-pulse">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500 text-white shadow-lg">
                <Volume2 className="w-6 h-6 animate-bounce" />
              </div>
              <div>
                <h4 className="font-bold text-sm sm:text-base text-rose-200">
                  HIGH WATER WARNING &mdash; BUZZER ACTIVE (GPIO 23)
                </h4>
                <p className="text-xs text-rose-300/90 mt-0.5">
                  Reservoir level is at or above 90.0% ({latestReading.water_level_cm?.toFixed(1)} cm / {latestReading.water_percentage?.toFixed(1)}%). Overflow warning audible alarm is sounding locally on GPIO 23.
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-block px-3 py-1 rounded-lg bg-rose-500/30 text-rose-200 border border-rose-500/40 text-xs font-mono font-bold">
              THRESHOLD &ge; 90%
            </span>
          </div>
        )}

        {/* Backend Connection Alert */}
        {backendError && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-center justify-between text-sm">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
              <span>
                <strong>Backend Notice:</strong> {backendError} Please ensure the containerized Django service is running.
              </span>
            </div>
            <button
              onClick={handleManualRefresh}
              className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 rounded-lg text-xs font-semibold border border-amber-500/30 transition-all"
            >
              Retry
            </button>
          </div>
        )}

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Visual Water Tank */}
          <div className="lg:col-span-5 flex flex-col">
            <WaterTank
              percentage={latestReading ? latestReading.water_percentage : 0}
              waterLevelCm={latestReading ? latestReading.water_level_cm : 0}
              tankHeightCm={tankHeightCm}
              status={latestReading ? latestReading.status : 'UNKNOWN'}
              buzzerStatus={isBuzzerActive}
            />
          </div>

          {/* Right Column: Telemetry Cards & Historical Charts */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <MetricsGrid
              latestReading={latestReading}
              statistics={historyData.statistics}
              deviceStatus={deviceStatus}
            />

            <HistoricalCharts
              readings={historyData.readings || []}
              selectedHours={selectedHours}
              onHoursChange={setSelectedHours}
            />
          </div>
        </div>
      </div>

      {/* Industrial Architecture System Footer */}
      <footer className="mt-12 pt-6 border-t border-slate-900 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5 text-slate-400">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" /> ESP32 (GPIO 5, 18, 23)
          </span>
          <span className="flex items-center gap-1.5 text-slate-400">
            <Volume2 className="w-3.5 h-3.5 text-rose-400" /> 3-Pin Buzzer Module
          </span>
          <span className="flex items-center gap-1.5 text-slate-400">
            <Wifi className="w-3.5 h-3.5 text-emerald-400" /> HTTP REST Ingestion
          </span>
          <span className="flex items-center gap-1.5 text-slate-400">
            <Server className="w-3.5 h-3.5 text-blue-400" /> Django & DRF Backend
          </span>
          <span className="flex items-center gap-1.5 text-slate-400">
            <Database className="w-3.5 h-3.5 text-indigo-400" /> PostgreSQL 16
          </span>
        </div>
        <div className="font-mono text-slate-600">
          Academic Project Prototype &copy; 2026
        </div>
      </footer>
    </div>
  );
}
