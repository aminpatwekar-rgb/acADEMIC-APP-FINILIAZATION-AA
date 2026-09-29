/**
 * TanStack Router Route Tree Generation
 * ONYX Learning Management System
 */

export interface RouteMeta {
  path: string;
  isPublic?: boolean;
  isAuthOnly?: boolean;
  requiresAuth?: boolean;
  requiredRole?: 'student' | 'teacher' | 'admin';
  title: string;
}

export const routeManifest: Record<string, RouteMeta> = {
  '/': {
    path: '/',
    isPublic: true,
    title: 'ONYX — Modern Handwriting & LMS Submission Flow',
  },
  '/login': {
    path: '/login',
    isAuthOnly: true,
    title: 'Sign In — ONYX',
  },
  '/signup': {
    path: '/signup',
    isAuthOnly: true,
    title: 'Create Account — ONYX',
  },
  '/reset-password': {
    path: '/reset-password',
    isAuthOnly: true,
    title: 'Reset Password — ONYX',
  },
  '/dashboard': {
    path: '/dashboard',
    requiresAuth: true,
    title: 'Dashboard — ONYX',
  },
  '/classes': {
    path: '/classes',
    requiresAuth: true,
    title: 'Classes — ONYX',
  },
  '/assignments': {
    path: '/assignments',
    requiresAuth: true,
    title: 'Assignments — ONYX',
  },
  '/quizzes': {
    path: '/quizzes',
    requiresAuth: true,
    title: 'Quizzes — ONYX',
  },
  '/leaderboard': {
    path: '/leaderboard',
    requiresAuth: true,
    title: 'Leaderboard — ONYX',
  },
  '/achievements': {
    path: '/achievements',
    requiresAuth: true,
    title: 'Achievements — ONYX',
  },
  '/settings': {
    path: '/settings',
    requiresAuth: true,
    title: 'Settings — ONYX',
  },
  '/admin': {
    path: '/admin',
    requiresAuth: true,
    requiredRole: 'admin',
    title: 'System Administration — ONYX',
  },
};

export type AppRoutePath = keyof typeof routeManifest;
