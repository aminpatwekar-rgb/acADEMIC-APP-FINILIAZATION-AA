import {
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged,
  updateProfile as updateAuthProfile,
  ActionCodeSettings
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase/index';

export type UserRole = 'student' | 'teacher' | 'admin';

export interface OnyxUser {
  uid: string;
  email: string;
  displayName: string;
  avatar: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  institution?: string;
}

export interface AuthState {
  user: FirebaseUser | null;
  profile: OnyxUser | null;
  loading: boolean;
  error: string | null;
}

/**
 * Creates or gets the Firestore user profile for a newly authenticated user.
 */
export async function getOrCreateUserProfile(
  fbUser: FirebaseUser,
  initialRole: UserRole = 'student',
  customDisplayName?: string
): Promise<OnyxUser> {
  const userRef = doc(db, 'users', fbUser.uid);
  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data() as OnyxUser;
      return {
        ...data,
        uid: fbUser.uid,
      };
    }

    const now = new Date().toISOString();
    const isAdmin = fbUser.email === 'merwynd12@gmail.com' || fbUser.email === 'aminpatwekar@gmail.com';
    const resolvedRole: UserRole = isAdmin ? 'admin' : (initialRole === 'admin' ? 'teacher' : initialRole);
    const resolvedDisplayName = customDisplayName || fbUser.displayName || 'ONYX Scholar';
    const resolvedAvatar = fbUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(resolvedDisplayName)}`;

    const newProfile: OnyxUser = {
      uid: fbUser.uid,
      email: fbUser.email || '',
      displayName: resolvedDisplayName,
      avatar: resolvedAvatar,
      role: resolvedRole,
      active: true,
      institution: 'ONYX Academy',
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(userRef, newProfile);
    return newProfile;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${fbUser.uid}`);
  }
}

/**
 * Sign up with email and password
 */
export async function signUpWithEmail(
  email: string,
  pass: string,
  displayName: string,
  role: UserRole = 'student'
): Promise<{ user: FirebaseUser; profile: OnyxUser }> {
  const cred = await createUserWithEmailAndPassword(auth, email, pass);
  
  // Set display name in Firebase Auth
  if (displayName) {
    await updateAuthProfile(cred.user, { displayName });
  }

  // Create document in Firestore
  const profile = await getOrCreateUserProfile(cred.user, role, displayName);

  // Send verification email
  try {
    await sendEmailVerification(cred.user);
  } catch (e) {
    console.warn('Could not automatically send verification email:', e);
  }

  return { user: cred.user, profile };
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(email: string, pass: string): Promise<FirebaseUser> {
  const cred = await signInWithEmailAndPassword(auth, email, pass);
  return cred.user;
}

/**
 * Sign in with Google OAuth popup
 */
export async function signInWithGoogle(defaultRole: UserRole = 'student'): Promise<{ user: FirebaseUser; profile: OnyxUser }> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const cred = await signInWithPopup(auth, provider);
  const profile = await getOrCreateUserProfile(cred.user, defaultRole, cred.user.displayName || undefined);
  return { user: cred.user, profile };
}

/**
 * Send password reset email
 */
export async function sendResetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

/**
 * Re-send email verification
 */
export async function resendVerificationEmail(): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('No authenticated user found');
  await sendEmailVerification(currentUser);
}

/**
 * Sign out
 */
export async function signOutUser(): Promise<void> {
  await firebaseSignOut(auth);
}

/**
 * Update user profile details (displayName, institution, avatar)
 * Note: Non-admins CANNOT change role or active status.
 */
export async function updateUserProfile(
  uid: string,
  updates: Partial<Pick<OnyxUser, 'displayName' | 'avatar' | 'institution'>>
): Promise<void> {
  const userRef = doc(db, 'users', uid);
  const payload = {
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  try {
    await updateDoc(userRef, payload);
    if (auth.currentUser && updates.displayName) {
      await updateAuthProfile(auth.currentUser, { displayName: updates.displayName });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
  }
}

/**
 * Subscribe to Auth State Changes and sync Firestore profile
 */
export function subscribeToAuth(
  callback: (state: { user: FirebaseUser | null; profile: OnyxUser | null; loading: boolean }) => void
): () => void {
  let unsubscribeProfile: (() => void) | null = null;

  const unsubscribeAuth = onAuthStateChanged(auth, (fbUser) => {
    if (unsubscribeProfile) {
      unsubscribeProfile();
      unsubscribeProfile = null;
    }

    if (!fbUser) {
      callback({ user: null, profile: null, loading: false });
      return;
    }

    const userRef = doc(db, 'users', fbUser.uid);
    unsubscribeProfile = onSnapshot(
      userRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const profile = { uid: fbUser.uid, ...snapshot.data() } as OnyxUser;
          callback({ user: fbUser, profile, loading: false });
        } else {
          // Document does not exist yet; provision it
          getOrCreateUserProfile(fbUser)
            .then((profile) => {
              callback({ user: fbUser, profile, loading: false });
            })
            .catch(() => {
              callback({ user: fbUser, profile: null, loading: false });
            });
        }
      },
      (error) => {
        console.error('Profile snapshot error:', error);
        callback({ user: fbUser, profile: null, loading: false });
      }
    );
  });

  return () => {
    unsubscribeAuth();
    if (unsubscribeProfile) unsubscribeProfile();
  };
}

export { promoteUserToAdmin, revokeAdminRole, isUserAdmin, getAllAdmins } from './adminManager';
