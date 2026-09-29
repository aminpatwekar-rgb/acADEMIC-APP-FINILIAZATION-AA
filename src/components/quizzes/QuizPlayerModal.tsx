import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  FirestoreQuiz,
  FirestoreQuizAttempt,
  QuizQuestion,
  QuizViolation,
  createQuizAttempt,
  updateQuizAttempt,
  awardPoints,
  notifyTeacher
} from '../../lib/firebase/firestoreService';
import confetti from 'canvas-confetti';
import {
  Timer,
  Shield,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Flag,
  ChevronLeft,
  ChevronRight,
  Send,
  X,
  Lock,
  RotateCcw,
  Award,
  Eye,
  Calendar,
  Clock,
  Check
} from 'lucide-react';

interface QuizPlayerModalProps {
  quiz: FirestoreQuiz;
  existingAttempt?: FirestoreQuizAttempt | null;
  attemptNumber: number;
  onClose: () => void;
  onSubmitted: (attemptId: string) => void;
}

export function QuizPlayerModal({
  quiz,
  existingAttempt,
  attemptNumber,
  onClose,
  onSubmitted
}: QuizPlayerModalProps) {
  const { user, profile } = useAuth();

  // Active Attempt State
  const [attemptId, setAttemptId] = useState<string | null>(existingAttempt?.id || null);
  const [attemptStatus, setAttemptStatus] = useState<
    'in_progress' | 'submitted' | 'timed_out' | 'locked'
  >(existingAttempt?.status || 'in_progress');

  // Shuffled and persisted questions
  const [questions, setQuestions] = useState<QuizQuestion[]>(() => {
    if (existingAttempt?.shuffledQuestions && existingAttempt.shuffledQuestions.length > 0) {
      return existingAttempt.shuffledQuestions;
    }
    // Perform initial shuffle if requested
    let qs = quiz.questions ? [...quiz.questions] : [];
    if (quiz.shuffleQuestions) {
      qs.sort(() => Math.random() - 0.5);
    }
    if (quiz.shuffleOptions) {
      qs = qs.map(q => {
        if (q.options && q.options.length > 0) {
          const shuffledOpts = [...q.options].sort(() => Math.random() - 0.5);
          return { ...q, options: shuffledOpts };
        }
        return q;
      });
    }
    return qs;
  });

  // Current Navigation State
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>(existingAttempt?.answers || {});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<string, boolean>>({});

  // Timer State
  const [timeRemaining, setTimeRemaining] = useState<number>(() => {
    if (existingAttempt?.timeRemainingSeconds !== undefined && existingAttempt.timeRemainingSeconds > 0) {
      return existingAttempt.timeRemainingSeconds;
    }
    return (quiz.durationMinutes || 20) * 60;
  });

  // Lockdown & Violations State
  const [violations, setViolations] = useState<QuizViolation[]>(existingAttempt?.violations || []);
  const [latestWarning, setLatestWarning] = useState<string | null>(null);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSummary, setSubmissionSummary] = useState<{
    score?: number;
    maxScore: number;
    status: string;
    answeredCount: number;
  } | null>(null);

  const lockdownConfig = quiz.lockdownConfig || {
    enabled: quiz.type === 'exam',
    maxViolations: 3,
    autoSubmitOnLock: true,
    blockCopyPaste: true,
    blockRightClick: true,
    trackVisibility: true
  };

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Initialize or Load Attempt Document in Firestore
  useEffect(() => {
    const initAttempt = async () => {
      if (existingAttempt?.id) {
        setAttemptId(existingAttempt.id);
        return;
      }

      if (!user) return;

      try {
        const newId = await createQuizAttempt({
          quizId: quiz.id,
          quizTitle: quiz.title,
          quizType: quiz.type,
          classId: quiz.classId,
          studentId: user.uid,
          studentName: profile?.displayName || user.displayName || 'Student',
          studentEmail: user.email || '',
          attemptNumber,
          startTime: new Date().toISOString(),
          status: 'in_progress',
          timeRemainingSeconds: (quiz.durationMinutes || 20) * 60,
          shuffledQuestions: questions, // Persist exact shuffled sequence!
          answers: {},
          violations: [],
          violationsCount: 0,
          isLocked: false
        });
        setAttemptId(newId);
      } catch (err) {
        console.error('Failed to create attempt doc in Firestore:', err);
      }
    };

    initAttempt();
  }, []);

  // 2. Countdown Timer
  useEffect(() => {
    if (attemptStatus !== 'in_progress') return;

    countdownIntervalRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current as NodeJS.Timeout);
          handleTimeExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [attemptStatus]);

  // Periodic Auto-Save to Firestore every 8 seconds
  useEffect(() => {
    if (!attemptId || attemptStatus !== 'in_progress') return;

    autoSaveTimerRef.current = setInterval(() => {
      updateQuizAttempt(attemptId, {
        answers,
        timeRemainingSeconds: timeRemaining,
        violations,
        violationsCount: violations.length
      }).catch(console.error);
    }, 8000);

    return () => {
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
    };
  }, [attemptId, answers, timeRemaining, violations, attemptStatus]);

  // 3. Proctored Lockdown Listeners: Tab Switch, Visibility, Copy, Paste, Right Click
  useEffect(() => {
    if (!lockdownConfig.enabled || attemptStatus !== 'in_progress') return;

    const recordViolationEvent = (type: QuizViolation['type'], message: string) => {
      const newV: QuizViolation = {
        id: `v-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        type,
        message,
        timestamp: new Date().toISOString()
      };

      setViolations(prev => {
        const next = [...prev, newV];
        setLatestWarning(`Security Violation #${next.length}: ${message}`);

        // Check if exceeded threshold
        if (next.length >= lockdownConfig.maxViolations) {
          handleLockdownBreached(next);
        } else if (attemptId) {
          updateQuizAttempt(attemptId, {
            violations: next,
            violationsCount: next.length
          }).catch(console.error);
        }
        return next;
      });

      // Clear toast after 4 seconds
      setTimeout(() => setLatestWarning(null), 4500);
    };

    const handleVisibilityChange = () => {
      if (document.hidden && lockdownConfig.trackVisibility) {
        recordViolationEvent('visibilitychange' as any, 'Navigated away from assessment or minimized window.');
      }
    };

    const handleWindowBlur = () => {
      if (lockdownConfig.trackVisibility) {
        recordViolationEvent('blur', 'Focus lost: Switched application or browser tab.');
      }
    };

    const handleCopy = (e: ClipboardEvent) => {
      if (lockdownConfig.blockCopyPaste) {
        e.preventDefault();
        recordViolationEvent('copy_attempt', 'Attempted to copy assessment material to clipboard.');
      }
    };

    const handlePaste = (e: ClipboardEvent) => {
      if (lockdownConfig.blockCopyPaste) {
        e.preventDefault();
        recordViolationEvent('paste_attempt', 'Attempted to paste external clipboard content.');
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      if (lockdownConfig.blockRightClick) {
        e.preventDefault();
        recordViolationEvent('context_menu', 'Right-click context menu interaction blocked.');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [lockdownConfig, attemptStatus, attemptId]);

  // Auto-lock when violation threshold exceeded
  const handleLockdownBreached = async (finalViolations: QuizViolation[]) => {
    setAttemptStatus('locked');
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    if (attemptId) {
      await updateQuizAttempt(attemptId, {
        status: 'locked',
        isLocked: true,
        submissionTime: new Date().toISOString(),
        violations: finalViolations,
        violationsCount: finalViolations.length,
        answers
      }).catch(console.error);
    }
  };

  // Timer auto-submit
  const handleTimeExpired = async () => {
    setAttemptStatus('timed_out');
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    if (attemptId) {
      await updateQuizAttempt(attemptId, {
        status: 'timed_out',
        submissionTime: new Date().toISOString(),
        answers,
        timeRemainingSeconds: 0
      }).catch(console.error);
    }

    const answeredCount = Object.keys(answers).length;
    setSubmissionSummary({
      maxScore: quiz.points,
      status: 'Timed Out',
      answeredCount
    });
  };

  // Normal Student Final Submission
  const handleFinalSubmit = async () => {
    if (!attemptId) return;
    setIsSubmitting(true);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    try {
      await updateQuizAttempt(attemptId, {
        status: 'submitted',
        submissionTime: new Date().toISOString(),
        answers,
        timeRemainingSeconds: timeRemaining,
        violations,
        violationsCount: violations.length
      });

      setAttemptStatus('submitted');
      setShowConfirmSubmit(false);
      const answeredCount = Object.keys(answers).length;

      // 1. Award points in Point Ledger
      if (user?.uid) {
        awardPoints({
          userId: user.uid,
          userName: profile?.displayName || 'Scholar',
          classId: quiz.classId,
          className: quiz.className,
          points: 50,
          reason: `Completed assessment: ${quiz.title}`,
          category: 'quiz'
        }).catch(console.error);
      }

      // 2. Notify course instructor
      if (quiz.instructorId || quiz.createdBy) {
        notifyTeacher({
          teacherId: (quiz.instructorId || quiz.createdBy)!,
          classId: quiz.classId,
          className: quiz.className,
          type: 'submission',
          title: `Quiz Submitted: ${quiz.title}`,
          message: `${profile?.displayName || 'Student'} completed quiz "${quiz.title}".`,
          link: '/quizzes'
        }).catch(console.error);
      }

      setSubmissionSummary({
        maxScore: quiz.points,
        status: 'Submitted Successfully',
        answeredCount
      });

      try {
        confetti({
          particleCount: 80,
          spread: 75,
          origin: { y: 0.6 }
        });
      } catch (_e) {}

      onSubmitted(attemptId);
    } catch (err) {
      console.error('Submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Answer modification helpers
  const handleSelectOption = (questionId: string, optIdx: number) => {
    if (attemptStatus !== 'in_progress') return;
    setAnswers(prev => ({
      ...prev,
      [questionId]: optIdx
    }));
  };

  const handleToggleMultiSelect = (questionId: string, optIdx: number) => {
    if (attemptStatus !== 'in_progress') return;
    const currentList: number[] = answers[questionId] || [];
    const nextList = currentList.includes(optIdx)
      ? currentList.filter(i => i !== optIdx)
      : [...currentList, optIdx];
    setAnswers(prev => ({
      ...prev,
      [questionId]: nextList
    }));
  };

  const handleTextChange = (questionId: string, text: string) => {
    if (attemptStatus !== 'in_progress') return;
    setAnswers(prev => ({
      ...prev,
      [questionId]: text
    }));
  };

  const formatCountdown = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const currentQ = questions[currentIdx];
  const isAnswered = (qId: string) => {
    const ans = answers[qId];
    if (ans === undefined || ans === null) return false;
    if (typeof ans === 'string') return ans.trim().length > 0;
    if (Array.isArray(ans)) return ans.length > 0;
    return true;
  };

  const answeredTotal = questions.filter(q => isAnswered(q.id)).length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="quiz-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-xs select-none animate-in fade-in duration-150"
    >
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[96vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Warning Toast */}
        {latestWarning && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-semibold shadow-2xl animate-in slide-in-from-top-3 duration-200">
            <AlertTriangle className="w-4 h-4 shrink-0 animate-bounce" />
            <span>{latestWarning}</span>
          </div>
        )}

        {/* Top Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
              {quiz.classCode || 'OX'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="quiz-modal-title" className="font-bold text-sm sm:text-base text-slate-900 dark:text-white line-clamp-1">
                  {quiz.title}
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                  Attempt #{attemptNumber}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Question {currentIdx + 1} of {questions.length} • {answeredTotal} Answered
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Countdown Display */}
            {attemptStatus === 'in_progress' && (
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs font-bold ${
                  timeRemaining < 60
                    ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 animate-pulse border border-rose-300 dark:border-rose-800'
                    : timeRemaining < 300
                    ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <Timer className="w-3.5 h-3.5" />
                <span>{formatCountdown(timeRemaining)}</span>
              </div>
            )}

            {/* Violation Sentinel Counter */}
            {lockdownConfig.enabled && attemptStatus === 'in_progress' && (
              <div
                title={`${violations.length} of ${lockdownConfig.maxViolations} violations recorded`}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold ${
                  violations.length > 0
                    ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-mono font-bold'
                    : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>
                  {violations.length}/{lockdownConfig.maxViolations}
                </span>
              </div>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close assessment player"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* LOCKED SCREEN STATE */}
        {attemptStatus === 'locked' && (
          <div className="flex-1 p-8 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Lock className="w-8 h-8" />
            </div>
            <div className="space-y-1 max-w-md">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Assessment Locked by Anti-Cheat Sentinel
              </h2>
              <p className="text-xs text-slate-500">
                You have exceeded the maximum allowed security violations ({lockdownConfig.maxViolations}/{lockdownConfig.maxViolations}). Your exam session has been automatically locked and submitted.
              </p>
            </div>

            {/* Violations Log */}
            <div className="w-full max-w-md bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-left space-y-2">
              <span className="font-bold text-[11px] text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                Recorded Violations Log:
              </span>
              {violations.map((v, i) => (
                <div key={v.id || i} className="text-[11px] text-rose-600 dark:text-rose-400 flex items-start gap-1.5">
                  <span className="font-mono font-bold">•</span>
                  <span>{v.message}</span>
                  <span className="text-slate-400 text-[10px] ml-auto font-mono">
                    {new Date(v.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold cursor-pointer"
            >
              Exit to Dashboard
            </button>
          </div>
        )}

        {/* SUBMITTED / TIMED OUT SCREEN */}
        {(attemptStatus === 'submitted' || attemptStatus === 'timed_out') && (
          <div className="flex-1 p-8 flex flex-col items-center justify-center text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {attemptStatus === 'timed_out' ? 'Time Expired — Exam Submitted' : 'Assessment Submitted!'}
              </h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Your responses have been securely recorded into Firestore.
                Answer keys remain locked on the server and will be reviewed by your course instructors.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 w-full max-w-md">
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Questions</span>
                <div className="text-lg font-mono font-bold text-slate-800 dark:text-slate-200 mt-1">
                  {questions.length}
                </div>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                <span className="text-[10px] uppercase font-bold text-slate-400">Answered</span>
                <div className="text-lg font-mono font-bold text-blue-600 dark:text-blue-400 mt-1">
                  {submissionSummary?.answeredCount ?? answeredTotal}
                </div>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                <span className="text-[10px] uppercase font-bold text-slate-400">Max Points</span>
                <div className="text-lg font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  {quiz.points}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded-xl bg-[#005fb8] hover:bg-[#004e9a] text-white text-xs font-semibold cursor-pointer shadow-xs"
            >
              Return to Quizzes
            </button>
          </div>
        )}

        {/* IN-PROGRESS EXAM BODY */}
        {attemptStatus === 'in_progress' && (
          <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
            {/* Left Question Area */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
              {currentQ ? (
                <>
                  {/* Question Header Badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#005fb8] dark:text-blue-400 uppercase tracking-wider">
                        Question {currentIdx + 1} of {questions.length}
                      </span>
                      <span className="px-2 py-0.5 rounded-md font-mono text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                        {currentQ.points} Points
                      </span>
                      <span className="px-2 py-0.5 rounded-md font-mono text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase">
                        {currentQ.type.replace('_', ' ')}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setFlaggedQuestions(prev => ({ ...prev, [currentQ.id]: !prev[currentQ.id] }))}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                        flaggedQuestions[currentQ.id]
                          ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      <Flag className="w-3.5 h-3.5 fill-current" />
                      <span>{flaggedQuestions[currentQ.id] ? 'Flagged' : 'Flag'}</span>
                    </button>
                  </div>

                  {/* Statement */}
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed">
                    {currentQ.question}
                  </h2>

                  {/* RENDERER ACCORDING TO QUESTION TYPE */}

                  {/* 1. MCQ (Single-Select) */}
                  {currentQ.type === 'mcq' && (
                    <div className="space-y-2.5 pt-2">
                      {(currentQ.options || []).map((opt, optIdx) => {
                        const isSelected = answers[currentQ.id] === optIdx;
                        return (
                          <button
                            key={optIdx}
                            type="button"
                            onClick={() => handleSelectOption(currentQ.id, optIdx)}
                            className={`w-full text-left p-3.5 sm:p-4 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                              isSelected
                                ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 shadow-xs'
                                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center font-mono ${
                                  isSelected
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                }`}
                              >
                                {String.fromCharCode(65 + optIdx)}
                              </span>
                              <span className="text-xs sm:text-sm font-medium">{opt}</span>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* 2. MULTI-SELECT (Multiple Checkboxes) */}
                  {currentQ.type === 'multi_select' && (
                    <div className="space-y-2.5 pt-2">
                      <p className="text-[11px] text-slate-500 italic">Select all options that apply:</p>
                      {(currentQ.options || []).map((opt, optIdx) => {
                        const selectedList: number[] = answers[currentQ.id] || [];
                        const isSelected = selectedList.includes(optIdx);
                        return (
                          <button
                            key={optIdx}
                            type="button"
                            onClick={() => handleToggleMultiSelect(currentQ.id, optIdx)}
                            className={`w-full text-left p-3.5 sm:p-4 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                              isSelected
                                ? 'border-purple-600 bg-purple-50/60 dark:bg-purple-950/40 text-purple-950 dark:text-purple-100 shadow-xs'
                                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                                  isSelected
                                    ? 'bg-purple-600 border-purple-600 text-white'
                                    : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'
                                }`}
                              >
                                {isSelected && <Check className="w-3.5 h-3.5" />}
                              </div>
                              <span className="text-xs sm:text-sm font-medium">{opt}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* 3. TRUE / FALSE */}
                  {currentQ.type === 'true_false' && (
                    <div className="grid grid-cols-2 gap-3 pt-3">
                      <button
                        type="button"
                        onClick={() => handleSelectOption(currentQ.id, 1)}
                        className={`p-4 rounded-xl border text-center transition-all cursor-pointer font-bold ${
                          answers[currentQ.id] === 1
                            ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 shadow-xs'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span className="text-base block">True</span>
                        <span className="text-[11px] font-normal text-slate-500">Statement is factually true</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectOption(currentQ.id, 0)}
                        className={`p-4 rounded-xl border text-center transition-all cursor-pointer font-bold ${
                          answers[currentQ.id] === 0
                            ? 'border-rose-600 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 shadow-xs'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span className="text-base block">False</span>
                        <span className="text-[11px] font-normal text-slate-500">Statement is factually false</span>
                      </button>
                    </div>
                  )}

                  {/* 4. FILL IN THE BLANK */}
                  {currentQ.type === 'fill_blank' && (
                    <div className="pt-2 space-y-2">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Type the exact term for the blank:
                      </label>
                      <input
                        type="text"
                        value={answers[currentQ.id] || ''}
                        onChange={e => handleTextChange(currentQ.id, e.target.value)}
                        placeholder="Type answer here..."
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-sm font-medium"
                      />
                    </div>
                  )}

                  {/* 5. SHORT ANSWER */}
                  {currentQ.type === 'short_answer' && (
                    <div className="pt-2 space-y-2">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Provide a concise short response (1-2 sentences):
                      </label>
                      <input
                        type="text"
                        value={answers[currentQ.id] || ''}
                        onChange={e => handleTextChange(currentQ.id, e.target.value)}
                        placeholder="Type your concise response..."
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-sm"
                      />
                    </div>
                  )}

                  {/* 6. ESSAY */}
                  {currentQ.type === 'essay' && (
                    <div className="pt-2 space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Type comprehensive long-form response:</span>
                        <span className="font-mono">
                          Word Count: {((answers[currentQ.id] || '').trim().split(/\s+/).filter(Boolean)).length}
                        </span>
                      </div>
                      <textarea
                        rows={7}
                        value={answers[currentQ.id] || ''}
                        onChange={e => handleTextChange(currentQ.id, e.target.value)}
                        placeholder="Compose essay, outlining arguments, proofs, citations, and conclusions..."
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs leading-relaxed"
                      />
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-slate-500">No questions available.</div>
              )}
            </div>

            {/* Right Question Palette / Navigation */}
            <div className="w-full md:w-64 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-950/50 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">
                  Question Palette
                </span>

                <div className="grid grid-cols-5 gap-1.5">
                  {questions.map((q, idx) => {
                    const answered = isAnswered(q.id);
                    const isFlagged = flaggedQuestions[q.id];
                    const isCurrent = idx === currentIdx;

                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => setCurrentIdx(idx)}
                        aria-label={`Question ${idx + 1}${answered ? ', answered' : ', unanswered'}${isFlagged ? ', flagged for review' : ''}`}
                        className={`h-8 rounded-lg font-mono text-xs font-bold transition-all relative flex items-center justify-center cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
                          isCurrent
                            ? 'ring-2 ring-blue-600 bg-blue-600 text-white shadow-xs'
                            : answered
                            ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-slate-400'
                        }`}
                      >
                        {idx + 1}
                        {isFlagged && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 absolute top-1 right-1" aria-hidden="true" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="space-y-1.5 pt-3 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-500">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-emerald-500" />
                    <span>Answered ({answeredTotal})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900" />
                    <span>Unanswered ({questions.length - answeredTotal})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-amber-500" />
                    <span>Flagged for Review</span>
                  </div>
                </div>
              </div>

              {/* Action: Finish & Submit */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowConfirmSubmit(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-xs cursor-pointer transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Assessment</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Navigation Buttons */}
        {attemptStatus === 'in_progress' && (
          <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
            <button
              type="button"
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
              className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <div className="flex items-center gap-2">
              {currentIdx < questions.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentIdx(prev => prev + 1)}
                  className="flex items-center gap-1 px-4 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowConfirmSubmit(true)}
                  className="flex items-center gap-1 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Review & Submit</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
        {showConfirmSubmit && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-100">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Submit Final Assessment?
                  </h3>
                  <p className="text-xs text-slate-500">
                    You have answered {answeredTotal} of {questions.length} questions.
                  </p>
                </div>
              </div>

              {answeredTotal < questions.length && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-xs">
                  ⚠️ You still have <strong>{questions.length - answeredTotal} unanswered questions</strong>. Once submitted, you cannot change your answers for this attempt.
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowConfirmSubmit(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-xs font-semibold cursor-pointer"
                >
                  Return to Questions
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleFinalSubmit}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Submitting...' : 'Confirm Submission'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
