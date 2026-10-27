import React, { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { ComputedData } from '../types';
import { fmt, grp, rej, byKey, dlab, rc } from '../dataService';
import { Factory, Box, Table } from 'lucide-react';

Chart.register(...registerables);

interface ProductionViewProps {
  data: ComputedData;
}

export const ProductionView: React.FC<ProductionViewProps> = ({ data }) => {
  const { cur } = data;
  const lineChartRef = useRef<HTMLCanvasElement>(null);
  const modelChartRef = useRef<HTMLCanvasElement>(null);

  // Groupings
  const lineGrouped = grp(cur, (r) => r.Line || 'Coating Line');
  const modelGrouped = grp(cur, (r) => r.Part || 'Standard');

  // Daily production grouped
  const dailyGrouped = grp(cur, (r) => `${dlab(r.DateKey)}|${r.DateKey}`)
    .sort(byKey)
    .map((o) => ({
      ...o,
      displayDate: o.k.split('|')[0],
      rawDate: o.k.split('|')[1],
    }));

  useEffect(() => {
    const chartInstances: Chart[] = [];

    // 1. By Line Chart (OK, Rework, Rejection)
    if (lineChartRef.current) {
      const chart = new Chart(lineChartRef.current, {
        type: 'bar',
        data: {
          labels: lineGrouped.map((x) => x.k),
          datasets: [
            {
              label: 'OK Parts',
              data: lineGrouped.map((x) => x.ok),
              backgroundColor: '#34d399',
              borderRadius: 6,
            },
            {
              label: 'Rework Parts',
              data: lineGrouped.map((x) => x.rw),
              backgroundColor: '#f59e0b',
              borderRadius: 6,
            },
            {
              label: 'Rejection Parts',
              data: lineGrouped.map((x) => x.rej),
              backgroundColor: '#f43f5e',
              borderRadius: 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              align: 'end',
              labels: { color: '#94a3b8', boxWidth: 12, font: { size: 11, weight: 'bold' } },
            },
            tooltip: {
              backgroundColor: '#0f172a',
              borderColor: '#334155',
              borderWidth: 1,
              callbacks: {
                label: (ctx) => `${ctx.dataset.label}: ${fmt(Number(ctx.raw))} Nos`,
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

    // 2. Production by Model (Stacked OK + Rework)
    if (modelChartRef.current) {
      const chart = new Chart(modelChartRef.current, {
        type: 'bar',
        data: {
          labels: modelGrouped.map((x) => x.k),
          datasets: [
            {
              label: 'OK',
              data: modelGrouped.map((x) => x.ok),
              backgroundColor: '#7c6cff',
              stack: 'p',
            },
            {
              label: 'Rework',
              data: modelGrouped.map((x) => x.rw),
              backgroundColor: '#f59e0b',
              borderRadius: 4,
              stack: 'p',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              align: 'end',
              labels: { color: '#94a3b8', boxWidth: 12, font: { size: 11, weight: 'bold' } },
            },
            tooltip: {
              backgroundColor: '#0f172a',
              borderColor: '#334155',
              borderWidth: 1,
              callbacks: {
                label: (ctx) => `${ctx.dataset.label}: ${fmt(Number(ctx.raw))} Nos`,
              },
            },
          },
          scales: {
            x: {
              stacked: true,
              grid: { color: '#1e293b' },
              ticks: { color: '#94a3b8', font: { size: 11 } },
            },
            y: {
              stacked: true,
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

    return () => {
      chartInstances.forEach((c) => c.destroy());
    };
  }, [lineGrouped, modelGrouped]);

  return (
    <div className="space-y-5">
      {/* 2 Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* By Line */}
        <div className="bg-[#131a31] border border-[#222b4a] rounded-2xl p-4.5 shadow-md">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Factory className="w-4 h-4 text-emerald-400" />
              OK / Rework / Rejection by Line
            </h3>
            <span className="text-xs text-slate-400">Coating Lines</span>
          </div>
          <div className="h-[280px] w-full">
            <canvas ref={lineChartRef} />
          </div>
        </div>

        {/* By Model */}
        <div className="bg-[#131a31] border border-[#222b4a] rounded-2xl p-4.5 shadow-md">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Box className="w-4 h-4 text-indigo-400" />
              Production by Model / Part
            </h3>
            <span className="text-xs text-slate-400">Stacked Output</span>
          </div>
          <div className="h-[280px] w-full">
            <canvas ref={modelChartRef} />
          </div>
        </div>
      </div>

      {/* Daily Production Table */}
      <div className="bg-[#131a31] border border-[#222b4a] rounded-2xl p-4.5 shadow-md">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Table className="w-4 h-4 text-blue-400" />
            Daily Production Breakdown
          </h3>
          <span className="text-xs text-slate-400">
            {dailyGrouped.length} operating days
          </span>
        </div>

        <div className="overflow-x-auto max-h-[460px]">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-[#222b4a] text-slate-400 sticky top-0 bg-[#131a31]">
                <th className="py-2.5 px-3 font-semibold">Date</th>
                <th className="py-2.5 px-3 font-semibold text-right">Loaded</th>
                <th className="py-2.5 px-3 font-semibold text-right">Inspected</th>
                <th className="py-2.5 px-3 font-semibold text-right">OK Parts</th>
                <th className="py-2.5 px-3 font-semibold text-right">Rework</th>
                <th className="py-2.5 px-3 font-semibold text-right">Rejection</th>
                <th className="py-2.5 px-3 font-semibold text-right">Rejection %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1b2342]">
              {dailyGrouped.map((o) => (
                <tr key={o.rawDate} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-white">
                    {o.displayDate}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-300 font-mono">
                    {fmt(o.load)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-300 font-mono">
                    {fmt(o.insp)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-emerald-400 font-semibold font-mono">
                    {fmt(o.ok)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-amber-400 font-medium font-mono">
                    {fmt(o.rw)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-rose-400 font-medium font-mono">
                    {fmt(o.rej)}
                  </td>
                  <td className={`py-2.5 px-3 text-right font-bold ${rc(rej(o))}`}>
                    {rej(o).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
