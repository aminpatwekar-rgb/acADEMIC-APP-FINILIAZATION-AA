import React from 'react';
import { ShieldAlert, ArrowLeft, Home, RotateCcw } from 'lucide-react';
import { UserRole } from '../../lib/auth';

interface UnauthorizedStateProps {
  onNavigate: (path: string) => void;
  requiredRole?: string;
  isPreviewing?: boolean;
  effectiveRole?: UserRole;
  onExitPreview?: () => void;
}

export function UnauthorizedState({
  onNavigate,
  requiredRole = 'admin',
  isPreviewing = false,
  effectiveRole,
  onExitPreview
}: UnauthorizedStateProps) {
  return (
    <div className="min-h-screen bg-[#f8f9fb] dark:bg-slate-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-xl text-center space-y-5">
        <div className="w-14 h-14 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center mx-auto">
          <ShieldAlert className="w-7 h-7" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Access Restricted</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            {isPreviewing ? (
              <>
                You are currently previewing ONYX as <strong className="capitalize text-slate-800 dark:text-slate-200">{effectiveRole}</strong>.
                Access to the administrative control plane is restricted while in simulation mode.
              </>
            ) : (
              <>
                This workspace area requires elevated <span className="font-semibold capitalize text-slate-700 dark:text-slate-300">{requiredRole}</span> permissions.
                Your current account does not have sufficient clearance.
              </>
            )}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          {isPreviewing && onExitPreview ? (
            <button
              type="button"
              onClick={onExitPreview}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs cursor-pointer transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Exit Preview & Access Admin</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate('/dashboard')}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#005fb8] hover:bg-[#004e9a] text-white text-xs font-semibold shadow-xs cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Dashboard</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </button>
        </div>
      </div>
    </div>
  );
}
