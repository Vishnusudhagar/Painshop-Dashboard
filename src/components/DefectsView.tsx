import React, { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { ComputedData } from '../types';
import { defects, fmt, DEFECT_COLORS } from '../dataService';
import { AlertTriangle, ListOrdered } from 'lucide-react';

Chart.register(...registerables);

interface DefectsViewProps {
  data: ComputedData;
}

export const DefectsView: React.FC<DefectsViewProps> = ({ data }) => {
  const { cur } = data;
  const paretoChartRef = useRef<HTMLCanvasElement>(null);

  const defectList = defects(cur, 0);
  const totalDefects = defectList.reduce((acc, curr) => acc + curr[1], 0);

  // Calculate cumulative percentages
  let runningSum = 0;
  const defectRows = defectList.map(([name, qty]) => {
    runningSum += qty;
    const pct = totalDefects > 0 ? (qty / totalDefects) * 100 : 0;
    const cumulativePct = totalDefects > 0 ? (runningSum / totalDefects) * 100 : 0;
    return {
      name,
      qty,
      pct,
      cumulativePct,
    };
  });

  useEffect(() => {
    let chartInstance: Chart | null = null;

    if (paretoChartRef.current && defectList.length > 0) {
      chartInstance = new Chart(paretoChartRef.current, {
        type: 'bar',
        data: {
          labels: defectList.map((x) => x[0]),
          datasets: [
            {
              label: 'Defect Qty',
              data: defectList.map((x) => x[1]),
              backgroundColor: defectList.map(
                (_, i) => DEFECT_COLORS[i % DEFECT_COLORS.length]
              ),
              borderRadius: 6,
            },
          ],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#0f172a',
              borderColor: '#334155',
              borderWidth: 1,
              callbacks: {
                label: (ctx) => {
                  const val = Number(ctx.raw);
                  const pct = totalDefects > 0 ? (val / totalDefects) * 100 : 0;
                  return `${fmt(val)} Nos (${pct.toFixed(1)}%)`;
                },
              },
            },
          },
          scales: {
            x: {
              beginAtZero: true,
              grid: { color: '#1e293b' },
              ticks: { color: '#94a3b8', font: { size: 11 } },
            },
            y: {
              grid: { display: false },
              ticks: { color: '#e2e8f0', font: { size: 11, weight: 'bold' } },
            },
          },
        },
      });
    }

    return () => {
      chartInstance?.destroy();
    };
  }, [defectList, totalDefects]);

  const chartHeight = Math.max(280, defectList.length * 36 + 60);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Defect Pareto Chart */}
      <div className="bg-[#131a31] border border-[#222b4a] rounded-2xl p-4.5 shadow-md">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            Defect Pareto Chart
          </h3>
          <span className="text-xs text-slate-400">
            Total Defects: <strong className="text-white">{fmt(totalDefects)}</strong>
          </span>
        </div>
        <div style={{ height: `${chartHeight}px` }} className="w-full">
          {defectList.length > 0 ? (
            <canvas ref={paretoChartRef} />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500 text-xs">
              No defects recorded in current selected range
            </div>
          )}
        </div>
      </div>

      {/* Defect Details Table */}
      <div className="bg-[#131a31] border border-[#222b4a] rounded-2xl p-4.5 shadow-md">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ListOrdered className="w-4 h-4 text-indigo-400" />
            Defect Details &amp; Cumulative Pareto
          </h3>
          <span className="text-xs text-slate-400">
            {defectRows.length} distinct defects
          </span>
        </div>

        <div className="overflow-x-auto max-h-[460px]">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-[#222b4a] text-slate-400 sticky top-0 bg-[#131a31]">
                <th className="py-2.5 px-3 font-semibold">Defect Category</th>
                <th className="py-2.5 px-3 font-semibold text-right">Qty</th>
                <th className="py-2.5 px-3 font-semibold text-right">Defect %</th>
                <th className="py-2.5 px-3 font-semibold text-right">Cumulative %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1b2342]">
              {defectRows.length > 0 ? (
                defectRows.map((r, i) => (
                  <tr key={r.name} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5 px-3 font-medium text-white flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: DEFECT_COLORS[i % DEFECT_COLORS.length] }}
                      />
                      <span>{r.name}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-400">
                      {fmt(r.qty)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                      {r.pct.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-indigo-300">
                      {r.cumulativePct.toFixed(1)}%
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500">
                    No defects recorded in current filter period
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
