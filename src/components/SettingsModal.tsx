import React, { useState, useEffect } from 'react';
import {
  X,
  FileSpreadsheet,
  Edit2,
  Check,
  AlertCircle,
  Copy,
  CheckCircle2,
  ExternalLink,
  RotateCw,
  Plus,
  Trash2,
  Settings as SettingsIcon,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Save,
  HelpCircle,
  List,
  Sparkles,
  Lock,
  Unlock,
  KeyRound,
  RotateCcw,
  Users,
  UserPlus,
  Power,
  Activity,
  History,
  User,
} from 'lucide-react';
import { FormQuestion, QuestionType, UserSession, UserAccount, AuditLogEntry } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'csv' | 'questions' | 'users' | 'security' | 'preferences';
  csvUrl: string;
  onUpdateCsvUrl: (newUrl: string) => Promise<{ success: boolean; error?: string }>;
  formQuestions: FormQuestion[];
  onUpdateFormQuestions: (
    questions: FormQuestion[]
  ) => Promise<{ success: boolean; error?: string }>;
  onResetQuestions: () => Promise<{ success: boolean; error?: string }>;
  currentUser: UserSession;
  monthlyTarget: number;
  onUpdateTarget: (target: number) => void;
  onAccountRemoved?: () => void;
  triggerHaptic?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'csv',
  csvUrl,
  onUpdateCsvUrl,
  formQuestions,
  onUpdateFormQuestions,
  onResetQuestions,
  currentUser,
  monthlyTarget,
  onUpdateTarget,
  onAccountRemoved,
  triggerHaptic,
}) => {
  const [activeTab, setActiveTab] = useState<'csv' | 'questions' | 'users' | 'security' | 'preferences'>(
    initialTab
  );

  // Sync tab on open
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  const isAdmin = currentUser.role === 'admin';

  const doHaptic = () => {
    if (triggerHaptic) triggerHaptic();
  };

  /* ================= CSV STATE & HANDLERS ================= */
  const [isEditingCsv, setIsEditingCsv] = useState(false);
  const [csvInput, setCsvInput] = useState(csvUrl);
  const [csvError, setCsvError] = useState('');
  const [csvSuccessMessage, setCsvSuccessMessage] = useState('');
  const [isSavingCsv, setIsSavingCsv] = useState(false);
  const [copiedCsv, setCopiedCsv] = useState(false);

  useEffect(() => {
    setCsvInput(csvUrl);
  }, [csvUrl]);

  const handleStartEditCsv = () => {
    doHaptic();
    if (!isAdmin) {
      setCsvError('Access Denied: Only administrators can modify the CSV link.');
      return;
    }
    setCsvInput(csvUrl);
    setIsEditingCsv(true);
    setCsvError('');
    setCsvSuccessMessage('');
  };

  const handleCancelEditCsv = () => {
    doHaptic();
    setCsvInput(csvUrl);
    setIsEditingCsv(false);
    setCsvError('');
  };

  const handleSaveCsv = async () => {
    doHaptic();
    const trimmed = csvInput.trim();

    if (!trimmed) {
      setCsvError('CSV URL cannot be empty.');
      return;
    }

    if (!/^https?:\/\//i.test(trimmed)) {
      setCsvError('Invalid URL. The link must start with https:// or http://.');
      return;
    }

    setIsSavingCsv(true);
    setCsvError('');

    try {
      const res = await onUpdateCsvUrl(trimmed);
      if (res.success) {
        setIsEditingCsv(false);
        setCsvSuccessMessage('CSV data source updated & live synchronization refreshed!');
        setTimeout(() => setCsvSuccessMessage(''), 4500);
      } else {
        setCsvError(res.error || 'Failed to update CSV URL. Check backend permissions.');
      }
    } catch (err: any) {
      setCsvError(err.message || 'An error occurred while saving CSV link.');
    } finally {
      setIsSavingCsv(false);
    }
  };

  const handleCopyCsv = () => {
    doHaptic();
    navigator.clipboard.writeText(csvUrl);
    setCopiedCsv(true);
    setTimeout(() => setCopiedCsv(false), 2000);
  };

  /* ================= FORM QUESTIONS HANDLERS ================= */
  const [editableQuestions, setEditableQuestions] = useState<FormQuestion[]>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [newOptionInput, setNewOptionInput] = useState('');
  const [questionsSuccessMessage, setQuestionsSuccessMessage] = useState('');
  const [questionsError, setQuestionsError] = useState('');
  const [isSavingQuestions, setIsSavingQuestions] = useState(false);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);

  const [newQuestionDraft, setNewQuestionDraft] = useState<Partial<FormQuestion>>({
    title: '',
    type: 'short_text',
    required: false,
    options: ['Option 1', 'Option 2'],
    stageCondition: 'All',
  });

  useEffect(() => {
    setEditableQuestions(JSON.parse(JSON.stringify(formQuestions)));
    if (formQuestions.length > 0 && !selectedQuestionId) {
      setSelectedQuestionId(formQuestions[0].id);
    }
  }, [formQuestions, isOpen]);

  const currentSelectedQuestion = editableQuestions.find((q) => q.id === selectedQuestionId);

  const handleQuestionFieldChange = (field: keyof FormQuestion, value: any) => {
    if (!selectedQuestionId || !isAdmin) return;
    setEditableQuestions((prev) =>
      prev.map((q) => {
        if (q.id === selectedQuestionId) {
          const updated = { ...q, [field]: value };
          if (
            (field === 'type' && (value === 'dropdown' || value === 'multiple_choice')) &&
            (!updated.options || updated.options.length === 0)
          ) {
            updated.options = ['Option 1', 'Option 2'];
          }
          return updated;
        }
        return q;
      })
    );
  };

  const handleAddOptionToQuestion = () => {
    doHaptic();
    const trimmed = newOptionInput.trim();
    if (!trimmed || !selectedQuestionId || !isAdmin) return;

    setEditableQuestions((prev) =>
      prev.map((q) => {
        if (q.id === selectedQuestionId) {
          const currentOpts = q.options || [];
          if (!currentOpts.includes(trimmed)) {
            return { ...q, options: [...currentOpts, trimmed] };
          }
        }
        return q;
      })
    );
    setNewOptionInput('');
  };

  const handleRemoveOptionFromQuestion = (optIndex: number) => {
    doHaptic();
    if (!selectedQuestionId || !isAdmin) return;
    setEditableQuestions((prev) =>
      prev.map((q) => {
        if (q.id === selectedQuestionId) {
          const currentOpts = q.options || [];
          return { ...q, options: currentOpts.filter((_, i) => i !== optIndex) };
        }
        return q;
      })
    );
  };

  const handleDeleteQuestion = (id: string) => {
    doHaptic();
    if (!isAdmin) return;
    if (editableQuestions.length <= 1) {
      setQuestionsError('Form must have at least one question.');
      return;
    }
    const filtered = editableQuestions.filter((q) => q.id !== id);
    setEditableQuestions(filtered);
    if (selectedQuestionId === id) {
      setSelectedQuestionId(filtered[0]?.id || null);
    }
  };

  const handleSaveAllQuestions = async () => {
    doHaptic();
    if (!isAdmin) {
      setQuestionsError('Access Denied: Only administrators can save question changes.');
      return;
    }

    for (const q of editableQuestions) {
      if ((q.type === 'dropdown' || q.type === 'multiple_choice') && (!q.options || q.options.length === 0)) {
        setQuestionsError(`Question "${q.title}" requires at least one answer option.`);
        setSelectedQuestionId(q.id);
        return;
      }
    }

    setIsSavingQuestions(true);
    setQuestionsError('');

    try {
      const res = await onUpdateFormQuestions(editableQuestions);
      if (res.success) {
        setQuestionsSuccessMessage('Form questions successfully saved & updated in data-entry form!');
        setTimeout(() => setQuestionsSuccessMessage(''), 4500);
      } else {
        setQuestionsError(res.error || 'Failed to save questions. Check backend permissions.');
      }
    } catch (err: any) {
      setQuestionsError(err.message || 'An error occurred while saving questions.');
    } finally {
      setIsSavingQuestions(false);
    }
  };

  const handleCancelQuestionEdits = () => {
    doHaptic();
    setEditableQuestions(JSON.parse(JSON.stringify(formQuestions)));
    setQuestionsError('');
    setIsAddingQuestion(false);
  };

  const handleCreateNewQuestion = () => {
    doHaptic();
    if (!newQuestionDraft.title?.trim()) {
      setQuestionsError('Question title is required.');
      return;
    }

    const newId = `q_custom_${Date.now()}`;
    const newQ: FormQuestion = {
      id: newId,
      title: newQuestionDraft.title.trim(),
      type: newQuestionDraft.type || 'short_text',
      required: !!newQuestionDraft.required,
      options:
        newQuestionDraft.type === 'dropdown' || newQuestionDraft.type === 'multiple_choice'
          ? newQuestionDraft.options || ['Option 1', 'Option 2']
          : undefined,
      placeholder: newQuestionDraft.placeholder,
      section: 'custom',
      stageCondition: newQuestionDraft.stageCondition || 'All',
    };

    setEditableQuestions((prev) => [...prev, newQ]);
    setSelectedQuestionId(newId);
    setIsAddingQuestion(false);
    setNewQuestionDraft({
      title: '',
      type: 'short_text',
      required: false,
      options: ['Option 1', 'Option 2'],
      stageCondition: 'All',
    });
    setQuestionsError('');
  };

  const handleResetQuestionsFactory = async () => {
    if (!isAdmin) return;
    if (confirm('Reset all form questions to default factory configuration? Custom questions will be removed.')) {
      doHaptic();
      const res = await onResetQuestions();
      if (res.success) {
        setQuestionsSuccessMessage('Form questions reset to factory defaults.');
        setTimeout(() => setQuestionsSuccessMessage(''), 3000);
      }
    }
  };

  /* ================= USER MANAGEMENT STATE & HANDLERS ================= */
  const [usersList, setUsersList] = useState<UserAccount[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userError, setUserError] = useState('');
  const [userSuccess, setUserSuccess] = useState('');

  // Add User Form Modal
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'operator'>('operator');
  const [newTempPassword, setNewTempPassword] = useState('');
  const [createdAdminRecoveryCode, setCreatedAdminRecoveryCode] = useState<string | null>(null);

  // Reset Password Modal
  const [resetUserTarget, setResetUserTarget] = useState<UserAccount | null>(null);
  const [adminResetPasswordInput, setAdminResetPasswordInput] = useState('');

  // Delete User Confirmation
  const [deleteUserTarget, setDeleteUserTarget] = useState<UserAccount | null>(null);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  const fetchUsers = async () => {
    if (!isAdmin) return;
    setIsLoadingUsers(true);
    setUserError('');
    try {
      const res = await fetch('/api/users', {
        headers: {
          Authorization: `Bearer ${currentUser.token}`,
        },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.users)) {
        setUsersList(data.users);
      } else {
        setUserError(data.error || 'Failed to fetch registered users.');
      }
    } catch (err: any) {
      setUserError(err.message || 'Error connecting to user management API.');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const fetchAuditLogs = async () => {
    if (!isAdmin) return;
    setIsLoadingAudit(true);
    try {
      const res = await fetch('/api/audit-logs', {
        headers: {
          Authorization: `Bearer ${currentUser.token}`,
        },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.logs)) {
        setAuditLogs(data.logs);
      }
    } catch (err) {
      console.warn('Failed to load audit logs:', err);
    } finally {
      setIsLoadingAudit(false);
    }
  };

  // Fetch users when entering 'users' or 'security' tab
  useEffect(() => {
    if (isOpen && isAdmin && (activeTab === 'users' || activeTab === 'security')) {
      fetchUsers();
      if (activeTab === 'security') {
        fetchAuditLogs();
      }
    }
  }, [activeTab, isOpen, isAdmin]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    doHaptic();
    setUserError('');
    setUserSuccess('');

    const cleanUser = newUsername.trim().toLowerCase();
    if (!cleanUser) {
      setUserError('Username is required.');
      return;
    }

    if (!newTempPassword || newTempPassword.length < 6) {
      setUserError('Temporary password must be at least 6 characters long.');
      return;
    }

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentUser.token}`,
        },
        body: JSON.stringify({
          username: cleanUser,
          displayName: newDisplayName.trim() || cleanUser,
          role: newUserRole,
          temporaryPassword: newTempPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setUserError(data.error || 'Failed to create user account.');
        return;
      }

      setUserSuccess(`User account "${cleanUser}" successfully created!`);
      if (data.generatedRecoveryCode) {
        setCreatedAdminRecoveryCode(data.generatedRecoveryCode);
      } else {
        setIsAddUserOpen(false);
        setNewUsername('');
        setNewDisplayName('');
        setNewTempPassword('');
      }

      fetchUsers();
    } catch (err: any) {
      setUserError(err.message || 'Failed to connect to server.');
    }
  };

  const handleToggleUserStatus = async (user: UserAccount) => {
    doHaptic();
    setUserError('');
    setUserSuccess('');

    const nextStatus = !user.isActive;

    try {
      const res = await fetch(`/api/users/${user.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentUser.token}`,
        },
        body: JSON.stringify({ isActive: nextStatus }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setUserError(data.error || 'Failed to update user status.');
        return;
      }

      setUserSuccess(`Account "${user.username}" is now ${nextStatus ? 'Active' : 'Deactivated'}.`);
      setTimeout(() => setUserSuccess(''), 3500);
      fetchUsers();
    } catch (err: any) {
      setUserError(err.message || 'Error updating status.');
    }
  };

  const handleAdminResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUserTarget) return;
    doHaptic();
    setUserError('');

    if (!adminResetPasswordInput || adminResetPasswordInput.length < 6) {
      setUserError('Temporary password must be at least 6 characters long.');
      return;
    }

    try {
      const res = await fetch(`/api/users/${resetUserTarget.id}/reset-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentUser.token}`,
        },
        body: JSON.stringify({ temporaryPassword: adminResetPasswordInput }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setUserError(data.error || 'Failed to reset password.');
        return;
      }

      setUserSuccess(
        `Temporary password set for "${resetUserTarget.username}". User will be required to change password on next sign-in.`
      );
      setResetUserTarget(null);
      setAdminResetPasswordInput('');
      fetchUsers();
    } catch (err: any) {
      setUserError(err.message || 'Error updating user password.');
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUserTarget) return;
    doHaptic();
    setUserError('');

    const isSelf =
      deleteUserTarget.id === currentUser.id ||
      deleteUserTarget.username.toLowerCase() === currentUser.username.toLowerCase();

    try {
      const res = await fetch(`/api/users/${deleteUserTarget.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${currentUser.token}`,
        },
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setUserError(data.error || 'Failed to remove user account.');
        return;
      }

      setUserSuccess(`Account "${deleteUserTarget.username}" permanently removed.`);
      setDeleteUserTarget(null);

      if (isSelf) {
        onClose();
        if (onAccountRemoved) {
          onAccountRemoved();
        }
        return;
      }

      fetchUsers();
    } catch (err: any) {
      setUserError(err.message || 'Error removing user account.');
    }
  };

  /* ================= PLANT TARGET STATE ================= */
  const [targetInput, setTargetInput] = useState(String(monthlyTarget));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-[#101835] border border-[#263566] rounded-3xl w-full max-w-5xl shadow-2xl text-white relative my-4 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-[#0d1d4d] via-[#152a6a] to-[#1c3384] p-4 sm:p-5 border-b border-[#243468] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 shadow-inner">
              <SettingsIcon className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-wide text-white">
                  Dashboard Settings &amp; Administration
                </h2>
                <span
                  className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                    isAdmin
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                  }`}
                >
                  {isAdmin ? 'Administrator Mode' : 'Operator (Read-Only)'}
                </span>
              </div>
              <p className="text-xs text-indigo-200/80">
                Configure published CSV data source, dynamic form questions, user accounts, and security
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              doHaptic();
              onClose();
            }}
            className="text-indigo-300 hover:text-white p-2 rounded-xl hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#202e5b] bg-[#0c142e] px-4 pt-2 gap-2 text-xs font-semibold overflow-x-auto scrollbar-none">
          {/* User Management Tab (Admin Only) */}
          {isAdmin && (
            <button
              onClick={() => {
                doHaptic();
                setActiveTab('users');
              }}
              className={`pb-3 px-3.5 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'users'
                  ? 'border-indigo-500 text-indigo-300 font-bold'
                  : 'border-transparent text-indigo-400/70 hover:text-indigo-200'
              }`}
            >
              <Users className="w-4 h-4 text-emerald-400" />
              <span>User Management</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded-full font-mono border border-emerald-500/30">
                {usersList.length || 'Admin'}
              </span>
            </button>
          )}

          {/* CSV Tab */}
          <button
            onClick={() => {
              doHaptic();
              setActiveTab('csv');
            }}
            className={`pb-3 px-3.5 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'csv'
                ? 'border-indigo-500 text-indigo-300 font-bold'
                : 'border-transparent text-indigo-400/70 hover:text-indigo-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>CSV Data Source</span>
          </button>

          {/* Form Questions Tab */}
          <button
            onClick={() => {
              doHaptic();
              setActiveTab('questions');
            }}
            className={`pb-3 px-3.5 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'questions'
                ? 'border-indigo-500 text-indigo-300 font-bold'
                : 'border-transparent text-indigo-400/70 hover:text-indigo-200'
            }`}
          >
            <List className="w-4 h-4" />
            <span>Form Question Editor</span>
            <span className="text-[10px] bg-indigo-500/30 text-indigo-200 px-1.5 py-0.2 rounded-full font-mono">
              {editableQuestions.length}
            </span>
          </button>

          {/* Security Tab */}
          <button
            onClick={() => {
              doHaptic();
              setActiveTab('security');
            }}
            className={`pb-3 px-3.5 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'security'
                ? 'border-indigo-500 text-indigo-300 font-bold'
                : 'border-transparent text-indigo-400/70 hover:text-indigo-200'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Access &amp; Audit Security</span>
          </button>

          {/* Targets & Plant Info Tab */}
          <button
            onClick={() => {
              doHaptic();
              setActiveTab('preferences');
            }}
            className={`pb-3 px-3.5 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'preferences'
                ? 'border-indigo-500 text-indigo-300 font-bold'
                : 'border-transparent text-indigo-400/70 hover:text-indigo-200'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Targets &amp; Plant Info</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 text-xs sm:text-sm space-y-5">
          {/* ================= TAB 0: USER MANAGEMENT (ADMIN ONLY) ================= */}
          {activeTab === 'users' && isAdmin && (
            <div className="space-y-4">
              {/* Top Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#131d40] border border-[#243468] p-4 rounded-2xl">
                <div>
                  <h3 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-400" />
                    Registered Accounts &amp; Access Controls
                  </h3>
                  <p className="text-xs text-indigo-300/70">
                    Create and manage Administrator and Operator accounts with temporary passwords &amp; access status
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchUsers}
                    disabled={isLoadingUsers}
                    className="px-3 py-1.5 rounded-xl bg-[#1c264a] hover:bg-[#253362] text-indigo-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition"
                    title="Refresh user list"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${isLoadingUsers ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>

                  <button
                    onClick={() => {
                      doHaptic();
                      setIsAddUserOpen(true);
                      setCreatedAdminRecoveryCode(null);
                      setUserError('');
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition active:scale-95"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Add New Account</span>
                  </button>
                </div>
              </div>

              {/* Status Alerts */}
              {userSuccess && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-300 animate-in fade-in">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span className="font-semibold">{userSuccess}</span>
                </div>
              )}

              {userError && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-300 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span className="font-semibold">{userError}</span>
                </div>
              )}

              {/* Users List - Mobile Card View (< md) & Desktop Table View (>= md) */}
              
              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {usersList.map((u) => {
                  const isPermanent = u.username.toLowerCase() === 'admin1' || Boolean(u.isPermanent);
                  const isCurrentUser = u.username.toLowerCase() === currentUser.username.toLowerCase();
                  const canRemove = isAdmin && !isCurrentUser && !isPermanent;

                  return (
                    <div
                      key={u.id}
                      className="p-4 rounded-2xl bg-[#0e1635] border border-[#202e5b] space-y-3 shadow-md"
                    >
                      {/* Card Header: User info & Role */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-white text-sm flex items-center gap-2">
                            <span>{u.name}</span>
                            {isCurrentUser && (
                              <span className="text-[10px] bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-full font-mono font-semibold">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-mono text-indigo-300/80 mt-0.5">
                            @{u.username}
                          </div>
                        </div>

                        {/* Role Badge */}
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide border shrink-0 ${
                            isPermanent
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : u.role === 'admin'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                          }`}
                        >
                          {isPermanent ? (
                            <>
                              <Lock className="w-3 h-3 text-amber-400" />
                              <span>Permanent Admin</span>
                            </>
                          ) : u.role === 'admin' ? (
                            <>
                              <ShieldCheck className="w-3 h-3 text-emerald-400" />
                              <span>Administrator</span>
                            </>
                          ) : (
                            <>
                              <User className="w-3 h-3 text-blue-400" />
                              <span>Operator</span>
                            </>
                          )}
                        </span>
                      </div>

                      {/* Card Status & Security Row */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#1a254d] text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              u.isActive
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'bg-slate-700 text-slate-400'
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                u.isActive ? 'bg-emerald-400' : 'bg-slate-500'
                              }`}
                            />
                            <span>{u.isActive ? (isPermanent ? 'Active (Permanent)' : 'Active') : 'Deactivated'}</span>
                          </span>
                        </div>

                        <div className="text-[11px] text-indigo-300/80">
                          {u.mustChangePassword ? (
                            <span className="text-amber-400 font-medium flex items-center gap-1">
                              <KeyRound className="w-3 h-3" />
                              Must change pass
                            </span>
                          ) : (
                            <span className="text-emerald-400 font-medium flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              Password set
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Card Actions Row */}
                      <div className="pt-2 border-t border-[#1a254d] flex flex-wrap items-center gap-2">
                        {/* Reset Password */}
                        <button
                          onClick={() => {
                            doHaptic();
                            setResetUserTarget(u);
                            setAdminResetPasswordInput('');
                            setUserError('');
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#18244a] hover:bg-[#233364] text-indigo-200 text-xs font-semibold transition active:scale-95"
                          title="Reset temporary password"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                          <span>Reset Pass</span>
                        </button>

                        {/* Toggle Active / Deactivate */}
                        {isPermanent ? (
                          <span
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/60 text-slate-400 text-xs font-mono border border-slate-700/60 select-none"
                            title="Permanent root administrator cannot be deactivated"
                          >
                            <Lock className="w-3 h-3 text-amber-400" />
                            <span>Permanent Active</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleToggleUserStatus(u)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 ${
                              u.isActive
                                ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30'
                                : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30'
                            }`}
                            title={u.isActive ? 'Deactivate account' : 'Activate account'}
                          >
                            <Power className="w-3.5 h-3.5" />
                            <span>{u.isActive ? 'Deactivate' : 'Activate'}</span>
                          </button>
                        )}

                        {/* Remove Account Button */}
                        {canRemove ? (
                          <button
                            onClick={() => {
                              doHaptic();
                              setDeleteUserTarget(u);
                              setUserError('');
                            }}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-bold transition active:scale-95 ml-auto shadow-sm"
                            title={`Remove ${u.role === 'admin' ? 'administrator' : 'operator'} account @${u.username}`}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                            <span>Remove Account</span>
                          </button>
                        ) : isPermanent ? (
                          <span className="text-[11px] font-mono text-amber-300/90 font-bold ml-auto px-2.5 py-1 bg-amber-500/15 border border-amber-500/30 rounded-xl flex items-center gap-1">
                            <Lock className="w-3 h-3 text-amber-400" />
                            Permanent
                          </span>
                        ) : (
                          <span className="text-[11px] font-mono text-indigo-400/60 italic ml-auto px-2 py-1 bg-indigo-500/10 rounded-lg">
                            Primary Admin
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block border border-[#202e5b] rounded-2xl overflow-x-auto bg-[#0e1635]">
                <table className="w-full text-left border-collapse min-w-[650px]">
                  <thead className="bg-[#121c42] text-indigo-300 text-[11px] font-bold uppercase tracking-wider border-b border-[#202e5b]">
                    <tr>
                      <th className="p-3.5">User</th>
                      <th className="p-3.5">Role</th>
                      <th className="p-3.5">Account Status</th>
                      <th className="p-3.5">Security / Login</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1b264e] text-xs">
                    {usersList.map((u) => {
                      const isPermanent = u.username.toLowerCase() === 'admin1' || Boolean(u.isPermanent);
                      const isCurrentUser = u.username.toLowerCase() === currentUser.username.toLowerCase();
                      const canRemove = isAdmin && !isCurrentUser && !isPermanent;

                      return (
                        <tr key={u.id} className="hover:bg-[#131f47]/50 transition">
                          <td className="p-3.5">
                            <div className="font-bold text-white flex items-center gap-2">
                              <span>{u.name}</span>
                              {isCurrentUser && (
                                <span className="text-[9px] bg-indigo-500/30 text-indigo-200 px-1.5 py-0.2 rounded font-mono">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] font-mono text-indigo-300/80">
                              @{u.username}
                            </div>
                          </td>

                          <td className="p-3.5">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${
                                isPermanent
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  : u.role === 'admin'
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                              }`}
                            >
                              {isPermanent ? (
                                <>
                                  <Lock className="w-3 h-3 text-amber-400" />
                                  <span>Permanent Admin</span>
                                </>
                              ) : u.role === 'admin' ? (
                                <>
                                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                                  <span>Administrator</span>
                                </>
                              ) : (
                                <>
                                  <User className="w-3 h-3 text-blue-400" />
                                  <span>Operator</span>
                                </>
                              )}
                            </span>
                          </td>

                          <td className="p-3.5">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                u.isActive
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : 'bg-slate-700 text-slate-400'
                              }`}
                            >
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  u.isActive ? 'bg-emerald-400' : 'bg-slate-500'
                                }`}
                              />
                              <span>{u.isActive ? (isPermanent ? 'Active (Permanent)' : 'Active') : 'Deactivated'}</span>
                            </span>
                          </td>

                          <td className="p-3.5 text-indigo-300/80 text-[11px]">
                            {u.mustChangePassword ? (
                              <span className="text-amber-400 font-medium flex items-center gap-1">
                                <KeyRound className="w-3 h-3" />
                                Must change password
                              </span>
                            ) : (
                              <span className="text-emerald-400 font-medium flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                Password configured
                              </span>
                            )}
                            <div className="text-[10px] text-indigo-400/60 mt-0.5">
                              {u.lastLogin ? `Last login: ${new Date(u.lastLogin).toLocaleDateString()}` : 'Never signed in'}
                            </div>
                          </td>

                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* Reset Password Button */}
                              <button
                                onClick={() => {
                                  doHaptic();
                                  setResetUserTarget(u);
                                  setAdminResetPasswordInput('');
                                  setUserError('');
                                }}
                                className="p-1.5 rounded-lg bg-[#18244a] hover:bg-[#233364] text-indigo-300 hover:text-white transition"
                                title="Reset Temporary Password"
                              >
                                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                              </button>

                              {/* Toggle Active / Inactive Button */}
                              {isPermanent ? (
                                <span
                                  className="p-1.5 rounded-lg bg-slate-800/40 text-slate-500 cursor-not-allowed border border-slate-700/40"
                                  title="Permanent root administrator cannot be deactivated"
                                >
                                  <Lock className="w-3.5 h-3.5 text-amber-400/80" />
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleToggleUserStatus(u)}
                                  className={`p-1.5 rounded-lg transition ${
                                    u.isActive
                                      ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300'
                                      : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300'
                                  }`}
                                  title={u.isActive ? 'Deactivate account' : 'Activate account'}
                                >
                                  <Power className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Remove Account Button */}
                              {canRemove ? (
                                <button
                                  onClick={() => {
                                    doHaptic();
                                    setDeleteUserTarget(u);
                                    setUserError('');
                                  }}
                                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-white border border-rose-500/40 transition text-xs font-bold active:scale-95 shadow-sm"
                                  title={`Remove ${u.role === 'admin' ? 'administrator' : 'operator'} account @${u.username}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                                  <span>Remove</span>
                                </button>
                              ) : isPermanent ? (
                                <span className="text-[10px] font-mono text-amber-300/90 font-bold px-2.5 py-1 bg-amber-500/15 border border-amber-500/30 rounded-md flex items-center gap-1">
                                  <Lock className="w-3 h-3 text-amber-400" />
                                  Permanent
                                </span>
                              ) : (
                                <span className="text-[10px] font-mono text-indigo-400/60 italic px-2 py-1 bg-indigo-500/10 rounded-md">
                                  Primary
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Add User Modal Dialog */}
              {isAddUserOpen && (
                <div className="p-5 rounded-2xl bg-[#141f48] border border-indigo-500/40 space-y-4 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-[#253568] pb-3">
                    <h4 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
                      <UserPlus className="w-4 h-4 text-emerald-400" />
                      Create New User Account
                    </h4>
                    <button
                      onClick={() => setIsAddUserOpen(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {createdAdminRecoveryCode ? (
                    <div className="p-4 bg-emerald-500/15 border border-emerald-500/40 rounded-xl space-y-3">
                      <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        Administrator Account Successfully Created!
                      </div>
                      <p className="text-xs text-emerald-200/90 leading-relaxed">
                        Important: Copy the following one-time recovery code and provide it securely to the administrator. This recovery code will be required if they ever need to recover their account:
                      </p>
                      <div className="p-3 bg-[#0a122e] rounded-lg border border-emerald-400/40 text-center">
                        <span className="font-mono text-base font-extrabold text-emerald-300 select-all tracking-widest">
                          {createdAdminRecoveryCode}
                        </span>
                      </div>
                      <div className="flex justify-end pt-2">
                        <button
                          onClick={() => {
                            setIsAddUserOpen(false);
                            setCreatedAdminRecoveryCode(null);
                            setNewUsername('');
                            setNewDisplayName('');
                            setNewTempPassword('');
                          }}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition"
                        >
                          I Have Stored The Recovery Code
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleCreateUser} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-indigo-300 uppercase mb-1">
                            Username (Login ID)
                          </label>
                          <input
                            type="text"
                            value={newUsername}
                            onChange={(e) => setNewUsername(e.target.value)}
                            placeholder="e.g. operator_line1 or admin2"
                            required
                            autoFocus
                            className="w-full bg-[#0a1026] text-white border border-[#2c3d75] rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-indigo-400"
                          />
                          <p className="text-[10px] text-indigo-400/60 mt-1">
                            3-20 characters, lowercase letters and numbers
                          </p>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-indigo-300 uppercase mb-1">
                            Full / Display Name
                          </label>
                          <input
                            type="text"
                            value={newDisplayName}
                            onChange={(e) => setNewDisplayName(e.target.value)}
                            placeholder="e.g. Rahul Sharma"
                            required
                            className="w-full bg-[#0a1026] text-white border border-[#2c3d75] rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-indigo-400"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-indigo-300 uppercase mb-1">
                            Account Role
                          </label>
                          <select
                            value={newUserRole}
                            onChange={(e) =>
                              setNewUserRole(e.target.value as 'admin' | 'operator')
                            }
                            className="w-full bg-[#0a1026] text-white border border-[#2c3d75] rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-indigo-400 cursor-pointer"
                          >
                            <option value="operator">Operator (Read-only config, log records, view reports)</option>
                            <option value="admin">Administrator (Full access, config editor, user management)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-indigo-300 uppercase mb-1">
                            Temporary Password
                          </label>
                          <input
                            type="password"
                            value={newTempPassword}
                            onChange={(e) => setNewTempPassword(e.target.value)}
                            placeholder="Minimum 6 characters"
                            required
                            className="w-full bg-[#0a1026] text-white border border-[#2c3d75] rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-indigo-400"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-[#253568]">
                        <span className="text-[11px] text-indigo-300/70">
                          Account will require password change upon first sign-in.
                        </span>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setIsAddUserOpen(false)}
                            className="px-4 py-2 bg-[#1c274f] text-slate-300 rounded-xl text-xs font-semibold"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md"
                          >
                            Create Account
                          </button>
                        </div>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* Reset Password Modal Dialog */}
              {resetUserTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                  <div className="bg-[#11193d] border border-[#263566] rounded-2xl p-5 max-w-md w-full space-y-4 shadow-2xl">
                    <h4 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
                      <KeyRound className="w-5 h-5 text-amber-400" />
                      Reset Password for @{resetUserTarget.username}
                    </h4>
                    <p className="text-xs text-indigo-200/80">
                      Enter a new temporary password for <strong>{resetUserTarget.name}</strong>. Existing sessions will be invalidated, and the user must change this password on next login.
                    </p>

                    <form onSubmit={handleAdminResetPassword} className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-bold text-indigo-300 uppercase mb-1">
                          New Temporary Password
                        </label>
                        <input
                          type="password"
                          value={adminResetPasswordInput}
                          onChange={(e) => setAdminResetPasswordInput(e.target.value)}
                          placeholder="Enter at least 6 characters"
                          required
                          autoFocus
                          className="w-full bg-[#0a1026] text-white border border-[#2c3d75] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-400"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setResetUserTarget(null)}
                          className="px-4 py-2 bg-[#1c274f] text-slate-300 rounded-xl text-xs font-semibold"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-md"
                        >
                          Confirm Password Reset
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Delete / Remove User Modal Dialog */}
              {deleteUserTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                  <div className="bg-[#11193d] border border-rose-500/40 rounded-2xl p-5 max-w-md w-full space-y-4 shadow-2xl">
                    <h4 className="font-bold text-white text-sm sm:text-base flex items-center gap-2 text-rose-300">
                      <Trash2 className="w-5 h-5 text-rose-400" />
                      Remove {deleteUserTarget.role === 'admin' ? 'Administrator' : 'Operator'} Account
                    </h4>
                    <p className="text-xs text-indigo-200/80 leading-relaxed">
                      Are you sure you want to permanently remove the account for{' '}
                      <strong className="text-white">
                        {deleteUserTarget.name} (@{deleteUserTarget.username})
                      </strong>{' '}
                      [{deleteUserTarget.role === 'admin' ? 'Administrator' : 'Operator'}]? All active sessions for this user will be terminated immediately.
                    </p>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setDeleteUserTarget(null)}
                        className="px-4 py-2 bg-[#1c274f] hover:bg-[#253366] text-slate-300 rounded-xl text-xs font-semibold transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteUser}
                        className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-950/60 transition active:scale-95 flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Confirm Remove Account</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 1: CSV DATA SOURCE ================= */}
          {activeTab === 'csv' && (
            <div className="space-y-5">
              {!isAdmin && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-200">
                  <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-amber-300 text-xs sm:text-sm">
                      Read-Only Operator Mode Active
                    </h4>
                    <p className="text-xs text-amber-200/80 mt-0.5">
                      You are signed in as an Operator. To modify the published CSV data source URL, please sign in with an Administrator account.
                    </p>
                  </div>
                </div>
              )}

              {csvSuccessMessage && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-300 animate-in fade-in">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span className="font-semibold">{csvSuccessMessage}</span>
                </div>
              )}

              {csvError && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-300 animate-in fade-in">
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                  <span className="font-semibold">{csvError}</span>
                </div>
              )}

              {/* CSV Link Card */}
              <div className="bg-[#131d40] border border-[#243468] rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm">
                        Published CSV Data Source Link
                      </h3>
                      <p className="text-xs text-indigo-300/70">
                        Live Google Sheet published web URL feeding production and defect metrics
                      </p>
                    </div>
                  </div>

                  {!isEditingCsv && (
                    <button
                      onClick={handleStartEditCsv}
                      disabled={!isAdmin}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-sm ${
                        isAdmin
                          ? 'bg-indigo-600 hover:bg-indigo-500 text-white active:scale-95'
                          : 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed opacity-60'
                      }`}
                      title={isAdmin ? 'Edit published CSV URL' : 'Admin authorization required'}
                    >
                      {isAdmin ? <Edit2 className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                      <span>Edit CSV Link</span>
                    </button>
                  )}
                </div>

                {isEditingCsv ? (
                  <div className="space-y-3 pt-2">
                    <label className="block text-xs font-bold text-indigo-300 uppercase tracking-wide">
                      Update Google Sheet Published CSV Link
                    </label>
                    <input
                      type="url"
                      value={csvInput}
                      onChange={(e) => {
                        setCsvInput(e.target.value);
                        setCsvError('');
                      }}
                      placeholder="https://docs.google.com/spreadsheets/d/e/.../pub?output=csv"
                      className="w-full bg-[#0a1026] text-white border border-indigo-500/60 focus:border-indigo-400 rounded-xl px-3.5 py-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                      autoFocus
                    />
                    <p className="text-[11px] text-indigo-300/70">
                      Must be a valid web URL starting with <code>https://</code>. After saving, the dashboard will immediately reload and validate the new data source.
                    </p>

                    <div className="flex items-center justify-end gap-2.5 pt-2">
                      <button
                        onClick={handleCancelEditCsv}
                        disabled={isSavingCsv}
                        className="px-4 py-2 rounded-xl bg-[#1c274f] hover:bg-[#253366] text-slate-300 text-xs font-semibold transition"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveCsv}
                        disabled={isSavingCsv}
                        className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-950/60 transition active:scale-95 disabled:opacity-50"
                      >
                        {isSavingCsv ? (
                          <RotateCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        <span>{isSavingCsv ? 'Validating & Saving…' : 'Save & Refresh Dashboard'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-[#0b1229] border border-[#1e2b54] rounded-xl p-3 flex items-center justify-between gap-3">
                      <span className="font-mono text-xs text-indigo-200 select-all truncate">
                        {csvUrl}
                      </span>
                      <button
                        onClick={handleCopyCsv}
                        className="px-2.5 py-1.5 rounded-lg bg-[#182348] hover:bg-[#202f60] text-indigo-300 text-xs font-semibold shrink-0 flex items-center gap-1.5 transition"
                      >
                        {copiedCsv ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedCsv ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center justify-between text-xs text-indigo-300/70 gap-2">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                        Live Synchronized &amp; Backend Persisted
                      </span>

                      <a
                        href={csvUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-400 hover:text-indigo-200 inline-flex items-center gap-1 font-semibold transition"
                      >
                        <span>Download Raw CSV</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-[#121936] rounded-2xl p-4 border border-[#232f57] space-y-2 text-xs text-indigo-200/80">
                <h4 className="font-bold text-white text-xs uppercase tracking-wide text-indigo-300">
                  How to get your Google Sheet CSV Link:
                </h4>
                <ol className="list-decimal list-inside space-y-1.5 text-indigo-200/90 leading-relaxed">
                  <li>Open your Google Sheet containing the paintshop logs.</li>
                  <li>Click <strong>File &rarr; Share &rarr; Publish to web</strong>.</li>
                  <li>Under Link, change <em>Entire Document</em> or select your Sheet tab, and change <em>Web page</em> to <strong>Comma-separated values (.csv)</strong>.</li>
                  <li>Click <strong>Publish</strong> and copy the generated link.</li>
                </ol>
              </div>
            </div>
          )}

          {/* ================= TAB 2: FORM QUESTION EDITOR ================= */}
          {activeTab === 'questions' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
                    Form Questions &amp; Field Manager
                    {isAdmin && (
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono border border-emerald-500/30">
                        Admin Editor
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-indigo-300/70">
                    Customize fields, add new inspection parameters, and define defect choices
                  </p>
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleResetQuestionsFactory}
                      className="px-3 py-1.5 rounded-xl bg-[#1c264a] hover:bg-[#253362] text-indigo-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition"
                      title="Reset all questions to default layout"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset Defaults</span>
                    </button>

                    <button
                      onClick={() => setIsAddingQuestion(true)}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add New Question</span>
                    </button>
                  </div>
                )}
              </div>

              {questionsSuccessMessage && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-300 animate-in fade-in">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span className="font-semibold">{questionsSuccessMessage}</span>
                </div>
              )}

              {questionsError && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-300 animate-in fade-in">
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                  <span className="font-semibold">{questionsError}</span>
                </div>
              )}

              {/* Add New Question Form */}
              {isAddingQuestion && isAdmin && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-[#14204c] to-[#1a2b66] border border-indigo-500/40 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-indigo-400/20 pb-2">
                    <h4 className="font-bold text-white text-xs sm:text-sm flex items-center gap-2">
                      <Plus className="w-4 h-4 text-emerald-400" />
                      Add New Form Question
                    </h4>
                    <button
                      onClick={() => setIsAddingQuestion(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-indigo-300 uppercase mb-1">
                        Question Title / Label
                      </label>
                      <input
                        type="text"
                        value={newQuestionDraft.title}
                        onChange={(e) =>
                          setNewQuestionDraft((prev) => ({ ...prev, title: e.target.value }))
                        }
                        placeholder="e.g. Paint Viscosity (sec) or Inspector Name"
                        className="w-full bg-[#0b1028] text-white border border-[#2c3d75] rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-indigo-400"
                        autoFocus
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-indigo-300 uppercase mb-1">
                        Question Type
                      </label>
                      <select
                        value={newQuestionDraft.type}
                        onChange={(e) =>
                          setNewQuestionDraft((prev) => ({
                            ...prev,
                            type: e.target.value as QuestionType,
                          }))
                        }
                        className="w-full bg-[#0b1028] text-white border border-[#2c3d75] rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-indigo-400"
                      >
                        <option value="short_text">Short Text (Single line)</option>
                        <option value="long_text">Long Text (Multi-line paragraph)</option>
                        <option value="number">Number (Quantity, temperature, DFT)</option>
                        <option value="dropdown">Dropdown (Single selection)</option>
                        <option value="multiple_choice">Multiple Choice (Checkboxes)</option>
                        <option value="date">Date</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <label className="flex items-center gap-2 text-xs text-indigo-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newQuestionDraft.required}
                        onChange={(e) =>
                          setNewQuestionDraft((prev) => ({ ...prev, required: e.target.checked }))
                        }
                        className="rounded border-[#2c3d75] text-indigo-600 focus:ring-0"
                      />
                      <span>Mark question as Required</span>
                    </label>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setIsAddingQuestion(false)}
                        className="px-3.5 py-1.5 rounded-xl bg-[#1c274f] text-slate-300 text-xs font-semibold"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleCreateNewQuestion}
                        className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md"
                      >
                        Add Question
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Master-Detail Question Editor */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-5 bg-[#121a3a] border border-[#243363] rounded-2xl p-2.5 space-y-1.5 max-h-[460px] overflow-y-auto">
                  <div className="px-2 py-1 text-[11px] font-bold text-indigo-300 uppercase tracking-wider flex items-center justify-between">
                    <span>Questions ({editableQuestions.length})</span>
                    <span className="text-[10px] text-indigo-400/70">Click to view/edit</span>
                  </div>

                  {editableQuestions.map((q, idx) => {
                    const isSelected = q.id === selectedQuestionId;
                    return (
                      <div
                        key={q.id}
                        onClick={() => {
                          doHaptic();
                          setSelectedQuestionId(q.id);
                        }}
                        className={`p-2.5 rounded-xl cursor-pointer transition flex items-center justify-between gap-2 border select-none ${
                          isSelected
                            ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-sm'
                            : 'bg-[#152044] hover:bg-[#1a2754] border-[#253566] text-indigo-200/90'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono text-indigo-400">
                              #{idx + 1}
                            </span>
                            <span className="font-bold text-xs truncate">{q.title}</span>
                            {q.required && (
                              <span className="text-[10px] text-rose-400 font-extrabold">*</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-[#0e1633] text-indigo-300 font-mono">
                              {q.type.replace('_', ' ')}
                            </span>
                            {q.stageCondition && q.stageCondition !== 'All' && (
                              <span className="text-[9px] text-indigo-400/80">
                                {q.stageCondition}
                              </span>
                            )}
                          </div>
                        </div>

                        {isAdmin && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteQuestion(q.id);
                            }}
                            className="text-slate-400 hover:text-rose-400 p-1 rounded-lg hover:bg-rose-500/10 transition"
                            title="Delete question"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="md:col-span-7 bg-[#131d40] border border-[#243468] rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
                  {currentSelectedQuestion ? (
                    <div className="space-y-4">
                      <div className="border-b border-[#233364] pb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-white text-xs sm:text-sm">
                            Question Details: {currentSelectedQuestion.title}
                          </h4>
                          {currentSelectedQuestion.section === 'custom' && (
                            <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-mono">
                              Custom Field
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">
                          ID: {currentSelectedQuestion.id}
                        </span>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-indigo-300 uppercase mb-1">
                          Question Label / Title
                        </label>
                        <input
                          type="text"
                          value={currentSelectedQuestion.title}
                          onChange={(e) => handleQuestionFieldChange('title', e.target.value)}
                          disabled={!isAdmin}
                          className="w-full bg-[#0a1026] text-white border border-[#2c3d75] focus:border-indigo-400 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none disabled:opacity-60"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-indigo-300 uppercase mb-1">
                            Question Type
                          </label>
                          <select
                            value={currentSelectedQuestion.type}
                            onChange={(e) =>
                              handleQuestionFieldChange('type', e.target.value as QuestionType)
                            }
                            disabled={!isAdmin}
                            className="w-full bg-[#0a1026] text-white border border-[#2c3d75] focus:border-indigo-400 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none cursor-pointer disabled:opacity-60"
                          >
                            <option value="short_text">Short Text</option>
                            <option value="long_text">Long Text</option>
                            <option value="number">Number</option>
                            <option value="dropdown">Dropdown (Single Selection)</option>
                            <option value="multiple_choice">Multiple Choice (Checkboxes)</option>
                            <option value="date">Date</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-indigo-300 uppercase mb-1">
                            Required Field
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              handleQuestionFieldChange('required', !currentSelectedQuestion.required)
                            }
                            disabled={!isAdmin}
                            className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-between border ${
                              currentSelectedQuestion.required
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                : 'bg-[#0a1026] text-slate-300 border-[#2c3d75]'
                            } disabled:opacity-60`}
                          >
                            <span>{currentSelectedQuestion.required ? 'Mandatory (Required)' : 'Optional'}</span>
                            <span>{currentSelectedQuestion.required ? '✓' : '—'}</span>
                          </button>
                        </div>
                      </div>

                      {(currentSelectedQuestion.type === 'dropdown' ||
                        currentSelectedQuestion.type === 'multiple_choice') && (
                        <div className="bg-[#0b122b] border border-[#21305c] rounded-xl p-3 space-y-2">
                          <label className="block text-[11px] font-bold text-indigo-300 uppercase">
                            Answer Choices / Options ({currentSelectedQuestion.options?.length || 0})
                          </label>

                          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1">
                            {currentSelectedQuestion.options?.map((opt, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1.5 bg-[#17234d] text-indigo-200 border border-[#293a6e] px-2.5 py-1 rounded-lg text-xs"
                              >
                                <span>{opt}</span>
                                {isAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveOptionFromQuestion(i)}
                                    className="text-slate-400 hover:text-rose-400 transition"
                                  >
                                    ×
                                  </button>
                                )}
                              </span>
                            ))}
                          </div>

                          {isAdmin && (
                            <div className="flex gap-2 pt-1">
                              <input
                                type="text"
                                value={newOptionInput}
                                onChange={(e) => setNewOptionInput(e.target.value)}
                                placeholder="Add new option..."
                                className="flex-1 bg-[#101838] text-white border border-[#27386d] rounded-lg px-2.5 py-1 text-xs focus:outline-none"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddOptionToQuestion();
                                  }
                                }}
                              />
                              <button
                                type="button"
                                onClick={handleAddOptionToQuestion}
                                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition"
                              >
                                + Add
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      <div>
                        <label className="block text-[11px] font-bold text-indigo-300 uppercase mb-1">
                          Display Stage Condition
                        </label>
                        <select
                          value={currentSelectedQuestion.stageCondition || 'All'}
                          onChange={(e) =>
                            handleQuestionFieldChange('stageCondition', e.target.value)
                          }
                          disabled={!isAdmin}
                          className="w-full bg-[#0a1026] text-white border border-[#2c3d75] focus:border-indigo-400 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none cursor-pointer disabled:opacity-60"
                        >
                          <option value="All">Always Visible (All Stages)</option>
                          <option value="Loading">Loading Stage Only</option>
                          <option value="Unloading">Unloading Stage Only</option>
                          <option value="Quality Control">Quality Control Stage Only</option>
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-400">
                      Select a question from the left to edit its properties.
                    </div>
                  )}

                  {isAdmin && (
                    <div className="pt-4 mt-4 border-t border-[#202e5b] flex items-center justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={handleCancelQuestionEdits}
                        disabled={isSavingQuestions}
                        className="px-4 py-2 rounded-xl bg-[#1c274f] hover:bg-[#253366] text-slate-300 text-xs font-semibold transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveAllQuestions}
                        disabled={isSavingQuestions}
                        className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-950/60 transition active:scale-95 disabled:opacity-50"
                      >
                        {isSavingQuestions ? (
                          <RotateCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Save className="w-3.5 h-3.5" />
                        )}
                        <span>{isSavingQuestions ? 'Saving to Backend…' : 'Save Changes'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 3: ACCESS & SECURITY ================= */}
          {activeTab === 'security' && (
            <div className="space-y-4">
              <div className="bg-[#131d40] border border-[#243468] rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center gap-3 border-b border-[#243362] pb-3">
                  <div
                    className={`p-2.5 rounded-2xl ${
                      isAdmin ? 'bg-emerald-500/20 text-emerald-300' : 'bg-blue-500/20 text-blue-300'
                    }`}
                  >
                    {isAdmin ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm sm:text-base">
                      Access Control &amp; Backend Enforcement
                    </h3>
                    <p className="text-xs text-indigo-300/80">
                      Security policy strictly enforced at server API endpoints (/api/config/*, /api/users/*)
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-[#0c1228] rounded-xl border border-[#1e2a52]">
                    <span className="text-[10px] uppercase font-bold text-indigo-400 block mb-1">
                      Current User
                    </span>
                    <div className="font-bold text-white text-sm">{currentUser.name}</div>
                    <div className="text-indigo-300/70 font-mono">@{currentUser.username}</div>
                  </div>

                  <div className="p-3 bg-[#0c1228] rounded-xl border border-[#1e2a52]">
                    <span className="text-[10px] uppercase font-bold text-indigo-400 block mb-1">
                      Active Role
                    </span>
                    <div
                      className={`font-bold text-sm ${
                        isAdmin ? 'text-emerald-400' : 'text-blue-400'
                      }`}
                    >
                      {isAdmin ? 'Administrator (Full Access)' : 'Operator (Read-Only Config)'}
                    </div>
                    <div className="text-indigo-300/70">
                      Token: <span className="font-mono text-[10px]">{currentUser.token.slice(0, 15)}...</span>
                    </div>
                  </div>
                </div>

                {/* Permissions matrix */}
                <div className="space-y-2 pt-2">
                  <h4 className="font-bold text-xs text-indigo-300 uppercase tracking-wide">
                    Permission Matrix &amp; Server Enforcement
                  </h4>
                  <div className="border border-[#1e2b54] rounded-xl overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-[#0e1633] text-indigo-300 font-bold border-b border-[#1e2b54]">
                        <tr>
                          <th className="p-2.5">Feature / Operation</th>
                          <th className="p-2.5">Administrator</th>
                          <th className="p-2.5">Operator</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1e2b54] text-slate-300">
                        <tr>
                          <td className="p-2.5 font-medium">View Dashboard &amp; Quality Reports</td>
                          <td className="p-2.5 text-emerald-400 font-bold">✓ Allowed</td>
                          <td className="p-2.5 text-emerald-400 font-bold">✓ Allowed</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-medium">Enter Production &amp; Defect Log Records</td>
                          <td className="p-2.5 text-emerald-400 font-bold">✓ Allowed</td>
                          <td className="p-2.5 text-emerald-400 font-bold">✓ Allowed</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-medium">Edit CSV Data Source URL</td>
                          <td className="p-2.5 text-emerald-400 font-bold">✓ Allowed</td>
                          <td className="p-2.5 text-rose-400 font-bold">✗ Blocked (HTTP 403)</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-medium">Add, Edit or Delete Form Questions</td>
                          <td className="p-2.5 text-emerald-400 font-bold">✓ Allowed</td>
                          <td className="p-2.5 text-rose-400 font-bold">✗ Blocked (HTTP 403)</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-medium">Create Administrator &amp; Operator Accounts</td>
                          <td className="p-2.5 text-emerald-400 font-bold">✓ Allowed</td>
                          <td className="p-2.5 text-rose-400 font-bold">✗ Blocked (HTTP 403)</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-medium">Reset User Passwords &amp; Manage Accounts</td>
                          <td className="p-2.5 text-emerald-400 font-bold">✓ Allowed</td>
                          <td className="p-2.5 text-rose-400 font-bold">✗ Blocked (HTTP 403)</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-medium">Access System Settings</td>
                          <td className="p-2.5 text-emerald-400 font-bold">✓ Allowed</td>
                          <td className="p-2.5 text-rose-400 font-bold">✗ Blocked (HTTP 403)</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Audit Trail Viewer (Admin only) */}
                {isAdmin && (
                  <div className="pt-3 border-t border-[#1e2a52] space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <History className="w-4 h-4 text-indigo-400" />
                        <h4 className="font-bold text-xs text-white">System Security Audit Log</h4>
                      </div>
                      <button
                        onClick={() => {
                          setShowAuditLogs((prev) => !prev);
                          if (!showAuditLogs) fetchAuditLogs();
                        }}
                        className="text-xs text-indigo-400 hover:text-indigo-200 underline font-semibold"
                      >
                        {showAuditLogs ? 'Hide Audit Log' : 'View Audit Log'}
                      </button>
                    </div>

                    {showAuditLogs && (
                      <div className="bg-[#0b1028] border border-[#1e2b54] rounded-xl p-3 max-h-56 overflow-y-auto space-y-2 text-xs">
                        {isLoadingAudit ? (
                          <div className="text-center py-4 text-indigo-300">Loading audit records...</div>
                        ) : auditLogs.length === 0 ? (
                          <div className="text-center py-4 text-slate-400">No audit logs recorded yet.</div>
                        ) : (
                          auditLogs.map((log) => (
                            <div
                              key={log.id}
                              className="p-2 rounded-lg bg-[#11193d] border border-[#1b264e] space-y-0.5"
                            >
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-bold text-indigo-300">{log.action}</span>
                                <span className="text-[10px] text-slate-400">
                                  {new Date(log.timestamp).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-300">{log.details}</p>
                              <div className="text-[10px] text-indigo-400/70">
                                Actor: <strong className="text-white">{log.actor}</strong>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Account Removal Section */}
                <div className="pt-4 border-t border-rose-500/20 space-y-3">
                  <div className="flex items-center gap-2 text-rose-300">
                    <Trash2 className="w-4 h-4 text-rose-400" />
                    <h4 className="font-bold text-xs uppercase tracking-wider">Account Removal</h4>
                  </div>
                  <div className="p-3.5 bg-rose-500/10 border border-rose-500/25 rounded-xl flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="font-bold text-white text-xs">Remove My Account (@{currentUser.username})</div>
                      <p className="text-[11px] text-rose-200/80">
                        Permanently delete your login credentials from the system. Your active session will be terminated immediately.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        doHaptic();
                        setDeleteUserTarget({
                          id: currentUser.id,
                          username: currentUser.username,
                          name: currentUser.name,
                          role: currentUser.role,
                          isActive: true,
                          mustChangePassword: false,
                          createdAt: '',
                          updatedAt: '',
                        });
                        setUserError('');
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-950/60 transition active:scale-95 flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove My Account</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 4: GENERAL PREFERENCES ================= */}
          {activeTab === 'preferences' && (
            <div className="space-y-4">
              <div className="bg-[#131d40] border border-[#243468] rounded-2xl p-4 sm:p-5 space-y-4">
                <h3 className="font-bold text-white text-sm">Plant &amp; Production Target Controls</h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-indigo-300 uppercase mb-1">
                      Monthly Production Target (Nos)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1000"
                        value={targetInput}
                        onChange={(e) => setTargetInput(e.target.value)}
                        className="w-48 bg-[#0a1026] text-white border border-[#2c3d75] rounded-xl px-3 py-2 text-xs font-bold focus:outline-none"
                      />
                      <button
                        onClick={() => {
                          doHaptic();
                          const val = Number(targetInput);
                          if (val > 0) {
                            onUpdateTarget(val);
                            alert('Target updated!');
                          }
                        }}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition"
                      >
                        Update Target
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 text-xs text-indigo-300/80 leading-relaxed">
                    <p>
                      <strong>Active Facility:</strong> Baxy Automotive Coatings Plant 1
                    </p>
                    <p>
                      <strong>Shifts:</strong> Shift A (06:00–14:00), Shift B (14:00–22:00), Shift C (22:00–06:00)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-[#0b1129] border-t border-[#202e5b] flex items-center justify-between">
          <span className="text-[11px] text-indigo-400/70">
            {isAdmin ? 'Administrator active session' : 'Operator active session'}
          </span>
          <button
            onClick={() => {
              doHaptic();
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-[#1a254d] hover:bg-[#233166] text-white text-xs font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
