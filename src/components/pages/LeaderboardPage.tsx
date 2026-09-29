import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  subscribeUsers,
  subscribeSubmissions,
  subscribeClasses,
  subscribePointLedger,
  subscribeAllUserBadges,
  subscribeAllClassMembers,
  FirestoreSubmission,
  FirestoreClass,
  PointLedgerEntry,
  UserBadgeRecord,
  FirestoreClassMember
} from '../../lib/firebase/firestoreService';
import { OnyxUser } from '../../lib/auth';
import {
  Trophy,
  Flame,
  Medal,
  Sparkles,
  Search,
  Filter,
  TrendingUp,
  Award,
  Zap,
  CheckCircle2,
  Users,
  Inbox,
  GraduationCap,
  Star
} from 'lucide-react';

interface ScholarLeader {
  rank: number;
  id: string;
  name: string;
  email: string;
  points: number;
  badgeCount: number;
  streak: number;
  handwrittenCount: number;
  course: string;
  classId?: string;
  avatarBg: string;
  isCurrentUser: boolean;
}

export function LeaderboardPage() {
  const { user: currentAuthUser, profile } = useAuth();

  const [rawUsers, setRawUsers] = useState<OnyxUser[]>([]);
  const [submissions, setSubmissions] = useState<FirestoreSubmission[]>([]);
  const [classes, setClasses] = useState<FirestoreClass[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<PointLedgerEntry[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadgeRecord[]>([]);
  const [classMembers, setClassMembers] = useState<FirestoreClassMember[]>([]);

  // View mode: 'overall' vs 'class'
  const [viewScope, setViewScope] = useState<'overall' | 'class'>('overall');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cheeredIds, setCheeredIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const unsubUsers = subscribeUsers(setRawUsers);
    const unsubSubs = subscribeSubmissions(setSubmissions);
    const unsubClasses = subscribeClasses((cls) => {
      setClasses(cls);
      if (cls.length > 0 && selectedClassId === 'all') {
        setSelectedClassId(cls[0].id);
      }
    });
    const unsubLedger = subscribePointLedger(setLedgerEntries);
    const unsubBadges = subscribeAllUserBadges(setUserBadges);
    const unsubMembers = subscribeAllClassMembers(setClassMembers);

    return () => {
      unsubUsers();
      unsubSubs();
      unsubClasses();
      unsubLedger();
      unsubBadges();
      unsubMembers();
    };
  }, []);

  const handleCheer = (id: string) => {
    setCheeredIds(prev => ({ ...prev, [id]: true }));
  };

  const avatarColors = [
    'bg-primary',
    'bg-emerald-600',
    'bg-purple-600',
    'bg-primary',
    'bg-amber-600',
    'bg-rose-600',
    'bg-cyan-600'
  ];

  // Filter for student users (or include all scholars)
  const studentUsers = rawUsers.filter(u => u.role === 'student' || !u.role);

  // Compute scholar rankings combining point ledger and submissions
  const computedScholars: ScholarLeader[] = useMemo(() => {
    // 1. Group badges by user
    const badgeCountMap: Record<string, number> = {};
    userBadges.forEach(b => {
      badgeCountMap[b.userId] = (badgeCountMap[b.userId] || 0) + 1;
    });

    // 2. Group point ledger points by user and class
    const ledgerPointsMap: Record<string, number> = {};
    const ledgerPointsByClass: Record<string, Record<string, number>> = {};

    ledgerEntries.forEach(entry => {
      ledgerPointsMap[entry.userId] = (ledgerPointsMap[entry.userId] || 0) + (entry.points || 0);
      if (entry.classId) {
        if (!ledgerPointsByClass[entry.userId]) ledgerPointsByClass[entry.userId] = {};
        ledgerPointsByClass[entry.userId][entry.classId] =
          (ledgerPointsByClass[entry.userId][entry.classId] || 0) + (entry.points || 0);
      }
    });

    const targetClass = classes.find(c => c.id === selectedClassId);
    const targetClassCode = targetClass ? targetClass.code : 'Class';

    const list = studentUsers.map((u, idx) => {
      const isCurrentUser = currentAuthUser?.uid === u.uid;
      const userSubs = submissions.filter(s => s.studentId === u.uid);
      const isMember =
        classMembers.some(m => m.classId === selectedClassId && m.userId === u.uid) ||
        Boolean(targetClass?.roster?.some((r: any) => r.id === u.uid || r.email === u.email)) ||
        userSubs.some(s => s.classId === selectedClassId);

      let subPoints = 0;
      let totalPoints = 0;
      let course = 'General';
      let handwrittenCount = 0;

      if (viewScope === 'class' && selectedClassId !== 'all') {
        const classSubs = userSubs.filter(s => s.classId === selectedClassId);
        subPoints = classSubs.reduce(
          (acc, sub) =>
            acc +
            (sub.score ||
              (sub.status === 'Submitted' || sub.status === 'Completed' ? 10 : 0)),
          0
        );
        totalPoints = subPoints + (ledgerPointsByClass[u.uid]?.[selectedClassId] || 0);
        course = targetClassCode;
        handwrittenCount = classSubs.filter(s => s.mode === 'handwritten').length;
      } else {
        subPoints = userSubs.reduce(
          (acc, sub) =>
            acc +
            (sub.score ||
              (sub.status === 'Submitted' || sub.status === 'Completed' ? 10 : 0)),
          0
        );
        totalPoints = subPoints + (ledgerPointsMap[u.uid] || 0);
        const primarySub = userSubs[0];
        const matchedClass = primarySub ? classes.find(c => c.id === primarySub.classId) : classes[0];
        course = matchedClass ? matchedClass.code : 'General';
        handwrittenCount = userSubs.filter(s => s.mode === 'handwritten').length;
      }

      const badgeCount = badgeCountMap[u.uid] || 0;

      return {
        rank: 0,
        id: u.uid,
        name: u.displayName || (isCurrentUser ? profile?.displayName || 'You' : 'Scholar'),
        email: u.email || '',
        points: totalPoints,
        badgeCount,
        streak: Math.min(7, Math.max(1, handwrittenCount + (badgeCount > 0 ? 2 : 1))),
        handwrittenCount,
        course,
        classId: selectedClassId,
        isMember,
        avatarBg: avatarColors[idx % avatarColors.length],
        isCurrentUser
      };
    });

    // Filter by Scope / Class
    let filtered = list;
    if (viewScope === 'class' && selectedClassId !== 'all') {
      filtered = filtered.filter(s => s.isMember || s.isCurrentUser);
    }

    // Filter by Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        s => s.name.toLowerCase().includes(q) || s.course.toLowerCase().includes(q)
      );
    }

    // Sort descending by points, then by badgeCount
    filtered.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return b.badgeCount - a.badgeCount;
    });

    // Assign rank
    return filtered.map((item, index) => ({
      ...item,
      rank: index + 1
    }));
  }, [
    studentUsers,
    submissions,
    classes,
    ledgerEntries,
    userBadges,
    classMembers,
    viewScope,
    selectedClassId,
    searchQuery,
    currentAuthUser?.uid,
    profile?.displayName
  ]);

  // Current user's standing
  const currentUserStanding = computedScholars.find(s => s.isCurrentUser);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200 pb-16">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">
            <Trophy className="w-4 h-4" />
            <span>Academic Distinction Rankings</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Scholar Leaderboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Points earned from completed handwritten problem sets, rigorous timed quizzes, zero-violation integrity sessions, and unlocked honors.
          </p>
        </div>

        {/* Current User Standing Card */}
        {currentUserStanding && (
          <div className="p-3.5 sm:p-4 rounded-2xl border-2 border-amber-500/40 bg-amber-50/50 dark:bg-amber-950/20 shadow-xs flex items-center gap-4 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white font-mono font-bold text-sm flex items-center justify-center shadow-xs">
              #{currentUserStanding.rank}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900 dark:text-white">Your Rank</span>
                <span className="px-1.5 py-0.2 rounded bg-amber-500 text-white font-mono text-[9px] font-bold">
                  YOU
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-mono font-medium">
                {currentUserStanding.points} pts · {currentUserStanding.badgeCount} badges
              </p>
            </div>
          </div>
        )}
      </div>

      {/* VIEW SCOPE TABS (OVERALL vs CLASS) & FILTERS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        {/* Overall vs Class Toggle */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl w-fit text-xs font-semibold">
          <button
            type="button"
            onClick={() => setViewScope('overall')}
            className={`px-4 py-1.5 rounded-xl transition-all cursor-pointer ${
              viewScope === 'overall'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            Overall Leaderboard
          </button>
          <button
            type="button"
            onClick={() => setViewScope('class')}
            className={`px-4 py-1.5 rounded-xl transition-all cursor-pointer ${
              viewScope === 'class'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            Class Leaderboard
          </button>
        </div>

        {/* Right Controls: Class Dropdown (if class scope) + Search */}
        <div className="flex items-center gap-2 flex-wrap">
          {viewScope === 'class' && (
            <select
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200"
            >
              <option value="all">All Classes</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.code}: {c.name}
                </option>
              ))}
            </select>
          )}

          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search scholar..."
              className="w-full pl-8.5 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* TOP PODIUM (1st, 2nd, 3rd) */}
      {computedScholars.length >= 3 && !searchQuery && (
        <div className="grid grid-cols-3 gap-3 sm:gap-4 pt-2">
          {/* 2nd Place */}
          <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col items-center text-center shadow-2xs space-y-2">
            <div className="w-7 h-7 rounded-full bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-mono font-bold text-xs flex items-center justify-center">
              #2
            </div>
            <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-slate-800 font-bold text-slate-800 dark:text-slate-200 flex items-center justify-center text-sm shadow-xs">
              {computedScholars[1].name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate max-w-32">
                {computedScholars[1].name}
              </h4>
              <p className="text-[11px] text-slate-400 font-mono">
                {computedScholars[1].points} pts · {computedScholars[1].badgeCount} badges
              </p>
            </div>
          </div>

          {/* 1st Place (Crown) */}
          <div className="p-4 sm:p-5 rounded-2xl border-2 border-amber-400 dark:border-amber-600 bg-amber-50/40 dark:bg-amber-950/20 flex flex-col items-center text-center shadow-xs space-y-2 transform -translate-y-1">
            <div className="w-8 h-8 rounded-full bg-amber-500 text-white font-mono font-bold text-xs flex items-center justify-center shadow-xs">
              👑 #1
            </div>
            <div className="w-14 h-14 rounded-2xl bg-amber-500 text-white font-bold flex items-center justify-center text-base shadow-sm">
              {computedScholars[0].name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate max-w-36">
                {computedScholars[0].name}
              </h4>
              <p className="text-xs text-amber-700 dark:text-amber-300 font-mono font-bold">
                {computedScholars[0].points} pts · {computedScholars[0].badgeCount} badges
              </p>
            </div>
          </div>

          {/* 3rd Place */}
          <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col items-center text-center shadow-2xs space-y-2">
            <div className="w-7 h-7 rounded-full bg-amber-700/30 text-amber-900 dark:text-amber-200 font-mono font-bold text-xs flex items-center justify-center">
              #3
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 font-bold flex items-center justify-center text-sm shadow-xs">
              {computedScholars[2].name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate max-w-32">
                {computedScholars[2].name}
              </h4>
              <p className="text-[11px] text-slate-400 font-mono">
                {computedScholars[2].points} pts · {computedScholars[2].badgeCount} badges
              </p>
            </div>
          </div>
        </div>
      )}

      {/* LEADERBOARD TABLE */}
      <div className="p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
        {computedScholars.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No scholars found matching criteria.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {computedScholars.map(scholar => {
              const isTopThree = scholar.rank <= 3;

              return (
                <div
                  key={scholar.id}
                  className={`py-3.5 px-3 rounded-xl flex items-center justify-between gap-3 transition-colors ${
                    scholar.isCurrentUser
                      ? 'bg-amber-50/70 dark:bg-amber-950/30 border-2 border-amber-400/80 dark:border-amber-600/80 shadow-xs'
                      : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                  }`}
                >
                  {/* Left: Rank, Avatar, Name */}
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <span
                      className={`w-7 text-center font-mono font-bold text-xs sm:text-sm ${
                        scholar.rank === 1
                          ? 'text-amber-500 font-black'
                          : scholar.rank === 2
                          ? 'text-slate-500'
                          : scholar.rank === 3
                          ? 'text-amber-700'
                          : 'text-slate-400'
                      }`}
                    >
                      #{scholar.rank}
                    </span>

                    <div
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs sm:text-sm shrink-0 shadow-2xs ${scholar.avatarBg}`}
                    >
                      {scholar.name.slice(0, 2).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                          {scholar.name}
                        </span>
                        {scholar.isCurrentUser && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white font-mono text-[9px] font-bold shrink-0">
                            YOU
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">
                        {scholar.course} · {scholar.handwrittenCount} ink submissions
                      </p>
                    </div>
                  </div>

                  {/* Right: Badge Count, Points, Cheer */}
                  <div className="flex items-center gap-4 sm:gap-6 shrink-0">
                    {/* Badge Count */}
                    <div className="flex items-center gap-1.5 text-xs text-purple-600 dark:text-purple-400 font-semibold">
                      <Award className="w-3.5 h-3.5" />
                      <span>{scholar.badgeCount}</span>
                      <span className="hidden sm:inline text-slate-400 font-normal">
                        {scholar.badgeCount === 1 ? 'badge' : 'badges'}
                      </span>
                    </div>

                    {/* Points */}
                    <div className="text-right min-w-16">
                      <span className="font-mono font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                        {scholar.points}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-sans">
                        pts
                      </span>
                    </div>

                    {/* Cheer Button */}
                    <button
                      type="button"
                      onClick={() => handleCheer(scholar.id)}
                      className={`p-2 rounded-xl text-xs transition-colors cursor-pointer ${
                        cheeredIds[scholar.id]
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                      title="Cheer for this scholar"
                    >
                      {cheeredIds[scholar.id] ? '👏 Cheered' : '👏'}
                    </button>
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
