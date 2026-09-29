import React, { useState } from 'react';
import { Camera, ShieldCheck, PenTool, BarChart3, ArrowRight, CheckCircle, Sun, Moon, Sparkles, Loader2 } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

interface LandingPageProps {
  onNavigate: (path: string) => void;
}

export function LandingPage({ onNavigate }: LandingPageProps) {
  const { isDark, setMode } = useTheme();
  const { user, signInGoogle } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleAuth = async () => {
    setGoogleLoading(true);
    try {
      await signInGoogle('student');
      onNavigate('/dashboard');
    } catch (e) {
      console.warn('Google sign-in caught:', e);
      onNavigate('/login');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090b10] text-slate-100 flex flex-col font-sans selection:bg-amber-500/30">
      {/* Top Navigation */}
      <header className="w-full max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white text-slate-950 font-bold flex items-center justify-center text-xs tracking-tight">
            OX
          </div>
          <span className="font-extrabold text-base tracking-widest text-white">ONYX</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMode(isDark ? 'light' : 'dark')}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
            aria-label="Toggle Theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-300" />}
          </button>

          {user ? (
            <button
              type="button"
              onClick={() => onNavigate('/dashboard')}
              className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-strong text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              Open Dashboard →
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onNavigate('/login')}
                className="px-3.5 py-2 rounded-lg text-slate-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Sign In
              </button>

              <button
                type="button"
                onClick={() => onNavigate('/signup')}
                className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-strong text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                Get started
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Ambient brand glows */}
        <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[720px] h-[420px] rounded-full opacity-25 blur-3xl"
             style={{ background: 'radial-gradient(closest-side, #2f5fe0, transparent)' }} />
        <div className="pointer-events-none absolute bottom-0 right-0 w-[420px] h-[300px] rounded-full opacity-15 blur-3xl"
             style={{ background: 'radial-gradient(closest-side, #14b8a6, transparent)' }} />
      <main className="relative w-full max-w-5xl mx-auto px-6 pt-10 pb-20 flex flex-col justify-center">
        {/* Badge */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-medium">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Built for schools and colleges</span>
          </div>
        </div>

        {/* Hero Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white max-w-3xl leading-[1.12]">
          <span className="font-serif italic font-normal text-slate-300">Handwriting </span>
          deserves a modern{' '}
          <span className="font-extrabold bg-gradient-to-r from-primary via-sky-400 to-teal-300 bg-clip-text text-transparent">submission flow.</span>
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-sm sm:text-base text-slate-400 max-w-2xl leading-relaxed">
          ONYX gives teachers classes, assignments and review tools — and gives students a calm place to submit scanned pages or typed work that can&apos;t be pasted in.
        </p>

        {/* Action Buttons with Google OAuth */}
        <div className="mt-8 flex flex-wrap items-center gap-3.5">
          {/* Continue with Google */}
          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={googleLoading}
            className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-xs sm:text-sm font-semibold shadow-lg transition-all cursor-pointer"
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-900" />
            ) : (
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
            )}
            <span>Continue with Google</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('/signup')}
            className="btn-md btn-primary sm: transition-all group"
          >
            <span>Create your account</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>

          <button
            type="button"
            onClick={() => onNavigate('/login')}
            className="px-5 py-2.5 rounded-xl border border-slate-800 bg-[#121620] hover:bg-[#1a2130] text-slate-300 text-xs sm:text-sm font-semibold transition-all cursor-pointer"
          >
            I already have one
          </button>
        </div>

        {/* Feature Cards Grid (2x2) */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1 */}
          <div className="p-6 rounded-2xl border border-slate-800/80 bg-[#0d1017]/90 hover:border-primary/40 hover:-translate-y-1 transition-all duration-200">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
              <Camera className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white tracking-tight mb-2">
              Handwritten first
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Capture pages with the camera, drag in scans, or upload multi-page PDFs. Pages stay ordered and private.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-2xl border border-slate-800/80 bg-[#0d1017]/90 hover:border-primary/40 hover:-translate-y-1 transition-all duration-200">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-sky-500 text-white flex items-center justify-center mb-4 shadow-lg group-hover:scale-105 transition-transform"><ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white tracking-tight mb-2">
              Locked typed editor
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Copy, paste, right-click and text drag are blocked. Every attempt raises a warning and is flagged to the teacher.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-2xl border border-slate-800/80 bg-[#0d1017]/90 hover:border-primary/40 hover:-translate-y-1 transition-all duration-200">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
              <PenTool className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white tracking-tight mb-2">
              Review with intent
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Zoom and rotate pages, leave comments, award marks, then return or approve in one pass.
            </p>
          </div>

          {/* Card 4 */}
          <div className="p-6 rounded-2xl border border-slate-800/80 bg-[#0d1017]/90 hover:border-primary/40 hover:-translate-y-1 transition-all duration-200">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white flex items-center justify-center mb-4 shadow-lg group-hover:scale-105 transition-transform"><BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white tracking-tight mb-2">
              Progress that reads clearly
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Upcoming, overdue, submitted and completion percentage — colour-coded across every dashboard.
            </p>
          </div>
        </div>
      </main>
      </div>

      {/* Footer */}
      <footer className="w-full border-t border-slate-900 py-6 text-center text-xs text-slate-600">
        ONYX LMS • Built with Firebase Auth, Cloud Firestore & Zero-Trust Security
      </footer>
    </div>
  );
}
