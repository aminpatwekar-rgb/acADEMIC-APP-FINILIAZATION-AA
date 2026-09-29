import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { useViewRole } from './lib/viewRole';
import { routeManifest, AppRoutePath } from './routeTree.gen';
import { LandingPage } from './components/pages/LandingPage';
import { LoginPage } from './components/pages/LoginPage';
import { SignupPage } from './components/pages/SignupPage';
import { ResetPasswordPage } from './components/pages/ResetPasswordPage';
import { DashboardPage } from './components/pages/DashboardPage';
import { ClassesPage } from './components/pages/ClassesPage';
import { AssignmentsPage } from './components/pages/AssignmentsPage';
import { QuizzesPage } from './components/pages/QuizzesPage';
import { LeaderboardPage } from './components/pages/LeaderboardPage';
import { AchievementsPage } from './components/pages/AchievementsPage';
import { SettingsPage } from './components/pages/SettingsPage';
import { AdminPage } from './components/pages/AdminPage';
import { Sidebar } from './components/navigation/Sidebar';
import { RolePreviewBanner } from './lib/viewRole';
import { EmailVerificationBanner } from './components/auth/EmailVerificationBanner';
import { AuthLoadingState } from './components/navigation/AuthLoadingState';
import { UnauthorizedState } from './components/navigation/UnauthorizedState';
import { RouteErrorPage } from './components/error-page';
import { Breadcrumbs } from './components/navigation/Breadcrumbs';

export function Router() {
  const { user, profile, loading } = useAuth();
  const { effectiveRole, actualRole, isPreviewing, resetRole } = useViewRole();

  // Browser path state
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || '/';
  });

  // Sync with browser history back/forward
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setCurrentPath(path);
    window.scrollTo(0, 0);
  };

  // Route metadata lookup
  const currentRoute = routeManifest[currentPath] || routeManifest['/'];

  // Update document title
  useEffect(() => {
    if (currentRoute?.title) {
      document.title = currentRoute.title;
    }
  }, [currentRoute]);

  // Loading State
  if (loading) {
    return <AuthLoadingState />;
  }

  // Auth-only Routes (/login, /signup, /reset-password)
  // If user is already signed in, redirect to dashboard
  if (currentRoute.isAuthOnly && user) {
    navigate('/dashboard');
    return <AuthLoadingState />;
  }

  // Protected Routes
  if (currentRoute.requiresAuth && !user) {
    return <LoginPage onNavigate={navigate} />;
  }

  // Admin Protected Route
  if (currentRoute.requiredRole === 'admin') {
    // 1. Non-admin users cannot access admin under any circumstances
    if (actualRole !== 'admin') {
      return <UnauthorizedState onNavigate={navigate} requiredRole="admin" isPreviewing={false} />;
    }
    // 2. If an admin is previewing as student or teacher, show restricted preview warning with quick exit
    if (isPreviewing) {
      return (
        <UnauthorizedState
          onNavigate={navigate}
          requiredRole="admin"
          isPreviewing={true}
          effectiveRole={effectiveRole}
          onExitPreview={() => {
            resetRole();
            navigate('/admin');
          }}
        />
      );
    }
  }

  // Public Landing Page
  if (currentPath === '/') {
    return <LandingPage onNavigate={navigate} />;
  }

  // Auth pages
  if (currentPath === '/login') {
    return <LoginPage onNavigate={navigate} />;
  }
  if (currentPath === '/signup') {
    return <SignupPage onNavigate={navigate} />;
  }
  if (currentPath === '/reset-password') {
    return <ResetPasswordPage onNavigate={navigate} />;
  }

  // Render Protected Shell with Sidebar & Banners
  const renderRouteContent = () => {
    switch (currentPath) {
      case '/dashboard':
        return <DashboardPage onNavigate={navigate} />;
      case '/classes':
        return <ClassesPage />;
      case '/assignments':
        return <AssignmentsPage />;
      case '/quizzes':
        return <QuizzesPage />;
      case '/leaderboard':
        return <LeaderboardPage />;
      case '/achievements':
        return <AchievementsPage />;
      case '/settings':
        return <SettingsPage />;
      case '/admin':
        return <AdminPage />;
      default:
        return <RouteErrorPage path={currentPath} onNavigate={navigate} />;
    }
  };

  return (
    <div className="min-h-screen bg-background dark:bg-slate-950 flex flex-col lg:flex-row text-slate-900 dark:text-slate-100">
      {/* Persistent Left Sidebar */}
      <Sidebar currentPath={currentPath} onNavigate={navigate} />

      {/* Main App Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <main id="main-content" tabIndex={-1} className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto focus:outline-none">
          {/* Top Breadcrumb Navigation */}
          <Breadcrumbs currentPath={currentPath} onNavigate={navigate} />

          {/* Amber Role Preview Banner */}
          <RolePreviewBanner />

          {/* Email Verification Banner */}
          <EmailVerificationBanner />

          {/* Page View */}
          {renderRouteContent()}
        </main>
      </div>
    </div>
  );
}
