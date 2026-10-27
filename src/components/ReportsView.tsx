import React, { useState, useMemo } from 'react';
import { ComputedData, ProductionRow } from '../types';
import { fmt, dlab, exportToCsv } from '../dataService';
import { Download, Search, FileText } from 'lucide-react';

interface ReportsViewProps {
  data: ComputedData;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ data }) => {
  const { cur } = data;
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRecords = useMemo(() => {
    if (!searchTerm.trim()) return cur;
    const term = searchTerm.toLowerCase();
    return cur.filter(
      (r) =>
        String(r.ID).toLowerCase().includes(term) ||
        r.DateKey.toLowerCase().includes(term) ||
        r.Shift.toLowerCase().includes(term) ||
        r.Line.toLowerCase().includes(term) ||
        r.Part.toLowerCase().includes(term) ||
        r.Stage.toLowerCase().includes(term) ||
        r.Defect.toLowerCase().includes(term)
    );
  }, [cur, searchTerm]);

  // Display most recent records first
  const displayList = useMemo(() => {
    return [...filteredRecords].reverse().slice(0, 500);
  }, [filteredRecords]);

  const handleDownload = () => {
    exportToCsv(filteredRecords, `paintshop_report_${Date.now()}.csv`);
  };

  return (
    <div className="bg-[#131a31] border border-[#222b4a] rounded-2xl p-4.5 shadow-md space-y-4">
      {/* Header and Download Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-400" />
          <div>
            <h3 className="text-sm font-bold text-white">Production &amp; Quality Audit Logs</h3>
            <p className="text-xs text-slate-400">
              Showing {displayList.length} of {filteredRecords.length} records in active scope
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search records, parts, defects..."
              className="bg-[#0a1026] text-white border border-[#26335f] focus:border-indigo-400 rounded-xl pl-8 pr-3 py-1.5 text-xs focus:outline-none w-48 sm:w-64"
            />
          </div>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-3.5 py-2 rounded-xl shadow-sm transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download CSV</span>
          </button>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="overflow-x-auto max-h-[560px] rounded-xl border border-[#1e274a]">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="border-b border-[#222b4a] text-slate-300 sticky top-0 bg-[#16203f] shadow-sm z-10">
              <th className="py-2.5 px-3 font-semibold">ID</th>
              <th className="py-2.5 px-3 font-semibold">Date</th>
              <th className="py-2.5 px-3 font-semibold">Shift</th>
              <th className="py-2.5 px-3 font-semibold">Line</th>
              <th className="py-2.5 px-3 font-semibold">Part / Model</th>
              <th className="py-2.5 px-3 font-semibold">Stage</th>
              <th className="py-2.5 px-3 font-semibold text-right">Loaded</th>
              <th className="py-2.5 px-3 font-semibold text-right">Inspected</th>
              <th className="py-2.5 px-3 font-semibold text-right text-emerald-400">OK</th>
              <th className="py-2.5 px-3 font-semibold text-right text-amber-400">Rework</th>
              <th className="py-2.5 px-3 font-semibold text-right text-rose-400">Not OK</th>
              <th className="py-2.5 px-3 font-semibold text-right text-rose-500">Rejected</th>
              <th className="py-2.5 px-3 font-semibold">Defect Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1b2342]">
            {displayList.length > 0 ? (
              displayList.map((r) => (
                <tr key={r.ID} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-2 px-3 font-mono text-[11px] text-slate-400">{r.ID}</td>
                  <td className="py-2 px-3 font-medium text-slate-200">{dlab(r.DateKey)}</td>
                  <td className="py-2 px-3 font-semibold text-white">Shift {r.Shift}</td>
                  <td className="py-2 px-3 text-slate-300">{r.Line}</td>
                  <td className="py-2 px-3 font-bold text-indigo-200">{r.Part}</td>
                  <td className="py-2 px-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        r.Stage === 'Loading'
                          ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                          : r.Stage === 'Unloading'
                          ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                          : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                      }`}
                    >
                      {r.Stage || 'Stage'}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-slate-300">
                    {r.Load ? fmt(r.Load) : '—'}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-slate-300">
                    {r.Insp ? fmt(r.Insp) : '—'}
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-emerald-400">
                    {r.OK ? fmt(r.OK) : '—'}
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-medium text-amber-400">
                    {r.Rework ? fmt(r.Rework) : '—'}
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-medium text-rose-400">
                    {r.NOK ? fmt(r.NOK) : '—'}
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-rose-500">
                    {r.Rej ? fmt(r.Rej) : '—'}
                  </td>
                  <td className="py-2 px-3 text-slate-300 max-w-xs truncate">
                    {r.Defect ? (
                      <span className="text-[11px] text-rose-300/90 font-medium">
                        {r.Defect.replace(/;/g, ', ').replace(/, $/, '')}
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[11px]">—</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={13} className="py-8 text-center text-slate-500">
                  No matching production logs found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
