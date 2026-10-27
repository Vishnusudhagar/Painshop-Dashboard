import React, { useRef } from 'react';
import {
  Link2,
  UploadCloud,
  RotateCw,
  PlusCircle,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Camera,
  RotateCcw,
  Smartphone,
} from 'lucide-react';
import { BAXY_LOGO_BASE64 } from '../logo';
import { ProfileDropdown } from './ProfileDropdown';

interface HeaderProps {
  logoSrc: string | null;
  onLogoChange: (newLogo: string | null) => void;
  isLive: boolean;
  isRefreshing: boolean;
  lastRefreshTime: string;
  onConnectSheet: () => void;
  onUploadFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRefresh: () => void;
  onAddRecord: () => void;
  onOpenAndroidModal: () => void;
  onOpenSettings: (tab?: 'csv' | 'questions' | 'users' | 'security' | 'preferences') => void;
  currentUser: import('../types').UserSession;
  onSignOut?: () => void;
  onOpenLogin?: () => void;
  onAccountRemoved?: () => void;
  totalRows: number;
}

export const Header: React.FC<HeaderProps> = ({
  logoSrc,
  onLogoChange,
  isLive,
  isRefreshing,
  lastRefreshTime,
  onConnectSheet,
  onUploadFile,
  onRefresh,
  onAddRecord,
  onOpenAndroidModal,
  onOpenSettings,
  currentUser,
  onSignOut,
  onOpenLogin,
  onAccountRemoved,
  totalRows,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const height = 120;
        const width = Math.round((img.width * height) / img.height);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/png');
          onLogoChange(dataUrl);
        }
      };
      if (typeof reader.result === 'string') {
        img.src = reader.result;
      }
    };
    reader.readAsDataURL(file);
  };

  const currentDateStr = new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date());

  const currentDisplayLogo = logoSrc || BAXY_LOGO_BASE64;

  return (
    <header className="border-b border-[#222b4a] bg-gradient-to-r from-[#071333] via-[#0d1f54] to-[#162770] px-4 py-3 sm:px-6 shadow-lg relative z-20">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Brand & Logo */}
        <div className="flex items-center gap-4">
          <div className="relative group">
            <button
              onClick={() => logoInputRef.current?.click()}
              title="Click to customize company logo"
              className="flex items-center justify-center p-1 rounded-lg border border-transparent hover:border-indigo-400/50 hover:bg-white/5 transition-all focus:outline-none"
            >
              {currentDisplayLogo ? (
                <img
                  src={currentDisplayLogo}
                  alt="Baxy Logo"
                  className="h-10 sm:h-12 max-w-[190px] object-contain drop-shadow"
                />
              ) : (
                <span className="text-3xl">🎨</span>
              )}
            </button>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
            />
            {logoSrc && logoSrc !== BAXY_LOGO_BASE64 && (
              <button
                onClick={() => onLogoChange(null)}
                title="Reset to default Baxy logo"
                className="absolute -bottom-1 -right-1 bg-slate-800 text-slate-300 hover:text-white p-1 rounded-full border border-slate-600 shadow-sm"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="border-l border-white/20 pl-4 py-0.5">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-wider text-white uppercase drop-shadow-sm">
                BAXY PAINTSHOP REPORT
              </h1>
            </div>
            <p className="text-xs sm:text-sm font-medium text-indigo-200/90 tracking-wide">
              Production <span className="opacity-50 mx-1">|</span> Quality{' '}
              <span className="opacity-50 mx-1">|</span> Performance
            </p>
          </div>
        </div>

        {/* Center Tagline (Hidden on smaller screens) */}
        <div className="hidden xl:flex flex-col items-center justify-center text-center px-4">
          <div className="text-sm font-semibold tracking-wide text-indigo-100 italic">
            Better Coating &nbsp;•&nbsp; Better Quality &nbsp;•&nbsp; Higher Productivity
          </div>
          <div className="text-xs text-indigo-300/80 mt-0.5 flex items-center gap-2">
            <span>Automotive Coatings Division</span>
            <span>•</span>
            <span>Plant 1</span>
          </div>
        </div>

        {/* Right Info & Live Status */}
        <div className="flex flex-wrap items-center gap-3 ml-auto sm:ml-0">
          {/* Date & Update pill */}
          <div className="flex items-center gap-2.5 bg-[#101835]/80 border border-[#222b4a] rounded-xl px-3.5 py-1.5 text-xs text-indigo-200">
            <Calendar className="w-4 h-4 text-indigo-400" />
            <div className="text-left">
              <div className="font-semibold text-white tracking-wide text-sm leading-tight">
                {currentDateStr}
              </div>
              <div className="text-[11px] text-indigo-300/80 flex items-center gap-1">
                <Clock className="w-3 h-3 inline text-indigo-400/80" />
                <span>Updated: {lastRefreshTime || 'Just now'}</span>
              </div>
            </div>
          </div>

          {/* Live Data Badge */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border ${
              isLive
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                : 'bg-slate-700/30 text-slate-300 border-slate-600/40'
            }`}
          >
            <span
              className={`inline-block w-2.5 h-2.5 rounded-full ${
                isLive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'
              }`}
            />
            <span>{isLive ? 'Live Sheet' : 'Sample Data'}</span>
          </div>

          {/* 30-Second Automatic Update Badge */}
          <div
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0f1738] border border-[#232f57] text-xs text-indigo-300 shadow-inner"
            title="Production data automatically updates once every 30 seconds"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-indigo-200 font-medium">Auto-update:</span>
            <span className="text-emerald-400 font-bold bg-emerald-500/15 px-1.5 py-0.5 rounded border border-emerald-500/30 font-mono text-[11px]">
              30s
            </span>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={onOpenAndroidModal}
              className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs px-3 py-2 rounded-lg shadow-sm transition-all border border-emerald-400/30 active:scale-95"
              title="Android Application Hub & Install"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-200" />
              <span>Android App</span>
            </button>

            <button
              onClick={onConnectSheet}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs px-3 py-2 rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400"
              title="Connect to Google Sheet published link"
            >
              <Link2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Connect Sheet</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 bg-[#1c264c] hover:bg-[#253265] text-indigo-200 hover:text-white font-medium text-xs px-3 py-2 rounded-lg border border-[#2b386b] transition-all"
              title="Upload XLSX or CSV file"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Upload File</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={onUploadFile}
            />

            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 bg-[#1c264c] hover:bg-[#253265] text-indigo-200 hover:text-white font-medium text-xs px-2.5 py-2 rounded-lg border border-[#2b386b] transition-all disabled:opacity-50"
              title="Update production data from sheet now"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={onAddRecord}
              className="flex items-center gap-1.5 bg-indigo-500 hover:bg-indigo-400 text-white font-medium text-xs px-3 py-2 rounded-lg shadow-sm transition-all"
              title="Open Daily Production Report form (Google Form synced)"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Log Record</span>
            </button>
          </div>

          {/* Profile & Settings Dropdown in Top-Right Corner */}
          <div className="pl-1 sm:pl-2 border-l border-white/15 flex items-center">
            <ProfileDropdown
              currentUser={currentUser}
              onOpenSettings={onOpenSettings}
              onSignOut={onSignOut}
              onOpenLogin={onOpenLogin}
              onAccountRemoved={onAccountRemoved}
            />
          </div>
        </div>
      </div>
    </header>
  );
};
