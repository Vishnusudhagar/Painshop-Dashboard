import React, { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { ComputedData } from '../types';
import { fmt, grp, rej, byKey } from '../dataService';
import { ShieldCheck, Percent, AlertOctagon, Wrench, XCircle, Eye } from 'lucide-react';

Chart.register(...registerables);

interface QualityViewProps {
  data: ComputedData;
}

export const QualityView: React.FC<QualityViewProps> = ({ data }) => {
  const { cur } = data;

  const qLineRef = useRef<HTMLCanvasElement>(null);
  const qModelRef = useRef<HTMLCanvasElement>(null);
  const qShiftRef = useRef<HTMLCanvasElement>(null);

  // Grouped summary
  const total = grp(cur, () => 'Total')[0] || {
    insp: 0,
    ok: 0,
    nok: 0,
    rw: 0,
    rej: 0,
    load: 0,
    k: 'Total',
    n: 0,
  };

  const firstPassYield = total.insp > 0 ? (total.ok / total.insp) * 100 : 0;
  const rejectionRate = rej(total);

  // Groupings for charts
  const lineGrouped = grp(cur, (r) => r.Line || '—').sort(byKey);
  const modelGrouped = grp(cur, (r) => r.Part || '—').sort(byKey);
  const shiftGrouped = grp(cur, (r) => r.Shift || '—').sort(byKey);

  useEffect(() => {
    const chartInstances: Chart[] = [];

    const createQualityBar = (
      canvas: HTMLCanvasElement,
      labels: string[],
      values: number[],
      color: string
    ) => {
      return new Chart(canvas, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              data: values,
              backgroundColor: color,
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
    };

    if (qLineRef.current) {
      chartInstances.push(
        createQualityBar(
          qLineRef.current,
          lineGrouped.map((x) => x.k),
          lineGrouped.map(rej),
          '#22d3ee'
        )
      );
    }

    if (qModelRef.current) {
      chartInstances.push(
        createQualityBar(
          qModelRef.current,
          modelGrouped.map((x) => x.k),
          modelGrouped.map(rej),
          '#f59e0b'
        )
      );
    }

    if (qShiftRef.current) {
      chartInstances.push(
        createQualityBar(
          qShiftRef.current,
          shiftGrouped.map((x) => `Shift ${x.k}`),
          shiftGrouped.map(rej),
          '#a855f7'
        )
      );
    }

    return () => {
      chartInstances.forEach((c) => c.destroy());
    };
  }, [lineGrouped, modelGrouped, shiftGrouped]);

  return (
    <div className="space-y-5">
      {/* 6 Quality Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* First-pass Yield */}
        <div className="bg-[#131a31] border border-[#222b4a] border-t-4 border-t-emerald-500 rounded-2xl p-4 shadow-md">
          <div className="flex items-center gap-2 text-emerald-400 mb-1.5">
            <ShieldCheck className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
              First-Pass Yield
            </span>
          </div>
          <div className="text-2xl font-black text-white">{firstPassYield.toFixed(1)}%</div>
          <div className="text-[10px] text-slate-400 mt-1">OK / Inspected</div>
        </div>

        {/* Rejection Rate */}
        <div className="bg-[#131a31] border border-[#222b4a] border-t-4 border-t-rose-500 rounded-2xl p-4 shadow-md">
          <div className="flex items-center gap-2 text-rose-400 mb-1.5">
            <Percent className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
              Rejection Rate
            </span>
          </div>
          <div className="text-2xl font-black text-rose-400">{rejectionRate.toFixed(2)}%</div>
          <div className="text-[10px] text-slate-400 mt-1">Rejected / Inspected</div>
        </div>

        {/* Not OK Qty */}
        <div className="bg-[#131a31] border border-[#222b4a] border-t-4 border-t-amber-500 rounded-2xl p-4 shadow-md">
          <div className="flex items-center gap-2 text-amber-400 mb-1.5">
            <AlertOctagon className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
              Not OK Qty
            </span>
          </div>
          <div className="text-2xl font-black text-white">{fmt(total.nok)}</div>
          <div className="text-[10px] text-slate-400 mt-1">Defects needing review</div>
        </div>

        {/* Rework Qty */}
        <div className="bg-[#131a31] border border-[#222b4a] border-t-4 border-t-amber-400 rounded-2xl p-4 shadow-md">
          <div className="flex items-center gap-2 text-amber-300 mb-1.5">
            <Wrench className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
              Rework Qty
            </span>
          </div>
          <div className="text-2xl font-black text-white">{fmt(total.rw)}</div>
          <div className="text-[10px] text-slate-400 mt-1">Recovered in line</div>
        </div>

        {/* Rejected Qty */}
        <div className="bg-[#131a31] border border-[#222b4a] border-t-4 border-t-rose-500 rounded-2xl p-4 shadow-md">
          <div className="flex items-center gap-2 text-rose-400 mb-1.5">
            <XCircle className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
              Rejected Qty
            </span>
          </div>
          <div className="text-2xl font-black text-white">{fmt(total.rej)}</div>
          <div className="text-[10px] text-slate-400 mt-1">Total scrap count</div>
        </div>

        {/* Inspected Qty */}
        <div className="bg-[#131a31] border border-[#222b4a] border-t-4 border-t-blue-500 rounded-2xl p-4 shadow-md">
          <div className="flex items-center gap-2 text-blue-400 mb-1.5">
            <Eye className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
              Inspected Qty
            </span>
          </div>
          <div className="text-2xl font-black text-white">{fmt(total.insp)}</div>
          <div className="text-[10px] text-slate-400 mt-1">Total audited parts</div>
        </div>
      </div>

      {/* 3 Quality Comparison Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-[#131a31] border border-[#222b4a] rounded-2xl p-4.5 shadow-md">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white">Rejection % by Line</h3>
            <span className="text-xs text-slate-400">Target &le; 3.5%</span>
          </div>
          <div className="h-[250px] w-full">
            <canvas ref={qLineRef} />
          </div>
        </div>

        <div className="bg-[#131a31] border border-[#222b4a] rounded-2xl p-4.5 shadow-md">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white">Rejection % by Model</h3>
            <span className="text-xs text-slate-400">Target &le; 3.5%</span>
          </div>
          <div className="h-[250px] w-full">
            <canvas ref={qModelRef} />
          </div>
        </div>

        <div className="bg-[#131a31] border border-[#222b4a] rounded-2xl p-4.5 shadow-md">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white">Rejection % by Shift</h3>
            <span className="text-xs text-slate-400">Target &le; 3.5%</span>
          </div>
          <div className="h-[250px] w-full">
            <canvas ref={qShiftRef} />
          </div>
        </div>
      </div>
    </div>
  );
};
