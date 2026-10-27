import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ProductionRow,
  ViewPage,
  FilterState,
  DateRangeOption,
  UserSession,
  FormQuestion,
} from './types';
import {
  DEFAULT_CSV_URL,
  DEFAULT_MONTHLY_TARGET,
  parseCsvOrExcel,
  fetchCsvString,
  computeData,
  dlab,
  fromDn,
  localKey,
} from './dataService';
import { DEFAULT_ROWS } from './sampleData';
import { DEFAULT_FORM_QUESTIONS } from './defaultQuestions';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { OverviewView } from './components/OverviewView';
import { ProductionView } from './components/ProductionView';
import { QualityView } from './components/QualityView';
import { DefectsView } from './components/DefectsView';
import { TrendsView } from './components/TrendsView';
import { ReportsView } from './components/ReportsView';
import { ConnectSheetModal } from './components/ConnectSheetModal';
import { EditTargetModal } from './components/EditTargetModal';
import { AddRecordModal } from './components/AddRecordModal';
import { AndroidInstallModal } from './components/AndroidInstallModal';
import { AndroidInstallBanner } from './components/AndroidInstallBanner';
import { AndroidBottomNav } from './components/AndroidBottomNav';
import { AndroidFAB } from './components/AndroidFAB';
import { OfflineIndicator } from './components/OfflineIndicator';
import { SettingsModal } from './components/SettingsModal';
import { LoginScreen } from './components/LoginScreen';
import { usePWAInstall } from './usePWAInstall';
import {
  LayoutDashboard,
  Factory,
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  FileSpreadsheet,
} from 'lucide-react';

export default function App() {
  const { triggerHaptic } = usePWAInstall();

  // Authentication & Session State
  const [currentUser, setCurrentUser] = useState<UserSession>(() => {
    try {
      const saved = localStorage.getItem('baxy_user');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      id: 'usr_admin_1',
      name: 'Sudhakar Vishnu (Admin)',
      email: 'sudhakarvishnu9@gmail.com',
      role: 'admin',
      token: 'token_admin_baxy_secure_2026',
      authenticated: true,
    };
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const auth = localStorage.getItem('baxy_auth');
      if (auth === 'true') return true;
      if (auth === 'false') return false;
      // Default to false so user gets to experience the login screen with username & password
      return false;
    } catch {
      return false;
    }
  });

  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);

  // Form Questions State (Loaded from backend or defaults)
  const [formQuestions, setFormQuestions] = useState<FormQuestion[]>(() => {
    try {
      const saved = localStorage.getItem('baxy_questions');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_FORM_QUESTIONS;
  });

  // Persistence states
  const [logoSrc, setLogoSrc] = useState<string | null>(() => {
    try {
      return localStorage.getItem('baxy_logo');
    } catch {
      return null;
    }
  });

  const [monthlyTarget, setMonthlyTarget] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('baxy_target');
      return saved && !isNaN(+saved) ? +saved : DEFAULT_MONTHLY_TARGET;
    } catch {
      return DEFAULT_MONTHLY_TARGET;
    }
  });

  const [csvUrl, setCsvUrl] = useState<string>(() => {
    try {
      return localStorage.getItem('baxy_csvurl') || DEFAULT_CSV_URL;
    } catch {
      return DEFAULT_CSV_URL;
    }
  });

  // App & Data state
  const [rows, setRows] = useState<ProductionRow[]>(DEFAULT_ROWS);
  const [page, setPage] = useState<ViewPage>('overview');
  const [isLive, setIsLive] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<string>('');
  const [statusNote, setStatusNote] = useState<string>('Initializing paintshop engine...');

  // Filters state
  const [filters, setFilters] = useState<FilterState>(() => {
    const today = new Date();
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    return {
      dateRange: 'month' as DateRangeOption,
      customFrom: localKey(firstOfMonth),
      customTo: localKey(today),
      shift: 'All',
      model: 'All',
      line: 'All',
    };
  });

  // Modals state
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [isAddRecordModalOpen, setIsAddRecordModalOpen] = useState(false);
  const [isAndroidModalOpen, setIsAndroidModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'csv' | 'questions' | 'users' | 'security' | 'preferences'>('csv');

  // Load backend configuration & auth on startup
  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success) {
          if (data.csvUrl) setCsvUrl(data.csvUrl);
          if (data.formQuestions && Array.isArray(data.formQuestions)) {
            setFormQuestions(data.formQuestions);
          }
        }
      })
      .catch((err) => console.warn('Could not sync with backend config store:', err));
  }, []);

  // Parse Android App Shortcuts & URL query params on launch
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const actionParam = params.get('action');
      const tabParam = params.get('tab') as ViewPage;

      if (actionParam === 'log') {
        setIsAddRecordModalOpen(true);
      }
      if (
        tabParam &&
        ['overview', 'production', 'quality', 'defects', 'trends', 'reports'].includes(tabParam)
      ) {
        setPage(tabParam);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Handle Android device back button & history popstate
  const handlePageChange = (newPage: ViewPage) => {
    triggerHaptic();
    if (newPage !== page) {
      try {
        window.history.pushState({ page: newPage }, '', `?tab=${newPage}`);
      } catch {}
      setPage(newPage);
    }
  };

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e.state?.page) {
        setPage(e.state.page);
      } else {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab') as ViewPage;
        if (tab && ['overview', 'production', 'quality', 'defects', 'trends', 'reports'].includes(tab)) {
          setPage(tab);
        } else {
          setPage('overview');
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Authentication handlers
  const handleLoginSuccess = (user: UserSession, keepSignedIn: boolean) => {
    triggerHaptic();
    setCurrentUser(user);
    setIsAuthenticated(true);
    setShowLoginModal(false);
    try {
      if (keepSignedIn) {
        localStorage.setItem('baxy_auth', 'true');
      } else {
        sessionStorage.setItem('baxy_auth', 'true');
        localStorage.removeItem('baxy_auth');
      }
      localStorage.setItem('baxy_user', JSON.stringify(user));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSignOut = () => {
    triggerHaptic();
    setIsAuthenticated(false);
    setShowLoginModal(false);
    try {
      localStorage.setItem('baxy_auth', 'false');
      sessionStorage.removeItem('baxy_auth');
      localStorage.removeItem('baxy_user');
    } catch (e) {
      console.error(e);
    }
  };

  // Open settings modal
  const handleOpenSettings = (
    initialTab: 'csv' | 'questions' | 'users' | 'security' | 'preferences' = 'csv'
  ) => {
    setSettingsTab(initialTab);
    setIsSettingsOpen(true);
  };

  // Logo persistence
  const handleLogoChange = (newLogo: string | null) => {
    setLogoSrc(newLogo);
    try {
      if (newLogo) localStorage.setItem('baxy_logo', newLogo);
      else localStorage.removeItem('baxy_logo');
    } catch (e) {
      console.error(e);
    }
  };

  // Target persistence
  const handleSaveTarget = (val: number) => {
    setMonthlyTarget(val);
    try {
      localStorage.setItem('baxy_target', String(val));
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch sheet logic
  const loadSheetData = useCallback(async (targetUrl: string, silent: boolean = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const csvText = await fetchCsvString(targetUrl);
      const parsedRows = await parseCsvOrExcel(csvText);

      if (parsedRows.length > 0) {
        setRows(parsedRows);
        setIsLive(true);
        const now = new Date();
        setLastRefreshTime(
          now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        );
        setStatusNote(`Live sync active · ${parsedRows.length} total entries retrieved from sheet.`);
      } else {
        setStatusNote('Connected, but 0 valid production rows found in sheet. Showing default sample data.');
      }
    } catch (err: any) {
      console.warn('Could not fetch live sheet, fallback to sample data:', err.message);
      setIsLive(false);
      setStatusNote(`Sheet sync paused: ${err.message}. Displaying sample production data.`);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Initial load and recurring 30-second automatic background data update
  useEffect(() => {
    // Initial fetch on mount or when csvUrl changes
    loadSheetData(csvUrl, false);

    // Automatically update on 30 sec once
    const autoUpdateInterval = setInterval(() => {
      loadSheetData(csvUrl, true);
    }, 30000);

    return () => clearInterval(autoUpdateInterval);
  }, [csvUrl, loadSheetData]);

  const handleManualRefresh = () => {
    triggerHaptic();
    loadSheetData(csvUrl, false);
  };

  const handleAccountRemoved = () => {
    triggerHaptic();
    setIsAuthenticated(false);
    setCurrentUser({
      id: '',
      username: '',
      name: '',
      role: 'operator',
      token: '',
      authenticated: false,
    });
    try {
      localStorage.removeItem('baxy_auth');
      sessionStorage.removeItem('baxy_auth');
      localStorage.removeItem('baxy_user');
    } catch {}
    setShowLoginModal(true);
  };

  // Backend Protected CSV URL update
  const handleUpdateCsvUrl = async (newUrl: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/config/csv-url', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentUser.token}`,
        },
        body: JSON.stringify({ csvUrl: newUrl }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error || `HTTP ${res.status}: Failed to update CSV URL`,
        };
      }

      // Update frontend state persistently
      setCsvUrl(newUrl);
      try {
        localStorage.setItem('baxy_csvurl', newUrl);
      } catch {}

      // Automatically refresh dashboard data source without requiring a page reload
      await loadSheetData(newUrl);

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error updating CSV URL' };
    }
  };

  // Backend Protected Form Questions update
  const handleUpdateFormQuestions = async (
    newQuestions: FormQuestion[]
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/config/form-questions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentUser.token}`,
        },
        body: JSON.stringify({ formQuestions: newQuestions }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error || `HTTP ${res.status}: Failed to update form questions`,
        };
      }

      setFormQuestions(newQuestions);
      try {
        localStorage.setItem('baxy_questions', JSON.stringify(newQuestions));
      } catch {}

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error updating form questions' };
    }
  };

  // Backend Protected Reset Questions to Defaults
  const handleResetQuestions = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/config/form-questions/reset', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${currentUser.token}`,
        },
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        return { success: false, error: data.error };
      }

      setFormQuestions(DEFAULT_FORM_QUESTIONS);
      try {
        localStorage.removeItem('baxy_questions');
      } catch {}

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  // Upload file (Excel / CSV)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsRefreshing(true);
    try {
      const buffer = await file.arrayBuffer();
      const parsed = await parseCsvOrExcel(buffer);
      if (parsed.length > 0) {
        setRows(parsed);
        setIsLive(false);
        const now = new Date();
        setLastRefreshTime(
          now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        );
        setStatusNote(`Loaded ${parsed.length} rows from uploaded file "${file.name}".`);
      } else {
        alert('Could not parse valid production records from this file.');
      }
    } catch (err: any) {
      alert(`Error reading file: ${err.message}`);
    } finally {
      setIsRefreshing(false);
      e.target.value = '';
    }
  };

  // Add new production record
  const handleAddRow = (newRow: ProductionRow) => {
    triggerHaptic();
    setRows((prev) => [newRow, ...prev]);
    setStatusNote(`Added new log entry #${newRow.ID} (${newRow.Part} - ${newRow.Line}). Recorded in Google Sheet & Dashboard.`);
    // Auto-poll the Google Sheet published CSV so the remote entry is reconciled
    setTimeout(() => {
      loadSheetData(csvUrl, true);
    }, 3500);
  };

  // Compute available filter options from current data
  const availableShifts = useMemo(() => {
    const set = new Set(rows.map((r) => r.Shift).filter(Boolean));
    return Array.from(set).sort();
  }, [rows]);

  const availableModels = useMemo(() => {
    const set = new Set(rows.map((r) => r.Part).filter(Boolean));
    return Array.from(set).sort();
  }, [rows]);

  const availableLines = useMemo(() => {
    const set = new Set(rows.map((r) => r.Line).filter(Boolean));
    return Array.from(set).sort();
  }, [rows]);

  // Compute filtered data
  const computedData = useMemo(() => {
    return computeData(rows, filters);
  }, [rows, filters]);

  // Auto-switch to 'all' if selected date range has 0 rows (smart fallback matching original Netlify app)
  useEffect(() => {
    if (filters.dateRange !== 'all' && rows.length > 0 && computedData.cur.length === 0) {
      setFilters((prev) => ({ ...prev, dateRange: 'all' }));
    }
  }, [rows, computedData.cur.length, filters.dateRange]);

  const dateSpanText = useMemo(() => {
    if (!computedData.cur.length) return 'No dates in scope';
    const ks = computedData.cur.map((r) => r.DateKey).sort();
    return `${dlab(ks[0])} to ${dlab(ks[ks.length - 1])}`;
  }, [computedData.cur]);

  const navItems: { id: ViewPage; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'production', label: 'Production', icon: <Factory className="w-4 h-4" /> },
    { id: 'quality', label: 'Quality', icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'defects', label: 'Defects Analysis', icon: <AlertTriangle className="w-4 h-4" /> },
    { id: 'trends', label: 'Trends', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'reports', label: 'Reports', icon: <FileSpreadsheet className="w-4 h-4" /> },
  ];

  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} triggerHaptic={triggerHaptic} />;
  }

  return (
    <div className="min-h-screen bg-[#0b0f1e] text-[#e8ecff] flex flex-col font-sans selection:bg-indigo-500 selection:text-white pb-16 lg:pb-0">
      {/* Offline Status Snackbar */}
      <OfflineIndicator />

      {/* Top Header with Profile Icon & Settings Dropdown */}
      <Header
        logoSrc={logoSrc}
        onLogoChange={handleLogoChange}
        isLive={isLive}
        isRefreshing={isRefreshing}
        lastRefreshTime={lastRefreshTime}
        onConnectSheet={() => handleOpenSettings('csv')}
        onUploadFile={handleFileUpload}
        onRefresh={handleManualRefresh}
        onAddRecord={() => setIsAddRecordModalOpen(true)}
        onOpenAndroidModal={() => setIsAndroidModalOpen(true)}
        onOpenSettings={handleOpenSettings}
        currentUser={currentUser}
        onSignOut={handleSignOut}
        onOpenLogin={() => setShowLoginModal(true)}
        onAccountRemoved={handleAccountRemoved}
        totalRows={rows.length}
      />

      {/* Android Installation Banner */}
      <AndroidInstallBanner onOpenDetails={() => setIsAndroidModalOpen(true)} />

      {/* Main Layout: Sidebar & Content */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Desktop Sidebar Navigation */}
        <aside className="hidden lg:block w-56 shrink-0 border-r border-[#222b4a] bg-[#0c1226]/90 p-4 sticky top-0 backdrop-blur-sm self-start min-h-[calc(100vh-80px)]">
          <nav className="flex flex-col gap-1.5">
            {navItems.map((item) => {
              const active = page === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handlePageChange(item.id)}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap text-left ${
                    active
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-1 ring-indigo-400/40'
                      : 'text-indigo-200/70 hover:text-white hover:bg-[#182346]'
                  }`}
                >
                  <span className={active ? 'text-white' : 'text-indigo-400'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-3 sm:p-5 lg:p-6 min-w-0 max-w-7xl mx-auto w-full pb-24 lg:pb-12">
          {/* Filters Bar */}
          <FilterBar
            filters={filters}
            onFilterChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
            availableShifts={availableShifts}
            availableModels={availableModels}
            availableLines={availableLines}
            recordsCount={computedData.cur.length}
            dateSpanText={dateSpanText}
          />

          {/* Active View */}
          <div className="space-y-6">
            {page === 'overview' && (
              <OverviewView
                data={computedData}
                monthlyTarget={monthlyTarget}
                onEditTarget={() => setIsTargetModalOpen(true)}
              />
            )}

            {page === 'production' && <ProductionView data={computedData} />}

            {page === 'quality' && <QualityView data={computedData} />}

            {page === 'defects' && <DefectsView data={computedData} />}

            {page === 'trends' && <TrendsView data={computedData} />}

            {page === 'reports' && <ReportsView data={computedData} />}
          </div>

          {/* Bottom Status / Audit Note */}
          <footer className="mt-8 pt-4 border-t border-[#1b2342] text-center text-xs text-indigo-300/60 flex flex-wrap items-center justify-between gap-2">
            <div>{statusNote}</div>
            <div className="text-[11px] text-slate-500">
              Shift Schedule: A (06:00–14:00) · B (14:00–22:00) · C (22:00–06:00)
            </div>
          </footer>
        </main>
      </div>

      {/* Android Floating Action Button (FAB) */}
      <AndroidFAB
        onAddRecord={() => setIsAddRecordModalOpen(true)}
        onRefresh={() => loadSheetData(csvUrl)}
        isRefreshing={isRefreshing}
        onHaptic={triggerHaptic}
      />

      {/* Android Material 3 Bottom Navigation Bar */}
      <AndroidBottomNav
        currentPage={page}
        onPageChange={handlePageChange}
        onHaptic={triggerHaptic}
      />

      {/* Comprehensive Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        initialTab={settingsTab}
        csvUrl={csvUrl}
        onUpdateCsvUrl={handleUpdateCsvUrl}
        formQuestions={formQuestions}
        onUpdateFormQuestions={handleUpdateFormQuestions}
        onResetQuestions={handleResetQuestions}
        currentUser={currentUser}
        monthlyTarget={monthlyTarget}
        onUpdateTarget={handleSaveTarget}
        triggerHaptic={triggerHaptic}
        onAccountRemoved={handleAccountRemoved}
      />

      {/* Android PWA Install Modal */}
      <AndroidInstallModal
        isOpen={isAndroidModalOpen}
        onClose={() => setIsAndroidModalOpen(false)}
      />

      {/* Fallback Connect Modal */}
      <ConnectSheetModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        currentUrl={csvUrl}
        onSaveUrl={(newUrl) => handleUpdateCsvUrl(newUrl)}
        onResetToDefault={() => handleUpdateCsvUrl(DEFAULT_CSV_URL)}
      />

      {/* Target Modal */}
      <EditTargetModal
        isOpen={isTargetModalOpen}
        onClose={() => setIsTargetModalOpen(false)}
        currentTarget={monthlyTarget}
        onSaveTarget={handleSaveTarget}
      />

      {/* Data-Entry Log Record Modal (Synced with Form Questions) */}
      <AddRecordModal
        isOpen={isAddRecordModalOpen}
        onClose={() => setIsAddRecordModalOpen(false)}
        onAddRow={handleAddRow}
        formQuestions={formQuestions}
        availableModels={availableModels}
        availableLines={availableLines}
      />

      {/* Switch Account / Re-login Modal Overlay */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <LoginScreen
            onLoginSuccess={handleLoginSuccess}
            onClose={() => setShowLoginModal(false)}
            triggerHaptic={triggerHaptic}
          />
        </div>
      )}
    </div>
  );
}
