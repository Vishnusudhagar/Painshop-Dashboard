import React from 'react';
import { FilterState, DateRangeOption } from '../types';
import { Filter, Calendar, Layers, Cpu, Factory } from 'lucide-react';

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (filters: Partial<FilterState>) => void;
  availableShifts: string[];
  availableModels: string[];
  availableLines: string[];
  recordsCount: number;
  dateSpanText: string;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  availableShifts,
  availableModels,
  availableLines,
  recordsCount,
  dateSpanText,
}) => {
  return (
    <div className="bg-[#121933]/90 border border-[#222b4a] rounded-2xl p-3.5 mb-5 shadow-md">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Date Range Filter */}
        <div className="bg-[#182142] border border-[#263259] rounded-xl p-2.5 flex flex-col justify-between">
          <label className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-300 uppercase tracking-wider mb-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            Date Range
          </label>
          <select
            value={filters.dateRange}
            onChange={(e) =>
              onFilterChange({ dateRange: e.target.value as DateRangeOption })
            }
            className="w-full bg-[#101730] text-indigo-100 border border-[#2e3b68] rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:border-indigo-400 cursor-pointer"
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="last7">Last 7 days</option>
            <option value="lastweek">Last week</option>
            <option value="month">This month</option>
            <option value="lastmonth">Last month</option>
            <option value="all">All data</option>
            <option value="custom">Custom date range</option>
          </select>

          {filters.dateRange === 'custom' && (
            <div className="flex gap-2 mt-2 pt-2 border-t border-[#263259]">
              <div className="flex-1">
                <span className="text-[10px] text-indigo-300 block mb-0.5">From</span>
                <input
                  type="date"
                  value={filters.customFrom}
                  onChange={(e) => onFilterChange({ customFrom: e.target.value })}
                  className="w-full bg-[#101730] text-indigo-100 border border-[#2e3b68] rounded-md px-1.5 py-1 text-xs"
                />
              </div>
              <div className="flex-1">
                <span className="text-[10px] text-indigo-300 block mb-0.5">To</span>
                <input
                  type="date"
                  value={filters.customTo}
                  onChange={(e) => onFilterChange({ customTo: e.target.value })}
                  className="w-full bg-[#101730] text-indigo-100 border border-[#2e3b68] rounded-md px-1.5 py-1 text-xs"
                />
              </div>
            </div>
          )}
        </div>

        {/* Shift Filter */}
        <div className="bg-[#182142] border border-[#263259] rounded-xl p-2.5 flex flex-col justify-between">
          <label className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-300 uppercase tracking-wider mb-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            Shift
          </label>
          <select
            value={filters.shift}
            onChange={(e) => onFilterChange({ shift: e.target.value })}
            className="w-full bg-[#101730] text-indigo-100 border border-[#2e3b68] rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:border-indigo-400 cursor-pointer"
          >
            <option value="All">All Shifts</option>
            {availableShifts.map((s) => (
              <option key={s} value={s}>
                {s.startsWith('Shift') ? s : `Shift ${s}`}
              </option>
            ))}
          </select>
          <div className="text-[10px] text-indigo-400/80 mt-1">
            A (06–14) · B (14–22) · C (22–06)
          </div>
        </div>

        {/* Model Filter */}
        <div className="bg-[#182142] border border-[#263259] rounded-xl p-2.5 flex flex-col justify-between">
          <label className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-300 uppercase tracking-wider mb-1.5">
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            Model / Part No
          </label>
          <select
            value={filters.model}
            onChange={(e) => onFilterChange({ model: e.target.value })}
            className="w-full bg-[#101730] text-indigo-100 border border-[#2e3b68] rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:border-indigo-400 cursor-pointer"
          >
            <option value="All">All Models</option>
            {availableModels.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <div className="text-[10px] text-indigo-400/80 mt-1 truncate">
            {availableModels.length} models tracked
          </div>
        </div>

        {/* Line Filter */}
        <div className="bg-[#182142] border border-[#263259] rounded-xl p-2.5 flex flex-col justify-between">
          <label className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-300 uppercase tracking-wider mb-1.5">
            <Factory className="w-3.5 h-3.5 text-indigo-400" />
            Coating Line
          </label>
          <select
            value={filters.line}
            onChange={(e) => onFilterChange({ line: e.target.value })}
            className="w-full bg-[#101730] text-indigo-100 border border-[#2e3b68] rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:border-indigo-400 cursor-pointer"
          >
            <option value="All">All Lines</option>
            {availableLines.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <div className="text-[10px] text-indigo-400/80 mt-1 truncate">
            {availableLines.length} active coating lines
          </div>
        </div>
      </div>

      {/* Summary Line */}
      <div className="mt-3 pt-2.5 border-t border-[#1f2a4f] flex flex-wrap items-center justify-between text-xs text-indigo-300/80 gap-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white">
            {recordsCount} {recordsCount === 1 ? 'record' : 'records'} in range
          </span>
          <span>·</span>
          <span>{dateSpanText}</span>
        </div>
        <div className="text-[11px] text-indigo-400/70">
          Rejection Limits: &le;3.5% Target (Green) · &le;4.5% Warning (Amber) · &gt;4.5% High (Red)
        </div>
      </div>
    </div>
  );
};
