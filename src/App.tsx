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

function AppContent() {
  const { profile, user, loading } = useAuth();
  // Ensure bootstrap admin email resolves to admin even prior to Firestore snapshot response
  const actualRole = (user?.email === 'merwynd12@gmail.com' || user?.email === 'aminpatwekar@gmail.com')
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
