import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  badge?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  badge,
  action,
  secondaryAction,
  className = ''
}: EmptyStateProps) {
  const ActionIcon = action?.icon;

  return (
    <div
      role="region"
      aria-label={title}
      className={`p-8 sm:p-12 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 text-center space-y-4 max-w-lg mx-auto my-6 animate-in fade-in duration-150 ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center mx-auto shadow-inner">
        <Icon className="w-7 h-7" aria-hidden="true" />
      </div>

      <div className="space-y-1.5">
        {badge && (
          <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#005fb8] dark:text-blue-300 border border-blue-200 dark:border-blue-900 mb-1">
            {badge}
          </span>
        )}
        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
          {title}
        </h3>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
          {description}
        </p>
      </div>

      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#005fb8] hover:bg-[#004e9a] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
            >
              {ActionIcon && <ActionIcon className="w-3.5 h-3.5" aria-hidden="true" />}
              <span>{action.label}</span>
            </button>
          )}

          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
            >
              <span>{secondaryAction.label}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
