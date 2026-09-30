import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../lib/auth';
import { AuthLayout } from '../auth/AuthLayout';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  GraduationCap,
  Sparkles,
  ArrowRight,
  UserCheck,
  Monitor
} from 'lucide-react';

interface LoginPageProps {
  onNavigate: (path: string) => void;
  initialMode?: 'signin' | 'signup';
}

export function LoginPage({ onNavigate, initialMode = 'signin' }: LoginPageProps) {
  const { signIn, signUp, signInGoogle, resetPassword } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [role, setRole] = useState<UserRole>('student');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forgot Password modal state
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'signin') {
      if (!email || !password) {
        setError('Please enter both email and password.');
        return;
      }
      setIsLoading(true);
      try {
        await signIn(email, password);
        onNavigate('/dashboard');
      } catch (err: any) {
        setError(err.message || 'Failed to sign in. Please verify your credentials.');
      } finally {
        setIsLoading(false);
      }
    } else {
      if (!email || !password || !fullName.trim()) {
        setError('Please fill in your name, email, and password.');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
      setIsLoading(true);
      try {
        await signUp(email, password, fullName.trim(), role);
        onNavigate('/dashboard');
      } catch (err: any) {
        setError(err.message || 'Failed to create account.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleGoogleAuth = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await signInGoogle(mode === 'signup' ? role : 'student');
      onNavigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Google authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      setResetError('Please enter your account email address.');
      return;
    }
    setResetLoading(true);
    setResetError(null);
    try {
      await resetPassword(resetEmail);
      setResetSent(true);
    } catch (err: any) {
      setResetError(err.message || 'Unable to send password reset email.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <AuthLayout
      title={mode === 'signin' ? 'Welcome back' : 'Create your account'}
      subtitle={
        mode === 'signin'
          ? 'Sign in to access your classes, assessments, and grade records.'
          : 'Choose your academic role and set up your institutional profile.'
      }
      onNavigate={onNavigate}
      activeMode={mode}
    >
      <div className="space-y-5">
        {/* Mode Pill Toggle */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setError(null);
            }}
            className={`flex-1 py-1.5 rounded-lg transition-all text-center cursor-pointer ${
              mode === 'signin'
                ? 'bg-card text-slate-950 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError(null);
            }}
            className={`flex-1 py-1.5 rounded-lg transition-all text-center cursor-pointer ${
              mode === 'signup'
                ? 'bg-card text-slate-950 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            Sign Up
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Google One-Click Button */}
        <button
          type="button"
          onClick={handleGoogleAuth}
          disabled={isLoading}
          className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold flex items-center justify-center gap-3 transition-colors cursor-pointer shadow-2xs"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-slate-800" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-card px-3 text-slate-400">or with email</span>
          </div>
        </div>

        {/* Role Selector (Only for Sign Up) */}
        {mode === 'signup' && (
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRole('student')}
              className={`
                p-3 rounded-xl border flex flex-col items-start gap-1 transition-all cursor-pointer text-left
                ${role === 'student'
                  ? 'border-brand bg-brand-tint dark:bg-blue-950/40 text-brand dark:text-blue-300 ring-1 ring-brand'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }
              `}
            >
              <div className="flex items-center gap-1.5">
                <GraduationCap className={`w-4 h-4 ${role === 'student' ? 'text-brand dark:text-blue-300' : 'text-slate-500'}`} />
                <span className="text-xs font-semibold">Student</span>
              </div>
              <span className="text-[10px] text-slate-400">Submit work & tests</span>
            </button>

            <button
              type="button"
              onClick={() => setRole('teacher')}
              className={`
                p-3 rounded-xl border flex flex-col items-start gap-1 transition-all cursor-pointer text-left
                ${role === 'teacher'
                  ? 'border-brand bg-brand-tint dark:bg-blue-950/40 text-brand dark:text-blue-300 ring-1 ring-brand'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }
              `}
            >
              <div className="flex items-center gap-1.5">
                <Monitor className={`w-4 h-4 ${role === 'teacher' ? 'text-brand dark:text-blue-300' : 'text-slate-500'}`} />
                <span className="text-xs font-semibold">Teacher</span>
              </div>
              <span className="text-[10px] text-slate-400">Create & grade</span>
            </button>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Full name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                required
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-hidden focus:border-brand focus:ring-1 focus:ring-brand transition-all"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@school.edu"
              required
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-hidden focus:border-brand focus:ring-1 focus:ring-brand transition-all"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Password
              </label>
              {mode === 'signin' && (
                <button
                  type="button"
                  onClick={() => onNavigate('/reset-password')}
                  className="text-[11px] text-slate-500 hover:text-brand dark:text-slate-400 dark:hover:text-blue-400 font-medium cursor-pointer transition-colors"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-hidden focus:border-brand focus:ring-1 focus:ring-brand transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-2.5 px-4 rounded-xl bg-brand hover:bg-brand-hover] text-white text-xs sm:text-sm font-semibold shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{mode === 'signin' ? 'Sign in to ONYX' : 'Create ONYX account'}</span>
          </button>
        </form>

        {/* Switch Link */}
        <div className="text-center pt-2">
          {mode === 'signin' ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('signup')}
                className="font-semibold text-brand hover:underline cursor-pointer"
              >
                Sign up
              </button>
            </p>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('signin')}
                className="font-semibold text-brand hover:underline cursor-pointer"
              >
                Sign in
              </button>
            </p>
          )}
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-card rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <h3 className="font-bold text-slate-950 dark:text-white text-base">Reset your password</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enter your account email and we&apos;ll send you a password recovery link.
            </p>

            {resetSent ? (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Password reset link sent to your inbox. Check your email.</span>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-3">
                {resetError && (
                  <div className="p-2.5 bg-rose-50 text-rose-700 text-xs rounded-lg">
                    {resetError}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email address
                  </label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    placeholder="you@school.edu"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-xs bg-slate-50 dark:bg-slate-950"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowResetModal(false)}
                    className="px-3 py-1.5 rounded-lg border text-xs text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="px-4 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold"
                  >
                    {resetLoading ? 'Sending...' : 'Send link'}
                  </button>
                </div>
              </form>
            )}

            {resetSent && (
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="px-4 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
