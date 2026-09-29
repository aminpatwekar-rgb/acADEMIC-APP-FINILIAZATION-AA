import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useViewRole } from '../../lib/viewRole';
import {
  subscribeClasses,
  subscribeAssignments,
  subscribeSubmissions,
  subscribeAllClassMembers,
  FirestoreClass,
  FirestoreAssignment,
  FirestoreSubmission,
  FirestoreClassMember
} from '../../lib/firebase/firestoreService';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  GraduationCap,
  Users,
  BookOpen,
  Inbox,
  ArrowRight,
  Sparkles,
  Plus
} from 'lucide-react';
import { Skeleton, SkeletonCard } from '../common/Skeleton';

interface DashboardPageProps {
  onNavigate: (path: string) => void;
}

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const { user, profile } = useAuth();
  const { effectiveRole, isPreviewing } = useViewRole();

  const isTeacherOrAdmin = effectiveRole === 'teacher' || effectiveRole === 'admin';
  const firstName = profile?.displayName?.split(' ')[0] || user?.displayName?.split(' ')[0] || 'Scholar';

  const [classes, setClasses] = useState<FirestoreClass[]>([]);
  const [assignments, setAssignments] = useState<FirestoreAssignment[]>([]);
  const [submissions, setSubmissions] = useState<FirestoreSubmission[]>([]);
  const [members, setMembers] = useState<FirestoreClassMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let loadedCount = 0;
    const markLoaded = () => {
      loadedCount++;
      if (loadedCount >= 2) setIsLoading(false);
    };

    const unsubClasses = subscribeClasses((data) => {
      setClasses(data);
      markLoaded();
    });
    const unsubAssignments = subscribeAssignments((data) => {
      setAssignments(data);
      markLoaded();
    });
    const unsubSubmissions = subscribeSubmissions((data) => {
      setSubmissions(data);
      markLoaded();
    });
    const unsubMembers = subscribeAllClassMembers((data) => {
      setMembers(data);
      markLoaded();
    });

    const timer = setTimeout(() => setIsLoading(false), 1200);

    return () => {
      clearTimeout(timer);
      unsubClasses();
      unsubAssignments();
      unsubSubmissions();
      unsubMembers();
    };
  }, []);

  // Compute live statistics from real Firebase collections
  const activeClassesCount = classes.filter(c => !c.archived).length;
  const enrolledStudentsCount = members.filter(m => m.role === 'student').length;
  const activeAssignmentsCount = assignments.filter(a => a.status === 'published').length;
  const pendingReviewCount = submissions.filter(s => s.status === 'Submitted' || s.status === 'Late' || s.status === 'Reviewed').length;

  // Student specific statistics
  const userSubmissions = submissions.filter(s => s.studentId === user?.uid);
  const userEnrolledClassesCount = members.filter(m => m.userId === user?.uid).length;
  const completedAssignmentsCount = userSubmissions.filter(s => s.status === 'Completed').length;
  const pendingWorkCount = Math.max(0, activeAssignmentsCount - completedAssignmentsCount);
  const overdueCount = assignments.filter(a => {
    if (a.status !== 'published' || !a.dueDate) return false;
    const parsed = new Date(a.dueDate);
    return !isNaN(parsed.getTime()) && new Date() > parsed;
  }).length;

  const totalTasks = assignments.length;
  const completionPercent = totalTasks > 0 ? Math.round((completedAssignmentsCount / totalTasks) * 100) : 0;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-primary dark:text-primary mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isTeacherOrAdmin ? 'Faculty Workspace' : 'Student Dashboard'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Welcome back, {firstName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {isTeacherOrAdmin
              ? 'Here is an overview of your active classes, assignments, and student submissions.'
              : 'Track your tasks, upcoming deadlines, and study progress.'
            }
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          {isTeacherOrAdmin ? (
            <>
              <button
                type="button"
                onClick={() => onNavigate('/classes')}
                className="btn-sm btn-secondary"
              >
                Manage Classes
              </button>
              <button
                type="button"
                onClick={() => onNavigate('/assignments')}
                className="btn-sm btn-primary"
              >
                <span>View Assignments</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onNavigate('/classes')}
                className="btn-sm btn-secondary"
              >
                Join Class
              </button>
              <button
                type="button"
                onClick={() => onNavigate('/assignments')}
                className="btn-sm btn-primary"
              >
                <span>Assignments</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* 4 Stat Cards calculated from real Firebase data */}
      {isTeacherOrAdmin ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Active Classes */}
          <div className="card p-5 group hover:-translate-y-0.5 hover:shadow-lift transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                ACTIVE CLASSES
              </span>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 text-white flex items-center justify-center shadow-soft group-hover:scale-110 transition-transform duration-200"><GraduationCap className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-white mt-3 font-mono">
              {activeClassesCount}
            </div>
          </div>

          {/* Enrolled Students */}
          <div className="card p-5 group hover:-translate-y-0.5 hover:shadow-lift transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                ENROLLED STUDENTS
              </span>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 text-white flex items-center justify-center shadow-soft group-hover:scale-110 transition-transform duration-200"><Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-white mt-3 font-mono">
              {enrolledStudentsCount}
            </div>
          </div>

          {/* Active Assignments */}
          <div className="card p-5 group hover:-translate-y-0.5 hover:shadow-lift transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                ACTIVE ASSIGNMENTS
              </span>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 text-white flex items-center justify-center shadow-soft group-hover:scale-110 transition-transform duration-200"><BookOpen className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-white mt-3 font-mono">
              {activeAssignmentsCount}
            </div>
          </div>

          {/* Pending Review */}
          <div className="card p-5 group hover:-translate-y-0.5 hover:shadow-lift transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                PENDING REVIEW
              </span>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 text-white flex items-center justify-center shadow-soft group-hover:scale-110 transition-transform duration-200"><Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-white mt-3 font-mono">
              {pendingReviewCount}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Pending Work */}
            <div className="card p-5 group hover:-translate-y-0.5 hover:shadow-lift transition-all duration-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  PENDING WORK
                </span>
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 text-white flex items-center justify-center shadow-soft group-hover:scale-110 transition-transform duration-200"><Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-bold text-slate-900 dark:text-white mt-3 font-mono">
                {pendingWorkCount}
              </div>
            </div>

            {/* Overdue */}
            <div className="card p-5 group hover:-translate-y-0.5 hover:shadow-lift transition-all duration-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  OVERDUE
                </span>
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 text-white flex items-center justify-center shadow-soft group-hover:scale-110 transition-transform duration-200"><AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-bold text-slate-900 dark:text-white mt-3 font-mono">
                {overdueCount}
              </div>
            </div>

            {/* Completed */}
            <div className="card p-5 group hover:-translate-y-0.5 hover:shadow-lift transition-all duration-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  COMPLETED
                </span>
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 text-white flex items-center justify-center shadow-soft group-hover:scale-110 transition-transform duration-200"><CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-bold text-slate-900 dark:text-white mt-3 font-mono">
                {completedAssignmentsCount}
              </div>
            </div>

            {/* Enrolled Classes */}
            <div className="card p-5 group hover:-translate-y-0.5 hover:shadow-lift transition-all duration-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  ENROLLED CLASSES
                </span>
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 text-white flex items-center justify-center shadow-soft group-hover:scale-110 transition-transform duration-200"><GraduationCap className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-bold text-slate-900 dark:text-white mt-3 font-mono">
                {userEnrolledClassesCount}
              </div>
            </div>
          </div>

          {/* Student Progress Bar */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Overall Completion <span className="font-normal text-slate-400">({completedAssignmentsCount} of {totalTasks} tasks completed)</span>
              </span>
              <span className="font-bold text-primary dark:text-primary">{completionPercent}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary-strong rounded-full transition-all duration-500 ease-out"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
          </div>
        </>
      )}

      {/* Assignments Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              {isTeacherOrAdmin ? 'Recent Assignments' : 'Your Assignments'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isTeacherOrAdmin
                ? 'Quick access to student progress and deadlines'
                : 'Stay ahead of due dates and submit work'
              }
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('/assignments')}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white font-medium cursor-pointer"
          >
            <span>{isTeacherOrAdmin ? 'All assignments' : 'View all'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Real assignments list or proper empty state */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : assignments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assignments.slice(0, 4).map(asg => (
              <div
                key={asg.id}
                onClick={() => onNavigate('/assignments')}
                className="card-hover p-5 cursor-pointer space-y-2.5 group/asg"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-slate-600 dark:text-slate-400">{asg.classCode || 'Section'}</span>
                  <span className="text-slate-400">{asg.points} pts</span>
                </div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">{asg.title}</h4>
                <p className="text-xs text-slate-500 line-clamp-2">{asg.description}</p>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Due {asg.dueDate}
                  </span>
                  <span className="font-semibold text-primary flex items-center gap-1 group-hover/asg:gap-2 transition-all">
                    Open <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-10 flex flex-col items-center justify-center text-center bg-white/50 dark:bg-slate-900/30">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mb-3">
              <Inbox className="w-6 h-6" />
            </div>

            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
              {isTeacherOrAdmin ? 'No assignments yet' : 'No assignments active'}
            </h3>

            <p className="text-xs text-slate-400 max-w-sm mb-4">
              {isTeacherOrAdmin
                ? 'Create a class and post your first assignment to start collecting and grading student work.'
                : isPreviewing
                  ? 'Previewing as Student — no assignments published for this account.'
                  : 'You have no pending assignments right now. Great job!'
              }
            </p>

            {isTeacherOrAdmin && (
              <button
                type="button"
                onClick={() => onNavigate('/classes')}
                className="btn-sm btn-primary"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Get Started with Classes</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
