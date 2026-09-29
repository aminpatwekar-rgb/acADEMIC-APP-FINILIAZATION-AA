/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ViewRoleProvider } from './lib/viewRole';
import { ErrorBoundary } from './components/error-page';
import { Router } from './router';
import { isBootstrapAdminEmail } from './lib/config';

function AppContent() {
  const { profile, user, loading } = useAuth();
  // Authorization source of truth: the `role` field on the Firestore `users`
  // document (or an `admin` custom claim). The optional VITE_ADMIN_BOOTSTRAP_EMAILS
  // env var only pre-resolves the role for the very first admin before their
  // Firestore profile snapshot arrives — remove it in production.
  const actualRole = isBootstrapAdminEmail(user?.email)
    ? 'admin'
    : (profile?.role || 'student');

  return (
    <ViewRoleProvider actualRole={actualRole} authLoading={loading}>
      <Router />
    </ViewRoleProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
