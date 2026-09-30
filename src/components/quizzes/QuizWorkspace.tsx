import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  FirestoreClass,
  FirestoreQuiz,
  FirestoreQuizAttempt,
  QuizQuestion,
  QuizQuestionAnswerKey,
  QuizType,
  QuestionType,
  QuestionDifficulty,
  createQuizWithSecureAnswers,
  updateQuizWithSecureAnswers,
  getQuizAnswerKey,
  subscribeQuizAttempts
} from '../../lib/firebase/firestoreService';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  RotateCw,
  Sparkles,
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Eye,
  Check,
  Calendar,
  Lock,
  X,
  BookOpen,
  FolderPlus,
  BarChart3
} from 'lucide-react';
import { QuizGradingModal } from './QuizGradingModal';
import { QuizPlayerModal } from './QuizPlayerModal';
import { AiGeneratorPanel } from './AiGeneratorPanel';
import { QuestionBankModal } from './QuestionBankModal';
import { QuizAnalyticsPanel } from './QuizAnalyticsPanel';

interface QuizWorkspaceProps {
  quiz?: FirestoreQuiz | null;
  classes: FirestoreClass[];
  onBack: () => void;
  onSaved: (msg: string) => void;
}

export function QuizWorkspace({
  quiz: initialQuiz,
  classes,
  onBack,
  onSaved
}: QuizWorkspaceProps) {
  const { user } = useAuth();

  // Active workspace tab matching user's screenshots
  const [activeTab, setActiveTab] = useState<'questions' | 'attempts' | 'ai' | 'settings'>('questions');

  // Core Metadata
  const [quizId, setQuizId] = useState<string | null>(initialQuiz?.id || null);
  const [title, setTitle] = useState(initialQuiz?.title || 'Untitled Assessment');
  const [classId, setClassId] = useState(initialQuiz?.classId || (classes[0]?.id || ''));
  const [quizType, setQuizType] = useState<QuizType>(initialQuiz?.type || 'exam');
  const [instructions, setInstructions] = useState(initialQuiz?.description || '');
  const [isPublished, setIsPublished] = useState(initialQuiz?.status !== 'closed');

  // Settings tab states
  const [durationMinutes, setDurationMinutes] = useState(initialQuiz?.durationMinutes?.toString() || '30');
  const [maxAttempts, setMaxAttempts] = useState(initialQuiz?.maxAttempts !== undefined ? initialQuiz.maxAttempts.toString() : '1');
  const [passingMarks, setPassingMarks] = useState('4');
  const [opensAt, setOpensAt] = useState(initialQuiz?.opensAt ? initialQuiz.opensAt.slice(0, 16) : '');
  const [closesAt, setClosesAt] = useState(initialQuiz?.closesAt ? initialQuiz.closesAt.slice(0, 16) : '');

  // Toggle settings
  const [lockdownMode, setLockdownMode] = useState(initialQuiz?.lockdownConfig?.enabled ?? true);
  const [shuffleQuestions, setShuffleQuestions] = useState(initialQuiz?.shuffleQuestions ?? true);
  const [shuffleOptions, setShuffleOptions] = useState(initialQuiz?.shuffleOptions ?? true);
  const [showResults, setShowResults] = useState(true);

  // Questions State
  const [questions, setQuestions] = useState<QuizQuestion[]>(() => {
    if (initialQuiz?.questions && initialQuiz.questions.length > 0) {
      return initialQuiz.questions.map(q => ({ ...q }));
    }
    return [
      {
        id: `q-${Date.now()}-1`,
        type: 'true_false',
        question: 'According to the study material, dialogue in a script should be as long and complicated as possible.',
        points: 1,
        difficulty: 'easy',
        correctIndex: 0, // False
        explanation: 'The material notes that good dialogue should avoid unnecessary words and that you should keep dialogue "short and natural."'
      }
    ];
  });

  // Attempts State
  const [attempts, setAttempts] = useState<FirestoreQuizAttempt[]>([]);
  const [inspectingAttempt, setInspectingAttempt] = useState<FirestoreQuizAttempt | null>(null);

  // Preview / Overview Modal
  const [showOverviewModal, setShowOverviewModal] = useState(false);

  // Question Bank State
  const [showQuestionBankModal, setShowQuestionBankModal] = useState(false);
  const [selectedQuestionToSave, setSelectedQuestionToSave] = useState<QuizQuestion | null>(null);
  const [masterAnswerKeys, setMasterAnswerKeys] = useState<QuizQuestionAnswerKey[]>([]);

  // Saving state
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load existing answer keys for editing
  useEffect(() => {
    if (initialQuiz?.id) {
      getQuizAnswerKey(initialQuiz.id).then(keyDoc => {
        if (keyDoc?.questions) {
          setMasterAnswerKeys(keyDoc.questions);
          setQuestions(prev =>
            prev.map(q => {
              const matchedKey = keyDoc.questions.find(k => k.questionId === q.id);
              if (matchedKey) {
                return {
                  ...q,
                  correctIndex: matchedKey.correctIndex ?? q.correctIndex ?? 0,
                  correctIndices: matchedKey.correctIndices ?? q.correctIndices ?? [],
                  acceptedAnswers: matchedKey.acceptedAnswers ?? q.acceptedAnswers ?? [],
                  explanation: matchedKey.explanation ?? q.explanation ?? '',
                  rubric: matchedKey.rubric ?? q.rubric ?? ''
                };
              }
              return q;
            })
          );
        }
      });
    }
  }, [initialQuiz]);

  // Subscribe to student attempts for this quiz
  useEffect(() => {
    if (quizId) {
      const unsub = subscribeQuizAttempts(quizId, setAttempts);
      return () => unsub();
    }
  }, [quizId]);

  // Class Info
  const currentClass = classes.find(c => c.id === classId) || classes[0];
  const classNameDisplay = currentClass ? currentClass.name : 'Course';

  // Total marks calculation
  const totalMarks = questions.reduce((acc, q) => acc + (Number(q.points) || 1), 0);

  // Question Management Functions
  const handleAddQuestion = (type: QuestionType = 'true_false') => {
    const newQuestion: QuizQuestion = {
      id: `q-${Date.now()}-${questions.length + 1}`,
      type,
      question: '',
      points: 1,
      difficulty: 'easy',
      options: type === 'mcq' || type === 'multi_select' ? ['Option 1', 'Option 2', 'Option 3', 'Option 4'] : undefined,
      correctIndex: type === 'true_false' ? 1 : 0,
      correctIndices: type === 'multi_select' ? [0] : undefined,
      acceptedAnswers: type === 'fill_blank' || type === 'short_answer' ? [''] : undefined,
      explanation: ''
    };
    setQuestions(prev => [...prev, newQuestion]);
  };

  const handleDeleteQuestion = (idx: number) => {
    if (questions.length <= 1) {
      showToast('An assessment must have at least one question.');
      return;
    }
    setQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  const handleDuplicateQuestion = (idx: number) => {
    const source = questions[idx];
    const clone: QuizQuestion = {
      ...source,
      id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      options: source.options ? [...source.options] : undefined,
      correctIndices: source.correctIndices ? [...source.correctIndices] : undefined,
      acceptedAnswers: source.acceptedAnswers ? [...source.acceptedAnswers] : undefined
    };
    const updated = [...questions];
    updated.splice(idx + 1, 0, clone);
    setQuestions(updated);
    showToast('Question duplicated.');
  };

  const handleMoveQuestion = (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= questions.length) return;
    const updated = [...questions];
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;
    setQuestions(updated);
  };

  const handleUpdateQuestion = (idx: number, updates: Partial<QuizQuestion>) => {
    setQuestions(prev =>
      prev.map((q, i) => (i === idx ? { ...q, ...updates } : q))
    );
  };

  // Save Quiz Handler
  const handleSaveQuiz = async () => {
    if (!title.trim()) {
      showToast('Please specify a title for the assessment.');
      return;
    }
    if (questions.length === 0) {
      showToast('Please add at least one question.');
      return;
    }

    setIsSaving(true);

    const masterAnswerKeys: QuizQuestionAnswerKey[] = questions.map(q => {
      const key: QuizQuestionAnswerKey = {
        questionId: q.id,
        explanation: q.explanation || ''
      };
      if (q.type === 'mcq' || q.type === 'true_false') {
        key.correctIndex = q.correctIndex ?? 0;
      } else if (q.type === 'multi_select') {
        key.correctIndices = q.correctIndices && q.correctIndices.length > 0 ? q.correctIndices : [0];
      } else if (q.type === 'fill_blank' || q.type === 'short_answer') {
        key.acceptedAnswers = (q.acceptedAnswers || []).filter(a => a.trim().length > 0);
      } else if (q.type === 'essay') {
        key.rubric = q.rubric || '';
      }
      return key;
    });

    const parsedDuration = parseInt(durationMinutes, 10) || 30;
    const parsedAttempts = parseInt(maxAttempts, 10);

    const quizPayload: Omit<FirestoreQuiz, 'id' | 'createdAt'> & { createdAt?: string } = {
      classId: currentClass ? currentClass.id : 'default-class',
      classCode: currentClass ? currentClass.code : 'COURSE',
      className: currentClass ? currentClass.name : 'General Course',
      title: title.trim(),
      description: instructions.trim(),
      type: quizType,
      durationMinutes: parsedDuration,
      points: totalMarks,
      totalPoints: totalMarks,
      passingPercentage: parseInt(passingMarks, 10) || 4,
      maxAttempts: isNaN(parsedAttempts) ? 1 : parsedAttempts,
      shuffleQuestions,
      shuffleOptions,
      opensAt: opensAt ? new Date(opensAt).toISOString() : undefined,
      closesAt: closesAt ? new Date(closesAt).toISOString() : undefined,
      lockdownConfig: {
        enabled: lockdownMode,
        maxViolations: 3,
        autoSubmitOnLock: true,
        blockCopyPaste: true,
        blockRightClick: true,
        trackVisibility: true
      },
      status: isPublished ? 'available' : 'closed',
      questions,
      createdBy: user?.uid || 'instructor'
    };

    try {
      if (quizId) {
        await updateQuizWithSecureAnswers(quizId, quizPayload, masterAnswerKeys);
        showToast('Assessment successfully updated!');
        onSaved(`Assessment "${title.trim()}" saved.`);
      } else {
        const newId = await createQuizWithSecureAnswers(quizPayload, masterAnswerKeys);
        setQuizId(newId);
        showToast('Assessment created and published!');
        onSaved(`Assessment "${title.trim()}" created.`);
      }
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || 'Error saving assessment.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-20 animate-in fade-in duration-150">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold shadow-xl border border-slate-700 dark:border-slate-200 animate-in slide-in-from-top-2 duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP HEADER MATCHING SCREENSHOT 1 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          {/* Back link */}
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quizzes</span>
          </button>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {title || 'Untitled Assessment'}
          </h1>

          {/* Subtitle */}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {classNameDisplay} · {questions.length} {questions.length === 1 ? 'question' : 'questions'} · {totalMarks} {totalMarks === 1 ? 'mark' : 'marks'}
          </p>
        </div>

        {/* Top-Right Action Buttons */}
        <div className="flex items-center gap-2.5 self-start sm:self-center">
          {/* Question Bank button */}
          <button
            type="button"
            onClick={() => {
              setSelectedQuestionToSave(null);
              setShowQuestionBankModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-card hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors shadow-2xs cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-600" />
            <span>Question Bank</span>
          </button>

          {/* Overview button */}
          <button
            type="button"
            onClick={() => setShowOverviewModal(true)}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-card hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors shadow-2xs cursor-pointer"
          >
            Overview
          </button>

          {/* Unpublish / Publish button */}
          <button
            type="button"
            onClick={() => {
              setIsPublished(!isPublished);
              showToast(isPublished ? 'Assessment unpublished (draft).' : 'Assessment published.');
            }}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-card hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors shadow-2xs cursor-pointer"
          >
            {isPublished ? 'Unpublish' : 'Publish'}
          </button>

          {/* Save button (solid blue with save icon) */}
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSaveQuiz}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-brand hover:bg-brand-hover] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save'}</span>
          </button>
        </div>
      </div>

      {/* SEGMENTED TAB PILLS MATCHING SCREENSHOTS */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl w-fit text-xs font-medium border border-slate-200/80 dark:border-slate-700/60">
        <button
          type="button"
          onClick={() => setActiveTab('questions')}
          className={`px-4 py-1.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'questions'
              ? 'bg-card text-slate-900 dark:text-white font-semibold shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Questions ({questions.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('attempts')}
          className={`px-4 py-1.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'attempts'
              ? 'bg-card text-slate-900 dark:text-white font-semibold shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Attempts
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ai')}
          className={`px-4 py-1.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'ai'
              ? 'bg-card text-slate-900 dark:text-white font-semibold shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          AI generator
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-1.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-card text-slate-900 dark:text-white font-semibold shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Settings
        </button>
      </div>

      {/* ========================================================
          TAB 1: QUESTIONS LIST (SCREENSHOT 1)
         ======================================================== */}
      {activeTab === 'questions' && (
        <div className="space-y-4">
          {questions.map((q, idx) => (
            <div
              key={q.id}
              className="p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-card shadow-2xs space-y-4"
            >
              {/* Card Controls Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 flex-wrap">
                  {/* Number pill */}
                  <div className="w-7 h-7 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </div>

                  {/* Question Type Select */}
                  <select
                    value={q.type}
                    onChange={e => {
                      const newType = e.target.value as QuestionType;
                      handleUpdateQuestion(idx, {
                        type: newType,
                        options:
                          newType === 'mcq' || newType === 'multi_select'
                            ? q.options && q.options.length > 0
                              ? q.options
                              : ['Option 1', 'Option 2', 'Option 3', 'Option 4']
                            : undefined
                      });
                    }}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
                  >
                    <option value="true_false">True / False</option>
                    <option value="mcq">Multiple choice</option>
                    <option value="multi_select">Multiple correct</option>
                    <option value="fill_blank">Fill in the blank</option>
                    <option value="short_answer">Short answer</option>
                    <option value="essay">Essay</option>
                  </select>

                  {/* Difficulty Select */}
                  <select
                    value={q.difficulty}
                    onChange={e => handleUpdateQuestion(idx, { difficulty: e.target.value as QuestionDifficulty })}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>

                  {/* Marks input */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
                    <span>Marks</span>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={q.points}
                      onChange={e => handleUpdateQuestion(idx, { points: parseInt(e.target.value, 10) || 1 })}
                      className="w-14 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-center font-mono font-bold text-slate-900 dark:text-white text-xs"
                    />
                  </div>
                </div>

                {/* Right Action Icons: Move Up, Move Down, Shuffle, Duplicate, Delete */}
                <div className="flex items-center gap-1 text-slate-400">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => handleMoveQuestion(idx, 'up')}
                    title="Move question up"
                    className="p-1.5 rounded-lg hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    disabled={idx === questions.length - 1}
                    onClick={() => handleMoveQuestion(idx, 'down')}
                    title="Move question down"
                    className="p-1.5 rounded-lg hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (q.options && q.options.length > 0) {
                        const shuffled = [...q.options].sort(() => Math.random() - 0.5);
                        handleUpdateQuestion(idx, { options: shuffled });
                        showToast('Answer choices shuffled.');
                      } else {
                        showToast('Options refreshed.');
                      }
                    }}
                    title="Refresh / shuffle choices"
                    className="p-1.5 rounded-lg hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDuplicateQuestion(idx)}
                    title="Duplicate question"
                    className="p-1.5 rounded-lg hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <Copy className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedQuestionToSave(q);
                      setShowQuestionBankModal(true);
                    }}
                    title="Save to Question Bank"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer"
                  >
                    <FolderPlus className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteQuestion(idx)}
                    title="Delete question"
                    className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Question Statement Textarea */}
              <div>
                <textarea
                  rows={2}
                  value={q.question}
                  onChange={e => handleUpdateQuestion(idx, { question: e.target.value })}
                  placeholder="Type question statement or prompt here..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* RENDER QUESTION CHOICES ACCORDING TO TYPE */}

              {/* 1. TRUE / FALSE CHOICES (EXACTLY AS SCREENSHOT 1) */}
              {q.type === 'true_false' && (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => handleUpdateQuestion(idx, { correctIndex: 1 })}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all flex items-center gap-3 cursor-pointer ${
                      q.correctIndex === 1
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-slate-900 dark:text-white'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        q.correctIndex === 1
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-slate-400 bg-card'
                      }`}
                    >
                      {q.correctIndex === 1 && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <span className="text-xs sm:text-sm font-medium">True</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUpdateQuestion(idx, { correctIndex: 0 })}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all flex items-center gap-3 cursor-pointer ${
                      q.correctIndex === 0
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-slate-900 dark:text-white'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        q.correctIndex === 0
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-slate-400 bg-card'
                      }`}
                    >
                      {q.correctIndex === 0 && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className="text-xs sm:text-sm font-medium">False</span>
                  </button>
                </div>
              )}

              {/* 2. MCQ (SINGLE CHOICE) */}
              {q.type === 'mcq' && (
                <div className="space-y-2">
                  {(q.options || []).map((opt, optIdx) => {
                    const isSelected = q.correctIndex === optIdx;
                    return (
                      <div
                        key={optIdx}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/30'
                            : 'border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`mcq-${q.id}`}
                          checked={isSelected}
                          onChange={() => handleUpdateQuestion(idx, { correctIndex: optIdx })}
                          className="w-4 h-4 accent-blue-600 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={opt}
                          onChange={e => {
                            const newOpts = [...(q.options || [])];
                            newOpts[optIdx] = e.target.value;
                            handleUpdateQuestion(idx, { options: newOpts });
                          }}
                          placeholder={`Option ${optIdx + 1}`}
                          className="flex-1 bg-transparent border-0 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none"
                        />
                        {(q.options || []).length > 2 && (
                          <button
                            type="button"
                            onClick={() => {
                              const newOpts = (q.options || []).filter((_, i) => i !== optIdx);
                              handleUpdateQuestion(idx, {
                                options: newOpts,
                                correctIndex: q.correctIndex === optIdx ? 0 : q.correctIndex
                              });
                            }}
                            className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => handleUpdateQuestion(idx, { options: [...(q.options || []), `Option ${(q.options || []).length + 1}`] })}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1 cursor-pointer pt-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add option</span>
                  </button>
                </div>
              )}

              {/* 3. MULTIPLE CORRECT (CHECKBOXES) */}
              {q.type === 'multi_select' && (
                <div className="space-y-2">
                  {(q.options || []).map((opt, optIdx) => {
                    const isChecked = (q.correctIndices || []).includes(optIdx);
                    return (
                      <div
                        key={optIdx}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border ${
                          isChecked
                            ? 'border-purple-500 bg-purple-50/40 dark:bg-purple-950/30'
                            : 'border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={e => {
                            const prev = q.correctIndices || [];
                            const next = e.target.checked
                              ? [...prev, optIdx]
                              : prev.filter(i => i !== optIdx);
                            handleUpdateQuestion(idx, { correctIndices: next });
                          }}
                          className="w-4 h-4 accent-purple-600 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={opt}
                          onChange={e => {
                            const newOpts = [...(q.options || [])];
                            newOpts[optIdx] = e.target.value;
                            handleUpdateQuestion(idx, { options: newOpts });
                          }}
                          placeholder={`Choice ${optIdx + 1}`}
                          className="flex-1 bg-transparent border-0 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none"
                        />
                        {(q.options || []).length > 2 && (
                          <button
                            type="button"
                            onClick={() => {
                              const newOpts = (q.options || []).filter((_, i) => i !== optIdx);
                              handleUpdateQuestion(idx, {
                                options: newOpts,
                                correctIndices: (q.correctIndices || []).filter(i => i !== optIdx)
                              });
                            }}
                            className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => handleUpdateQuestion(idx, { options: [...(q.options || []), `Choice ${(q.options || []).length + 1}`] })}
                    className="text-xs font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-1 cursor-pointer pt-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add choice</span>
                  </button>
                </div>
              )}

              {/* 4. FILL IN THE BLANK OR SHORT ANSWER */}
              {(q.type === 'fill_blank' || q.type === 'short_answer') && (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Accepted answer strings (case-insensitive keyword matching):
                  </label>
                  {(q.acceptedAnswers || []).map((ans, aIdx) => (
                    <div key={aIdx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={ans}
                        onChange={e => {
                          const updated = [...(q.acceptedAnswers || [])];
                          updated[aIdx] = e.target.value;
                          handleUpdateQuestion(idx, { acceptedAnswers: updated });
                        }}
                        placeholder="e.g. RuBisCO or carbon fixation"
                        className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                      />
                      {(q.acceptedAnswers || []).length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = (q.acceptedAnswers || []).filter((_, i) => i !== aIdx);
                            handleUpdateQuestion(idx, { acceptedAnswers: updated });
                          }}
                          className="text-slate-400 hover:text-rose-500 p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleUpdateQuestion(idx, { acceptedAnswers: [...(q.acceptedAnswers || []), ''] })}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1 cursor-pointer pt-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add accepted synonym</span>
                  </button>
                </div>
              )}

              {/* 5. ESSAY */}
              {q.type === 'essay' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Grading rubric & key criteria:
                  </label>
                  <textarea
                    rows={2}
                    value={q.rubric || ''}
                    onChange={e => handleUpdateQuestion(idx, { rubric: e.target.value })}
                    placeholder="Outline required arguments, proofs, citations, and scoring criteria..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                  />
                </div>
              )}

              {/* EXPLANATION SECTION MATCHING SCREENSHOT 1 */}
              <div className="space-y-1.5 pt-2">
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Explanation (shown after grading)
                </label>
                <textarea
                  rows={2}
                  value={q.explanation || ''}
                  onChange={e => handleUpdateQuestion(idx, { explanation: e.target.value })}
                  placeholder="Provide educational explanation clarifying why the answer is correct..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          ))}

          {/* + Add question button matching screenshot 1 */}
          <button
            type="button"
            onClick={() => handleAddQuestion('true_false')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-card hover:bg-slate-50 dark:hover:bg-slate-800/80 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add question</span>
          </button>
        </div>
      )}

      {/* ========================================================
          TAB 2: ATTEMPTS LIST & ANALYTICS
         ======================================================== */}
      {activeTab === 'attempts' && (
        <QuizAnalyticsPanel
          quiz={{
            id: quizId || 'temp-id',
            title,
            classId,
            className: classNameDisplay,
            durationMinutes: parseInt(durationMinutes, 10) || 30,
            points: totalMarks,
            type: quizType,
            questions,
            lockdownConfig: {
              enabled: lockdownMode,
              maxViolations: 3,
              autoSubmitOnLock: true,
              blockCopyPaste: true,
              blockRightClick: true,
              trackVisibility: true
            },
            maxAttempts: parseInt(maxAttempts, 10) || 1,
            shuffleQuestions,
            shuffleOptions,
            createdAt: new Date().toISOString()
          }}
          attempts={attempts}
          answerKeys={masterAnswerKeys}
          onInspectAttempt={att => setInspectingAttempt(att)}
        />
      )}

      {/* ========================================================
          TAB 3: AI GENERATOR (MATCHING SCREENSHOT 2)
         ======================================================== */}
      {activeTab === 'ai' && (
        <div className="p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-card shadow-2xs">
          <AiGeneratorPanel
            existingQuestions={questions}
            onAddQuestions={(newQuestions, newKeys) => {
              setQuestions(prev => [...prev, ...newQuestions]);
              setMasterAnswerKeys(prev => [...prev, ...newKeys]);
              setActiveTab('questions');
              showToast(`Added ${newQuestions.length} generated questions to assessment!`);
            }}
          />
        </div>
      )}

      {/* ========================================================
          TAB 4: SETTINGS (SCREENSHOT 3)
         ======================================================== */}
      {activeTab === 'settings' && (
        <div className="p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-card shadow-2xs space-y-5">
          {/* Row 1: Title & Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Scripting"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-medium text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                Type
              </label>
              <select
                value={quizType}
                onChange={e => setQuizType(e.target.value as QuizType)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-medium text-slate-900 dark:text-white focus:outline-none"
              >
                <option value="exam">Final exam</option>
                <option value="timed">Timed quiz</option>
                <option value="scheduled">Scheduled quiz</option>
                <option value="practice">Practice</option>
              </select>
            </div>
          </div>

          {/* Instructions Textarea */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
              Instructions
            </label>
            <textarea
              rows={3}
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              placeholder="Provide rules, calculator allowances, or special notes for students..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none"
            />
          </div>

          {/* Row: Time limit, Max attempts, Passing marks */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                Time limit (minutes)
              </label>
              <input
                type="number"
                min="1"
                max="300"
                value={durationMinutes}
                onChange={e => setDurationMinutes(e.target.value)}
                placeholder="30"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-medium text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                Max attempts
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={maxAttempts}
                onChange={e => setMaxAttempts(e.target.value)}
                placeholder="1"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-medium text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                Passing marks
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={passingMarks}
                onChange={e => setPassingMarks(e.target.value)}
                placeholder="4"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-medium text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
          </div>

          {/* Row: Opens at, Closes at */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                Opens at
              </label>
              <input
                type="datetime-local"
                value={opensAt}
                onChange={e => setOpensAt(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-medium text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                Closes at
              </label>
              <input
                type="datetime-local"
                value={closesAt}
                onChange={e => setClosesAt(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-medium text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
          </div>

          {/* TOGGLE SWITCHES MATCHING SCREENSHOT 3 */}
          <div className="space-y-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            {/* 1. Lockdown mode */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                  Lockdown mode
                </h4>
                <p className="text-[11px] text-slate-400">
                  Warn and lock the attempt if the student leaves the tab.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLockdownMode(!lockdownMode)}
                className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                  lockdownMode ? 'bg-brand' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    lockdownMode ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* 2. Shuffle questions */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                  Shuffle questions
                </h4>
                <p className="text-[11px] text-slate-400">
                  Each student sees a different order.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShuffleQuestions(!shuffleQuestions)}
                className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                  shuffleQuestions ? 'bg-brand' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    shuffleQuestions ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* 3. Shuffle options */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                  Shuffle options
                </h4>
                <p className="text-[11px] text-slate-400">
                  Randomise answer choices per student.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShuffleOptions(!shuffleOptions)}
                className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                  shuffleOptions ? 'bg-brand' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    shuffleOptions ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* 4. Show results */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                  Show results
                </h4>
                <p className="text-[11px] text-slate-400">
                  Let students see their score after submitting.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowResults(!showResults)}
                className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                  showResults ? 'bg-brand' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    showResults ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INSPECT / GRADE ATTEMPT MODAL */}
      {inspectingAttempt && (
        <QuizGradingModal
          quiz={{
            id: quizId || 'temp-id',
            title,
            classId,
            className: classNameDisplay,
            durationMinutes: parseInt(durationMinutes, 10) || 30,
            points: totalMarks,
            type: quizType,
            questions,
            lockdownConfig: {
              enabled: lockdownMode,
              maxViolations: 3,
              autoSubmitOnLock: true,
              blockCopyPaste: true,
              blockRightClick: true,
              trackVisibility: true
            },
            maxAttempts: 1,
            shuffleQuestions,
            shuffleOptions,
            createdAt: new Date().toISOString()
          }}
          attempt={inspectingAttempt}
          onClose={() => setInspectingAttempt(null)}
          onGraded={() => {
            showToast('Grading saved.');
            setInspectingAttempt(null);
          }}
        />
      )}

      {/* OVERVIEW / STUDENT PREVIEW MODAL */}
      {showOverviewModal && (
        <QuizPlayerModal
          quiz={{
            id: quizId || 'preview-id',
            title,
            classId,
            className: classNameDisplay,
            durationMinutes: parseInt(durationMinutes, 10) || 30,
            points: totalMarks,
            type: quizType,
            questions,
            lockdownConfig: {
              enabled: lockdownMode,
              maxViolations: 3,
              autoSubmitOnLock: true,
              blockCopyPaste: true,
              blockRightClick: true,
              trackVisibility: true
            },
            maxAttempts: 1,
            shuffleQuestions,
            shuffleOptions,
            createdAt: new Date().toISOString()
          }}
          attemptNumber={1}
          onClose={() => setShowOverviewModal(false)}
          onSubmitted={() => setShowOverviewModal(false)}
        />
      )}

      {/* QUESTION BANK MODAL */}
      {showQuestionBankModal && (
        <QuestionBankModal
          initialQuestionToSave={selectedQuestionToSave}
          onClose={() => {
            setShowQuestionBankModal(false);
            setSelectedQuestionToSave(null);
          }}
          onReuseQuestion={(reusedQuestion, reusedKey) => {
            setQuestions(prev => [...prev, reusedQuestion]);
            if (reusedKey) {
              setMasterAnswerKeys(prev => [...prev, reusedKey]);
            }
            showToast(`Added question from Question Bank.`);
          }}
        />
      )}
    </div>
  );
}
