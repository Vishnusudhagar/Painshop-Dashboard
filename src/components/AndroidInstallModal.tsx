import React, { useState } from 'react';
import {
  Smartphone,
  Download,
  CheckCircle2,
  Share2,
  Copy,
  ExternalLink,
  Layers,
  Sparkles,
  WifiOff,
  Zap,
  X,
  ShieldCheck,
} from 'lucide-react';
import { usePWAInstall } from '../usePWAInstall';

interface AndroidInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidInstallModal: React.FC<AndroidInstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isAndroid, isIOS, install, triggerHaptic } = usePWAInstall();
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [activeTab, setActiveTab] = useState<'install' | 'apk' | 'features'>('install');

  if (!isOpen) return null;

  const currentUrl = window.location.href;

  const handleCopyUrl = () => {
    triggerHaptic();
    navigator.clipboard.writeText(currentUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleInstallClick = async () => {
    triggerHaptic();
    if (isInstallable) {
      await install();
    } else {
      alert(
        'To install on Android:\n1. Open Chrome menu (⋮) in the top-right.\n2. Tap "Install app" or "Add to Home screen".'
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#101835] border border-[#2a3663] rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0d1d4d] via-[#152968] to-[#1e3482] p-4 sm:p-5 border-b border-[#223164] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shadow-inner text-indigo-300">
              <Smartphone className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Android Application
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Ready
                </span>
              </h3>
              <p className="text-xs text-indigo-200/80">
                Install as a native APK or WebAPK on your Android device
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              triggerHaptic();
              onClose();
            }}
            className="text-indigo-300 hover:text-white p-2 rounded-xl hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-[#223164] bg-[#0c132c] px-4 pt-2 gap-2 text-xs font-semibold">
          <button
            onClick={() => {
              triggerHaptic();
              setActiveTab('install');
            }}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'install'
                ? 'border-indigo-500 text-indigo-300 font-bold'
                : 'border-transparent text-indigo-400/60 hover:text-indigo-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            1-Tap Install
          </button>
          <button
            onClick={() => {
              triggerHaptic();
              setActiveTab('apk');
            }}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'apk'
                ? 'border-indigo-500 text-indigo-300 font-bold'
                : 'border-transparent text-indigo-400/60 hover:text-indigo-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            APK / Package Guide
          </button>
          <button
            onClick={() => {
              triggerHaptic();
              setActiveTab('features');
            }}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'features'
                ? 'border-indigo-500 text-indigo-300 font-bold'
                : 'border-transparent text-indigo-400/60 hover:text-indigo-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            App Features
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs sm:text-sm text-indigo-200/90">
          {activeTab === 'install' && (
            <div className="space-y-4">
              {isInstalled ? (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-emerald-300 text-sm">
                      Application Already Installed!
                    </h4>
                    <p className="text-xs text-emerald-200/80 mt-1">
                      You are using Baxy Paintshop in standalone Android mode. You can access it anytime directly from your phone's home screen or app drawer.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-900/40 to-blue-900/30 border border-indigo-500/30">
                  <div className="flex items-center gap-3 mb-3">
                    <img
                      src="/pwa-192x192.png"
                      alt="Baxy App Icon"
                      className="w-12 h-12 rounded-2xl shadow-md border border-white/10"
                    />
                    <div>
                      <h4 className="font-bold text-white text-sm sm:text-base">
                        Baxy Paintshop Mobile
                      </h4>
                      <p className="text-xs text-indigo-300">
                        Version 2.0 • Standalone Android WebAPK
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleInstallClick}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition active:scale-[0.98]"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isInstallable ? 'Install Now on Android' : 'Add to Android Home Screen'}</span>
                  </button>
                </div>
              )}

              {/* Step by step Android instructions */}
              <div className="bg-[#141e42] rounded-2xl p-4 border border-[#23315c] space-y-3">
                <h5 className="font-bold text-white flex items-center gap-2 text-xs uppercase tracking-wider text-indigo-300">
                  <Smartphone className="w-4 h-4 text-indigo-400" />
                  How to Install on Any Android Phone:
                </h5>
                <ol className="space-y-2.5 text-xs text-indigo-200/90 list-decimal list-inside leading-relaxed">
                  <li className="pl-1">
                    Open this URL in <strong className="text-white">Google Chrome</strong> or <strong className="text-white">Samsung Internet</strong> on your phone.
                  </li>
                  <li className="pl-1">
                    Tap the <strong>three dots menu (⋮)</strong> at the top right of the browser.
                  </li>
                  <li className="pl-1">
                    Select <strong className="text-emerald-300">"Install app"</strong> or <strong className="text-emerald-300">"Add to Home screen"</strong>.
                  </li>
                  <li className="pl-1">
                    Android will create a native app shortcut with full splash screen, zero browser address bars, and standalone performance!
                  </li>
                </ol>
              </div>

              {/* Share URL block */}
              <div className="bg-[#121936] rounded-xl p-3 border border-[#232f57] flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-[10px] font-semibold uppercase text-indigo-400 block">
                    Share Link to Phone
                  </span>
                  <div className="text-xs text-slate-300 truncate font-mono">
                    {currentUrl}
                  </div>
                </div>
                <button
                  onClick={handleCopyUrl}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600/40 hover:bg-indigo-600 text-white text-xs font-semibold shrink-0 flex items-center gap-1.5 transition"
                >
                  {copiedUrl ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedUrl ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'apk' && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/20">
                <h4 className="font-bold text-white text-xs sm:text-sm flex items-center gap-2 mb-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Convert to Standalone Android .APK (TWA)
                </h4>
                <p className="text-xs text-indigo-200/80 leading-relaxed">
                  Because this application is a fully compliant Progressive Web App with manifest and service worker, it can be packaged directly into a native Android <strong className="text-white">.apk</strong> file for enterprise sideloading (MDM) or Google Play Console release.
                </p>
              </div>

              <div className="space-y-2 text-xs bg-[#131d40] p-3.5 rounded-xl border border-[#24315f]">
                <h5 className="font-bold text-indigo-300 uppercase tracking-wide text-[11px]">
                  Option 1: PWABuilder (Recommended 1-Click APK)
                </h5>
                <p className="text-indigo-200/80">
                  PWABuilder generates an Android Studio project or signed APK in seconds:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-slate-300">
                  <li>Visit <span className="text-indigo-400 underline font-mono">pwabuilder.com</span></li>
                  <li>Paste the app URL</li>
                  <li>Click <strong>Package for Android</strong> &rarr; Download Signed APK / AAB.</li>
                </ol>
                <a
                  href={`https://www.pwabuilder.com?url=${encodeURIComponent(currentUrl)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition"
                >
                  <span>Open in PWABuilder</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="space-y-2 text-xs bg-[#131d40] p-3.5 rounded-xl border border-[#24315f]">
                <h5 className="font-bold text-indigo-300 uppercase tracking-wide text-[11px]">
                  Option 2: Android CLI (Bubblewrap CLI)
                </h5>
                <p className="text-indigo-200/80">
                  For native Android developers using Google's official Bubblewrap tool:
                </p>
                <div className="bg-[#0a0f24] p-2.5 rounded-lg font-mono text-[11px] text-emerald-400 select-all overflow-x-auto">
                  npm i -g @bubblewrap/cli<br />
                  bubblewrap init --manifest="{currentUrl.replace(/\/$/, '')}/manifest.webmanifest"<br />
                  bubblewrap build
                </div>
              </div>
            </div>
          )}

          {activeTab === 'features' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl bg-[#131d40] border border-[#24315f] space-y-1">
                  <div className="flex items-center gap-2 font-bold text-white text-xs">
                    <WifiOff className="w-4 h-4 text-amber-400" />
                    Offline Ready
                  </div>
                  <p className="text-[11px] text-indigo-300/80">
                    Service Worker caches sheets data and UI so paintshop operators can record data offline.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#131d40] border border-[#24315f] space-y-1">
                  <div className="flex items-center gap-2 font-bold text-white text-xs">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    Android Navigation Bar
                  </div>
                  <p className="text-[11px] text-indigo-300/80">
                    Material 3 bottom navigation with haptic touch feedback tailored for one-handed operation.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#131d40] border border-[#24315f] space-y-1">
                  <div className="flex items-center gap-2 font-bold text-white text-xs">
                    <Zap className="w-4 h-4 text-indigo-400" />
                    Floating Action Button (FAB)
                  </div>
                  <p className="text-[11px] text-indigo-300/80">
                    Quick "+ Log Entry" button for instantaneous shop-floor batch recording.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#131d40] border border-[#24315f] space-y-1">
                  <div className="flex items-center gap-2 font-bold text-white text-xs">
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    Android Shortcuts
                  </div>
                  <p className="text-[11px] text-indigo-300/80">
                    Long-press the home screen icon to directly jump to Quality or Defect Pareto.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-[#0c1228] rounded-xl border border-[#1e2a52] text-xs text-indigo-300/80 flex items-center justify-between">
                <span>Theme Bar: <strong>#0a1a46</strong> (Android status bar)</span>
                <span className="text-emerald-400 font-semibold">100% PWA Score</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-[#0b1129] border-t border-[#223164] flex items-center justify-between">
          <span className="text-[11px] text-indigo-400/70">
            {isAndroid ? 'Android Device Detected' : isIOS ? 'iOS Device Detected' : 'Desktop Browser'}
          </span>
          <button
            onClick={() => {
              triggerHaptic();
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-[#1a254d] hover:bg-[#233166] text-white text-xs font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
