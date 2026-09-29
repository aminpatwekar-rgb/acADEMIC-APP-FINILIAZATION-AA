import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { isBootstrapAdminEmail } from '../lib/config';
import {
  OnyxUser,
  UserRole,
  signUpWithEmail,
  signInWithEmail,
  signInWithGoogle,
  sendResetPassword,
  resendVerificationEmail,
  signOutUser,
  updateUserProfile,
  subscribeToAuth,
  getOrCreateUserProfile
} from '../lib/auth/index';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: OnyxUser | null;
  loading: boolean;
  error: string | null;
  emailVerified: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string, name: string, role: UserRole) => Promise<void>;
  signInGoogle: (role?: UserRole) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfileData: (updates: Partial<Pick<OnyxUser, 'displayName' | 'avatar' | 'institution'>>) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  error: null,
  emailVerified: false,
  signIn: async () => {},
  signUp: async () => {},
  signInGoogle: async () => {},
  resetPassword: async () => {},
  resendVerification: async () => {},
  signOut: async () => {},
  updateProfileData: async () => {},
  clearError: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<OnyxUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    // Failsafe timeout so preview is never stuck in infinite loading state
    const failsafe = setTimeout(() => {
      if (active) setLoading(false);
    }, 1200);

    const unsubscribe = subscribeToAuth((state) => {
      if (active) {
        clearTimeout(failsafe);
        setUser(state.user);
        setProfile(state.profile);
        setLoading(state.loading);
      }
    });

    return () => {
      active = false;
      clearTimeout(failsafe);
      unsubscribe();
    };
  }, []);

  const signIn = async (email: string, pass: string) => {
    setError(null);
    try {
      await signInWithEmail(email, pass);
    } catch (err: any) {
      const msg = err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found'
        ? 'Invalid email or password.'
        : (err.message || 'Failed to sign in.');
      setError(msg);
      throw new Error(msg);
    }
  };

  const signUp = async (email: string, pass: string, name: string, role: UserRole) => {
    setError(null);
    try {
      const res = await signUpWithEmail(email, pass, name, role);
      setUser(res.user);
      setProfile(res.profile);
    } catch (err: any) {
      const msg = err.code === 'auth/email-already-in-use'
        ? 'This email address is already in use.'
        : (err.message || 'Failed to create account.');
      setError(msg);
      throw new Error(msg);
    }
  };

  const signInGoogle = async (defaultRole: UserRole = 'student') => {
    setError(null);
    try {
      const res = await signInWithGoogle(defaultRole);
      setUser(res.user);
      setProfile(res.profile);
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        const msg = err.code === 'auth/popup-blocked'
          ? 'Google sign-in popup was blocked by browser. Please enable popups or try Demo Sign-in.'
          : (err.message || 'Google authentication failed.');
        setError(msg);
        throw new Error(msg);
      }
    }
  };

  const resetPassword = async (email: string) => {
    setError(null);
    try {
      await sendResetPassword(email);
    } catch (err: any) {
      const msg = err.message || 'Could not send password reset email.';
      setError(msg);
      throw new Error(msg);
    }
  };

  const resendVerification = async () => {
    setError(null);
    try {
      await resendVerificationEmail();
    } catch (err: any) {
      const msg = err.message || 'Could not send verification email.';
      setError(msg);
      throw new Error(msg);
    }
  };

  const signOut = async () => {
    setError(null);
    await signOutUser();
    setUser(null);
    setProfile(null);
  };

  const updateProfileData = async (updates: Partial<Pick<OnyxUser, 'displayName' | 'avatar' | 'institution'>>) => {
    if (!user) return;
    await updateUserProfile(user.uid, updates);
    if (profile) {
      setProfile({
        ...profile,
        ...updates,
      });
    }
  };

  const clearError = () => setError(null);

  const emailVerified = user ? (user.emailVerified || isBootstrapAdminEmail(user.email)) : false;

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      error,
      emailVerified,
      signIn,
      signUp,
      signInGoogle,
      resetPassword,
      resendVerification,
      signOut,
      updateProfileData,
      clearError,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
