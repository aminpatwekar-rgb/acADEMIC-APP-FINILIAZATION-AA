import React from 'react';
import { LoginPage } from './LoginPage';

interface SignupPageProps {
  onNavigate: (path: string) => void;
}

export function SignupPage({ onNavigate }: SignupPageProps) {
  return <LoginPage onNavigate={onNavigate} initialMode="signup" />;
}
