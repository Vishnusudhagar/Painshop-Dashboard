import React, { useState } from 'react';
import { X, Target, Check } from 'lucide-react';
import { fmt } from '../dataService';

interface EditTargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTarget: number;
  onSaveTarget: (target: number) => void;
}

export const EditTargetModal: React.FC<EditTargetModalProps> = ({
  isOpen,
  onClose,
  currentTarget,
  onSaveTarget,
}) => {
  const [val, setVal] = useState(String(currentTarget));

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(val.replace(/,/g, ''));
    if (!isNaN(num) && num > 0) {
      onSaveTarget(num);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#121935] border border-[#2b396b] rounded-2xl w-full max-w-md p-6 shadow-2xl text-white relative animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-indigo-300 hover:text-white p-1 rounded-lg hover:bg-white/10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Monthly Production Target</h2>
            <p className="text-xs text-indigo-200/80">
              Set monthly shop-floor quota (units) to measure pacing &amp; progress
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-indigo-300 uppercase tracking-wider mb-2">
              Monthly Target (Nos)
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                step="100"
                value={val}
                onChange={(e) => setVal(e.target.value)}
                className="w-full bg-[#0a1026] text-white border border-[#2b396b] focus:border-emerald-400 rounded-xl px-4 py-2.5 text-base font-bold focus:outline-none"
                autoFocus
              />
              <span className="absolute right-4 top-2.5 text-xs text-indigo-400 font-semibold">
                Units
              </span>
            </div>
            <div className="text-[11px] text-indigo-300/80 mt-1.5">
              Current Target: <strong>{fmt(currentTarget)}</strong> Nos
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[#1e2a52]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#17203e] hover:bg-[#202b54] text-slate-300 rounded-xl text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md transition-all"
            >
              <Check className="w-4 h-4" />
              Save Target
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
