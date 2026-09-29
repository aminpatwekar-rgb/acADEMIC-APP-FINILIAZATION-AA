import React from 'react';
import {
  ChevronRight,
  Home,
  LayoutGrid,
  GraduationCap,
  BookOpen,
  FileQuestion,
  Trophy,
  Award,
  Settings,
  ShieldAlert,
  ArrowLeft
} from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: React.ComponentType<{ className?: string }>;
  isCurrent?: boolean;
}

interface BreadcrumbsProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  customItems?: BreadcrumbItem[];
  showBackButton?: boolean;
}

export function Breadcrumbs({
  currentPath,
  onNavigate,
  customItems,
  showBackButton = true
}: BreadcrumbsProps) {
  // If custom items are passed, use them; otherwise infer from currentPath
  const getBreadcrumbs = (): BreadcrumbItem[] => {
    if (customItems && customItems.length > 0) {
      return customItems;
    }

    const homeItem: BreadcrumbItem = {
      label: 'Home',
      path: '/dashboard',
      icon: Home
    };

    switch (currentPath) {
      case '/dashboard':
        return [
          {
            label: 'Dashboard',
            path: '/dashboard',
            icon: LayoutGrid,
            isCurrent: true
          }
        ];
      case '/classes':
        return [
          homeItem,
          {
            label: 'Classes',
            path: '/classes',
            icon: GraduationCap,
            isCurrent: true
          }
        ];
      case '/assignments':
        return [
          homeItem,
          {
            label: 'Assignments & Submissions',
            path: '/assignments',
            icon: BookOpen,
            isCurrent: true
          }
        ];
      case '/quizzes':
        return [
          homeItem,
          {
            label: 'Quizzes & Assessments',
            path: '/quizzes',
            icon: FileQuestion,
            isCurrent: true
          }
        ];
      case '/leaderboard':
        return [
          homeItem,
          {
            label: 'Leaderboard',
            path: '/leaderboard',
            icon: Trophy,
            isCurrent: true
          }
        ];
      case '/achievements':
        return [
          homeItem,
          {
            label: 'Achievements & Badges',
            path: '/achievements',
            icon: Award,
            isCurrent: true
          }
        ];
      case '/settings':
        return [
          homeItem,
          {
            label: 'Settings & Preferences',
            path: '/settings',
            icon: Settings,
            isCurrent: true
          }
        ];
      case '/admin':
        return [
          homeItem,
          {
            label: 'System Administration',
            path: '/admin',
            icon: ShieldAlert,
            isCurrent: true
          }
        ];
      default:
        return [
          homeItem,
          {
            label: currentPath.replace('/', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Page',
            path: currentPath,
            isCurrent: true
          }
        ];
    }
  };

  const items = getBreadcrumbs();
  const isDashboard = currentPath === '/dashboard';
  const parentItem = items.length > 1 ? items[items.length - 2] : null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-4 sm:mb-6 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm"
    >
      <ol className="flex items-center flex-wrap gap-1.5 sm:gap-2">
        {items.map((item, index) => {
          const isLast = index === items.length - 1 || item.isCurrent;
          const Icon = item.icon;

          return (
            <li key={item.path || index} className="flex items-center gap-1.5 sm:gap-2">
              {index > 0 && (
                <ChevronRight
                  className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600 shrink-0"
                  aria-hidden="true"
                />
              )}

              {isLast ? (
                <span
                  aria-current="page"
                  className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-200/60 dark:border-slate-700/60"
                >
                  {Icon && <Icon className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                  <span>{item.label}</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => item.path && onNavigate(item.path)}
                  className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 font-medium transition-colors px-1.5 py-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {Icon && <Icon className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />}
                  <span>{item.label}</span>
                </button>
              )}
            </li>
          );
        })}
      </ol>

      {/* Quick Parent Return Action for non-root views */}
      {showBackButton && !isDashboard && parentItem && parentItem.path && (
        <button
          type="button"
          onClick={() => onNavigate(parentItem.path!)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800 shadow-2xs transition-all focus:outline-none focus:ring-2 focus:ring-amber-500"
          aria-label={`Back to ${parentItem.label}`}
        >
          <ArrowLeft className="w-3 h-3 text-slate-400" />
          <span>Back to {parentItem.label}</span>
        </button>
      )}
    </nav>
  );
}
