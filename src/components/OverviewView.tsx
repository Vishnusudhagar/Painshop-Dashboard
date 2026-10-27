import React, { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { ComputedData } from '../types';
import {
  fmt,
  sum,
  grp,
  rej,
  byKey,
  dlab,
  rc,
  rcBadge,
  defects,
  DEFECT_COLORS,
  SHIFT_INFO,
} from '../dataService';
import {
  TrendingUp,
  TrendingDown,
  Target,
  Box,
  Wrench,
  XCircle,
  BarChart3,
  Calendar,
  AlertTriangle,
  Users,
} from 'lucide-react';

Chart.register(...registerables);

interface OverviewViewProps {
  data: ComputedData;
  monthlyTarget: number;
  onEditTarget: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  data,
  monthlyTarget,
  onEditTarget,
}) => {
  const { cur, prev, trend, lbl } = data;

  const prodChartRef = useRef<HTMLCanvasElement>(null);
  const monChartRef = useRef<HTMLCanvasElement>(null);
  const defChartRef = useRef<HTMLCanvasElement>(null);

  // Totals
  const okQty = sum(cur, 'OK');
  const rwQty = sum(cur, 'Rework');
  const prodTotal = okQty + rwQty;
  const rejQty = sum(cur, 'Rej');

  const netNG = (rows: any[]) => Math.max(0, sum(rows, 'NOK') - sum(rows, 'Rej'));

  const delta = (field: 'OK' | 'Rework' | 'Rej' | 'NOK'): number | null => {
    if (!prev || !prev.length) return null;
    const calc =
      field === 'NOK'
        ? netNG
        : field === 'OK'
        ? (rows: any[]) => sum(rows, 'OK') + sum(rows, 'Rework')
        : (rows: any[]) => sum(rows, field);
    const pVal = calc(prev);
    const cVal = calc(cur);
    return pVal ? ((cVal - pVal) / pVal) * 100 : null;
  };

  const targetPct = monthlyTarget > 0 ? (prodTotal / monthlyTarget) * 100 : 0;

  // Shift wise table
  const shiftGrouped = grp(cur, (r) => r.Shift).sort(byKey);
  const totalGrouped = grp(cur, () => 'Total')[0] || {
    insp: 0,
    ok: 0,
    nok: 0,
    rw: 0,
    rej: 0,
    load: 0,
    k: 'Total',
    n: 0,
  };

  // Defects
  const defectEntries = defects(cur, 5);
  const totalDefectsCount = defectEntries.reduce((acc, curr) => acc + curr[1], 0);

  // Render Charts
  useEffect(() => {
    const chartInstances: { destroy: () => void }[] = [];

    // 1. Production Trend (OK + Rework stacked + Rejection % line)
    if (prodChartRef.current) {
      const d = grp(trend, (r) => r.DateKey)
        .sort(byKey)
        .slice(-10);

      const chart = new Chart(prodChartRef.current, {
        type: 'bar',
        data: {
          labels: d.map((x) => dlab(x.k)),
          datasets: [
            {
              type: 'bar',
              label: 'OK Parts',
              data: d.map((x) => x.ok),
              backgroundColor: '#3b82f6',
              stack: 'prod',
              order: 2,
              borderRadius: 4,
            },
            {
              type: 'bar',
              label: 'Rework Parts',
              data: d.map((x) => x.rw),
              backgroundColor: '#f59e0b',
              stack: 'prod',
              order: 2,
              borderRadius: 4,
            },
            {
              type: 'line',
              label: 'Rejection %',
              data: d.map(rej),
              borderColor: '#34d399',
              backgroundColor: '#34d399',
              borderWidth: 2.5,
              tension: 0.35,
              pointRadius: 4,
              pointBackgroundColor: '#34d399',
              yAxisID: 'y1',
              order: 1,
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
              labels: {
                color: '#94a3b8',
                boxWidth: 12,
                font: { size: 11, weight: 'bold' },
              },
            },
            tooltip: {
              backgroundColor: '#0f172a',
              borderColor: '#334155',
              borderWidth: 1,
              titleFont: { weight: 'bold' },
              callbacks: {
                label: (ctx: any) => {
                  if (ctx.dataset.yAxisID === 'y1') {
                    return `Rejection: ${Number(ctx.raw).toFixed(1)}%`;
                  }
                  return `${ctx.dataset.label}: ${fmt(Number(ctx.raw))} Nos`;
                },
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
                callback: (v: any) => fmt(Number(v)),
                font: { size: 11 },
              },
            },
            y1: {
              position: 'right',
              beginAtZero: true,
              grid: { display: false },
              ticks: {
                color: '#34d399',
                callback: (v: any) => `${v}%`,
                font: { size: 11 },
              },
            },
          },
        },
      } as any);
      chartInstances.push(chart);
    }

    // 2. Monthly Rejection Trend
    if (monChartRef.current) {
      const m = grp(data.b, (r) => r.DateKey.slice(0, 7))
        .sort(byKey)
        .slice(-6);

      const monLabels = m.map((x) => {
        const parts = x.k.split('-');
        const moNum = parts[1] ? Number(parts[1]) - 1 : 0;
        return (
          ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][
            moNum
          ] || x.k
        );
      });

      const chart = new Chart(monChartRef.current, {
        type: 'bar',
        data: {
          labels: monLabels,
          datasets: [
            {
              label: 'Rejection %',
              data: m.map(rej),
              backgroundColor: '#3b82f6',
              borderRadius: 6,
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
              grid: { display: false },
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

    // 3. Defect Doughnut
    if (defChartRef.current && defectEntries.length > 0) {
      const chart = new Chart(defChartRef.current, {
        type: 'doughnut',
        data: {
          labels: defectEntries.map((x) => x[0]),
          datasets: [
            {
              data: defectEntries.map((x) => x[1]),
              backgroundColor: DEFECT_COLORS.slice(0, defectEntries.length),
              borderColor: '#131a31',
              borderWidth: 2,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '62%',
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#0f172a',
              borderColor: '#334155',
              borderWidth: 1,
              callbacks: {
                label: (ctx) => {
                  const val = Number(ctx.raw);
                  const pct = totalDefectsCount > 0 ? (val / totalDefectsCount) * 100 : 0;
                  return `${ctx.label}: ${fmt(val)} (${pct.toFixed(1)}%)`;
                },
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
  }, [trend, data.b, cur, defectEntries, totalDefectsCount]);

  const renderDelta = (val: number | null, positiveIsGood: boolean = true) => {
    if (val == null) {
      return <span className="text-slate-400 text-xs">no previous data</span>;
    }
    const isPositive = val >= 0;
    const isGood = isPositive === positiveIsGood;
    return (
      <span
        className={`flex items-center gap-1 font-semibold text-xs ${
          isGood ? 'text-emerald-400' : 'text-rose-400'
        }`}
      >
        {isPositive ? (
          <TrendingUp className="w-3.5 h-3.5" />
        ) : (
          <TrendingDown className="w-3.5 h-3.5" />
        )}
        <span>
          {isPositive ? '+' : ''}
          {val.toFixed(1)}%
        </span>
        <span className="text-slate-400 font-normal text-[11px] ml-1">{lbl}</span>
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {/* 4 Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Monthly Target Card */}
        <div
          onClick={onEditTarget}
          role="button"
          tabIndex={0}
          className="bg-gradient-to-br from-[#121c38] via-[#102a3a] to-[#0d3830] border border-[#21434c] border-t-4 border-t-emerald-500 rounded-2xl p-4.5 shadow-lg cursor-pointer hover:border-emerald-400 transition-all group"
          title="Click to edit target"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl group-hover:scale-105 transition-transform">
              <Target className="w-7 h-7" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Monthly Target
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white leading-tight">
                {fmt(monthlyTarget)}
                <span className="text-xs font-normal text-slate-400 ml-1.5">Nos</span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-emerald-300">{targetPct.toFixed(1)}%</span>
              <span className="text-slate-400">achieved</span>
            </div>
            <div className="w-24 bg-slate-800/80 rounded-full h-2 overflow-hidden border border-slate-700">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(targetPct, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Total Production Card */}
        <div className="bg-gradient-to-br from-[#121c38] via-[#152a55] to-[#14307a] border border-[#23356e] border-t-4 border-t-blue-500 rounded-2xl p-4.5 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
              <Box className="w-7 h-7" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Total Production
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white leading-tight">
                {fmt(prodTotal)}
                <span className="text-xs font-normal text-slate-400 ml-1.5">Nos</span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-white/10 flex flex-col gap-1 text-xs">
            {renderDelta(delta('OK'), true)}
            <div className="text-[11px] text-slate-400">
              OK {fmt(okQty)} + Rework {fmt(rwQty)}
            </div>
          </div>
        </div>

        {/* Rework Parts Card */}
        <div className="bg-gradient-to-br from-[#121c38] via-[#2d261b] to-[#453412] border border-[#523d1d] border-t-4 border-t-amber-500 rounded-2xl p-4.5 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
              <Wrench className="w-7 h-7" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Rework Parts Qty
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white leading-tight">
                {fmt(rwQty)}
                <span className="text-xs font-normal text-slate-400 ml-1.5">Nos</span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-white/10 flex flex-col gap-1 text-xs">
            {renderDelta(delta('Rework'), false)}
            <div className="text-[11px] text-slate-400">
              included in Total Production
            </div>
          </div>
        </div>

        {/* Rejected Part Qty Card */}
        <div className="bg-gradient-to-br from-[#121c38] via-[#331725] to-[#4c1626] border border-[#5a1c2e] border-t-4 border-t-rose-500 rounded-2xl p-4.5 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl">
              <XCircle className="w-7 h-7" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Rejected Part Qty
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white leading-tight">
                {fmt(rejQty)}
                <span className="text-xs font-normal text-slate-400 ml-1.5">Nos</span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-white/10 flex flex-col gap-1 text-xs">
            {renderDelta(delta('Rej'), false)}
            <div className="text-[11px] text-slate-400">
              Scrap &amp; Defective items
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Charts & Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Production Trend (Spans 2 cols) */}
        <div className="lg:col-span-2 bg-[#131a31] border border-[#222b4a] rounded-2xl p-4.5 shadow-md">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              Production Trend
            </h3>
            <span className="text-xs text-slate-400">
              OK + Rework Units &amp; Rejection %
            </span>
          </div>
          <div className="h-[280px] w-full">
            <canvas ref={prodChartRef} />
          </div>
        </div>

        {/* Monthly Rejection Trend (1 col) */}
        <div className="bg-[#131a31] border border-[#222b4a] rounded-2xl p-4.5 shadow-md">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400" />
              Monthly Rejection Trend
            </h3>
            <span className="text-xs text-slate-400">Past Months</span>
          </div>
          <div className="h-[280px] w-full">
            <canvas ref={monChartRef} />
          </div>
        </div>

        {/* Defect Type (1 col) */}
        <div className="bg-[#131a31] border border-[#222b4a] rounded-2xl p-4.5 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Defect Distribution
            </h3>
            <span className="text-xs text-slate-400">Top 5</span>
          </div>
          <div className="h-[210px] w-full relative">
            <canvas ref={defChartRef} />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-extrabold text-white">
                {fmt(totalDefectsCount)}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Defects</span>
            </div>
          </div>
          {/* Defect Legend Table */}
          <div className="mt-3 pt-3 border-t border-[#1e2a52] space-y-1.5 text-xs">
            {defectEntries.length > 0 ? (
              defectEntries.map(([name, qty], idx) => {
                const pct =
                  totalDefectsCount > 0 ? (qty / totalDefectsCount) * 100 : 0;
                return (
                  <div key={name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: DEFECT_COLORS[idx % DEFECT_COLORS.length] }}
                      />
                      <span className="text-slate-200 truncate">{name}</span>
                    </div>
                    <span className="text-slate-400 font-mono font-medium">
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="text-center text-slate-500 py-3 text-xs">
                No defects logged in current range
              </div>
            )}
          </div>
        </div>

        {/* Shift Wise Production (Spans 2 cols) */}
        <div className="lg:col-span-2 bg-[#131a31] border border-[#222b4a] rounded-2xl p-4.5 shadow-md">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              Shift Wise Production
            </h3>
            <span className="text-xs text-slate-400">Batch Breakdown</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-[#222b4a] text-slate-400">
                  <th className="py-2.5 px-3 font-semibold">Shift</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Total Production</th>
                  <th className="py-2.5 px-3 font-semibold text-right">OK Parts</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Rework</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Rejection %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1b2342]">
                {shiftGrouped.map((o) => (
                  <tr key={o.k} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-white">Shift {o.k}</span>
                      <span className="text-[11px] text-slate-400 ml-2">
                        {SHIFT_INFO[o.k]?.hours ? `(${SHIFT_INFO[o.k].hours})` : ''}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-slate-100">
                      {fmt(o.ok + o.rw)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-400 font-medium">
                      {fmt(o.ok)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-amber-400 font-medium">
                      {fmt(o.rw)}
                    </td>
                    <td className={`py-2.5 px-3 text-right font-bold ${rc(rej(o))}`}>
                      {rej(o).toFixed(1)}%
                    </td>
                  </tr>
                ))}
                {/* Total Summary Row */}
                <tr className="bg-[#182142] font-black border-t-2 border-[#2b386b]">
                  <td className="py-2.5 px-3 text-white">Total</td>
                  <td className="py-2.5 px-3 text-right text-white">
                    {fmt(totalGrouped.ok + totalGrouped.rw)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-emerald-400">
                    {fmt(totalGrouped.ok)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-amber-400">
                    {fmt(totalGrouped.rw)}
                  </td>
                  <td className={`py-2.5 px-3 text-right ${rc(rej(totalGrouped))}`}>
                    {rej(totalGrouped).toFixed(1)}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
