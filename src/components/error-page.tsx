import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  RotateCcw,
  Home,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Send,
  X,
  Compass,
  LayoutGrid,
  BookOpen,
  GraduationCap,
  Search
} from 'lucide-react';
import { captureError, normalizeFirebaseError, scrubSensitiveDetails } from '../lib/error-capture';
import { reportIssue } from '../lib/lovable-error-reporting';

interface ErrorPageProps {
  error?: Error;
  resetErrorBoundary?: () => void;
  title?: string;
  description?: string;
}

export function ErrorPage({
  error,
  resetErrorBoundary,
  title,
  description
}: ErrorPageProps) {
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportCategory, setReportCategory] = useState<'bug' | 'visual_glitch' | 'performance' | 'accessibility'>('bug');
  const [reportComment, setReportComment] = useState('');
  const [reportSubmitted, setReportSubmitted] = useState(false);

  const normalized = normalizeFirebaseError(error);
  const displayTitle = title || normalized.title;
  const displayDesc = description || normalized.message;

  // Escape key handler for report modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showReportModal) {
        setShowReportModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showReportModal]);

  const handleSendReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportComment.trim()) return;

    reportIssue({
      category: reportCategory,
      description: `${reportComment} [Normalized: ${normalized.code || 'UNKNOWN'} - ${normalized.message}]`
    });

    setReportSubmitted(true);
    setTimeout(() => {
      setShowReportModal(false);
      setReportSubmitted(false);
      setReportComment('');
    }, 2000);
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="min-h-screen bg-background dark:bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6"
    >
      <div className="w-full max-w-lg bg-card border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
        {/* Brand Header */}
        <div className="flex items-center justify-center gap-2">
          <div className="w-7 h-7 rounded-full bg-slate-950 dark:bg-white text-white dark:text-slate-950 flex items-center justify-center font-black text-xs">
            OX
          </div>
          <span className="font-extrabold text-sm tracking-widest text-slate-900 dark:text-white">
            ONYX ACADEMY
          </span>
        </div>

        {/* Warning Icon */}
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-inner">
          <AlertTriangle className="w-8 h-8" aria-hidden="true" />
        </div>

        {/* Text Details */}
        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {displayTitle}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-md mx-auto">
            {displayDesc}
          </p>
        </div>

        {/* Primary Actions Cluster */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {resetErrorBoundary && (
            <button
              type="button"
              onClick={resetErrorBoundary}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand hover:bg-brand-hover] text-white text-xs font-semibold shadow-xs cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              <span>Try Again</span>
            </button>
          )}

          <a
            href="/dashboard"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
          >
            <Home className="w-4 h-4" aria-hidden="true" />
            <span>Dashboard</span>
          </a>

          <button
            type="button"
            onClick={() => setShowReportModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
          >
            <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Report Issue</span>
          </button>
        </div>

        {/* Diagnostic disclosure (No sensitive info leaked) */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <button
            type="button"
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            aria-expanded={showDiagnostics}
            className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 mx-auto transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
          >
            <span>{showDiagnostics ? 'Hide Technical Diagnostics' : 'Show Technical Diagnostics'}</span>
            {showDiagnostics ? <ChevronUp className="w-3 h-3" aria-hidden="true" /> : <ChevronDown className="w-3 h-3" aria-hidden="true" />}
          </button>

          {showDiagnostics && (
            <div className="mt-3 p-3.5 rounded-xl bg-slate-100/70 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/60 text-left font-mono text-[11px] text-slate-700 dark:text-slate-300 space-y-1.5 overflow-x-auto">
              <div>
                <span className="text-slate-500 dark:text-slate-400">Classification: </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{normalized.category.toUpperCase()}</span>
              </div>
              {normalized.code && (
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Error Code: </span>
                  <span className="text-amber-700 dark:text-amber-400">{normalized.code}</span>
                </div>
              )}
              <div>
                <span className="text-slate-500 dark:text-slate-400">Timestamp: </span>
                <span>{new Date().toISOString()}</span>
              </div>
              {error?.stack && (
                <div className="pt-1 border-t border-slate-200 dark:border-slate-800/60">
                  <span className="text-slate-500 dark:text-slate-400 block pb-1">Sanitized Calltrace:</span>
                  <pre className="text-[10px] text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed max-h-24 overflow-y-auto">
                    {scrubSensitiveDetails(error.stack.slice(0, 300))}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Issue Report Feedback Modal */}
      {showReportModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-modal-title"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md bg-card border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 id="report-modal-title" className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                <span>Submit Error Feedback</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                aria-label="Close feedback dialog"
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {reportSubmitted ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" aria-hidden="true" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Report Received
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Thank you! Our engineering telemetry has logged this diagnostic report.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendReport} className="space-y-4">
                <div>
                  <label htmlFor="issue-category-select" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Issue Category
                  </label>
                  <select
                    id="issue-category-select"
                    value={reportCategory}
                    onChange={(e) => setReportCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-medium text-slate-800 dark:text-slate-200 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
                  >
                    <option value="bug">Software Bug / Crash</option>
                    <option value="visual_glitch">Display or Layout Issue</option>
                    <option value="accessibility">Accessibility / Screen Reader Issue</option>
                    <option value="performance">Slow Pacing / Latency</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="issue-description-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    What were you doing when this happened?
                  </label>
                  <textarea
                    id="issue-description-input"
                    rows={3}
                    required
                    value={reportComment}
                    onChange={(e) => setReportComment(e.target.value)}
                    placeholder="e.g. Submitting problem set 2 on mobile canvas..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand hover:bg-brand-hover] text-white text-xs font-semibold shadow-xs focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
                  >
                    <Send className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Send Report</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Route Not Found / 404 Page
 */
export function RouteErrorPage({
  path,
  onNavigate
}: {
  path: string;
  onNavigate: (route: string) => void;
}) {
  return (
    <div
      role="region"
      aria-label="Course Page Not Found"
      className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-6"
    >
      <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-950/40 text-brand dark:text-blue-400 flex items-center justify-center mx-auto shadow-inner">
        <Compass className="w-8 h-8" aria-hidden="true" />
      </div>

      <div className="space-y-2 max-w-md">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Course Page Not Found
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          The requested URL <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px] text-slate-800 dark:text-slate-200">{path}</code> does not match any registered class, quiz, or module.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
        <button
          type="button"
          onClick={() => onNavigate('/dashboard')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand hover:bg-brand-hover] text-white text-xs font-semibold shadow-xs cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
        >
          <LayoutGrid className="w-4 h-4" aria-hidden="true" />
          <span>Dashboard</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigate('/classes')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-card text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
        >
          <GraduationCap className="w-4 h-4" aria-hidden="true" />
          <span>Classes</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigate('/assignments')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-card text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
        >
          <BookOpen className="w-4 h-4" aria-hidden="true" />
          <span>Assignments</span>
        </button>
      </div>
    </div>
  );
}

/**
 * Top-Level React Error Boundary
 */
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    captureError(error, `react-error-boundary: ${info.componentStack?.slice(0, 100) || 'root'}`);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <ErrorPage
          error={this.state.error}
          resetErrorBoundary={() => this.setState({ hasError: false, error: undefined })}
        />
      );
    }
    return this.props.children;
  }
}
