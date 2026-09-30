import React from 'react';
import {
  ArrowLeft,
  ShieldCheck,
  Sparkles,
  Lock,
  Layers,
  CheckCircle2,
  GraduationCap
} from 'lucide-react';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  onNavigate: (path: string) => void;
  children: React.ReactNode;
  activeMode?: 'signin' | 'signup' | 'reset';
  tagline?: string;
}

export function AuthLayout({
  title,
  subtitle,
  onNavigate,
  children,
  activeMode,
  tagline = 'Next-Generation Academic LMS'
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-background font-sans text-foreground">
      {/* ========================================================
          LEFT COLUMN: Immersive Illustration & Editorial Stage
          (Desktop / Tablet-Landscape >= lg)
         ======================================================== */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[52%] relative bg-slate-950 text-white flex-col justify-between p-12 xl:p-16 overflow-hidden select-none">
        {/* Subtle Ambient Radial Lighting */}
        <div
          className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-60"
          style={{
            background:
              'radial-gradient(ellipse at 15% 15%, rgba(0, 95, 184, 0.35) 0%, transparent 50%), radial-gradient(ellipse at 85% 85%, rgba(124, 58, 237, 0.28) 0%, transparent 55%)'
          }}
        />

        {/* Delicate Geometric Vector Matrix Grid */}
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="auth-grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#auth-grid-pattern)" />
          </svg>
        </div>

        {/* TOP BRAND HEADER */}
        <div className="relative z-10 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="flex items-center gap-3 text-left group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-white text-slate-950 font-black text-sm flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              OX
            </div>
            <div>
              <span className="font-extrabold text-base tracking-widest text-white block">
                ONYX
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                {tagline}
              </span>
            </div>
          </button>

          <span className="text-xs font-mono font-medium text-slate-400 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-800">
            Institutional v6.0
          </span>
        </div>

        {/* CENTER ILLUSTRATION STAGE */}
        <div className="relative z-10 my-auto py-8 flex flex-col items-center justify-center">
          {/* Layered Architectural & Mathematical Isometric Showcase */}
          <div className="relative w-full max-w-lg">
            {/* Ambient Backlight Glow behind card */}
            <div className="absolute -inset-1.5 bg-gradient-to-r from-blue-600/30 to-purple-600/30 rounded-3xl blur-2xl opacity-70" />

            {/* Primary Glassmorphic Canvas Showcase Card */}
            <div className="relative rounded-2xl border border-slate-700/60 bg-slate-900/85 backdrop-blur-md p-6 xl:p-7 shadow-2xl space-y-5">
              {/* Card Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                  <span className="text-xs font-mono text-slate-400 ml-2">canvas://evaluation-sandbox</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Anti-Cheat Sentinel Active</span>
                </div>
              </div>

              {/* Mathematical Equation & Proof Vector Linework */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>Theorem 4.12: Stokes & Surface Integrals</span>
                  <span className="text-blue-400 font-semibold">Verified Proof</span>
                </div>
                <div className="font-serif italic text-lg sm:text-xl text-blue-200 tracking-wide text-center py-2 select-all">
                  ∮<sub>∂Ω</sub> F · dr = ∬<sub>Ω</sub> (∇ × F) · n̂ dA
                </div>
                <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/50">
                  <span>Topology: Compact Orientable Surface</span>
                  <span className="font-mono text-slate-300">Confidence: 99.8%</span>
                </div>
              </div>

              {/* Floating Feature Indicators */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold block text-slate-200">Zero-Knowledge</span>
                    <span className="text-[10px] text-slate-400">Encrypted Answer Keys</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold block text-slate-200">Anti-Cheat Sentinel</span>
                    <span className="text-[10px] text-slate-400">Proctored Lockdown</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Overlapping Floating Badge Bottom-Right */}
            <div className="absolute -bottom-4 -right-4 bg-blue-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-blue-400/40 animate-in fade-in zoom-in-95 duration-200">
              <Sparkles className="w-3.5 h-3.5 fill-current" />
              <span>Handwritten Canvas & LaTeX Math</span>
            </div>
          </div>
        </div>

        {/* BOTTOM ACADEMIC TESTIMONIAL & TRUST */}
        <div className="relative z-10 pt-4 border-t border-slate-800/80">
          <blockquote className="text-xs sm:text-sm text-slate-300 italic leading-relaxed">
            &ldquo;ONYX has fundamentally elevated how our faculty conducts conceptual examinations, handwritten proofs, and algorithmic evaluations.&rdquo;
          </blockquote>
          <div className="mt-2.5 flex items-center justify-between text-xs text-slate-400">
            <div>
              <span className="font-semibold text-white block">Dr. Elizabeth Vance</span>
              <span className="text-[11px] text-slate-500">Department of Computer Science & Mathematics</span>
            </div>
            <span className="text-[11px] font-mono text-slate-500">FERPA & SOC2 Ready</span>
          </div>
        </div>
      </div>

      {/* ========================================================
          RIGHT COLUMN: Centered Authentication Form Container
         ======================================================== */}
      <div className="w-full lg:w-1/2 xl:w-[48%] min-h-screen flex flex-col justify-between bg-card px-6 py-8 sm:px-12 sm:py-12 lg:px-14 xl:px-16 overflow-y-auto">
        {/* Top Action Row */}
        <div className="flex items-center justify-between w-full max-w-[420px] mx-auto">
          {/* Mobile Logo (Visible only on < lg) */}
          <div className="lg:hidden flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-slate-950 text-white font-black text-xs flex items-center justify-center">
              OX
            </div>
            <span className="font-extrabold text-sm tracking-widest text-foreground">
              ONYX
            </span>
          </div>

          {/* Back Navigation to Home */}
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer ml-auto"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to home</span>
          </button>
        </div>

        {/* Centered Main Form Container */}
        <div className="w-full max-w-[420px] mx-auto my-auto py-8">
          {/* Form Header */}
          <div className="mb-6 space-y-1.5 text-left">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              {subtitle}
            </p>
          </div>

          {/* Form Content / Children */}
          {children}
        </div>

        {/* Bottom Institutional Disclaimer */}
        <div className="w-full max-w-[420px] mx-auto pt-6 text-center text-[11px] text-slate-400 dark:text-slate-500">
          <span>Protected by enterprise-grade Zero-Trust Firestore Security.</span>
          <div className="mt-1 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('/')}
              className="hover:underline cursor-pointer"
            >
              Terms of Service
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => onNavigate('/')}
              className="hover:underline cursor-pointer"
            >
              Privacy Policy
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => onNavigate('/')}
              className="hover:underline cursor-pointer"
            >
              Security Overview
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
