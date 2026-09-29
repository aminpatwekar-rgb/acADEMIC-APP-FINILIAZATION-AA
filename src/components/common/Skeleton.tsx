import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  animation?: 'pulse' | 'wave' | 'none';
}

export function Skeleton({
  className = '',
  variant = 'rounded',
  animation = 'pulse',
  ...props
}: SkeletonProps) {
  const variantStyles = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-xl'
  }[variant];

  const animationStyles = {
    pulse: 'animate-pulse',
    wave: 'relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/20 dark:before:via-white/10 before:to-transparent',
    none: ''
  }[animation];

  return (
    <div
      className={`bg-slate-200/80 dark:bg-slate-800/70 ${variantStyles} ${animationStyles} ${className}`}
      {...props}
    />
  );
}

export function SkeletonText({
  lines = 3,
  className = ''
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          className={
            i === lines - 1
              ? 'w-3/5 h-3.5'
              : i === 0
              ? 'w-full h-4'
              : 'w-4/5 h-3.5'
          }
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div
      className={`p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4 ${className}`}
    >
      <div className="flex items-center justify-between">
        <Skeleton variant="rounded" className="w-16 h-6" />
        <Skeleton variant="circular" className="w-6 h-6" />
      </div>
      <div className="space-y-2">
        <Skeleton variant="text" className="w-3/4 h-5" />
        <Skeleton variant="text" className="w-1/2 h-3.5" />
      </div>
      <div className="flex items-center gap-3 pt-2">
        <Skeleton variant="rounded" className="w-20 h-4" />
        <Skeleton variant="rounded" className="w-20 h-4" />
        <Skeleton variant="rounded" className="w-20 h-4" />
      </div>
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <Skeleton variant="rounded" className="w-24 h-4" />
        <Skeleton variant="rounded" className="w-28 h-8" />
      </div>
    </div>
  );
}

export function SkeletonQuizEditor() {
  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 animate-pulse">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton variant="text" className="w-20 h-4" />
          <Skeleton variant="text" className="w-48 h-8" />
          <Skeleton variant="text" className="w-36 h-4" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton variant="rounded" className="w-24 h-9" />
          <Skeleton variant="rounded" className="w-24 h-9" />
          <Skeleton variant="rounded" className="w-24 h-9" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        <Skeleton variant="rounded" className="w-28 h-9" />
        <Skeleton variant="rounded" className="w-24 h-9" />
        <Skeleton variant="rounded" className="w-28 h-9" />
        <Skeleton variant="rounded" className="w-24 h-9" />
      </div>

      {/* Question Card Box */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton variant="circular" className="w-7 h-7" />
            <Skeleton variant="rounded" className="w-32 h-8" />
            <Skeleton variant="rounded" className="w-24 h-8" />
            <Skeleton variant="rounded" className="w-20 h-8" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton variant="rounded" className="w-6 h-6" />
            <Skeleton variant="rounded" className="w-6 h-6" />
            <Skeleton variant="rounded" className="w-6 h-6" />
          </div>
        </div>

        <Skeleton variant="rounded" className="w-full h-24" />

        <div className="space-y-2 pt-2">
          <Skeleton variant="rounded" className="w-full h-12" />
          <Skeleton variant="rounded" className="w-full h-12" />
        </div>

        <div className="pt-2">
          <Skeleton variant="text" className="w-40 h-4 mb-2" />
          <Skeleton variant="rounded" className="w-full h-16" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonAuthLoading() {
  return (
    <div className="min-h-screen bg-[#f8f9fb] dark:bg-slate-950 flex flex-col items-center justify-center p-6">
      <div className="flex flex-col items-center gap-4 text-center max-w-sm w-full">
        <div className="w-12 h-12 rounded-2xl bg-slate-950 dark:bg-white text-white dark:text-slate-950 flex items-center justify-center font-black text-lg shadow-md animate-pulse">
          OX
        </div>
        <div className="w-full space-y-2">
          <Skeleton variant="text" className="w-3/4 mx-auto h-4" />
          <Skeleton variant="text" className="w-1/2 mx-auto h-3" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 animate-pulse">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950 flex items-center justify-between">
        <Skeleton variant="rounded" className="w-36 h-5" />
        <Skeleton variant="rounded" className="w-24 h-5" />
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800 p-2">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={rIdx} className="py-3 px-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <Skeleton variant="circular" className="w-8 h-8 shrink-0" />
              <div className="space-y-1.5 flex-1 max-w-xs">
                <Skeleton variant="text" className="w-3/4 h-3.5" />
                <Skeleton variant="text" className="w-1/2 h-3" />
              </div>
            </div>
            {Array.from({ length: cols - 1 }).map((_, cIdx) => (
              <Skeleton key={cIdx} variant="rounded" className="w-20 h-4 hidden sm:block" />
            ))}
            <Skeleton variant="rounded" className="w-16 h-7 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

