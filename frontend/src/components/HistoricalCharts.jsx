import React, { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { LineChart, Activity, Clock } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function HistoricalCharts({ readings = [], selectedHours, onHoursChange }) {
  const [activeTab, setActiveTab] = useState('water_level'); // 'water_level' or 'distance'

  // Format timestamps for chart labels (HH:MM:SS)
  const labels = readings.map((r) => {
    const d = new Date(r.created_at);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  });

  const waterLevelData = readings.map((r) => r.water_level_cm);
  const distanceData = readings.map((r) => r.distance_cm);

  const chartData = {
    labels: labels.length > 0 ? labels : ['No Data'],
    datasets: [
      activeTab === 'water_level'
        ? {
            label: 'Water Level (cm)',
            data: waterLevelData.length > 0 ? waterLevelData : [0],
            borderColor: '#06b6d4',
            backgroundColor: 'rgba(6, 182, 212, 0.15)',
            borderWidth: 2,
            pointRadius: readings.length > 30 ? 0 : 3,
            pointHoverRadius: 6,
            pointBackgroundColor: '#06b6d4',
            tension: 0.35,
            fill: true,
          }
        : {
            label: 'Measured Distance to Water (cm)',
            data: distanceData.length > 0 ? distanceData : [0],
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            borderWidth: 2,
            pointRadius: readings.length > 30 ? 0 : 3,
            pointHoverRadius: 6,
            pointBackgroundColor: '#f59e0b',
            tension: 0.35,
            fill: true,
          },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#0f172a',
        titleColor: '#e2e8f0',
        bodyColor: '#94a3b8',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 10,
        callbacks: {
          afterBody: (context) => {
            const index = context[0]?.dataIndex;
            if (index !== undefined && readings[index]) {
              return `Fill: ${readings[index].water_percentage.toFixed(1)}% | Status: ${readings[index].status}`;
            }
            return '';
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(51, 65, 85, 0.25)',
        },
        ticks: {
          color: '#64748b',
          maxTicksLimit: 8,
          font: { family: 'JetBrains Mono', size: 10 },
        },
      },
      y: {
        grid: {
          color: 'rgba(51, 65, 85, 0.25)',
        },
        ticks: {
          color: '#64748b',
          font: { family: 'JetBrains Mono', size: 10 },
        },
      },
    },
  };

  return (
    <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-2xl backdrop-blur-xl flex flex-col">
      {/* Chart Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <LineChart className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-200">Sensor Analytics & Trend</h3>
            <p className="text-xs text-slate-400">Chronological telemetry data over time</p>
          </div>
        </div>

        {/* View Switchers */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1">
            <button
              onClick={() => setActiveTab('water_level')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'water_level'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Water Level (cm)
            </button>
            <button
              onClick={() => setActiveTab('distance')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'distance'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Distance (cm)
            </button>
          </div>

          {/* Time Filter Buttons */}
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1">
            {[
              { label: '1H', val: '1' },
              { label: '6H', val: '6' },
              { label: '24H', val: '24' },
              { label: 'All', val: '' },
            ].map((f) => (
              <button
                key={f.label}
                onClick={() => onHoursChange(f.val)}
                className={`px-2.5 py-1 text-xs font-mono font-medium rounded-lg transition-all ${
                  selectedHours === f.val
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div className="relative w-full h-72 sm:h-80">
        {readings.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 gap-2">
            <Activity className="w-8 h-8 animate-pulse text-slate-600" />
            <p className="text-sm">Awaiting live telemetry stream from ESP32...</p>
          </div>
        ) : (
          <Line data={chartData} options={chartOptions} />
        )}
      </div>
    </div>
  );
}

