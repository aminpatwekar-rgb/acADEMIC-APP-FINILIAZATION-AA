import React, { useState, useMemo } from 'react';
import {
  FirestoreQuiz,
  FirestoreQuizAttempt,
  QuizQuestion,
  QuizQuestionAnswerKey
} from '../../lib/firebase/firestoreService';
import {
  BarChart3,
  TrendingUp,
  Users,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertTriangle,
  Award,
  ChevronDown,
  ChevronUp,
  Search,
  Eye,
  Percent,
  Clock
} from 'lucide-react';

interface QuizAnalyticsPanelProps {
  quiz: FirestoreQuiz;
  attempts: FirestoreQuizAttempt[];
  answerKeys?: QuizQuestionAnswerKey[];
  onInspectAttempt?: (attempt: FirestoreQuizAttempt) => void;
}

export function QuizAnalyticsPanel({
  quiz,
  attempts,
  answerKeys = [],
  onInspectAttempt
}: QuizAnalyticsPanelProps) {
  const [selectedQuestionIdx, setSelectedQuestionIdx] = useState<number | null>(null);
  const [studentSearch, setStudentSearch] = useState('');

  // 1. Core Summary Metrics
  const summary = useMemo(() => {
    const totalAttempts = attempts.length;
    const uniqueStudents = new Set(attempts.map(a => a.studentId)).size;
    const completedAttempts = attempts.filter(a => a.status === 'submitted');
    const completionRate =
      totalAttempts > 0 ? Math.round((completedAttempts.length / totalAttempts) * 100) : 0;

    const scores = completedAttempts.map(a =>
      a.percentage !== undefined
        ? a.percentage
        : Math.round(((a.score || 0) / (a.maxScore || quiz.points || 1)) * 100)
    );

    const avgScore =
      scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;

    return {
      totalAttempts,
      uniqueStudents,
      completedAttempts: completedAttempts.length,
      completionRate,
      avgScore,
      highestScore,
      lowestScore
    };
  }, [attempts, quiz.points]);

  // 2. Per-Question Detailed Analytics (Difficulty, Correct/Incorrect, Unanswered, Option stats)
  const questionAnalytics = useMemo(() => {
    return (quiz.questions || []).map((q, qIdx) => {
      let totalResponses = 0;
      let correctResponses = 0;
      let incorrectResponses = 0;
      let unansweredResponses = 0;
      const optionCounts: Record<number, number> = {};

      const matchedKey = answerKeys.find(k => k.questionId === q.id);
      const expectedIndex = matchedKey?.correctIndex ?? q.correctIndex;

      attempts.forEach(att => {
        const studentAns = (att.answers as any)?.[q.id];
        if (!studentAns) {
          unansweredResponses++;
          return;
        }

        totalResponses++;

        if (q.type === 'mcq' || q.type === 'true_false') {
          const pickedIdx = studentAns.selectedOptionIndex;
          if (pickedIdx === undefined || pickedIdx === null) {
            unansweredResponses++;
          } else {
            optionCounts[pickedIdx] = (optionCounts[pickedIdx] || 0) + 1;
            if (expectedIndex !== undefined && pickedIdx === expectedIndex) {
              correctResponses++;
            } else {
              incorrectResponses++;
            }
          }
        } else if (q.type === 'multi_select') {
          const picked = studentAns.selectedOptionIndices || [];
          if (picked.length === 0) {
            unansweredResponses++;
          } else {
            picked.forEach((pIdx: number) => {
              optionCounts[pIdx] = (optionCounts[pIdx] || 0) + 1;
            });
            const expected = matchedKey?.correctIndices ?? q.correctIndices ?? [];
            const isMatch =
              picked.length === expected.length &&
              picked.every((v: number) => expected.includes(v));
            if (isMatch) correctResponses++;
            else incorrectResponses++;
          }
        } else {
          // Fill blank or short answer
          const text = (studentAns.textAnswer || '').trim();
          if (!text) {
            unansweredResponses++;
          } else {
            const accepted = matchedKey?.acceptedAnswers ?? q.acceptedAnswers ?? [];
            const isMatch = accepted.some(
              a => a.toLowerCase().trim() === text.toLowerCase().trim()
            );
            if (isMatch) correctResponses++;
            else incorrectResponses++;
          }
        }
      });

      const attemptsTotal = attempts.length || 1;
      const accuracyRate =
        totalResponses > 0 ? Math.round((correctResponses / totalResponses) * 100) : 0;

      let difficultyRating = 'Challenging';
      if (accuracyRate >= 75) difficultyRating = 'Easy';
      else if (accuracyRate >= 45) difficultyRating = 'Moderate';

      return {
        questionId: q.id,
        index: qIdx + 1,
        question: q.question,
        type: q.type,
        options: q.options,
        expectedIndex,
        totalResponses,
        correctResponses,
        incorrectResponses,
        unansweredResponses,
        accuracyRate,
        difficultyRating,
        optionCounts
      };
    });
  }, [quiz.questions, attempts, answerKeys]);

  // Filter students for performance list
  const filteredAttempts = attempts.filter(att => {
    if (!studentSearch.trim()) return true;
    const name = (att.studentName || '').toLowerCase();
    const id = (att.studentId || '').toLowerCase();
    const q = studentSearch.toLowerCase();
    return name.includes(q) || id.includes(q);
  });

  return (
    <div className="space-y-6">
      {/* 1. TOP STATS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            AVERAGE SCORE
          </span>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 dark:text-white flex items-baseline gap-1">
            <span>{summary.avgScore}%</span>
            <span className="text-xs text-slate-400 font-normal">
              (High: {summary.highestScore}%)
            </span>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            COMPLETION RATE
          </span>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 dark:text-white flex items-baseline gap-1">
            <span>{summary.completionRate}%</span>
            <span className="text-xs text-slate-400 font-normal">
              ({summary.completedAttempts}/{summary.totalAttempts})
            </span>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            STUDENTS ATTEMPTED
          </span>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 dark:text-white">
            {summary.uniqueStudents}
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            TOTAL ATTEMPTS
          </span>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 dark:text-white">
            {summary.totalAttempts}
          </div>
        </div>
      </div>

      {/* 2. ITEM DIFFICULTY & BREAKDOWN TABLE */}
      <div className="p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-4">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
            Question Performance & Difficulty Analysis
          </h3>
          <p className="text-xs text-slate-500">
            Per-question pass rates, unanswered ratios, and distribution of student choices.
          </p>
        </div>

        {questionAnalytics.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No questions defined in this assessment.</p>
        ) : (
          <div className="space-y-3">
            {questionAnalytics.map((qa, idx) => {
              const isExpanded = selectedQuestionIdx === idx;

              return (
                <div
                  key={qa.questionId}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 p-4 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-mono text-xs font-bold flex items-center justify-center">
                        {qa.index}
                      </span>
                      <span className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-1 max-w-md">
                        {qa.question}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          qa.difficultyRating === 'Easy'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : qa.difficultyRating === 'Moderate'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        {qa.difficultyRating} ({qa.accuracyRate}%)
                      </span>

                      <button
                        type="button"
                        onClick={() => setSelectedQuestionIdx(isExpanded ? null : idx)}
                        className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        <span>{isExpanded ? 'Hide Stats' : 'Option Stats'}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Summary Bar for Correct, Incorrect, Unanswered */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                          <CheckCircle2 className="w-3 h-3" /> {qa.correctResponses} Correct
                        </span>
                        <span className="flex items-center gap-1 text-rose-600 font-semibold">
                          <XCircle className="w-3 h-3" /> {qa.incorrectResponses} Incorrect
                        </span>
                        <span className="flex items-center gap-1 text-slate-400">
                          <HelpCircle className="w-3 h-3" /> {qa.unansweredResponses} Unanswered
                        </span>
                      </div>
                      <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                        {qa.accuracyRate}% Success
                      </span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex">
                      <div
                        style={{
                          width: `${qa.totalResponses > 0 ? (qa.correctResponses / (qa.totalResponses + qa.unansweredResponses)) * 100 : 0}%`
                        }}
                        className="bg-emerald-500 h-full"
                      />
                      <div
                        style={{
                          width: `${qa.totalResponses > 0 ? (qa.incorrectResponses / (qa.totalResponses + qa.unansweredResponses)) * 100 : 0}%`
                        }}
                        className="bg-rose-500 h-full"
                      />
                      <div
                        style={{
                          width: `${(qa.unansweredResponses / Math.max(1, qa.totalResponses + qa.unansweredResponses)) * 100}%`
                        }}
                        className="bg-slate-400 dark:bg-slate-600 h-full"
                      />
                    </div>
                  </div>

                  {/* EXPANDED OPTION STATISTICS */}
                  {isExpanded && qa.options && qa.options.length > 0 && (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2 animate-in fade-in duration-150">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        Choice Frequency Breakdown
                      </span>
                      <div className="space-y-1.5">
                        {qa.options.map((opt, optIdx) => {
                          const count = qa.optionCounts[optIdx] || 0;
                          const percent =
                            qa.totalResponses > 0 ? Math.round((count / qa.totalResponses) * 100) : 0;
                          const isCorrect = qa.expectedIndex === optIdx;

                          return (
                            <div
                              key={optIdx}
                              className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                                isCorrect
                                  ? 'border-emerald-500/60 bg-emerald-50/40 dark:bg-emerald-950/30'
                                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                    isCorrect
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
                                  }`}
                                >
                                  {String.fromCharCode(65 + optIdx)}
                                </span>
                                <span className={isCorrect ? 'font-semibold text-emerald-900 dark:text-emerald-200' : 'text-slate-700 dark:text-slate-300'}>
                                  {opt}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 font-mono">
                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                  {count} ({percent}%)
                                </span>
                                {isCorrect && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-600 text-white">
                                    CORRECT
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. STUDENT PERFORMANCE LIST */}
      <div className="p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Student Performance Records
            </h3>
            <p className="text-xs text-slate-500">
              Individual submission scores, duration, timestamps, and proctored violation records.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={studentSearch}
              onChange={e => setStudentSearch(e.target.value)}
              placeholder="Search student name..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {filteredAttempts.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No student attempt records found matching criteria.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredAttempts.map(att => {
              const scorePct =
                att.percentage !== undefined
                  ? att.percentage
                  : Math.round(((att.score || 0) / (att.maxScore || quiz.points || 1)) * 100);

              return (
                <div
                  key={att.id}
                  className="py-3 sm:py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 px-2 rounded-xl transition-colors"
                >
                  <div className="space-y-0.5">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      {att.studentName || 'Student'}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Attempt #{att.attemptNumber} · {new Date(att.startTime).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                        scorePct >= (quiz.passingPercentage || 60)
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      {att.score ?? 0}/{att.maxScore ?? quiz.points} ({scorePct}%)
                    </span>

                    {onInspectAttempt && (
                      <button
                        type="button"
                        onClick={() => onInspectAttempt(att)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Review</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
