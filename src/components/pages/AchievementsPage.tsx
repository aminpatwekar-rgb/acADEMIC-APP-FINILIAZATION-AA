import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  subscribeSubmissions,
  subscribeUserBadges,
  subscribeStudentAttempts,
  subscribePointLedger,
  PointLedgerEntry,
  FirestoreSubmission,
  FirestoreQuizAttempt,
  UserBadgeRecord
} from '../../lib/firebase/firestoreService';
import {
  BADGE_CATALOG,
  BadgeDefinition,
  evaluateAndAwardBadges
} from '../../lib/gamification/badgeEngine';
import confetti from 'canvas-confetti';
import {
  Award,
  Zap,
  Shield,
  BookCheck,
  Star,
  Sparkles,
  CheckCircle2,
  Flame,
  Sigma,
  PenTool,
  Trophy,
  Lock,
  Gift,
  Inbox,
  Clock,
  Check,
  RotateCw
} from 'lucide-react';

export function AchievementsPage() {
  const { user, profile } = useAuth();

  const [submissions, setSubmissions] = useState<FirestoreSubmission[]>([]);
  const [attempts, setAttempts] = useState<FirestoreQuizAttempt[]>([]);
  const [earnedBadges, setEarnedBadges] = useState<UserBadgeRecord[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<PointLedgerEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'badges' | 'ledger'>('badges');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  // Subscribe to submissions, student quiz attempts, user badges, and point ledger in Firestore
  useEffect(() => {
    if (!user?.uid) return;

    const unsubSubs = subscribeSubmissions(setSubmissions);
    const unsubAttempts = subscribeStudentAttempts(user.uid, setAttempts);
    const unsubBadges = subscribeUserBadges(user.uid, setEarnedBadges);
    const unsubLedger = subscribePointLedger(setLedgerEntries);

    return () => {
      unsubSubs();
      unsubAttempts();
      unsubBadges();
      unsubLedger();
    };
  }, [user?.uid]);

  const mySubmissions = user ? submissions.filter(s => s.studentId === user.uid) : [];
  const myAttempts = user ? attempts.filter(a => a.studentId === user.uid) : [];
  const myLedger = user ? ledgerEntries.filter(e => e.userId === user.uid) : [];

  // Run automatic badge evaluation whenever data loads or changes
  const runAutomaticEvaluation = async () => {
    if (!user?.uid) return;
    setIsEvaluating(true);
    try {
      const newlyAwarded = await evaluateAndAwardBadges(
        user.uid,
        profile?.displayName || 'Scholar',
        mySubmissions,
        myAttempts,
        earnedBadges
      );

      if (newlyAwarded.length > 0) {
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 }
          });
        } catch (_e) {}

        const names = newlyAwarded.map(b => b.title).join(', ');
        setToastMessage(`🏆 Congratulations! You unlocked: ${names}`);
        setTimeout(() => setToastMessage(null), 5000);
      }
    } catch (err) {
      console.error('Error during badge evaluation:', err);
    } finally {
      setIsEvaluating(false);
    }
  };

  useEffect(() => {
    if (user?.uid && mySubmissions.length > 0) {
      runAutomaticEvaluation();
    }
  }, [user?.uid, mySubmissions.length, myAttempts.length]);

  const earnedBadgeMap = new Map(earnedBadges.map(b => [b.badgeId, b]));

  // Icon mapping helper
  const getBadgeIcon = (iconName: string) => {
    switch (iconName) {
      case 'PenTool':
        return PenTool;
      case 'Shield':
        return Shield;
      case 'Star':
        return Star;
      case 'Award':
        return Award;
      case 'Sigma':
        return Sigma;
      case 'Flame':
        return Flame;
      case 'Zap':
        return Zap;
      case 'Trophy':
        return Trophy;
      default:
        return Award;
    }
  };

  const computedBadges = BADGE_CATALOG.map(def => {
    const earnedRecord = earnedBadgeMap.get(def.id);
    const { current, isEligible } = def.computeProgress(mySubmissions, myAttempts);
    const isUnlocked = Boolean(earnedRecord) || isEligible;

    return {
      ...def,
      currentProgress: Math.min(def.maxProgress, current),
      isUnlocked,
      unlockedAt: earnedRecord?.unlockedAt,
      icon: getBadgeIcon(def.iconName)
    };
  });

  const filteredBadges = computedBadges.filter(b => {
    if (selectedCategory === 'all') return true;
    return b.category === selectedCategory;
  });

  const unlockedCount = computedBadges.filter(b => b.isUnlocked).length;
  const totalEarnedPoints = earnedBadges.reduce((acc, b) => acc + (b.pointsAwarded || 0), 0);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200 pb-16">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold shadow-xl border border-slate-700 animate-in slide-in-from-top-2 duration-150">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-600 dark:text-purple-400 mb-1">
            <Award className="w-4 h-4" />
            <span>Academic Honors & Recognition</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Achievements & Badges
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Earn persistent badges for digital vector handwriting, proctored anti-cheat integrity, mathematical typesetting, and high-score mastery.
          </p>
        </div>

        {/* Evaluate Button */}
        <button
          type="button"
          disabled={isEvaluating}
          onClick={runAutomaticEvaluation}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors shadow-2xs cursor-pointer self-start sm:self-center disabled:opacity-50"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isEvaluating ? 'animate-spin text-blue-600' : ''}`} />
          <span>{isEvaluating ? 'Evaluating...' : 'Check Honors'}</span>
        </button>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            BADGES UNLOCKED
          </span>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 dark:text-white flex items-baseline gap-1.5">
            <span>{unlockedCount}</span>
            <span className="text-xs text-slate-400 font-normal">/ {BADGE_CATALOG.length}</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            GAMIFICATION POINTS EARNED
          </span>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-purple-600 dark:text-purple-400">
            +{totalEarnedPoints} pts
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            AUTOMATIC BADGE ENGINE
          </span>
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold text-xs pt-1">
            <CheckCircle2 className="w-4 h-4" />
            <span>Active & Awarding in Background</span>
          </div>
        </div>
      </div>

      {/* VIEW SWITCHER: BADGES & HONORS vs POINT LEDGER */}
      <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl w-fit text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('badges')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'badges'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold shadow-xs'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          Badges & Honors ({unlockedCount}/{BADGE_CATALOG.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ledger')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'ledger'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold shadow-xs'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <span>Point Ledger</span>
          <span className="px-1.5 py-0.2 rounded-md bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-mono text-[10px]">
            {myLedger.length}
          </span>
        </button>
      </div>

      {activeTab === 'badges' ? (
        <>
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl w-fit text-xs font-semibold overflow-x-auto max-w-full">
            {[
              { id: 'all', label: 'All Honors' },
              { id: 'handwriting', label: 'Handwriting' },
              { id: 'integrity', label: 'Integrity' },
              { id: 'assessments', label: 'Assessments' },
              { id: 'latex', label: 'LaTeX' },
              { id: 'streaks', label: 'Streaks' },
              { id: 'mastery', label: 'Mastery' }
            ].map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer shrink-0 ${
                  selectedCategory === cat.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Badges Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBadges.map(badge => {
              const Icon = badge.icon;
              const isUnlocked = badge.isUnlocked;

              return (
                <div
                  key={badge.id}
                  className={`p-5 rounded-2xl border transition-all shadow-2xs space-y-4 relative overflow-hidden flex flex-col justify-between ${
                    isUnlocked
                      ? 'border-purple-200 dark:border-purple-900/60 bg-white dark:bg-slate-900'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 opacity-80'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-xs ${
                          isUnlocked
                            ? 'bg-purple-600 text-white shadow-purple-500/20'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                        }`}
                      >
                        {isUnlocked ? <Icon className="w-5 h-5" /> : <Lock className="w-4 h-4" />}
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                          isUnlocked
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}
                      >
                        +{badge.pointsAwarded} XP
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>{badge.title}</span>
                        {isUnlocked && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        {badge.description}
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar & Status */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-slate-400">
                        {isUnlocked ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                            <Check className="w-3 h-3 stroke-[3]" /> Unlocked
                          </span>
                        ) : (
                          'In Progress'
                        )}
                      </span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {badge.currentProgress} / {badge.maxProgress}
                      </span>
                    </div>

                    <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isUnlocked ? 'bg-purple-600' : 'bg-slate-400 dark:bg-slate-600'
                        }`}
                        style={{
                          width: `${Math.min(100, (badge.currentProgress / badge.maxProgress) * 100)}%`
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        /* POINT LEDGER VIEW */
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Personal Point Ledger
              </h3>
              <p className="text-xs text-slate-400">
                Audited transaction log of all academic points and experience awarded to your account.
              </p>
            </div>
            <div className="px-4 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-right">
              <span className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400 tracking-wider block">
                Total Ledger Balance
              </span>
              <span className="text-xl font-black font-mono text-purple-700 dark:text-purple-300">
                {myLedger.reduce((sum, e) => sum + (e.points || 0), 0)} pts
              </span>
            </div>
          </div>

          {myLedger.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 space-y-2">
              <Award className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="font-semibold text-slate-600 dark:text-slate-400">
                No point ledger transactions yet.
              </p>
              <p>Turn in assignments, take quizzes, and earn badges to populate your points ledger!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Date & Time</th>
                    <th className="py-2.5 px-3">Transaction / Reason</th>
                    <th className="py-2.5 px-3">Course / Scope</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-right">Points Earned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {myLedger.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 text-slate-400 text-[11px] whitespace-nowrap">
                        {new Date(entry.createdAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="py-3 px-3 font-sans font-semibold text-slate-900 dark:text-white">
                        {entry.reason}
                      </td>
                      <td className="py-3 px-3 text-slate-500 font-sans">
                        {entry.className || 'General'}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-sans font-bold capitalize bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {entry.category}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        +{entry.points} pts
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
