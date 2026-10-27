import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  Lock,
  User,
  Shield,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ArrowLeft,
  RotateCw,
  X,
} from 'lucide-react';
import { BAXY_LOGO_BASE64 } from '../logo';
import { UserSession } from '../types';

interface LoginScreenProps {
  onLoginSuccess: (user: UserSession, keepSignedIn: boolean) => void;
  onClose?: () => void;
  triggerHaptic?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
  onClose,
  triggerHaptic,
}) => {
  // Modes: 'login' | 'first_login' | 'forgot'
  const [view, setView] = useState<'login' | 'first_login' | 'forgot'>('login');

  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Pending user state for mandatory first-login password change
  const [pendingSession, setPendingSession] = useState<{
    user: any;
    token: string;
  } | null>(null);
  const [firstLoginNewPassword, setFirstLoginNewPassword] = useState('');
  const [firstLoginConfirmPassword, setFirstLoginConfirmPassword] = useState('');
  const [firstLoginError, setFirstLoginError] = useState('');

  // Account recovery state
  const [recoveryUsername, setRecoveryUsername] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [recoveryNewPassword, setRecoveryNewPassword] = useState('');
  const [recoveryConfirmPassword, setRecoveryConfirmPassword] = useState('');
  const [recoverySuccess, setRecoverySuccess] = useState('');
  const [recoveryError, setRecoveryError] = useState('');

  const doHaptic = () => {
    if (triggerHaptic) triggerHaptic();
  };

  /* ================= LOGIN HANDLER ================= */
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    doHaptic();
    setErrorMessage('');

    const cleanUsername = username.trim();
    if (!cleanUsername || !password) {
      setErrorMessage('Please enter both username and password.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: cleanUsername,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || 'Authentication failed. Please verify credentials.');
        setIsLoading(false);
        return;
      }

      // Check if user is required to change password on first login
      if (data.mustChangePassword) {
        setPendingSession({
          user: data.user,
          token: data.token,
        });
        setView('first_login');
        setIsLoading(false);
        return;
      }

      const sessionObj: UserSession = {
        ...data.user,
        token: data.token,
        authenticated: true,
      };

      onLoginSuccess(sessionObj, keepSignedIn);
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Unable to connect to authentication server. Please check your network.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  /* ================= FIRST-LOGIN PASSWORD CHANGE ================= */
  const handleFirstLoginPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    doHaptic();
    setFirstLoginError('');

    if (!firstLoginNewPassword || firstLoginNewPassword.length < 6) {
      setFirstLoginError('New password must be at least 6 characters long.');
      return;
    }

    if (firstLoginNewPassword !== firstLoginConfirmPassword) {
      setFirstLoginError('New password and confirmation do not match.');
      return;
    }

    if (!pendingSession) {
      setFirstLoginError('Session expired. Please sign in again.');
      setView('login');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/first-login-change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${pendingSession.token}`,
        },
        body: JSON.stringify({
          newPassword: firstLoginNewPassword,
          confirmPassword: firstLoginConfirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setFirstLoginError(data.error || 'Failed to update initial password.');
        setIsLoading(false);
        return;
      }

      const sessionObj: UserSession = {
        ...data.user,
        token: pendingSession.token,
        authenticated: true,
        mustChangePassword: false,
      };

      onLoginSuccess(sessionObj, keepSignedIn);
    } catch (err: any) {
      setFirstLoginError(err.message || 'Error updating password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  /* ================= FORGOT / ACCOUNT RECOVERY HANDLER ================= */
  const handleRecoverAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    doHaptic();
    setRecoveryError('');
    setRecoverySuccess('');

    if (!recoveryUsername.trim() || !recoveryCode.trim() || !recoveryNewPassword) {
      setRecoveryError('Please fill in all recovery fields.');
      return;
    }

    if (recoveryNewPassword.length < 6) {
      setRecoveryError('New password must be at least 6 characters long.');
      return;
    }

    if (recoveryNewPassword !== recoveryConfirmPassword) {
      setRecoveryError('New password and confirmation do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/recover-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: recoveryUsername.trim(),
          recoveryCode: recoveryCode.trim(),
          newPassword: recoveryNewPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setRecoveryError(data.error || 'Account recovery failed. Verify your recovery code.');
        setIsLoading(false);
        return;
      }

      setRecoverySuccess(
        data.message || 'Password successfully reset! Returning to sign in...'
      );
      setTimeout(() => {
        setUsername(recoveryUsername.trim());
        setPassword('');
        setView('login');
        setRecoverySuccess('');
        setRecoveryUsername('');
        setRecoveryCode('');
        setRecoveryNewPassword('');
        setRecoveryConfirmPassword('');
      }, 2000);
    } catch (err: any) {
      setRecoveryError(err.message || 'Server connection error during account recovery.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f1e] text-[#e8ecff] flex items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Background radial gradient glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_15%,#1c245c_0%,#0b0f1e_65%)] pointer-events-none" />
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container Card */}
      <div className="relative w-full max-w-[420px] bg-[#11193d]/95 backdrop-blur-xl border border-[#232f5e] rounded-3xl p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.7)] animate-in fade-in zoom-in-95 duration-200 z-10">
        {onClose && (
          <button
            onClick={() => {
              doHaptic();
              onClose();
            }}
            className="absolute top-4 right-4 p-2 rounded-full text-indigo-300 hover:text-white hover:bg-white/10 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* ================= VIEW 1: SIGN IN ================= */}
        {view === 'login' && (
          <div className="space-y-6">
            {/* Top Logo Badge */}
            <div className="flex flex-col items-center">
              <div className="bg-[#0b143a] border border-[#243368] rounded-2xl p-2.5 px-5 shadow-inner max-w-[210px] flex items-center justify-center">
                <img
                  src={BAXY_LOGO_BASE64}
                  alt="Baxy Engineering"
                  className="h-9 sm:h-11 object-contain drop-shadow"
                />
              </div>

              {/* Title & Subtitle */}
              <h1 className="text-xl sm:text-2xl font-black tracking-wider text-white uppercase mt-4 text-center">
                BAXY PAINTSHOP
              </h1>
              <p className="text-xs sm:text-sm text-indigo-200/70 text-center mt-1 font-medium">
                Production &amp; Quality Management Portal
              </p>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* USERNAME */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  USERNAME
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setErrorMessage('');
                    }}
                    placeholder="Enter registered username"
                    autoComplete="username"
                    required
                    autoFocus
                    className="w-full bg-[#162144] text-white border border-[#263566] focus:border-indigo-400 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition placeholder-slate-500 font-medium"
                  />
                </div>
              </div>

              {/* PASSWORD */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  PASSWORD
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setErrorMessage('');
                    }}
                    placeholder="Enter password"
                    autoComplete="current-password"
                    required
                    className="w-full bg-[#162144] text-white border border-[#263566] focus:border-indigo-400 rounded-xl pl-4 pr-11 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition placeholder-slate-500 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      doHaptic();
                      setShowPassword((prev) => !prev);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-200 p-1.5 rounded-lg transition"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-indigo-300" />
                    ) : (
                      <Eye className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* KEEP ME SIGNED IN CHECKBOX */}
              <div className="pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={keepSignedIn}
                    onChange={(e) => setKeepSignedIn(e.target.checked)}
                    className="w-4 h-4 rounded border-[#2c3e78] bg-[#162144] text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                  <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wide">
                    KEEP ME SIGNED IN ON THIS DEVICE
                  </span>
                </label>
              </div>

              {/* Sign in Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#6366f1] via-[#7066f8] to-[#818cf8] hover:from-[#5558e6] hover:to-[#707af5] text-white font-bold text-sm sm:text-base shadow-lg shadow-indigo-600/35 active:scale-[0.98] transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? <RotateCw className="w-4 h-4 animate-spin" /> : null}
                <span>{isLoading ? 'Authenticating…' : 'Sign in'}</span>
              </button>

              {/* Forgot password link */}
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    doHaptic();
                    setView('forgot');
                    setErrorMessage('');
                    setRecoveryError('');
                  }}
                  className="text-indigo-400 hover:text-indigo-200 text-xs font-medium hover:underline transition"
                >
                  Forgot password or need account recovery?
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ================= VIEW 2: MANDATORY FIRST-TIME PASSWORD CHANGE ================= */}
        {view === 'first_login' && (
          <div className="space-y-5">
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-400/30 mx-auto flex items-center justify-center mb-2 shadow-inner">
                <Shield className="w-6 h-6 text-amber-400" />
              </div>
              <h2 className="text-lg font-bold text-white">First Sign-In Password Setup</h2>
              <p className="text-xs text-indigo-200/70 mt-1">
                Security Policy: Administrator <strong className="text-white">@{pendingSession?.user?.username}</strong> must set a new personal password before accessing the system.
              </p>
            </div>

            {firstLoginError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{firstLoginError}</span>
              </div>
            )}

            <form onSubmit={handleFirstLoginPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  NEW PASSWORD
                </label>
                <input
                  type="password"
                  value={firstLoginNewPassword}
                  onChange={(e) => {
                    setFirstLoginNewPassword(e.target.value);
                    setFirstLoginError('');
                  }}
                  placeholder="Enter at least 6 characters"
                  required
                  autoFocus
                  className="w-full bg-[#162144] text-white border border-[#263566] focus:border-indigo-400 rounded-xl px-4 py-3 text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  CONFIRM NEW PASSWORD
                </label>
                <input
                  type="password"
                  value={firstLoginConfirmPassword}
                  onChange={(e) => {
                    setFirstLoginConfirmPassword(e.target.value);
                    setFirstLoginError('');
                  }}
                  placeholder="Re-enter new password"
                  required
                  className="w-full bg-[#162144] text-white border border-[#263566] focus:border-indigo-400 rounded-xl px-4 py-3 text-sm focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-950/60 active:scale-[0.98] transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? <RotateCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                <span>{isLoading ? 'Saving Password…' : 'Set Password & Enter Dashboard'}</span>
              </button>
            </form>
          </div>
        )}

        {/* ================= VIEW 3: FORGOT PASSWORD / ACCOUNT RECOVERY ================= */}
        {view === 'forgot' && (
          <div className="space-y-5">
            <button
              type="button"
              onClick={() => {
                doHaptic();
                setView('login');
                setRecoveryError('');
              }}
              className="inline-flex items-center gap-1.5 text-xs text-indigo-300 hover:text-white font-semibold transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign in</span>
            </button>

            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 mx-auto flex items-center justify-center mb-2 shadow-inner">
                <KeyRound className="w-6 h-6 text-indigo-400" />
              </div>
              <h2 className="text-lg font-bold text-white">Account Password Recovery</h2>
              <p className="text-xs text-indigo-200/70 mt-1">
                Enter your username and secure recovery code to reset your account password
              </p>
            </div>

            {/* Success Banner */}
            {recoverySuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{recoverySuccess}</span>
              </div>
            )}

            {/* Error Banner */}
            {recoveryError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{recoveryError}</span>
              </div>
            )}

            <form onSubmit={handleRecoverAccount} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={recoveryUsername}
                  onChange={(e) => {
                    setRecoveryUsername(e.target.value);
                    setRecoveryError('');
                  }}
                  placeholder="e.g. admin1"
                  required
                  autoFocus
                  className="w-full bg-[#162144] text-white border border-[#263566] focus:border-indigo-400 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Recovery Code
                </label>
                <input
                  type="text"
                  value={recoveryCode}
                  onChange={(e) => {
                    setRecoveryCode(e.target.value);
                    setRecoveryError('');
                  }}
                  placeholder="Enter assigned recovery code"
                  required
                  className="w-full bg-[#162144] text-white border border-[#263566] focus:border-indigo-400 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-mono uppercase focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={recoveryNewPassword}
                  onChange={(e) => {
                    setRecoveryNewPassword(e.target.value);
                    setRecoveryError('');
                  }}
                  placeholder="Enter at least 6 characters"
                  required
                  className="w-full bg-[#162144] text-white border border-[#263566] focus:border-indigo-400 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={recoveryConfirmPassword}
                  onChange={(e) => {
                    setRecoveryConfirmPassword(e.target.value);
                    setRecoveryError('');
                  }}
                  placeholder="Re-enter new password"
                  required
                  className="w-full bg-[#162144] text-white border border-[#263566] focus:border-indigo-400 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-950/60 active:scale-[0.98] transition flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              >
                {isLoading ? <RotateCw className="w-4 h-4 animate-spin" /> : null}
                <span>Verify Code &amp; Reset Password</span>
              </button>
            </form>

            <p className="text-[11px] text-indigo-300/60 text-center">
              Operator accounts without a recovery code should contact a plant administrator for a password reset.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
