import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  FirestoreClass,
  FirestoreQuiz,
  QuizQuestion,
  QuizQuestionAnswerKey,
  QuizType,
  QuestionType,
  QuestionDifficulty,
  QuizLockdownConfig,
  createQuizWithSecureAnswers,
  updateQuizWithSecureAnswers,
  getQuizAnswerKey
} from '../../lib/firebase/firestoreService';
import {
  X,
  Plus,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Shield,
  Clock,
  Calendar,
  Shuffle,
  Check,
  CheckSquare,
  HelpCircle,
  FileQuestion,
  AlertCircle,
  Award,
  Layers,
  Settings,
  BookOpen
} from 'lucide-react';

interface QuizEditorModalProps {
  initialQuiz?: FirestoreQuiz | null;
  classes: FirestoreClass[];
  onClose: () => void;
  onSaved: (msg: string) => void;
}

export function QuizEditorModal({
  initialQuiz,
  classes,
  onClose,
  onSaved
}: QuizEditorModalProps) {
  const { user, profile } = useAuth();

  // Basic Metadata
  const [title, setTitle] = useState(initialQuiz?.title || '');
  const [description, setDescription] = useState(initialQuiz?.description || '');
  const [classId, setClassId] = useState(initialQuiz?.classId || (classes[0]?.id || ''));
  const [quizType, setQuizType] = useState<QuizType>(initialQuiz?.type || 'timed');
  const [durationMinutes, setDurationMinutes] = useState(initialQuiz?.durationMinutes?.toString() || '20');
  const [maxAttempts, setMaxAttempts] = useState(initialQuiz?.maxAttempts !== undefined ? initialQuiz.maxAttempts.toString() : '1');

  // Scheduling
  const [hasScheduling, setHasScheduling] = useState(Boolean(initialQuiz?.opensAt || initialQuiz?.closesAt));
  const [opensAt, setOpensAt] = useState(initialQuiz?.opensAt ? initialQuiz.opensAt.slice(0, 16) : '');
  const [closesAt, setClosesAt] = useState(initialQuiz?.closesAt ? initialQuiz.closesAt.slice(0, 16) : '');

  // Randomization
  const [shuffleQuestions, setShuffleQuestions] = useState(initialQuiz?.shuffleQuestions ?? true);
  const [shuffleOptions, setShuffleOptions] = useState(initialQuiz?.shuffleOptions ?? true);

  // Lockdown
  const [lockdownEnabled, setLockdownEnabled] = useState(
    initialQuiz?.lockdownConfig?.enabled ?? (initialQuiz?.type === 'exam' || true)
  );
  const [maxViolations, setMaxViolations] = useState(
    initialQuiz?.lockdownConfig?.maxViolations?.toString() || '3'
  );
  const [blockCopyPaste, setBlockCopyPaste] = useState(
    initialQuiz?.lockdownConfig?.blockCopyPaste ?? true
  );
  const [blockRightClick, setBlockRightClick] = useState(
    initialQuiz?.lockdownConfig?.blockRightClick ?? true
  );
  const [trackVisibility, setTrackVisibility] = useState(
    initialQuiz?.lockdownConfig?.trackVisibility ?? true
  );
  const [autoSubmitOnLock, setAutoSubmitOnLock] = useState(
    initialQuiz?.lockdownConfig?.autoSubmitOnLock ?? true
  );

  // Questions with Answer Keys (loaded if editing)
  const [questions, setQuestions] = useState<QuizQuestion[]>(() => {
    if (initialQuiz?.questions && initialQuiz.questions.length > 0) {
      return initialQuiz.questions.map(q => ({ ...q }));
    }
    return [
      {
        id: `q-${Date.now()}-1`,
        type: 'mcq',
        question: '',
        points: 5,
        difficulty: 'medium',
        options: ['', '', '', ''],
        correctIndex: 0,
        explanation: ''
      }
    ];
  });

  const [activeTab, setActiveTab] = useState<'questions' | 'settings'>('questions');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load existing answer keys if editing an existing quiz
  useEffect(() => {
    if (initialQuiz?.id) {
      getQuizAnswerKey(initialQuiz.id).then(keyDoc => {
        if (keyDoc?.questions) {
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

  // Adjust default settings when quiz type changes
  const handleQuizTypeChange = (newType: QuizType) => {
    setQuizType(newType);
    if (newType === 'practice') {
      setMaxAttempts('0'); // unlimited
      setLockdownEnabled(false);
    } else if (newType === 'exam') {
      setMaxAttempts('1');
      setLockdownEnabled(true);
      setBlockCopyPaste(true);
      setBlockRightClick(true);
      setTrackVisibility(true);
      setHasScheduling(true);
    } else if (newType === 'scheduled') {
      setHasScheduling(true);
    }
  };

  // Total points calculation
  const totalCalculatedPoints = questions.reduce((acc, q) => acc + (Number(q.points) || 0), 0);

  // Question manipulation helpers
  const handleAddQuestion = (type: QuestionType = 'mcq') => {
    const newQ: QuizQuestion = {
      id: `q-${Date.now()}-${questions.length + 1}`,
      type,
      question: '',
      points: 5,
      difficulty: 'medium',
      options: type === 'mcq' || type === 'multi_select' ? ['', '', '', ''] : undefined,
      correctIndex: 0,
      correctIndices: type === 'multi_select' ? [0] : undefined,
      acceptedAnswers: type === 'fill_blank' || type === 'short_answer' ? [''] : undefined,
      explanation: ''
    };
    setQuestions(prev => [...prev, newQ]);
  };

  const handleDeleteQuestion = (idx: number) => {
    if (questions.length <= 1) {
      setErrorMsg('A quiz must contain at least one question.');
      return;
    }
    setQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  const handleDuplicateQuestion = (idx: number) => {
    const source = questions[idx];
    const clone: QuizQuestion = {
      ...source,
      id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      question: `${source.question} (Copy)`,
      options: source.options ? [...source.options] : undefined,
      correctIndices: source.correctIndices ? [...source.correctIndices] : undefined,
      acceptedAnswers: source.acceptedAnswers ? [...source.acceptedAnswers] : undefined
    };
    const updated = [...questions];
    updated.splice(idx + 1, 0, clone);
    setQuestions(updated);
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
      prev.map((q, i) => {
        if (i !== idx) return q;
        return { ...q, ...updates };
      })
    );
  };

  // Option management for MCQ & Multi-select
  const handleAddOption = (qIdx: number) => {
    const q = questions[qIdx];
    const currentOptions = q.options || [];
    handleUpdateQuestion(qIdx, {
      options: [...currentOptions, '']
    });
  };

  const handleRemoveOption = (qIdx: number, optIdx: number) => {
    const q = questions[qIdx];
    const currentOptions = q.options || [];
    if (currentOptions.length <= 2) return;
    const newOptions = currentOptions.filter((_, i) => i !== optIdx);
    // Fix correctIndex if needed
    let newCorrect = q.correctIndex ?? 0;
    if (newCorrect >= newOptions.length) newCorrect = newOptions.length - 1;
    handleUpdateQuestion(qIdx, {
      options: newOptions,
      correctIndex: newCorrect,
      correctIndices: (q.correctIndices || []).filter(i => i !== optIdx).map(i => (i > optIdx ? i - 1 : i))
    });
  };

  const handleOptionChange = (qIdx: number, optIdx: number, val: string) => {
    const q = questions[qIdx];
    const newOptions = [...(q.options || [])];
    newOptions[optIdx] = val;
    handleUpdateQuestion(qIdx, { options: newOptions });
  };

  // Accepted answers for Fill Blank & Short Answer
  const handleAddAcceptedAnswer = (qIdx: number) => {
    const q = questions[qIdx];
    handleUpdateQuestion(qIdx, {
      acceptedAnswers: [...(q.acceptedAnswers || []), '']
    });
  };

  const handleRemoveAcceptedAnswer = (qIdx: number, aIdx: number) => {
    const q = questions[qIdx];
    const filtered = (q.acceptedAnswers || []).filter((_, i) => i !== aIdx);
    handleUpdateQuestion(qIdx, { acceptedAnswers: filtered });
  };

  const handleAcceptedAnswerChange = (qIdx: number, aIdx: number, val: string) => {
    const q = questions[qIdx];
    const updated = [...(q.acceptedAnswers || [])];
    updated[aIdx] = val;
    handleUpdateQuestion(qIdx, { acceptedAnswers: updated });
  };

  // Submit Handler
  const handleSaveQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim()) {
      setErrorMsg('Please enter a quiz title.');
      return;
    }

    if (questions.length === 0) {
      setErrorMsg('Please add at least one question.');
      return;
    }

    // Validate that questions have statements
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim()) {
        setErrorMsg(`Question #${i + 1} statement cannot be empty.`);
        return;
      }
      if ((q.type === 'mcq' || q.type === 'multi_select') && (!q.options || q.options.some(o => !o.trim()))) {
        setErrorMsg(`Question #${i + 1} has empty options. Please fill all options.`);
        return;
      }
    }

    const chosenClass = classes.find(c => c.id === classId) || classes[0];

    const lockdownConfig: QuizLockdownConfig = {
      enabled: lockdownEnabled,
      maxViolations: parseInt(maxViolations, 10) || 3,
      autoSubmitOnLock,
      blockCopyPaste,
      blockRightClick,
      trackVisibility
    };

    // Prepare Master Answer Keys (separated from student quiz)
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

    const parsedDuration = parseInt(durationMinutes, 10) || 20;
    const parsedAttempts = parseInt(maxAttempts, 10);

    const quizPayload: Omit<FirestoreQuiz, 'id' | 'createdAt'> & { createdAt?: string } = {
      classId: chosenClass ? chosenClass.id : 'default-class',
      classCode: chosenClass ? chosenClass.code : 'COURSE',
      className: chosenClass ? chosenClass.name : 'General Course',
      title: title.trim(),
      description: description.trim(),
      type: quizType,
      durationMinutes: parsedDuration,
      points: totalCalculatedPoints,
      totalPoints: totalCalculatedPoints,
      maxAttempts: isNaN(parsedAttempts) ? 1 : parsedAttempts,
      shuffleQuestions,
      shuffleOptions,
      opensAt: hasScheduling && opensAt ? new Date(opensAt).toISOString() : undefined,
      closesAt: hasScheduling && closesAt ? new Date(closesAt).toISOString() : undefined,
      lockdownConfig,
      status: 'available',
      questions, // Will be sanitized in createQuizWithSecureAnswers
      createdBy: user?.uid || 'instructor'
    };

    setIsSubmitting(true);
    try {
      if (initialQuiz?.id) {
        await updateQuizWithSecureAnswers(initialQuiz.id, quizPayload, masterAnswerKeys);
        onSaved(`Assessment "${title.trim()}" updated with secure answer keys!`);
      } else {
        await createQuizWithSecureAnswers(quizPayload, masterAnswerKeys);
        onSaved(`Assessment "${title.trim()}" published to course!`);
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || 'Error saving quiz. Please check permissions.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[94vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
              <FileQuestion className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {initialQuiz ? 'Edit Course Assessment' : 'Author New Assessment / Exam'}
              </h3>
              <p className="text-xs text-slate-500">
                Configure question types, rubrics, anti-cheat lockdown, and answer keys.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-200 dark:bg-slate-800 p-0.5 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('questions')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'questions'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Questions ({questions.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'settings'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Settings & Security
              </button>
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

        {/* Error Alert */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Modal Form */}
        <form onSubmit={handleSaveQuiz} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {/* Top Metadata Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Assessment Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Midterm Examination: Graph Algorithms"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Target Class *
              </label>
              <select
                value={classId}
                onChange={e => setClassId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Assessment Type *
              </label>
              <select
                value={quizType}
                onChange={e => handleQuizTypeChange(e.target.value as QuizType)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-semibold"
              >
                <option value="practice">Practice (Self-Paced)</option>
                <option value="timed">Timed Quiz</option>
                <option value="scheduled">Scheduled Quiz</option>
                <option value="exam">Final Exam (Max Security)</option>
              </select>
            </div>
          </div>

          {/* TAB 1: QUESTIONS EDITOR */}
          {activeTab === 'questions' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-900 dark:text-white">
                    Questions Pool ({questions.length})
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono font-bold">
                    Total: {totalCalculatedPoints} Points
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-slate-500 font-medium">Add Type:</span>
                  <button
                    type="button"
                    onClick={() => handleAddQuestion('mcq')}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold hover:border-blue-500 cursor-pointer"
                  >
                    + MCQ
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddQuestion('multi_select')}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold hover:border-blue-500 cursor-pointer"
                  >
                    + Multi-Select
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddQuestion('true_false')}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold hover:border-blue-500 cursor-pointer"
                  >
                    + True/False
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddQuestion('fill_blank')}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold hover:border-blue-500 cursor-pointer"
                  >
                    + Fill Blank
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddQuestion('short_answer')}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold hover:border-blue-500 cursor-pointer"
                  >
                    + Short Answer
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddQuestion('essay')}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold hover:border-blue-500 cursor-pointer"
                  >
                    + Essay
                  </button>
                </div>
              </div>

              {/* Questions Stack */}
              <div className="space-y-4">
                {questions.map((q, qIdx) => (
                  <div
                    key={q.id}
                    className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs space-y-4 relative"
                  >
                    {/* Question Header & Controls */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold flex items-center justify-center font-mono">
                          {qIdx + 1}
                        </span>

                        <select
                          value={q.type}
                          onChange={e => handleUpdateQuestion(qIdx, {
                            type: e.target.value as QuestionType,
                            options: e.target.value === 'mcq' || e.target.value === 'multi_select' ? (q.options && q.options.length > 0 ? q.options : ['', '', '', '']) : undefined,
                            acceptedAnswers: e.target.value === 'fill_blank' || e.target.value === 'short_answer' ? (q.acceptedAnswers || ['']) : undefined
                          })}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border-0 font-bold text-slate-800 dark:text-slate-200"
                        >
                          <option value="mcq">MCQ (Single-Choice)</option>
                          <option value="multi_select">Multi-Select (Checkboxes)</option>
                          <option value="true_false">True / False</option>
                          <option value="fill_blank">Fill in the Blank</option>
                          <option value="short_answer">Short Answer</option>
                          <option value="essay">Essay Response</option>
                        </select>

                        <select
                          value={q.difficulty}
                          onChange={e => handleUpdateQuestion(qIdx, { difficulty: e.target.value as QuestionDifficulty })}
                          className={`px-2 py-1 rounded-lg font-semibold text-[11px] ${
                            q.difficulty === 'easy'
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                              : q.difficulty === 'hard'
                              ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                              : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                          }`}
                        >
                          <option value="easy">Easy</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                        </select>
                      </div>

                      {/* Right controls: Points, Reorder, Duplicate, Delete */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <label className="text-slate-500 font-medium">Points:</label>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={q.points}
                            onChange={e => handleUpdateQuestion(qIdx, { points: parseInt(e.target.value, 10) || 1 })}
                            className="w-14 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-center font-mono font-bold"
                          />
                        </div>

                        <div className="flex items-center border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                          <button
                            type="button"
                            disabled={qIdx === 0}
                            onClick={() => handleMoveQuestion(qIdx, 'up')}
                            title="Move Up"
                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={qIdx === questions.length - 1}
                            onClick={() => handleMoveQuestion(qIdx, 'down')}
                            title="Move Down"
                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDuplicateQuestion(qIdx)}
                          title="Duplicate Question"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <Copy className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(qIdx)}
                          title="Delete Question"
                          className="p-1.5 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Question Statement */}
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Question Statement *
                      </label>
                      <textarea
                        rows={2}
                        required
                        value={q.question}
                        onChange={e => handleUpdateQuestion(qIdx, { question: e.target.value })}
                        placeholder={
                          q.type === 'fill_blank'
                            ? 'e.g. In asymmetric cryptography, the ___ key is distributed openly while the private key is kept confidential.'
                            : 'Enter the clear question statement or problem...'
                        }
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>

                    {/* TYPE-SPECIFIC EDITOR */}

                    {/* 1. MCQ (Single-Select) */}
                    {q.type === 'mcq' && (
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between">
                          <label className="font-semibold text-slate-700 dark:text-slate-300">
                            Answer Choices (Select radio button for the correct answer)
                          </label>
                          <button
                            type="button"
                            onClick={() => handleAddOption(qIdx)}
                            className="text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" /> Add Choice
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {(q.options || []).map((opt, optIdx) => (
                            <div
                              key={optIdx}
                              className={`flex items-center gap-2 p-2 rounded-xl border ${
                                q.correctIndex === optIdx
                                  ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20'
                                  : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`correct-${q.id}`}
                                checked={q.correctIndex === optIdx}
                                onChange={() => handleUpdateQuestion(qIdx, { correctIndex: optIdx })}
                                title="Mark as correct answer"
                                className="w-4 h-4 text-emerald-600 accent-emerald-600 cursor-pointer"
                              />
                              <span className="font-bold text-slate-500 font-mono w-4">
                                {String.fromCharCode(65 + optIdx)}.
                              </span>
                              <input
                                type="text"
                                required
                                value={opt}
                                onChange={e => handleOptionChange(qIdx, optIdx, e.target.value)}
                                placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                                className="flex-1 bg-transparent border-0 focus:ring-0 text-slate-900 dark:text-white text-xs"
                              />
                              {(q.options || []).length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveOption(qIdx, optIdx)}
                                  className="text-slate-400 hover:text-rose-500 cursor-pointer p-1"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 2. MULTI-SELECT (Multiple Checkboxes) */}
                    {q.type === 'multi_select' && (
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between">
                          <label className="font-semibold text-slate-700 dark:text-slate-300">
                            Multiple Choices (Check all boxes that apply as correct answers)
                          </label>
                          <button
                            type="button"
                            onClick={() => handleAddOption(qIdx)}
                            className="text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" /> Add Choice
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {(q.options || []).map((opt, optIdx) => {
                            const isChecked = (q.correctIndices || []).includes(optIdx);
                            return (
                              <div
                                key={optIdx}
                                className={`flex items-center gap-2 p-2 rounded-xl border ${
                                  isChecked
                                    ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20'
                                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={e => {
                                    const prevIndices = q.correctIndices || [];
                                    const nextIndices = e.target.checked
                                      ? [...prevIndices, optIdx]
                                      : prevIndices.filter(i => i !== optIdx);
                                    handleUpdateQuestion(qIdx, { correctIndices: nextIndices });
                                  }}
                                  className="w-4 h-4 text-emerald-600 accent-emerald-600 cursor-pointer"
                                />
                                <span className="font-bold text-slate-500 font-mono w-4">
                                  {String.fromCharCode(65 + optIdx)}.
                                </span>
                                <input
                                  type="text"
                                  required
                                  value={opt}
                                  onChange={e => handleOptionChange(qIdx, optIdx, e.target.value)}
                                  placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                                  className="flex-1 bg-transparent border-0 focus:ring-0 text-slate-900 dark:text-white text-xs"
                                />
                                {(q.options || []).length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveOption(qIdx, optIdx)}
                                    className="text-slate-400 hover:text-rose-500 cursor-pointer p-1"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 3. TRUE / FALSE */}
                    {q.type === 'true_false' && (
                      <div className="space-y-2 pt-1">
                        <label className="font-semibold text-slate-700 dark:text-slate-300">
                          Correct Truth Value
                        </label>
                        <div className="flex items-center gap-3">
                          <label
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl border cursor-pointer ${
                              q.correctIndex === 1
                                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 font-bold'
                                : 'border-slate-200 dark:border-slate-800'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`tf-${q.id}`}
                              checked={q.correctIndex === 1}
                              onChange={() => handleUpdateQuestion(qIdx, { correctIndex: 1 })}
                            />
                            <span>True (Factually Accurate)</span>
                          </label>

                          <label
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl border cursor-pointer ${
                              q.correctIndex === 0
                                ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 font-bold'
                                : 'border-slate-200 dark:border-slate-800'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`tf-${q.id}`}
                              checked={q.correctIndex === 0}
                              onChange={() => handleUpdateQuestion(qIdx, { correctIndex: 0 })}
                            />
                            <span>False (Factually Inaccurate)</span>
                          </label>
                        </div>
                      </div>
                    )}

                    {/* 4. FILL BLANK & 5. SHORT ANSWER */}
                    {(q.type === 'fill_blank' || q.type === 'short_answer') && (
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between">
                          <label className="font-semibold text-slate-700 dark:text-slate-300">
                            Accepted Answers (Case-insensitive string matches)
                          </label>
                          <button
                            type="button"
                            onClick={() => handleAddAcceptedAnswer(qIdx)}
                            className="text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" /> Add Accepted Synonym
                          </button>
                        </div>

                        <div className="space-y-2">
                          {(q.acceptedAnswers || []).map((ans, aIdx) => (
                            <div key={aIdx} className="flex items-center gap-2">
                              <span className="w-5 text-slate-400 font-mono text-[11px]">#{aIdx + 1}</span>
                              <input
                                type="text"
                                required
                                value={ans}
                                onChange={e => handleAcceptedAnswerChange(qIdx, aIdx, e.target.value)}
                                placeholder="e.g. public key"
                                className="flex-1 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                              />
                              {(q.acceptedAnswers || []).length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAcceptedAnswer(qIdx, aIdx)}
                                  className="text-slate-400 hover:text-rose-500 cursor-pointer p-1"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 6. ESSAY (Rubric) */}
                    {q.type === 'essay' && (
                      <div className="space-y-2 pt-1">
                        <label className="font-semibold text-slate-700 dark:text-slate-300">
                          Teacher Grading Rubric & Expected Core Arguments
                        </label>
                        <textarea
                          rows={2}
                          value={q.rubric || ''}
                          onChange={e => handleUpdateQuestion(qIdx, { rubric: e.target.value })}
                          placeholder="Outline expectations for student thesis, required citations, algorithmic proofs, or key definitions..."
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                        />
                      </div>
                    )}

                    {/* EXPLANATION / SOLUTION WALKTHROUGH */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Educational Explanation (Saved securely in answer keys)
                      </label>
                      <input
                        type="text"
                        value={q.explanation || ''}
                        onChange={e => handleUpdateQuestion(qIdx, { explanation: e.target.value })}
                        placeholder="Comprehensive rationale explaining why the answer is correct..."
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-[11px]"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: SETTINGS, RANDOMIZATION & LOCKDOWN */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Timing & Attempts Section */}
              <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-4">
                <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                  <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Duration & Attempt Limits</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Duration (Minutes) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="300"
                      required
                      value={durationMinutes}
                      onChange={e => setDurationMinutes(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Timer auto-submits when expired.</p>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Max Attempts Allowed *
                    </label>
                    <select
                      value={maxAttempts}
                      onChange={e => setMaxAttempts(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium"
                    >
                      <option value="1">1 Attempt (Strict Exam)</option>
                      <option value="2">2 Attempts (Best Score)</option>
                      <option value="3">3 Attempts</option>
                      <option value="5">5 Attempts</option>
                      <option value="0">Unlimited Attempts (Practice Mode)</option>
                    </select>
                  </div>
                </div>

                {/* Scheduling Windows */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        Scheduled Time Window
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Restrict test taking to specific dates and hours.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={hasScheduling}
                      onChange={e => setHasScheduling(e.target.checked)}
                      className="w-4 h-4 text-blue-600 accent-blue-600 rounded cursor-pointer"
                    />
                  </div>

                  {hasScheduling && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Opening Time (Available From)
                        </label>
                        <input
                          type="datetime-local"
                          value={opensAt}
                          onChange={e => setOpensAt(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Closing Time (Deadline)
                        </label>
                        <input
                          type="datetime-local"
                          value={closesAt}
                          onChange={e => setClosesAt(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Randomization Section */}
              <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-3">
                <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                  <Shuffle className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>Randomization & Order Persistence</span>
                </div>

                <div className="space-y-2.5 pt-1">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shuffleQuestions}
                      onChange={e => setShuffleQuestions(e.target.checked)}
                      className="w-4 h-4 text-purple-600 accent-purple-600 rounded"
                    />
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        Shuffle questions per attempt
                      </span>
                      <p className="text-[11px] text-slate-500">
                        Generates a randomized sequence per student, persisted for resuming and evaluation.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shuffleOptions}
                      onChange={e => setShuffleOptions(e.target.checked)}
                      className="w-4 h-4 text-purple-600 accent-purple-600 rounded"
                    />
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        Shuffle options within questions
                      </span>
                      <p className="text-[11px] text-slate-500">
                        Randomizes choice ordering for MCQ and multi-select choices.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Anti-Cheat & Proctored Lockdown Section */}
              <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                    <Shield className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                    <span>Proctored Lockdown & Violation Sentinel</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={lockdownEnabled}
                    onChange={e => setLockdownEnabled(e.target.checked)}
                    className="w-4 h-4 text-rose-600 accent-rose-600 rounded cursor-pointer"
                  />
                </div>

                {lockdownEnabled && (
                  <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Auto-Lock Violation Threshold
                        </label>
                        <select
                          value={maxViolations}
                          onChange={e => setMaxViolations(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                        >
                          <option value="1">1 Violation (Zero Tolerance)</option>
                          <option value="2">2 Violations</option>
                          <option value="3">3 Violations (Recommended)</option>
                          <option value="5">5 Violations</option>
                        </select>
                      </div>

                      <div className="flex items-center pt-5">
                        <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800 dark:text-slate-200">
                          <input
                            type="checkbox"
                            checked={autoSubmitOnLock}
                            onChange={e => setAutoSubmitOnLock(e.target.checked)}
                            className="w-4 h-4 text-rose-600 accent-rose-600 rounded"
                          />
                          <span>Auto-submit attempt when locked</span>
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                      <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={trackVisibility}
                          onChange={e => setTrackVisibility(e.target.checked)}
                          className="w-4 h-4 text-rose-600 accent-rose-600 rounded"
                        />
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          Tab Switching & Visibility
                        </span>
                      </label>

                      <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={blockCopyPaste}
                          onChange={e => setBlockCopyPaste(e.target.checked)}
                          className="w-4 h-4 text-rose-600 accent-rose-600 rounded"
                        />
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          Block Copy & Paste
                        </span>
                      </label>

                      <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={blockRightClick}
                          onChange={e => setBlockRightClick(e.target.checked)}
                          className="w-4 h-4 text-rose-600 accent-rose-600 rounded"
                        />
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          Block Right Click
                        </span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Form Actions Footer */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="text-slate-500 font-mono text-[11px]">
              🔒 Answer keys are automatically isolated to protected teacher document.
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting || classes.length === 0}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#005fb8] hover:bg-[#004e9a] text-white font-semibold shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{isSubmitting ? 'Saving Assessment...' : initialQuiz ? 'Update Assessment' : 'Publish Assessment'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
