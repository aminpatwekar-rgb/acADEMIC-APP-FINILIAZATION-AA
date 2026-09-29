import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  LayoutGrid,
  GraduationCap,
  BookOpen,
  FileQuestion,
  Trophy,
  Award,
  Settings,
  ShieldAlert,
  ArrowRight,
  Sun,
  Moon,
  Laptop,
  Check,
  User,
  X,
  Clock,
  Sparkles,
  Lock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useViewRole } from '../../lib/viewRole';
import {
  subscribeClasses,
  subscribeAssignments,
  subscribeQuizzes,
  subscribeAllClassMembers,
  FirestoreClass,
  FirestoreAssignment,
  FirestoreQuiz,
  FirestoreClassMember
} from '../../lib/firebase/firestoreService';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
}

export function GlobalSearchModal({ isOpen, onClose, onNavigate }: GlobalSearchModalProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const { user, profile } = useAuth();
  const { actualRole, effectiveRole, setPreviewRole } = useViewRole();
  const { setMode, setThemeStyle } = useTheme();

  // Real-time Firestore records
  const [classes, setClasses] = useState<FirestoreClass[]>([]);
  const [assignments, setAssignments] = useState<FirestoreAssignment[]>([]);
  const [quizzes, setQuizzes] = useState<FirestoreQuiz[]>([]);
  const [classMembers, setClassMembers] = useState<FirestoreClassMember[]>([]);

  // Subscribe when modal is mounted or open
  useEffect(() => {
    if (!isOpen) return;

    const unsubClasses = subscribeClasses(setClasses);
    const unsubAssignments = subscribeAssignments(setAssignments);
    const unsubQuizzes = subscribeQuizzes(setQuizzes);
    const unsubMembers = subscribeAllClassMembers(setClassMembers);

    return () => {
      unsubClasses();
      unsubAssignments();
      unsubQuizzes();
      unsubMembers();
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Global hotkey: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // PERMISSION FILTERING:
  // Teachers and Admins see their classes/assessments.
  // Students only see classes they are enrolled in and assignments/quizzes for those classes.
  const isTeacherOrAdmin = effectiveRole === 'teacher' || effectiveRole === 'admin';
  const myClassIds = new Set(
    classMembers.filter(m => m.userId === user?.uid).map(m => m.classId)
  );

  const accessibleClasses = classes.filter(c => {
    if (isTeacherOrAdmin) return true;
    return myClassIds.has(c.id);
  });

  const accessibleClassIds = new Set(accessibleClasses.map(c => c.id));

  const accessibleAssignments = assignments.filter(a => {
    if (isTeacherOrAdmin) return true;
    return accessibleClassIds.has(a.classId);
  });

  const accessibleQuizzes = quizzes.filter(q => {
    if (isTeacherOrAdmin) return true;
    return accessibleClassIds.has(q.classId);
  });

  // Base navigation items
  const navItems = [
    { id: 'nav-dash', title: 'Dashboard', subtitle: 'Overview, analytics & active courses', category: 'Navigation', icon: LayoutGrid, path: '/dashboard' },
    { id: 'nav-classes', title: 'Classes & Course Roster', subtitle: 'View lectures, enrolled courses & syllabi', category: 'Navigation', icon: GraduationCap, path: '/classes' },
    { id: 'nav-assign', title: 'Assignments', subtitle: 'Problem sets, lab reports & submissions', category: 'Navigation', icon: BookOpen, path: '/assignments' },
    { id: 'nav-quizzes', title: 'Assessments & Quizzes', subtitle: 'Timed exams, practice & proctored evaluations', category: 'Navigation', icon: FileQuestion, path: '/quizzes' },
    { id: 'nav-leader', title: 'Leaderboard', subtitle: 'Global & class scholar point rankings', category: 'Navigation', icon: Trophy, path: '/leaderboard' },
    { id: 'nav-achieve', title: 'Achievements & Badges', subtitle: 'Earned digital ink & integrity honors', category: 'Navigation', icon: Award, path: '/achievements' },
    { id: 'nav-settings', title: 'Settings', subtitle: 'Personal preferences, notifications & study targets', category: 'Navigation', icon: Settings, path: '/settings' },
  ];

  if (actualRole === 'admin') {
    navItems.push({ id: 'nav-admin', title: 'Admin Workspace & Users', subtitle: 'Platform oversight & user administration', category: 'Administration', icon: ShieldAlert, path: '/admin' });
  }

  // Real searchable course classes (Respects Permissions)
  const classItems = accessibleClasses.map(c => {
    const studentCount = classMembers.filter(m => m.classId === c.id).length;
    return {
      id: `class-${c.id}`,
      title: `${c.code}: ${c.name}`,
      subtitle: `${c.subject || 'Course'} · Taught by ${c.instructor || 'Instructor'} · ${studentCount} students`,
      category: 'Classes',
      icon: GraduationCap,
      path: '/classes'
    };
  });

  // Real searchable assignments (Respects Permissions)
  const assignmentItems = accessibleAssignments.map(a => ({
    id: `assign-${a.id}`,
    title: a.title,
    subtitle: `${a.className || 'Class'} · Due ${a.dueDate ? new Date(a.dueDate).toLocaleDateString() : 'No deadline'} · ${a.points} pts`,
    category: 'Assignments',
    icon: BookOpen,
    path: '/assignments'
  }));

  // Real searchable quizzes (Respects Permissions)
  const quizItems = accessibleQuizzes.map(q => ({
    id: `quiz-${q.id}`,
    title: q.title,
    subtitle: `${q.className || 'Class'} · ${q.durationMinutes}m · ${q.points} marks · ${q.type}`,
    category: 'Quizzes',
    icon: FileQuestion,
    path: '/quizzes'
  }));

  // Quick action items (Theme, preview, etc.)
  const actionItems = [
    { id: 'mode-dark', title: 'Switch to Dark Mode', subtitle: 'High contrast obsidian appearance', category: 'Quick Action', icon: Moon, action: () => setMode('dark') },
    { id: 'mode-light', title: 'Switch to Light Mode', subtitle: 'Clean crisp document editor mode', category: 'Quick Action', icon: Sun, action: () => setMode('light') },
    { id: 'theme-midnight', title: 'Theme: Midnight Blue', subtitle: 'Deep navy accent style', category: 'Theming', icon: Check, action: () => setThemeStyle('midnight') },
    { id: 'theme-forest', title: 'Theme: Forest Emerald', subtitle: 'Natural emerald green style', category: 'Theming', icon: Check, action: () => setThemeStyle('forest') }
  ];

  const allSearchable = [
    ...classItems,
    ...assignmentItems,
    ...quizItems,
    ...navItems,
    ...actionItems
  ];

  const qLower = query.toLowerCase().trim();
  const filtered = qLower === ''
    ? navItems
    : allSearchable.filter(item =>
        item.title.toLowerCase().includes(qLower) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(qLower)) ||
        item.category.toLowerCase().includes(qLower)
      );

  const handleSelect = (item: any) => {
    onClose();
    if (item.action) {
      item.action();
    } else if (item.path) {
      onNavigate(item.path);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        handleSelect(filtered[selectedIndex]);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-start justify-center p-4 pt-16 sm:pt-24 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search classes, assignments, quizzes, or type commands..."
            className="w-full bg-transparent text-sm sm:text-base text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[10px] font-mono text-slate-400 font-semibold shadow-2xs">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-slate-100 dark:divide-slate-800/60">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No matching classes, assignments, or quizzes found for &quot;{query}&quot;.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = selectedIndex === idx;
              const Icon = item.icon;

              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-blue-50/70 dark:bg-blue-950/40 text-slate-900 dark:text-white'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-brand text-white shadow-2xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold truncate">
                          {item.title}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono font-medium shrink-0">
                          {item.category}
                        </span>
                      </div>
                      {item.subtitle && (
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <ArrowRight
                    className={`w-4 h-4 text-slate-400 shrink-0 ml-2 transition-transform ${
                      isSelected ? 'translate-x-1 text-brand dark:text-blue-400' : 'opacity-0'
                    }`}
                  />
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <span className="font-sans font-medium text-slate-500">
            {accessibleClasses.length} Classes · {accessibleAssignments.length} Assignments · {accessibleQuizzes.length} Quizzes
          </span>
        </div>
      </div>
    </div>
  );
}
