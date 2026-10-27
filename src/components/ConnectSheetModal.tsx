import React, { useState } from 'react';
import { X, Link2, Check, ExternalLink, AlertTriangle, RefreshCw } from 'lucide-react';
import { DEFAULT_CSV_URL } from '../dataService';

interface ConnectSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUrl: string;
  onSaveUrl: (url: string) => void;
  onResetToDefault: () => void;
}

export const ConnectSheetModal: React.FC<ConnectSheetModalProps> = ({
  isOpen,
  onClose,
  currentUrl,
  onSaveUrl,
  onResetToDefault,
}) => {
  const [urlInput, setUrlInput] = useState(currentUrl || DEFAULT_CSV_URL);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [statusMsg, setStatusMsg] = useState('');

  if (!isOpen) return null;

  const handleTest = async () => {
    if (!urlInput.trim()) {
      setTestStatus('error');
      setStatusMsg('Please enter a Google Sheet CSV URL');
      return;
    }
    setTestStatus('testing');
    setStatusMsg('Testing connection to sheet...');
    try {
      const cacheBust = (urlInput.includes('?') ? '&' : '?') + 't=' + Date.now();
      const target = urlInput.trim() + cacheBust;
      const res = await fetch(`https://corsproxy.io/?url=${encodeURIComponent(target)}`);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const text = await res.text();
      if (!text.trim() || /^\s*<(!doctype|html)/i.test(text)) {
        throw new Error('Received HTML webpage instead of CSV. Please publish as CSV.');
      }
      setTestStatus('success');
      setStatusMsg(`Connection successful! Received ${text.split('\n').length} rows.`);
    } catch (e: any) {
      setTestStatus('error');
      setStatusMsg(`Could not connect: ${e.message}`);
    }
  };

  const handleSave = () => {
    onSaveUrl(urlInput.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#121935] border border-[#2b396b] rounded-2xl w-full max-w-xl p-6 shadow-2xl text-white relative animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-indigo-300 hover:text-white p-1 rounded-lg hover:bg-white/10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Link2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Connect Live Google Sheet</h2>
            <p className="text-xs text-indigo-200/80">
              Sync paintshop production logs directly from your published Google Spreadsheet
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-indigo-300 uppercase tracking-wider mb-2">
              Google Sheet Published CSV Link
            </label>
            <input
              type="text"
              value={urlInput}
              onChange={(e) => {
                setUrlInput(e.target.value);
                setTestStatus('idle');
              }}
              placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv"
              className="w-full bg-[#0a1026] text-white border border-[#2b396b] focus:border-indigo-400 rounded-xl px-3.5 py-2.5 text-xs font-mono focus:outline-none"
            />
          </div>

          {testStatus !== 'idle' && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                testStatus === 'testing'
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                  : testStatus === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {testStatus === 'testing' && <RefreshCw className="w-4 h-4 animate-spin" />}
              {testStatus === 'success' && <Check className="w-4 h-4 text-emerald-400" />}
              {testStatus === 'error' && <AlertTriangle className="w-4 h-4 text-rose-400" />}
              <span>{statusMsg}</span>
            </div>
          )}

          {/* Quick instructions */}
          <div className="bg-[#0c142c] border border-[#1e2a52] rounded-xl p-3.5 text-xs text-indigo-200/90 space-y-1.5">
            <div className="font-semibold text-white flex items-center gap-1.5">
              <span>📋 How to publish Google Sheet as CSV:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px] leading-relaxed">
              <li>Open your Google Sheet with your production and inspection columns.</li>
              <li>Click <strong>File</strong> &rarr; <strong>Share</strong> &rarr; <strong>Publish to web</strong>.</li>
              <li>Under "Link", select your tab and change format to <strong>Comma-separated values (.csv)</strong>.</li>
              <li>Click <strong>Publish</strong> and copy the generated link.</li>
            </ol>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#1e2a52]">
          <div className="flex gap-2">
            <button
              onClick={handleTest}
              disabled={testStatus === 'testing'}
              className="px-3.5 py-2 bg-[#1b254a] hover:bg-[#253364] text-indigo-200 hover:text-white rounded-xl text-xs font-medium border border-[#2b396b] transition-all"
            >
              Test Link
            </button>
            <button
              onClick={() => {
                setUrlInput(DEFAULT_CSV_URL);
                onResetToDefault();
                setTestStatus('idle');
              }}
              className="px-3 py-2 bg-transparent text-indigo-400 hover:text-indigo-200 rounded-xl text-xs font-medium underline"
            >
              Reset to Default Baxy Sheet
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#17203e] hover:bg-[#202b54] text-slate-300 rounded-xl text-xs font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md transition-all"
            >
              Save &amp; Sync Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
