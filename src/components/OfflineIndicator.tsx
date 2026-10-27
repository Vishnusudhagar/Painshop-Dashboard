import React, { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { useOnlineStatus } from '../useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const [showRestored, setShowRestored] = useState(false);
  const [hasBeenOffline, setHasBeenOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setHasBeenOffline(true);
    } else if (hasBeenOffline) {
      setShowRestored(true);
      const timer = setTimeout(() => setShowRestored(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, hasBeenOffline]);

  if (!isOnline) {
    return (
      <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-amber-600/95 text-white px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-lg backdrop-blur-sm border border-amber-400/40 flex items-center gap-2 animate-bounce">
        <WifiOff className="w-3.5 h-3.5 text-white" />
        <span>Offline Mode — Using Cached Data</span>
      </div>
    );
  }

  if (showRestored) {
    return (
      <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-emerald-600/95 text-white px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-lg backdrop-blur-sm border border-emerald-400/40 flex items-center gap-2">
        <Wifi className="w-3.5 h-3.5 text-white" />
        <span>Back Online — Live Sync Restored</span>
      </div>
    );
  }

  return null;
};
