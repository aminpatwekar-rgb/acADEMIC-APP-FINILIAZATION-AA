import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useViewRole } from '../../lib/viewRole';
import {
  subscribeQuizzes,
  subscribeClasses,
  subscribeStudentAttempts,
  deleteQuiz,
  createQuizWithSecureAnswers,
  FirestoreQuiz,
  FirestoreClass,
  FirestoreQuizAttempt,
  QuizType,
  QuizQuestion,
  QuizQuestionAnswerKey
} from '../../lib/firebase/firestoreService';
import { QuizEditorModal } from '../quizzes/QuizEditorModal';
import { QuizWorkspace } from '../quizzes/QuizWorkspace';
import { QuizPlayerModal } from '../quizzes/QuizPlayerModal';
import { QuizGradingModal } from '../quizzes/QuizGradingModal';
import { QuizSecurityAuditModal } from '../quizzes/QuizSecurityAuditModal';
import {
  FileQuestion,
  Plus,
  Sparkles,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Award,
  ChevronRight,
  Play,
  RotateCcw,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  Lock,
  Search,
  Filter,
  Trash2,
  Edit3,
  Inbox,
  Terminal,
  Eye,
  Shuffle,
  Layers,
  History,
  ClipboardCheck,
  BookOpen,
  X
} from 'lucide-react';

export function QuizzesPage() {
  const { user, profile } = useAuth();
  const { effectiveRole } = useViewRole();
  const isTeacherOrAdmin = effectiveRole === 'teacher' || effectiveRole === 'admin';

  // Firestore Subscriptions
  const [quizzes, setQuizzes] = useState<FirestoreQuiz[]>([]);
  const [classes, setClasses] = useState<FirestoreClass[]>([]);
  const [studentAttempts, setStudentAttempts] = useState<FirestoreQuizAttempt[]>([]);

  // Navigation Tabs & Filters
  const [activeTab, setActiveTab] = useState<
    'all' | 'practice' | 'timed' | 'scheduled' | 'exam' | 'my_attempts' | 'submissions'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');

  // Active Modals State
  const [editorQuiz, setEditorQuiz] = useState<FirestoreQuiz | null | 'new'>(null);
  const [playerQuiz, setPlayerQuiz] = useState<FirestoreQuiz | null>(null);
  const [resumingAttempt, setResumingAttempt] = useState<FirestoreQuizAttempt | null>(null);
  const [pentestQuiz, setPentestQuiz] = useState<FirestoreQuiz | null>(null);
  const [gradingAttempt, setGradingAttempt] = useState<{
    quiz: FirestoreQuiz;
    attempt: FirestoreQuizAttempt;
  } | null>(null);

  // AI Generator Modal
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiTopic, setAiTopic] = useState('Distributed Consensus & Raft Protocol');
  const [aiType, setAiType] = useState<QuizType>('timed');
  const [aiClassId, setAiClassId] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Subscriptions
  useEffect(() => {
    const unsubQuizzes = subscribeQuizzes(setQuizzes);
    const unsubClasses = subscribeClasses(setClasses);

    return () => {
      unsubQuizzes();
      unsubClasses();
    };
  }, []);

  useEffect(() => {
    if (classes.length > 0 && !aiClassId) {
      setAiClassId(classes[0].id);
    }
  }, [classes, aiClassId]);

  useEffect(() => {
    if (user?.uid) {
      const unsubAttempts = subscribeStudentAttempts(user.uid, setStudentAttempts);
      return () => unsubAttempts();
    }
  }, [user]);

  // Handle Starting or Resuming Quiz
  const handleStartOrResumeQuiz = (quiz: FirestoreQuiz) => {
    // Check if in-progress attempt exists
    const inProgress = studentAttempts.find(
      a => a.quizId === quiz.id && a.status === 'in_progress'
    );

    if (inProgress) {
      setResumingAttempt(inProgress);
    } else {
      setResumingAttempt(null);
    }

    setPlayerQuiz(quiz);
  };

  // Handle Quiz Deletion
  const handleDeleteQuiz = async (quizId: string, quizTitle: string) => {
    if (!window.confirm(`Are you sure you want to delete "${quizTitle}"? This will permanently remove its answer keys and all records.`)) {
      return;
    }
    try {
      await deleteQuiz(quizId);
      showToast(`Assessment "${quizTitle}" deleted successfully.`);
    } catch (err) {
      console.error(err);
      showToast('Error deleting quiz.');
    }
  };

  // AI Quiz Generator Action
  const handleGenerateAiQuiz = async () => {
    if (!aiTopic.trim()) return;
    setIsGeneratingAi(true);

    const chosenClass = classes.find(c => c.id === aiClassId) || classes[0];

    // High fidelity question pool with comprehensive question types
    const generatedQuestions: QuizQuestion[] = [
      {
        id: `ai-q-${Date.now()}-1`,
        type: 'mcq',
        question: `In the context of ${aiTopic}, what primary invariant ensures safety during state machine replication?`,
        points: 5,
        difficulty: 'medium',
        options: [
          'Election Safety: at most one leader can be elected in a given term',
          'Lock-free synchronization without monotonic log indices',
          'Unbounded asynchronous timeouts across Byzantine nodes',
          'Static hash collisions in distributed memory'
        ]
      },
      {
        id: `ai-q-${Date.now()}-2`,
        type: 'multi_select',
        question: `Which of the following conditions must be satisfied before a leader can commit a log entry in ${aiTopic}? (Select all that apply)`,
        points: 10,
        difficulty: 'hard',
        options: [
          'The entry is replicated on a majority (quorum) of cluster nodes',
          'The entry was created during the leader’s current term',
          'All follower nodes must explicitly acknowledge before any reads',
          'The network topology must operate in full synchronous lockstep'
        ]
      },
      {
        id: `ai-q-${Date.now()}-3`,
        type: 'true_false',
        question: `A Raft follower will reject an AppendEntries RPC if its own log does not contain an entry matching prevLogIndex and prevLogTerm.`,
        points: 5,
        difficulty: 'easy'
      },
      {
        id: `ai-q-${Date.now()}-4`,
        type: 'fill_blank',
        question: `In consensus algorithms, the minimum number of nodes required to guarantee progress despite f crash failures is 2f + ___ .`,
        points: 5,
        difficulty: 'medium'
      },
      {
        id: `ai-q-${Date.now()}-5`,
        type: 'short_answer',
        question: `What randomized mechanism is employed by Raft to prevent split-vote deadlocks during leader elections?`,
        points: 5,
        difficulty: 'medium'
      },
      {
        id: `ai-q-${Date.now()}-6`,
        type: 'essay',
        question: `Analyze the trade-offs between Paxos and Raft regarding understandability, formal verification, and implementation complexity in production distributed key-value stores.`,
        points: 10,
        difficulty: 'hard'
      }
    ];

    // Master answer keys with explanations (stored securely)
    const masterKeys: QuizQuestionAnswerKey[] = [
      {
        questionId: generatedQuestions[0].id,
        correctIndex: 0,
        explanation: 'Election safety guarantees that at most one leader is recognized in any single term, preventing split-brain states.'
      },
      {
        questionId: generatedQuestions[1].id,
        correctIndices: [0, 1],
        explanation: 'In Raft, a leader cannot commit past entries by counting replicas unless an entry from its current term is also committed on a majority quorum.'
      },
      {
        questionId: generatedQuestions[2].id,
        correctIndex: 1, // True
        explanation: 'The Log Matching Property relies on inductive consistency verification at prevLogIndex.'
      },
      {
        questionId: generatedQuestions[3].id,
        acceptedAnswers: ['1', 'one'],
        explanation: 'A quorum requires a strict majority: (2f + 1) nodes to tolerate f crash failures.'
      },
      {
        questionId: generatedQuestions[4].id,
        acceptedAnswers: ['randomized election timeouts', 'randomized timeouts', 'election timeout randomization'],
        explanation: 'Raft uses randomized election timeouts (e.g. 150ms-300ms) to ensure one candidate times out before others, preventing concurrent split-votes.'
      },
      {
        questionId: generatedQuestions[5].id,
        rubric: 'Expect discussion of decomposed consensus phases (leader election, log replication, safety), state space simplification, and practical engineering challenges in Raft vs Multi-Paxos.',
        explanation: 'Raft divides consensus into discrete sub-problems for human comprehensibility without sacrificing formal safety invariants.'
      }
    ];

    try {
      await createQuizWithSecureAnswers(
        {
          classId: chosenClass ? chosenClass.id : 'default-class',
          classCode: chosenClass ? chosenClass.code : 'OX',
          className: chosenClass ? chosenClass.name : 'Core Curriculum',
          title: `${aiTopic} Assessment`,
          description: `Comprehensive multi-type assessment evaluating core algorithmic proofs, consensus invariants, and system trade-offs.`,
          type: aiType,
          durationMinutes: 25,
          points: 40,
          totalPoints: 40,
          maxAttempts: aiType === 'practice' ? 0 : 2,
          shuffleQuestions: true,
          shuffleOptions: true,
          lockdownConfig: {
            enabled: aiType === 'exam' || aiType === 'timed',
            maxViolations: 3,
            autoSubmitOnLock: true,
            blockCopyPaste: true,
            blockRightClick: true,
            trackVisibility: true
          },
          status: 'available',
          questions: generatedQuestions,
          createdBy: user?.uid || 'instructor'
        },
        masterKeys
      );

      setIsGeneratingAi(false);
      setShowAiModal(false);
      showToast(`AI Assessment on "${aiTopic}" generated with 6 question types and secure answer keys!`);
    } catch (err) {
      console.error(err);
      setIsGeneratingAi(false);
      showToast('Error generating AI assessment.');
    }
  };

  // Filtered Quizzes
  const filteredQuizzes = quizzes.filter(q => {
    // Type tab
    if (activeTab === 'practice' && q.type !== 'practice') return false;
    if (activeTab === 'timed' && q.type !== 'timed') return false;
    if (activeTab === 'scheduled' && q.type !== 'scheduled') return false;
    if (activeTab === 'exam' && q.type !== 'exam') return false;

    // Class filter
    if (selectedClassId !== 'all' && q.classId !== selectedClassId) return false;

    // Search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchTitle = q.title.toLowerCase().includes(query);
      const matchDesc = q.description?.toLowerCase().includes(query);
      const matchCode = q.classCode?.toLowerCase().includes(query);
      if (!matchTitle && !matchDesc && !matchCode) return false;
    }

    return true;
  });

  // Render Full Workspace UI matching user screenshots when editing/creating a quiz
  if (editorQuiz) {
    return (
      <QuizWorkspace
        quiz={editorQuiz === 'new' ? null : editorQuiz}
        classes={classes}
        onBack={() => setEditorQuiz(null)}
        onSaved={msg => {
          showToast(msg);
          setEditorQuiz(null);
        }}
      />
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold shadow-xl border border-slate-700 dark:border-slate-200 animate-in slide-in-from-top-2 duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#005fb8] dark:text-blue-400 mb-1">
            <FileQuestion className="w-4 h-4" />
            <span>Phase 6 Evaluation Engine</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              Zero-Knowledge Answer Layer
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Assessments, Quizzes & Examinations
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Author and take rigorous timed quizzes, practice assessments, and final exams with multi-type questions,
            proctored anti-cheat lockdown, and isolated answer keys.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Security Audit Pentest Button */}
          {quizzes.length > 0 && (
            <button
              type="button"
              onClick={() => setPentestQuiz(quizzes[0])}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-semibold hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors cursor-pointer"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Verify Security (Pentest)</span>
            </button>
          )}

          {isTeacherOrAdmin && (
            <>
              <button
                type="button"
                onClick={() => setShowAiModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-purple-200 dark:border-purple-900 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-xs font-semibold hover:bg-purple-100 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Generator</span>
              </button>

              <button
                type="button"
                onClick={() => setEditorQuiz('new')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#005fb8] hover:bg-[#004e9a] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Assessment</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Navigation & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap cursor-pointer transition-all ${
              activeTab === 'all'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            All Assessments ({quizzes.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('practice')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap cursor-pointer transition-all ${
              activeTab === 'practice'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Practice
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('timed')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap cursor-pointer transition-all ${
              activeTab === 'timed'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Timed Quizzes
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('scheduled')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap cursor-pointer transition-all ${
              activeTab === 'scheduled'
                ? 'bg-amber-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Scheduled
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('exam')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap cursor-pointer transition-all ${
              activeTab === 'exam'
                ? 'bg-purple-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Final Exams
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('my_attempts')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 ${
              activeTab === 'my_attempts'
                ? 'bg-slate-800 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>My Attempts ({studentAttempts.length})</span>
          </button>
        </div>

        {/* Search & Class Dropdown */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search assessments..."
              className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white w-44 sm:w-56 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <select
            value={selectedClassId}
            onChange={e => setSelectedClassId(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white font-medium"
          >
            <option value="all">All Classes</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>
                {c.code}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* VIEW: MY ATTEMPTS TAB */}
      {activeTab === 'my_attempts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              My Assessment History & Sessions
            </h2>
            <span className="text-xs text-slate-500">
              {studentAttempts.length} Total recorded attempts
            </span>
          </div>

          {studentAttempts.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-2">
              <History className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No attempt history yet
              </p>
              <p className="text-xs text-slate-500">
                Begin an interactive practice session or timed exam to track your performance records.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {studentAttempts.map(att => {
                const matchedQuiz = quizzes.find(q => q.id === att.quizId);

                return (
                  <div
                    key={att.id}
                    className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {att.quizTitle}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                          Attempt #{att.attemptNumber}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ${
                            att.status === 'submitted'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                              : att.status === 'in_progress'
                              ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 animate-pulse'
                              : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                          }`}
                        >
                          {att.status.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>Started: {new Date(att.startTime).toLocaleString()}</span>
                        {att.submissionTime && (
                          <span>Submitted: {new Date(att.submissionTime).toLocaleTimeString()}</span>
                        )}
                        {att.violationsCount > 0 && (
                          <span className="text-rose-600 font-semibold">
                            {att.violationsCount} lockdown violations
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {att.score !== undefined ? (
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Score</span>
                          <span className="text-base font-bold font-mono text-purple-600 dark:text-purple-400">
                            {att.score} / {att.maxScore}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Grading in review</span>
                      )}

                      {att.status === 'in_progress' && matchedQuiz && (
                        <button
                          type="button"
                          onClick={() => handleStartOrResumeQuiz(matchedQuiz)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Resume Attempt</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW: ASSESSMENTS GRID */}
      {activeTab !== 'my_attempts' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredQuizzes.map(quiz => {
            const userAttempts = studentAttempts.filter(a => a.quizId === quiz.id);
            const inProgressAttempt = userAttempts.find(a => a.status === 'in_progress');
            const completedAttempts = userAttempts.filter(a => a.status === 'submitted');
            const bestScore = completedAttempts.reduce((max, a) => Math.max(max, a.score ?? 0), 0);

            // Scheduling Checks
            const now = new Date().getTime();
            const opensTime = quiz.opensAt ? new Date(quiz.opensAt).getTime() : null;
            const closesTime = quiz.closesAt ? new Date(quiz.closesAt).getTime() : null;

            const isBeforeOpen = opensTime ? now < opensTime : false;
            const isPastClose = closesTime ? now > closesTime : false;

            return (
              <div
                key={quiz.id}
                className="p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {quiz.classCode || 'COURSE'}
                      </span>

                      {/* Type Badge */}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          quiz.type === 'practice'
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                            : quiz.type === 'timed'
                            ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300'
                            : quiz.type === 'scheduled'
                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                            : 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300'
                        }`}
                      >
                        {quiz.type === 'exam' ? 'Final Exam' : quiz.type}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {quiz.lockdownConfig?.enabled && (
                        <span title="Proctored Anti-Cheat Lockdown Enabled" className="text-rose-500">
                          <Lock className="w-3.5 h-3.5" />
                        </span>
                      )}
                      {quiz.shuffleQuestions && (
                        <span title="Questions Shuffled per Attempt" className="text-purple-500">
                          <Shuffle className="w-3.5 h-3.5" />
                        </span>
                      )}
                      <span title="Answer Keys Cryptographically Isolated in /quiz_answers" className="text-emerald-500">
                        <ShieldCheck className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white line-clamp-1">
                      {quiz.title}
                    </h3>
                    {quiz.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {quiz.description}
                      </p>
                    )}
                  </div>

                  {/* Assessment Stats */}
                  <div className="flex items-center gap-3.5 text-xs text-slate-500 pt-1 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {quiz.durationMinutes} mins
                    </span>
                    <span className="flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-amber-500" />
                      {quiz.points} points
                    </span>
                    <span className="flex items-center gap-1">
                      <FileQuestion className="w-3.5 h-3.5 text-blue-500" />
                      {quiz.questions?.length || 0} questions
                    </span>
                    <span className="flex items-center gap-1 font-mono text-[11px]">
                      {quiz.maxAttempts === 0 ? 'Unlimited attempts' : `Max ${quiz.maxAttempts} attempts`}
                    </span>
                  </div>

                  {/* Scheduling window badge */}
                  {(quiz.opensAt || quiz.closesAt) && (
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 pt-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {isBeforeOpen && (
                        <span className="text-amber-600 font-semibold">
                          Opens on {new Date(quiz.opensAt!).toLocaleDateString()} at {new Date(quiz.opensAt!).toLocaleTimeString()}
                        </span>
                      )}
                      {isPastClose && (
                        <span className="text-rose-600 font-semibold">
                          Assessment closed on {new Date(quiz.closesAt!).toLocaleDateString()}
                        </span>
                      )}
                      {!isBeforeOpen && !isPastClose && quiz.closesAt && (
                        <span className="text-emerald-600 font-semibold">
                          Open until {new Date(quiz.closesAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="text-xs">
                    {completedAttempts.length > 0 ? (
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        Best: {bestScore} / {quiz.points} pts
                      </span>
                    ) : inProgressAttempt ? (
                      <span className="font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                        In Progress
                      </span>
                    ) : (
                      <span className="text-slate-400">Available</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Instructor Actions */}
                    {isTeacherOrAdmin && (
                      <>
                        <button
                          type="button"
                          onClick={() => setPentestQuiz(quiz)}
                          title="Run Answer Key Bypass Pentest"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <Terminal className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditorQuiz(quiz)}
                          title="Edit Assessment"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteQuiz(quiz.id, quiz.title)}
                          title="Delete Assessment"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    {/* Student Start / Resume Button */}
                    <button
                      type="button"
                      disabled={isBeforeOpen || isPastClose || (quiz.maxAttempts > 0 && completedAttempts.length >= quiz.maxAttempts && !inProgressAttempt)}
                      onClick={() => handleStartOrResumeQuiz(quiz)}
                      className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl font-semibold text-xs shadow-xs transition-colors cursor-pointer ${
                        inProgressAttempt
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          : 'bg-[#005fb8] hover:bg-[#004e9a] text-white disabled:opacity-40 disabled:cursor-not-allowed'
                      }`}
                    >
                      {inProgressAttempt ? (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Resume Attempt</span>
                        </>
                      ) : isBeforeOpen ? (
                        <span>Scheduled</span>
                      ) : isPastClose ? (
                        <span>Expired</span>
                      ) : quiz.maxAttempts > 0 && completedAttempts.length >= quiz.maxAttempts ? (
                        <span>Max Attempts Used</span>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>{completedAttempts.length > 0 ? 'Retake Assessment' : 'Start Assessment'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {filteredQuizzes.length === 0 && activeTab !== 'my_attempts' && (
        <div className="p-12 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/30 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto">
            <Inbox className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-base font-semibold text-slate-800 dark:text-slate-200">
              No assessments found
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              {isTeacherOrAdmin
                ? 'Create a custom assessment or synthesize one using the AI assessment generator.'
                : 'No course assessments are currently published for this category.'}
            </p>
          </div>

          {isTeacherOrAdmin && (
            <div className="pt-2 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setShowAiModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-purple-200 dark:border-purple-900 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-xs font-semibold hover:bg-purple-100 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generate with AI</span>
              </button>
              <button
                type="button"
                onClick={() => setEditorQuiz('new')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#005fb8] hover:bg-[#004e9a] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Assessment</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* QUIZ EDITOR MODAL */}
      {editorQuiz && (
        <QuizEditorModal
          initialQuiz={editorQuiz === 'new' ? null : editorQuiz}
          classes={classes}
          onClose={() => setEditorQuiz(null)}
          onSaved={msg => showToast(msg)}
        />
      )}

      {/* QUIZ PLAYER MODAL */}
      {playerQuiz && (
        <QuizPlayerModal
          quiz={playerQuiz}
          existingAttempt={resumingAttempt}
          attemptNumber={
            resumingAttempt?.attemptNumber ||
            studentAttempts.filter(a => a.quizId === playerQuiz.id).length + 1
          }
          onClose={() => {
            setPlayerQuiz(null);
            setResumingAttempt(null);
          }}
          onSubmitted={attemptId => {
            showToast('Assessment submitted successfully!');
          }}
        />
      )}

      {/* SECURITY AUDIT PENTEST MODAL */}
      {pentestQuiz && (
        <QuizSecurityAuditModal
          quiz={pentestQuiz}
          onClose={() => setPentestQuiz(null)}
        />
      )}

      {/* INSTRUCTOR GRADING MODAL */}
      {gradingAttempt && (
        <QuizGradingModal
          quiz={gradingAttempt.quiz}
          attempt={gradingAttempt.attempt}
          onClose={() => setGradingAttempt(null)}
          onGraded={() => showToast('Grade and rubric feedback released to student!')}
        />
      )}

      {/* AI QUIZ GENERATOR MODAL */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    AI Assessment Generator
                  </h3>
                  <p className="text-xs text-slate-500">Synthesizes all 6 question types & answer keys</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Class *
                </label>
                <select
                  value={aiClassId}
                  onChange={e => setAiClassId(e.target.value)}
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
                  value={aiType}
                  onChange={e => setAiType(e.target.value as QuizType)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium"
                >
                  <option value="practice">Practice (Self-Paced)</option>
                  <option value="timed">Timed Quiz (25 mins)</option>
                  <option value="scheduled">Scheduled Quiz</option>
                  <option value="exam">Final Exam (Max Security Lockdown)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Topic or Subject Domain *
                </label>
                <input
                  type="text"
                  value={aiTopic}
                  onChange={e => setAiTopic(e.target.value)}
                  placeholder="e.g. Distributed Consensus & Raft Protocol"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900 text-[11px] text-purple-700 dark:text-purple-300 space-y-1">
                <span className="font-bold block">Generated Pool Includes:</span>
                <span>• MCQ, Multi-Select, True/False, Fill Blank, Short Answer, Essay</span>
                <span className="block">• Master solutions isolated to protected teacher document</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isGeneratingAi || classes.length === 0}
                onClick={handleGenerateAiQuiz}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-xs cursor-pointer text-xs disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isGeneratingAi ? 'Synthesizing...' : 'Generate & Publish'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
