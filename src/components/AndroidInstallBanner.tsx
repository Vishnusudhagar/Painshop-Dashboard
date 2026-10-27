import React, { useState } from 'react';
import { Smartphone, Download, X } from 'lucide-react';
import { usePWAInstall } from '../usePWAInstall';

interface AndroidInstallBannerProps {
  onOpenDetails: () => void;
}

export const AndroidInstallBanner: React.FC<AndroidInstallBannerProps> = ({ onOpenDetails }) => {
  const { isInstallable, isInstalled, install, triggerHaptic } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);

  if (isInstalled || dismissed) return null;

  return (
    <div className="mx-3 mt-3 sm:mx-6 bg-gradient-to-r from-[#111f4d] via-[#1a2d6e] to-[#0f1d47] border border-indigo-500/30 rounded-2xl p-3 sm:p-4 shadow-lg flex flex-wrap items-center justify-between gap-3 text-white">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center shrink-0">
          <Smartphone className="w-5 h-5 text-indigo-300" />
        </div>
        <div className="min-w-0">
          <div className="font-bold text-xs sm:text-sm text-white flex items-center gap-2">
            Install Baxy Paintshop for Android
            <span className="hidden sm:inline-block text-[10px] uppercase font-extrabold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
              WebAPK Ready
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-indigo-200/80 truncate">
            Fast shop-floor access, offline caching, and fullscreen operation.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <button
          onClick={() => {
            triggerHaptic();
            if (isInstallable) {
              install();
            } else {
              onOpenDetails();
            }
          }}
          className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 flex items-center gap-1.5 transition active:scale-95"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{isInstallable ? 'Install App' : 'Get Android App'}</span>
        </button>
        <button
          onClick={() => {
            triggerHaptic();
            setDismissed(true);
          }}
          className="text-indigo-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
