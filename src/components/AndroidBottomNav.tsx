import React from 'react';
import { ViewPage } from '../types';
import {
  LayoutDashboard,
  Factory,
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  FileSpreadsheet,
} from 'lucide-react';

interface AndroidBottomNavProps {
  currentPage: ViewPage;
  onPageChange: (page: ViewPage) => void;
  onHaptic?: () => void;
}

export const AndroidBottomNav: React.FC<AndroidBottomNavProps> = ({
  currentPage,
  onPageChange,
  onHaptic,
}) => {
  const items: { id: ViewPage; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'production', label: 'Prod', icon: <Factory className="w-5 h-5" /> },
    { id: 'quality', label: 'Quality', icon: <ShieldCheck className="w-5 h-5" /> },
    { id: 'defects', label: 'Defects', icon: <AlertTriangle className="w-5 h-5" /> },
    { id: 'trends', label: 'Trends', icon: <TrendingUp className="w-5 h-5" /> },
    { id: 'reports', label: 'Reports', icon: <FileSpreadsheet className="w-5 h-5" /> },
  ];

  const handleSelect = (id: ViewPage) => {
    if (onHaptic) onHaptic();
    else {
      try {
        if ('vibrate' in navigator) navigator.vibrate(10);
      } catch {}
    }
    onPageChange(id);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-[#0a1024]/95 backdrop-blur-md border-t border-[#1e2a52] px-2 py-1.5 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] pb-[max(env(safe-area-inset-bottom),8px)]">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {items.map((item) => {
          const active = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleSelect(item.id)}
              className="flex-1 flex flex-col items-center justify-center py-1 px-1 focus:outline-none transition-all active:scale-95"
            >
              <div
                className={`flex items-center justify-center px-4 py-1 rounded-full transition-all duration-200 ${
                  active
                    ? 'bg-indigo-600/90 text-white shadow-md shadow-indigo-600/40 ring-1 ring-indigo-400/30 scale-105'
                    : 'text-indigo-300/60 hover:text-indigo-200'
                }`}
              >
                {item.icon}
              </div>
              <span
                className={`text-[10px] tracking-tight mt-1 font-medium transition-colors ${
                  active ? 'text-indigo-200 font-bold' : 'text-indigo-300/60'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
