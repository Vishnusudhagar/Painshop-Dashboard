import React, { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { ComputedData } from '../types';
import { grp, rej, byKey, dlab, fmt } from '../dataService';
import { TrendingUp, Activity, BarChart2 } from 'lucide-react';

Chart.register(...registerables);

interface TrendsViewProps {
  data: ComputedData;
}

export const TrendsView: React.FC<TrendsViewProps> = ({ data }) => {
  const { trend } = data;

  const tProdRef = useRef<HTMLCanvasElement>(null);
  const tRejRef = useRef<HTMLCanvasElement>(null);
  const tGrowthRef = useRef<HTMLCanvasElement>(null);

  const dailyGrouped = grp(trend, (r) => r.DateKey).sort(byKey);
  const labels = dailyGrouped.map((x) => dlab(x.k));

  // Day-over-day growth
  const totalParts = (x: { ok: number; rw: number }) => x.ok + x.rw;
  const growthRates = dailyGrouped.map((x, i) => {
    if (i === 0 || !totalParts(dailyGrouped[i - 1])) return 0;
    const prevVal = totalParts(dailyGrouped[i - 1]);
    const curVal = totalParts(x);
    return ((curVal - prevVal) / prevVal) * 100;
  });

  useEffect(() => {
    const chartInstances: { destroy: () => void }[] = [];

    // 1. Daily Production Line / Area
    if (tProdRef.current) {
      const chart = new Chart(tProdRef.current, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Total Production',
              data: dailyGrouped.map((x) => x.ok + x.rw),
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              borderWidth: 2.5,
              fill: true,
              tension: 0.35,
              pointRadius: 4,
              pointBackgroundColor: '#3b82f6',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#0f172a',
              borderColor: '#334155',
              borderWidth: 1,
              callbacks: {
                label: (ctx) => `Output: ${fmt(Number(ctx.raw))} Nos`,
              },
            },
          },
          scales: {
            x: {
              grid: { color: '#1e293b' },
              ticks: { color: '#94a3b8', font: { size: 11 } },
            },
            y: {
              beginAtZero: true,
              grid: { color: '#1e293b' },
              ticks: {
                color: '#94a3b8',
                callback: (v) => fmt(Number(v)),
                font: { size: 11 },
              },
            },
          },
        },
      });
      chartInstances.push(chart);
    }

    // 2. Daily Rejection % Line
    if (tRejRef.current) {
      const chart = new Chart(tRejRef.current, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Rejection %',
              data: dailyGrouped.map(rej),
              borderColor: '#f43f5e',
              backgroundColor: 'rgba(244, 63, 94, 0.12)',
              borderWidth: 2.5,
              fill: true,
              tension: 0.35,
              pointRadius: 4,
              pointBackgroundColor: '#f43f5e',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#0f172a',
              borderColor: '#334155',
              borderWidth: 1,
              callbacks: {
                label: (ctx) => `Rejection: ${Number(ctx.raw).toFixed(2)}%`,
              },
            },
          },
          scales: {
            x: {
              grid: { color: '#1e293b' },
              ticks: { color: '#94a3b8', font: { size: 11 } },
            },
            y: {
              beginAtZero: true,
              grid: { color: '#1e293b' },
              ticks: {
                color: '#94a3b8',
                callback: (v) => `${v}%`,
                font: { size: 11 },
              },
            },
          },
        },
      });
      chartInstances.push(chart);
    }

    // 3. Day-over-Day Growth %
    if (tGrowthRef.current) {
      const chart = new Chart(tGrowthRef.current, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Growth %',
              data: growthRates,
              backgroundColor: growthRates.map((v) =>
                v >= 0 ? '#34d399' : '#f43f5e'
              ),
              borderRadius: 4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#0f172a',
              borderColor: '#334155',
              borderWidth: 1,
              callbacks: {
                label: (ctx) => `Growth: ${Number(ctx.raw).toFixed(1)}%`,
              },
            },
          },
          scales: {
            x: {
              grid: { color: '#1e293b' },
              ticks: { color: '#94a3b8', font: { size: 11 } },
            },
            y: {
              grid: { color: '#1e293b' },
              ticks: {
                color: '#94a3b8',
                callback: (v) => `${v}%`,
                font: { size: 11 },
              },
            },
          },
        },
      });
      chartInstances.push(chart);
    }

    return () => {
      chartInstances.forEach((c) => c.destroy());
    };
  }, [dailyGrouped, labels, growthRates]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {/* Daily Production */}
      <div className="bg-[#131a31] border border-[#222b4a] rounded-2xl p-4.5 shadow-md">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            Daily Production
          </h3>
          <span className="text-xs text-slate-400">OK + Rework Units</span>
        </div>
        <div className="h-[280px] w-full">
          <canvas ref={tProdRef} />
        </div>
      </div>

      {/* Daily Rejection Rate */}
      <div className="bg-[#131a31] border border-[#222b4a] rounded-2xl p-4.5 shadow-md">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-rose-400" />
            Daily Rejection %
          </h3>
          <span className="text-xs text-slate-400">Target &le; 3.5%</span>
        </div>
        <div className="h-[280px] w-full">
          <canvas ref={tRejRef} />
        </div>
      </div>

      {/* Day-over-Day Growth */}
      <div className="bg-[#131a31] border border-[#222b4a] rounded-2xl p-4.5 shadow-md">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-emerald-400" />
            Day-over-Day Growth %
          </h3>
          <span className="text-xs text-slate-400">Delta %</span>
        </div>
        <div className="h-[280px] w-full">
          <canvas ref={tGrowthRef} />
        </div>
      </div>
    </div>
  );
};
