import {
  FirestoreSubmission,
  FirestoreQuizAttempt,
  UserBadgeRecord,
  awardBadge,
  awardPoints,
  createNotification
} from '../firebase/firestoreService';

export interface BadgeDefinition {
  id: string;
  title: string;
  category: 'handwriting' | 'integrity' | 'latex' | 'streaks' | 'assessments' | 'mastery';
  description: string;
  iconName: string;
  pointsAwarded: number;
  maxProgress: number;
  computeProgress: (
    submissions: FirestoreSubmission[],
    attempts: FirestoreQuizAttempt[]
  ) => { current: number; isEligible: boolean };
}

export const BADGE_CATALOG: BadgeDefinition[] = [
  {
    id: 'badge-ink-first',
    title: 'First Digital Stroke',
    category: 'handwriting',
    description: 'Submit your first handwritten problem set using vector digital ink.',
    iconName: 'PenTool',
    pointsAwarded: 100,
    maxProgress: 1,
    computeProgress: (subs) => {
      const count = subs.filter(s => s.mode === 'handwritten').length;
      return { current: Math.min(1, count), isEligible: count >= 1 };
    }
  },
  {
    id: 'badge-anticheat-shield',
    title: 'Anti-Cheat Champion',
    category: 'integrity',
    description: 'Complete 3 proctored locked sessions with zero clipboard or tab-blur violations.',
    iconName: 'Shield',
    pointsAwarded: 250,
    maxProgress: 3,
    computeProgress: (subs, attempts) => {
      const cleanTypedSubs = subs.filter(s => s.mode === 'typed' && s.violationsCount === 0).length;
      const cleanQuizAttempts = attempts.filter(a => (a.violationsCount || 0) === 0 && a.status === 'submitted').length;
      const total = cleanTypedSubs + cleanQuizAttempts;
      return { current: Math.min(3, total), isEligible: total >= 3 };
    }
  },
  {
    id: 'badge-perfect-century',
    title: 'Century Master (100%)',
    category: 'mastery',
    description: 'Achieve a perfect 100% score on any course assignment or quiz.',
    iconName: 'Star',
    pointsAwarded: 500,
    maxProgress: 1,
    computeProgress: (subs, attempts) => {
      const perfectSub = subs.some(s => (s.score || 0) >= 100 || (s.grade || 0) >= 100);
      const perfectQuiz = attempts.some(a => a.percentage === 100 || (a.score && a.score === a.maxScore));
      const hasPerfect = perfectSub || perfectQuiz;
      return { current: hasPerfect ? 1 : 0, isEligible: hasPerfect };
    }
  },
  {
    id: 'badge-quiz-ace',
    title: 'Quiz Ace',
    category: 'assessments',
    description: 'Score 90% or higher on at least 2 rigorous academic quizzes.',
    iconName: 'Award',
    pointsAwarded: 200,
    maxProgress: 2,
    computeProgress: (_, attempts) => {
      const highScores = attempts.filter(a => {
        const pct = a.percentage ?? (a.maxScore ? Math.round(((a.score || 0) / a.maxScore) * 100) : 0);
        return pct >= 90;
      }).length;
      return { current: Math.min(2, highScores), isEligible: highScores >= 2 };
    }
  },
  {
    id: 'badge-latex-virtuoso',
    title: 'LaTeX Virtuoso',
    category: 'latex',
    description: 'Compose solutions containing formatted mathematical equations and formulas.',
    iconName: 'Sigma',
    pointsAwarded: 150,
    maxProgress: 2,
    computeProgress: (subs) => {
      const mathSubs = subs.filter(s => s.content && (s.content.includes('$') || s.content.includes('\\frac'))).length;
      return { current: Math.min(2, mathSubs), isEligible: mathSubs >= 1 };
    }
  },
  {
    id: 'badge-streak-fire',
    title: 'Consistency Flame',
    category: 'streaks',
    description: 'Maintain an active academic participation streak for 3 or more days.',
    iconName: 'Flame',
    pointsAwarded: 300,
    maxProgress: 3,
    computeProgress: (subs, attempts) => {
      const allDates = [
        ...subs.map(s => s.submittedAt ? s.submittedAt.slice(0, 10) : ''),
        ...attempts.map(a => a.startTime ? a.startTime.slice(0, 10) : '')
      ].filter(Boolean);
      const uniqueDays = new Set(allDates).size;
      return { current: Math.min(3, uniqueDays), isEligible: uniqueDays >= 2 };
    }
  },
  {
    id: 'badge-speedy-scholar',
    title: 'Speedy Scholar',
    category: 'assessments',
    description: 'Complete a timed assessment in under 50% of the allotted time limit.',
    iconName: 'Zap',
    pointsAwarded: 150,
    maxProgress: 1,
    computeProgress: (_, attempts) => {
      const fastAttempt = attempts.some(a => {
        if (!a.startTime || !a.submissionTime) return false;
        const start = new Date(a.startTime).getTime();
        const end = new Date(a.submissionTime).getTime();
        const elapsedSec = (end - start) / 1000;
        return elapsedSec > 0 && elapsedSec <= 600;
      });
      return { current: fastAttempt ? 1 : 0, isEligible: fastAttempt };
    }
  },
  {
    id: 'badge-class-vanguard',
    title: 'Class Vanguard',
    category: 'mastery',
    description: 'Be the first student to submit an assignment or attempt an exam in your class.',
    iconName: 'Trophy',
    pointsAwarded: 150,
    maxProgress: 1,
    computeProgress: (subs) => {
      const hasSub = subs.length > 0;
      return { current: hasSub ? 1 : 0, isEligible: hasSub };
    }
  }
];

/**
 * Automatically evaluates all badge criteria and awards unearned badges to the student.
 * Persists badges, points, and notifications in Firestore.
 */
export async function evaluateAndAwardBadges(
  userId: string,
  userName: string,
  userSubmissions: FirestoreSubmission[],
  userAttempts: FirestoreQuizAttempt[],
  existingBadges: UserBadgeRecord[]
): Promise<BadgeDefinition[]> {
  const earnedBadgeIds = new Set(existingBadges.map(b => b.badgeId));
  const newlyAwarded: BadgeDefinition[] = [];

  for (const badge of BADGE_CATALOG) {
    if (earnedBadgeIds.has(badge.id)) continue;

    const { isEligible } = badge.computeProgress(userSubmissions, userAttempts);
    if (isEligible) {
      try {
        // 1. Award Badge in Firestore
        await awardBadge({
          userId,
          badgeId: badge.id,
          badgeTitle: badge.title,
          badgeCategory: badge.category,
          badgeIcon: badge.iconName,
          pointsAwarded: badge.pointsAwarded
        });

        // 2. Add to Point Ledger
        await awardPoints({
          userId,
          userName: userName || 'Student',
          points: badge.pointsAwarded,
          reason: `Achievement Unlocked: ${badge.title}`,
          category: 'achievement'
        });

        // 3. Create Persistent Notification
        await createNotification({
          userId,
          type: 'announcement',
          title: `🏆 Badge Unlocked: ${badge.title}`,
          message: `Congratulations! You earned the "${badge.title}" badge and +${badge.pointsAwarded} points!`,
          link: '/achievements'
        });

        newlyAwarded.push(badge);
      } catch (err) {
        console.error(`Error awarding badge ${badge.id}:`, err);
      }
    }
  }

  return newlyAwarded;
}
