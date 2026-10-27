import React, { useState, useRef, useEffect } from 'react';
import {
  User,
  Settings,
  Shield,
  ShieldCheck,
  LogOut,
  ChevronDown,
  Sparkles,
  Users,
  FileSpreadsheet,
} from 'lucide-react';
import { UserSession } from '../types';

interface ProfileDropdownProps {
  currentUser: UserSession;
  onOpenSettings: (initialTab?: 'csv' | 'questions' | 'users' | 'security' | 'preferences') => void;
  onSignOut?: () => void;
  onOpenLogin?: () => void;
  onAccountRemoved?: () => void;
  triggerHaptic?: () => void;
}

export const ProfileDropdown: React.FC<ProfileDropdownProps> = ({
  currentUser,
  onOpenSettings,
  onSignOut,
  onOpenLogin,
  onAccountRemoved,
  triggerHaptic,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (triggerHaptic) triggerHaptic();
    setIsOpen((prev) => !prev);
  };

  const handleSettingsClick = (tab: 'csv' | 'questions' | 'users' | 'security' | 'preferences' = 'csv') => {
    if (triggerHaptic) triggerHaptic();
    setIsOpen(false);
    onOpenSettings(tab);
  };

  const isAdmin = currentUser.role === 'admin';

  // Extract initials
  const initials = (currentUser.name || currentUser.username || 'BP')
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'AD';

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Profile Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        className={`flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-xl border transition-all focus:outline-none select-none active:scale-95 ${
          isOpen
            ? 'bg-[#1b254b] border-indigo-500 shadow-md ring-2 ring-indigo-500/20'
            : 'bg-[#121b3b]/90 hover:bg-[#18234c] border-[#253360] hover:border-indigo-400/50'
        }`}
        title={`${currentUser.name} (${isAdmin ? 'Admin' : 'Operator'})`}
      >
        {/* Avatar circle */}
        <div className="relative">
          <div
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-black text-xs shadow-inner ${
              isAdmin
                ? 'bg-gradient-to-br from-indigo-500 to-indigo-700 text-white border border-indigo-400/40'
                : 'bg-gradient-to-br from-slate-600 to-slate-800 text-slate-200 border border-slate-500/40'
            }`}
          >
            {isAdmin ? <ShieldCheck className="w-4 h-4 text-emerald-300" /> : <User className="w-4 h-4 text-slate-200" />}
          </div>
          {/* Status Dot */}
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0b0f1e] ${
              isAdmin ? 'bg-emerald-400' : 'bg-blue-400'
            }`}
          />
        </div>

        {/* Text Details */}
        <div className="hidden sm:flex flex-col text-left">
          <span className="text-[11px] font-bold text-white leading-tight truncate max-w-[100px]">
            {currentUser.name || currentUser.username}
          </span>
          <span
            className={`text-[9px] uppercase font-extrabold tracking-wider ${
              isAdmin ? 'text-emerald-400' : 'text-blue-300'
            }`}
          >
            {isAdmin ? 'Administrator' : 'Operator'}
          </span>
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-indigo-300 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-white' : ''
          }`}
        />
      </button>

      {/* Modern Dark-Themed Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-[#0f1736] border border-[#263566] shadow-[0_10px_35px_rgba(0,0,0,0.7)] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* User Account Info Header */}
          <div className="p-4 bg-gradient-to-br from-[#121c44] to-[#18265a] border-b border-[#233362]">
            <div className="flex items-center gap-3">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm shadow-md ${
                  isAdmin
                    ? 'bg-gradient-to-br from-indigo-500 via-indigo-600 to-blue-700 text-white border border-indigo-400/50'
                    : 'bg-gradient-to-br from-slate-600 to-slate-800 text-slate-200 border border-slate-500/50'
                }`}
              >
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="font-bold text-white text-xs sm:text-sm truncate">
                    {currentUser.name || currentUser.username}
                  </h4>
                  <span
                    className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                      isAdmin
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                    }`}
                  >
                    {isAdmin ? 'Administrator' : 'Operator'}
                  </span>
                </div>
                <p className="text-[11px] text-indigo-200/70 truncate mt-0.5 font-mono">
                  @{currentUser.username || 'user'}
                </p>
              </div>
            </div>

            {/* Access Level Badge */}
            <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[10px] text-indigo-300/80">
              <span className="flex items-center gap-1">
                <Shield className="w-3 h-3 text-indigo-400" />
                Backend Security:
              </span>
              <span className="font-semibold text-emerald-400">
                {isAdmin ? 'Full Administrator Access' : 'Operator Access (Read-Only Config)'}
              </span>
            </div>
          </div>

          {/* Menu Items */}
          <div className="p-2 space-y-1">
            {/* User Management Button (Admin Only) */}
            {isAdmin && (
              <button
                onClick={() => handleSettingsClick('users')}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-white hover:bg-indigo-600/20 hover:text-indigo-200 border border-transparent hover:border-indigo-500/30 transition group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 group-hover:bg-emerald-600 group-hover:text-white transition">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="block font-bold flex items-center gap-1.5">
                      User Management
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-mono">
                        Admin
                      </span>
                    </span>
                    <span className="text-[10px] text-indigo-300/70 font-normal">
                      Add admins, operators &amp; reset passwords
                    </span>
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 -rotate-90 text-indigo-400 opacity-60 group-hover:opacity-100" />
              </button>
            )}

            {/* CSV Data Source Settings Button */}
            <button
              onClick={() => handleSettingsClick('csv')}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-white hover:bg-indigo-600/20 hover:text-indigo-200 border border-transparent hover:border-indigo-500/30 transition group"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 group-hover:bg-indigo-600 group-hover:text-white transition">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <span className="block font-bold">CSV Data Source</span>
                  <span className="text-[10px] text-indigo-300/70 font-normal">
                    {isAdmin ? 'Edit published CSV URL & live sync' : 'View connected CSV source'}
                  </span>
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 -rotate-90 text-indigo-400 opacity-60 group-hover:opacity-100" />
            </button>

            {/* Form Questions Editor Button */}
            <button
              onClick={() => handleSettingsClick('questions')}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-white hover:bg-indigo-600/20 hover:text-indigo-200 border border-transparent hover:border-indigo-500/30 transition group"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 group-hover:bg-indigo-600 group-hover:text-white transition">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <span className="block font-bold flex items-center gap-1.5">
                    Form Questions
                    {isAdmin && (
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-mono">
                        Admin
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] text-indigo-300/70 font-normal">
                    {isAdmin ? 'Add, edit, or delete questions' : 'View inspection form questions'}
                  </span>
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 -rotate-90 text-indigo-400 opacity-60 group-hover:opacity-100" />
            </button>

            {/* Security & Access Policies Button */}
            <button
              onClick={() => handleSettingsClick('security')}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-white hover:bg-indigo-600/20 hover:text-indigo-200 border border-transparent hover:border-indigo-500/30 transition group"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 group-hover:bg-indigo-600 group-hover:text-white transition">
                  <Shield className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <span className="block font-bold">Access &amp; Audit Security</span>
                  <span className="text-[10px] text-indigo-300/70 font-normal">
                    Role permissions &amp; audit logging
                  </span>
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 -rotate-90 text-indigo-400 opacity-60 group-hover:opacity-100" />
            </button>

            {/* Account Switcher / Sign Out */}
            <div className="pt-1 border-t border-[#1a254d] my-1">
              {onOpenLogin && (
                <button
                  onClick={() => {
                    if (triggerHaptic) triggerHaptic();
                    setIsOpen(false);
                    onOpenLogin();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-indigo-300 hover:text-white hover:bg-[#18234a] transition"
                >
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-indigo-400" />
                    <span>Switch User Account</span>
                  </div>
                  <span className="text-[10px] text-indigo-400">Sign in</span>
                </button>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-[#0a1026] border-t border-[#1a254d] flex items-center justify-between text-[11px] text-indigo-300/70">
            <span className="truncate">Plant 1 Coatings Division</span>
            <button
              onClick={() => {
                if (triggerHaptic) triggerHaptic();
                setIsOpen(false);
                if (onSignOut) {
                  onSignOut();
                }
              }}
              className="text-rose-400 hover:text-rose-300 flex items-center gap-1 font-semibold transition"
            >
              <LogOut className="w-3 h-3" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
