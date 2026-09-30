import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  FirestoreQuiz,
  FirestoreQuizAttempt,
  FirestoreQuizAnswerKey,
  getQuizAnswerKey,
  gradeQuizAttempt
} from '../../lib/firebase/firestoreService';
import {
  X,
  Award,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Shield,
  User,
  Check,
  Save,
  MessageSquare,
  FileText
} from 'lucide-react';

interface QuizGradingModalProps {
  quiz: FirestoreQuiz;
  attempt: FirestoreQuizAttempt;
  onClose: () => void;
  onGraded: () => void;
}

export function QuizGradingModal({
  quiz,
  attempt,
  onClose,
  onGraded
}: QuizGradingModalProps) {
  const { user } = useAuth();
  const [answerKeyDoc, setAnswerKeyDoc] = useState<FirestoreQuizAnswerKey | null>(null);
  const [loadingKeys, setLoadingKeys] = useState(true);

  // Manual question grading state: [questionId] -> points
  const [questionScores, setQuestionScores] = useState<Record<string, number>>({});
  const [questionFeedback, setQuestionFeedback] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Load instructor answer keys
  useEffect(() => {
    getQuizAnswerKey(quiz.id)
      .then(res => {
        setAnswerKeyDoc(res);
        // Pre-populate scores based on auto-grading if not already graded
        const initialScores: Record<string, number> = {};
        const questions = attempt.shuffledQuestions || quiz.questions || [];

        questions.forEach(q => {
          const studentAns = attempt.answers[q.id];
          const masterKey = res?.questions?.find(k => k.questionId === q.id);

          if (q.type === 'mcq' || q.type === 'true_false') {
            if (masterKey?.correctIndex !== undefined && studentAns === masterKey.correctIndex) {
              initialScores[q.id] = q.points;
            } else {
              initialScores[q.id] = 0;
            }
          } else if (q.type === 'multi_select') {
            const correctSet = new Set(masterKey?.correctIndices || []);
            const studentSet = new Set(Array.isArray(studentAns) ? studentAns : []);
            if (correctSet.size > 0 && correctSet.size === studentSet.size && [...correctSet].every(x => studentSet.has(x))) {
              initialScores[q.id] = q.points;
            } else {
              initialScores[q.id] = 0;
            }
          } else if (q.type === 'fill_blank' || q.type === 'short_answer') {
            const accepted = (masterKey?.acceptedAnswers || []).map(a => a.trim().toLowerCase());
            const studentStr = typeof studentAns === 'string' ? studentAns.trim().toLowerCase() : '';
            if (accepted.includes(studentStr)) {
              initialScores[q.id] = q.points;
            } else {
              initialScores[q.id] = 0;
            }
          } else {
            // Essay defaults to 0 until teacher manually evaluates
            initialScores[q.id] = attempt.feedback?.[q.id]?.pointsAwarded || 0;
          }
        });

        setQuestionScores(initialScores);
        setLoadingKeys(false);
      })
      .catch(err => {
        console.error('Failed to load instructor answer keys:', err);
        setLoadingKeys(false);
      });
  }, [quiz, attempt]);

  const questions = attempt.shuffledQuestions || quiz.questions || [];
  const currentTotalScore = Object.values(questionScores).reduce((a, b) => a + (Number(b) || 0), 0);
  const maxPossibleScore = quiz.points || questions.reduce((a, q) => a + q.points, 0);
  const scorePercentage = Math.round((currentTotalScore / (maxPossibleScore || 1)) * 100);

  const handleSaveGrading = async () => {
    setIsSaving(true);
    try {
      const feedbackMap: Record<string, { isCorrect?: boolean; pointsAwarded?: number; feedback?: string }> = {};

      questions.forEach(q => {
        feedbackMap[q.id] = {
          pointsAwarded: questionScores[q.id] || 0,
          isCorrect: (questionScores[q.id] || 0) === q.points,
          feedback: questionFeedback[q.id] || ''
        };
      });

      await gradeQuizAttempt(attempt.id, {
        score: currentTotalScore,
        maxScore: maxPossibleScore,
        percentage: scorePercentage,
        feedback: feedbackMap,
        reviewedBy: user?.displayName || user?.email || 'Instructor'
      });

      onGraded();
      onClose();
    } catch (err) {
      console.error('Error saving grading:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-3xl bg-card rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[94vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Grade Assessment Attempt #{attempt.attemptNumber}
              </h3>
              <p className="text-xs text-slate-500">
                Student: <span className="font-semibold text-slate-800 dark:text-slate-200">{attempt.studentName}</span> ({attempt.studentEmail})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Score</span>
              <span className="text-sm font-mono font-bold text-purple-600 dark:text-purple-400">
                {currentTotalScore} / {maxPossibleScore} ({scorePercentage}%)
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Attempt Metadata Banner */}
        <div className="px-6 py-3 bg-slate-100/60 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
          <div>
            <span className="text-slate-400 block">Started:</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {new Date(attempt.startTime).toLocaleTimeString()}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">Submitted:</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {attempt.submissionTime ? new Date(attempt.submissionTime).toLocaleTimeString() : 'In Progress'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">Status:</span>
            <span className="font-semibold text-slate-900 dark:text-white capitalize">
              {attempt.status.replace('_', ' ')}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">Lockdown Violations:</span>
            <span className={`font-semibold ${attempt.violationsCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {attempt.violationsCount || 0} recorded
            </span>
          </div>
        </div>

        {/* Violations Warning if Any */}
        {(attempt.violations || []).length > 0 && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <Shield className="w-4 h-4 text-rose-600" />
              <span>Anti-Cheat Log ({attempt.violations.length} events):</span>
            </div>
            {attempt.violations.map((v, idx) => (
              <div key={idx} className="text-[11px] text-rose-700 dark:text-rose-400 flex items-center justify-between">
                <span>• {v.message}</span>
                <span className="font-mono text-[10px]">{new Date(v.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        )}

        {/* Questions & Responses Grading List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {questions.map((q, idx) => {
            const studentAns = attempt.answers[q.id];
            const masterKey = answerKeyDoc?.questions?.find(k => k.questionId === q.id);
            const awardedPoints = questionScores[q.id] ?? 0;

            return (
              <div
                key={q.id}
                className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-card/60 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">
                      Question {idx + 1}
                    </span>
                    <span className="px-2 py-0.5 rounded-md font-mono text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase">
                      {q.type.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <label className="text-slate-500 font-medium">Points Awarded:</label>
                    <input
                      type="number"
                      min="0"
                      max={q.points}
                      value={awardedPoints}
                      onChange={e =>
                        setQuestionScores(prev => ({
                          ...prev,
                          [q.id]: Math.min(q.points, Math.max(0, parseInt(e.target.value, 10) || 0))
                        }))
                      }
                      className="w-14 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-center font-mono font-bold"
                    />
                    <span className="text-slate-400 font-mono">/ {q.points}</span>
                  </div>
                </div>

                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {q.question}
                </p>

                {/* Student's Given Answer */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Student's Response:
                  </span>
                  <div className="text-slate-900 dark:text-white font-medium">
                    {studentAns === undefined || studentAns === null ? (
                      <span className="text-slate-400 italic">No answer provided</span>
                    ) : q.type === 'mcq' ? (
                      <span>
                        {String.fromCharCode(65 + Number(studentAns))}.{' '}
                        {q.options?.[Number(studentAns)] || studentAns}
                      </span>
                    ) : q.type === 'multi_select' ? (
                      <span>
                        {(Array.isArray(studentAns) ? studentAns : [])
                          .map(i => `${String.fromCharCode(65 + i)} (${q.options?.[i]})`)
                          .join(', ')}
                      </span>
                    ) : q.type === 'true_false' ? (
                      <span>{studentAns === 1 ? 'True' : 'False'}</span>
                    ) : (
                      <p className="whitespace-pre-wrap">{String(studentAns)}</p>
                    )}
                  </div>
                </div>

                {/* Master Answer Key & Explanation */}
                {masterKey && (
                  <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 space-y-1 text-emerald-950 dark:text-emerald-200">
                    <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block">
                      Master Key & Solution:
                    </span>
                    <div className="text-[11px] font-medium">
                      {q.type === 'mcq' && masterKey.correctIndex !== undefined && (
                        <span>Correct Choice: {String.fromCharCode(65 + masterKey.correctIndex)} ({q.options?.[masterKey.correctIndex]})</span>
                      )}
                      {q.type === 'multi_select' && masterKey.correctIndices && (
                        <span>Correct Choices: {masterKey.correctIndices.map(i => String.fromCharCode(65 + i)).join(', ')}</span>
                      )}
                      {q.type === 'true_false' && (
                        <span>Correct Value: {masterKey.correctIndex === 1 ? 'True' : 'False'}</span>
                      )}
                      {(q.type === 'fill_blank' || q.type === 'short_answer') && masterKey.acceptedAnswers && (
                        <span>Accepted Terms: {masterKey.acceptedAnswers.join(' | ')}</span>
                      )}
                      {q.type === 'essay' && masterKey.rubric && (
                        <div>
                          <strong className="block">Evaluation Rubric:</strong>
                          <p className="whitespace-pre-wrap">{masterKey.rubric}</p>
                        </div>
                      )}
                      {masterKey.explanation && (
                        <p className="text-slate-600 dark:text-slate-400 mt-1 italic">
                          Explanation: {masterKey.explanation}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Feedback Input */}
                <div>
                  <input
                    type="text"
                    value={questionFeedback[q.id] || ''}
                    onChange={e => setQuestionFeedback(prev => ({ ...prev, [q.id]: e.target.value }))}
                    placeholder="Instructor feedback for this question..."
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px]"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-card flex items-center justify-between">
          <div className="text-slate-500 font-mono text-[11px]">
            Final Score: <strong>{currentTotalScore}</strong> / {maxPossibleScore} ({scorePercentage}%)
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold cursor-pointer text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveGrading}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Releasing Grade...' : 'Save & Release Grade'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
