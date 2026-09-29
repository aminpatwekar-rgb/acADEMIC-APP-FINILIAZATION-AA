import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Mail, CheckCircle2, Loader2 } from 'lucide-react';

export function EmailVerificationBanner() {
  const { user, emailVerified, resendVerification } = useAuth();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!user || emailVerified) return null;

  const handleResend = async () => {
    setSending(true);
    try {
      await resendVerification();
      setSent(true);
      setTimeout(() => setSent(false), 5000);
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="w-full bg-primary-soft dark:bg-primary/15 border border-primary/30 dark:border-primary/30/60 text-primary-strong dark:text-primary dark:text-primary px-4 py-2.5 rounded-lg flex items-center justify-between text-xs font-medium mb-6 shadow-xs animate-in fade-in">
      <div className="flex items-center gap-2">
        <Mail className="w-4 h-4 text-primary dark:text-primary shrink-0" />
        <span>
          A verification link has been sent to <strong className="font-semibold">{user.email}</strong>. Please verify your email to unlock all institutional privileges.
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0 ml-4">
        {sent ? (
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Sent!
          </span>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={sending}
            className="text-primary dark:text-primary hover:text-primary-strong dark:text-primary dark:hover:text-white font-semibold underline underline-offset-2 cursor-pointer transition-colors flex items-center gap-1"
          >
            {sending && <Loader2 className="w-3 h-3 animate-spin" />}
            Resend Email
          </button>
        )}
      </div>
    </div>
  );
}
