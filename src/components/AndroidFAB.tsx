import React from 'react';
import { Plus, RotateCw } from 'lucide-react';

interface AndroidFABProps {
  onAddRecord: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onHaptic?: () => void;
}

export const AndroidFAB: React.FC<AndroidFABProps> = ({
  onAddRecord,
  onRefresh,
  isRefreshing,
  onHaptic,
}) => {
  const triggerFeedback = () => {
    if (onHaptic) onHaptic();
    else {
      try {
        if ('vibrate' in navigator) navigator.vibrate(15);
      } catch {}
    }
  };

  return (
    <div className="fixed bottom-20 right-4 lg:bottom-8 lg:right-8 z-30 flex flex-col items-end gap-3 pointer-events-none">
      {/* Quick Refresh Mini FAB */}
      <button
        onClick={() => {
          triggerFeedback();
          onRefresh();
        }}
        disabled={isRefreshing}
        title="Quick Sync"
        className="pointer-events-auto w-10 h-10 rounded-full bg-[#182348] border border-[#2b3a6d] text-indigo-300 hover:text-white shadow-lg flex items-center justify-center transition-all active:scale-90 hover:scale-105"
      >
        <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
      </button>

      {/* Main Material 3 Extended FAB */}
      <button
        onClick={() => {
          triggerFeedback();
          onAddRecord();
        }}
        className="pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-xl shadow-emerald-950/60 border border-emerald-400/30 transition-all active:scale-95 hover:shadow-emerald-600/30"
      >
        <Plus className="w-5 h-5 stroke-[2.5]" />
        <span className="tracking-wide uppercase text-[11px] font-extrabold">Log Record</span>
      </button>
    </div>
  );
};
