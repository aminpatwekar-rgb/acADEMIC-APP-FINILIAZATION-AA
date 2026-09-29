import React, { useState, useEffect } from 'react';
import { MessageSquare, X, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { reportIssue } from '../../lib/lovable-error-reporting';
import { getLastError } from '../../lib/error-capture';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
  userName?: string;
}

export function FeedbackModal({
  isOpen,
  onClose,
  userEmail,
  userName
}: FeedbackModalProps) {
  const [category, setCategory] = useState<'bug' | 'visual_glitch' | 'feature_request' | 'accessibility' | 'performance'>('bug');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [lastErrorSnapshot, setLastErrorSnapshot] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSubmitted(false);
      const err = getLastError();
      setLastErrorSnapshot(err ? `[Last Captured Error: ${err.code || 'RUNTIME'}: ${err.message}]` : null);
    }
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    reportIssue({
      userEmail,
      userName,
      category,
      description: lastErrorSnapshot ? `${description.trim()} ${lastErrorSnapshot}` : description.trim()
    });

    setSubmitted(true);
    setTimeout(() => {
      onClose();
      setDescription('');
      setSubmitted(false);
    }, 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-modal-title"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in duration-100"
    >
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-100">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h3 id="feedback-modal-title" className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary dark:text-primary" aria-hidden="true" />
            <span>Send Feedback or Report Issue</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close feedback modal"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {submitted ? (
          <div className="py-8 text-center space-y-2 animate-in zoom-in-95 duration-150">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" aria-hidden="true" />
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Feedback Received
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xs mx-auto">
              Thank you! Your feedback has been safely logged into ONYX issue reporting telemetry.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="feedback-category" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                id="feedback-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-medium text-slate-800 dark:text-slate-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                <option value="bug">Bug / Unexpected Behavior</option>
                <option value="visual_glitch">Display / Responsive Glitch</option>
                <option value="accessibility">Accessibility / Screen Reader Barrier</option>
                <option value="performance">Pacing / Latency</option>
                <option value="feature_request">Feature Request / Suggestion</option>
              </select>
            </div>

            <div>
              <label htmlFor="feedback-description" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Description
              </label>
              <textarea
                id="feedback-description"
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what occurred, or suggest an enhancement..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {lastErrorSnapshot && (
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-[11px] flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span className="truncate">Recent runtime exception will be attached for diagnostic triage.</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-sm btn-primary"
              >
                <Send className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Submit Feedback</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
