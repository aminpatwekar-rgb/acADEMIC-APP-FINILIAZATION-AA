/**
 * Admin Role Management Service
 * Handles secure admin role assignment and revocation via Firestore
 * ONLY callable by existing admins through security rules
 */

import {
  collection,
  doc,
  updateDoc,
  serverTimestamp,
  getDoc,
  setDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../firebase';

export interface AdminAssignment {
  userId: string;
  email: string;
  assignedAt: string;
  assignedBy: string;
  reason?: string;
}

/**
 * Promote a user to admin role
 * SECURITY: Only admins can call this; Firestore rules enforce via isAdmin() check
 */
export async function promoteUserToAdmin(
  userId: string,
  email: string,
  reason?: string
): Promise<void> {
  try {
    // 1. Update user profile role
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      throw new Error(`User ${userId} does not exist in Firestore`);
    }

    await updateDoc(userRef, {
      role: 'admin',
      updatedAt: serverTimestamp(),
    });

    // 2. Create audit log entry
    const auditLogRef = collection(db, 'admin_audit_log');
    await setDoc(doc(auditLogRef), {
      action: 'PROMOTE_TO_ADMIN',
      userId,
      email,
      reason: reason || 'No reason provided',
      timestamp: serverTimestamp(),
      performedBy: 'system', // In production, track the current user
    });

    console.log(`Successfully promoted ${email} (${userId}) to admin`);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `/users/${userId}`);
  }
}

/**
 * Revoke admin role from a user
 * SECURITY: Only admins can call this; Firestore rules enforce via isAdmin() check
 */
export async function revokeAdminRole(
  userId: string,
  email: string,
  reason?: string
): Promise<void> {
  try {
    // 1. Update user profile role back to student
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      throw new Error(`User ${userId} does not exist in Firestore`);
    }

    const currentRole = userSnap.data()?.role;
    if (currentRole !== 'admin') {
      throw new Error(`User ${email} is not an admin`);
    }

    await updateDoc(userRef, {
      role: 'student',
      updatedAt: serverTimestamp(),
    });

    // 2. Create audit log entry
    const auditLogRef = collection(db, 'admin_audit_log');
    await setDoc(doc(auditLogRef), {
      action: 'REVOKE_ADMIN',
      userId,
      email,
      reason: reason || 'No reason provided',
      timestamp: serverTimestamp(),
      performedBy: 'system',
    });

    console.log(`Successfully revoked admin role from ${email} (${userId})`);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `/users/${userId}`);
  }
}

/**
 * Check if a user has admin role by querying Firestore
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return false;
    }

    return userSnap.data()?.role === 'admin' && userSnap.data()?.active === true;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

/**
 * List all admins in the system
 */
export async function getAllAdmins(): Promise<AdminAssignment[]> {
  try {
    const usersRef = collection(db, 'users');
    const adminQuery = query(usersRef, where('role', '==', 'admin'), where('active', '==', true));
    const querySnap = await getDocs(adminQuery);

    return querySnap.docs.map((doc) => ({
      userId: doc.id,
      email: doc.data().email,
      assignedAt: doc.data().createdAt,
      assignedBy: 'system',
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, '/users');
  }
}
