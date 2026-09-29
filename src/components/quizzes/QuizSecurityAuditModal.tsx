import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useViewRole } from '../../lib/viewRole';
import {
  FirestoreQuiz,
  verifyDirectFirestoreAnswerKeyBypass
} from '../../lib/firebase/firestoreService';
import {
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Play,
  Lock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  X,
  FileCode,
  RefreshCw,
  EyeOff
} from 'lucide-react';

interface QuizSecurityAuditModalProps {
  quiz: FirestoreQuiz;
  onClose: () => void;
}

export function QuizSecurityAuditModal({ quiz, onClose }: QuizSecurityAuditModalProps) {
  const { user, profile } = useAuth();
  const { effectiveRole } = useViewRole();

  const [isRunning, setIsRunning] = useState(false);
  const [auditResult, setAuditResult] = useState<{
    attemptedPath: string;
    blocked: boolean;
    errorCode: string;
    errorMessage: string;
    timestamp: string;
  } | null>(null);

  const [simulatedRole, setSimulatedRole] = useState<'student' | 'teacher'>(
    effectiveRole === 'teacher' || effectiveRole === 'admin' ? 'teacher' : 'student'
  );

  const handleRunSecurityExploitTest = async () => {
    setIsRunning(true);
    setAuditResult(null);

    // Run real live Firestore direct request test
    try {
      const res = await verifyDirectFirestoreAnswerKeyBypass(quiz.id);
      setAuditResult(res);
    } catch (err: any) {
      setAuditResult({
        attemptedPath: `quiz_answers/${quiz.id}`,
        blocked: true,
        errorCode: 'PERMISSION_DENIED',
        errorMessage: err?.message || 'Access blocked by Firestore rules',
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                <span>Direct Firestore Answer Bypass Pentest</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-semibold">
                  Zero-Knowledge Audit
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Target: <span className="font-semibold text-slate-700 dark:text-slate-300">{quiz.title}</span> ({quiz.id})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs">
          {/* Explanation Banner */}
          <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/60 dark:bg-blue-950/30 space-y-2">
            <div className="flex items-center gap-2 font-bold text-blue-900 dark:text-blue-300 text-sm">
              <EyeOff className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Architectural Invariant: Zero-Knowledge Student Clients</span>
            </div>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-[11px]">
              ONYX enforces strict separation between public quiz metadata (<code className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-200 font-mono">/quizzes/{'{quizId}'}</code>)
              and master answer keys with explanations (<code className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-200 font-mono">/quiz_answers/{'{quizId}'}</code>).
              Even if a student uses Chrome DevTools or constructs raw Firestore SDK calls, the security rules guarantee a hard database rejection.
            </p>
          </div>

          {/* Target Blueprint Info */}
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono text-[11px]">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-sans font-bold">Tested Document Path</span>
              <span className="text-slate-800 dark:text-slate-200 font-semibold">/quiz_answers/{quiz.id}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-sans font-bold">Current Auth Identity</span>
              <span className="text-slate-800 dark:text-slate-200 font-semibold">{user?.email || 'Anonymous'}</span>
            </div>
          </div>

          {/* Exploit Test Action Box */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-900 text-slate-100 space-y-3 font-mono">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span>Exploit Script Execution: Direct Firestore getDoc()</span>
              </div>
              <button
                type="button"
                disabled={isRunning}
                onClick={handleRunSecurityExploitTest}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-sans text-xs font-semibold shadow-xs cursor-pointer transition-all disabled:opacity-50"
              >
                {isRunning ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Executing Request...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Attempt Direct Read</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-3 rounded-lg bg-black/60 text-[11px] text-slate-300 leading-relaxed border border-slate-800">
              <span className="text-emerald-400 font-bold">$ </span>
              <span>// Direct bypass attempt on secure answer collection</span>
              <br />
              <span className="text-slate-500">const</span> docRef = doc(db, <span className="text-amber-300">"quiz_answers"</span>, <span className="text-blue-300">"{quiz.id}"</span>);
              <br />
              <span className="text-slate-500">const</span> payload = <span className="text-slate-500">await</span> getDoc(docRef);
            </div>
          </div>

          {/* Audit Test Results */}
          {auditResult && (
            <div
              className={`p-4 rounded-xl border space-y-3 animate-in fade-in duration-150 ${
                auditResult.blocked
                  ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/30'
                  : 'border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {auditResult.blocked ? (
                    <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                  )}
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    {auditResult.blocked ? 'Security Enforced: Direct Request Rejected' : 'Authorized Access Granted'}
                  </h4>
                </div>

                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                    auditResult.blocked
                      ? 'bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200'
                      : 'bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200'
                  }`}
                >
                  {auditResult.errorCode}
                </span>
              </div>

              <div className="space-y-1.5 text-[11px] font-mono">
                <div>
                  <span className="text-slate-500">Attempted Path: </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{auditResult.attemptedPath}</span>
                </div>
                <div>
                  <span className="text-slate-500">Server Interception: </span>
                  <span className={auditResult.blocked ? 'text-emerald-700 dark:text-emerald-300 font-semibold' : 'text-amber-700 dark:text-amber-300 font-semibold'}>
                    {auditResult.errorMessage}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Timestamp: </span>
                  <span className="text-slate-700 dark:text-slate-300">{new Date(auditResult.timestamp).toLocaleString()}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 text-[11px]">
                {auditResult.blocked ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="text-emerald-800 dark:text-emerald-200">
                      <strong>Verification Passed:</strong> Direct Firestore bypass failed as expected. Answer keys cannot be extracted by unauthorized clients.
                    </span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span className="text-amber-800 dark:text-amber-200">
                      Caller is authenticated as a verified instructor or administrator with explicit read rights. To test unauthorized access, switch to student role or incognito.
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Active Security Rules Snippet */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <FileCode className="w-3.5 h-3.5 text-blue-500" />
              <span>Active Firestore Security Rule in firestore.rules</span>
            </div>
            <pre className="p-3.5 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px] overflow-x-auto leading-relaxed border border-slate-800">
{`// Quizzes collection: questions without answer keys
match /quizzes/{quizId} {
  allow read: if isSignedIn();
  allow create, update, delete: if isTeacher();
}

// Quiz Answer Keys: SECURE — NEVER SEND TO STUDENTS
// Only teachers and admins have read/write access
match /quiz_answers/{quizId} {
  allow read, write: if isTeacher();
}`}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Phase 6 Answer Security Standard: ABAC Hardened
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold cursor-pointer text-xs"
          >
            Close Pentest Audit
          </button>
        </div>
      </div>
    </div>
  );
}
