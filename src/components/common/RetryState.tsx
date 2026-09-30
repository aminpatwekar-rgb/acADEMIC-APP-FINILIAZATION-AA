import React from 'react';
import { RotateCcw, AlertTriangle, WifiOff, ShieldAlert, ArrowLeft } from 'lucide-react';

interface RetryStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  onSecondaryAction?: () => void;
  secondaryActionLabel?: string;
  isRetrying?: boolean;
  category?: 'network' | 'permission' | 'general';
  className?: string;
}

export function RetryState({
  title = 'Unable to Load Data',
  message = 'A temporary network or server anomaly occurred while fetching this course record. Please check your connectivity and retry.',
  onRetry,
  onSecondaryAction,
  secondaryActionLabel = 'Return to Dashboard',
  isRetrying = false,
  category = 'general',
  className = ''
}: RetryStateProps) {
  const Icon = category === 'network' ? WifiOff : category === 'permission' ? ShieldAlert : AlertTriangle;
  const iconColor = category === 'permission'
    ? 'text-rose-600 dark:text-rose-400 bg-rose-500/10'
    : 'text-amber-600 dark:text-amber-400 bg-amber-500/10';

  return (
    <div
      role="region"
      aria-label={title}
      className={`p-8 sm:p-10 rounded-2xl border border-slate-200 dark:border-slate-800 bg-card shadow-2xs text-center space-y-4 max-w-lg mx-auto my-6 animate-in fade-in duration-150 ${className}`}
    >
      <div className={`w-14 h-14 rounded-2xl ${iconColor} flex items-center justify-center mx-auto shadow-inner`}>
        <Icon className="w-7 h-7" aria-hidden="true" />
      </div>

      <div className="space-y-1.5">
        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
          {title}
        </h3>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
          {message}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
        {onRetry && (
          <button
            type="button"
            disabled={isRetrying}
            onClick={onRetry}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand hover:bg-brand-hover] text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>{isRetrying ? 'Retrying...' : 'Retry Connection'}</span>
          </button>
        )}

        {onSecondaryAction && (
          <button
            type="button"
            onClick={onSecondaryAction}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{secondaryActionLabel}</span>
          </button>
        )}
      </div>
    </div>
  );
}
