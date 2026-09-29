/**
 * Centralized Firestore Service for ONYX LMS
 * Source of truth: Real Firebase Firestore Database
 * Zero mock/fake records. When Firestore is empty, returns empty arrays.
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth, OperationType, handleFirestoreError } from './index';
import { OnyxUser } from '../auth/index';

export interface FirestoreClass {
  id: string;
  code: string;
  name: string;
  subject: string;
  section: string;
  description: string;
  ownerId: string;
  instructor: string;
  schedule: string;
  room: string;
  bannerPreset: string;
  bannerColor: string;
  archived: boolean;
  joinCode: string;
  createdAt: string;
  updatedAt?: string;
  roster?: any[];
}

export interface FirestoreClassMember {
  id: string;
  classId: string;
  userId: string;
  name: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  rollNumber: string;
  erNumber: string;
  srNumber: string;
  avatarBg?: string;
  attendance: number;
  progress: number;
  grade: number;
  joinedAt: string;
}

export type AssignmentPriority = 'low' | 'medium' | 'high';
export type AssignmentSubmissionType = 'handwritten' | 'typed' | 'both';
export type AssignmentLifecycleStatus = 'draft' | 'published' | 'archived';

export interface FirestoreAssignment {
  id: string;
  classId: string;
  classCode?: string;
  className?: string;
  title: string;
  subject: string;
  instructions: string;
  description?: string; // backwards compatibility alias
  dueDate: string;
  dueTime: string;
  maximumMarks: number;
  points?: number; // backwards compatibility alias
  priority: AssignmentPriority;
  submissionType: AssignmentSubmissionType;
  allowImages: boolean;
  allowAutocorrect: boolean;
  allowVoiceTyping: boolean;
  status: AssignmentLifecycleStatus;
  mode?: 'handwritten' | 'typed_anticheat' | 'latex_math' | 'any'; // legacy support
  createdAt: string;
  updatedAt?: string;
}

export type StudentSubmissionStatus =
  | 'Not Started'
  | 'In Progress'
  | 'Submitted'
  | 'Late'
  | 'Reviewed'
  | 'Returned'
  | 'Completed';

export interface HandwrittenPage {
  pageNumber: number;
  imageUrl: string;
  fileName?: string;
  caption?: string;
}

export interface TypedInsertedImage {
  id: string;
  url: string;
  caption: string;
  order: number;
}

export interface SubmissionViolation {
  id: string;
  type: string;
  message: string;
  timestamp: string;
}

export interface FirestoreSubmission {
  id: string;
  assignmentId: string;
  classId: string;
  studentId: string;
  studentName: string;
  content: string;
  mode: 'handwritten' | 'typed';
  status: StudentSubmissionStatus;
  handwrittenPages?: HandwrittenPage[];
  typedImages?: TypedInsertedImage[];
  violations?: SubmissionViolation[];
  violationsCount: number;
  score?: number;
  grade?: number;
  gradeFeedback?: string;
  improvementNotes?: string;
  reviewerId?: string;
  reviewerName?: string;
  gradeReleased?: boolean;
  savedAt?: string;
  submittedAt: string;
  reviewedAt?: string;
}

export type QuizType = 'practice' | 'timed' | 'scheduled' | 'exam';
export type QuestionType = 'mcq' | 'multi_select' | 'true_false' | 'fill_blank' | 'short_answer' | 'essay';
export type QuestionDifficulty = 'easy' | 'medium' | 'hard';

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  question: string;
  points: number;
  difficulty: QuestionDifficulty;
  options?: string[]; // for mcq & multi_select
  // Sensitive fields are stripped when saving to public /quizzes/{quizId}
  // Kept optional for local editor state and teacher inspection
  correctIndex?: number;
  correctIndices?: number[];
  acceptedAnswers?: string[];
  explanation?: string;
  rubric?: string;
}

export interface QuizLockdownConfig {
  enabled: boolean;
  maxViolations: number;
  autoSubmitOnLock: boolean;
  blockCopyPaste: boolean;
  blockRightClick: boolean;
  trackVisibility: boolean;
}

export interface FirestoreQuiz {
  id: string;
  classId: string;
  classCode?: string;
  className?: string;
  title: string;
  description?: string;
  type: QuizType;
  durationMinutes: number;
  points: number;
  totalPoints?: number;
  passingPercentage?: number;
  maxAttempts: number; // 0 = unlimited
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  opensAt?: string;
  closesAt?: string;
  lockdownConfig: QuizLockdownConfig;
  status?: 'available' | 'completed' | 'scheduled' | 'closed';
  lastScore?: number;
  questions: QuizQuestion[];
  instructorId?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface QuizQuestionAnswerKey {
  questionId: string;
  correctIndex?: number; // for mcq, true_false
  correctIndices?: number[]; // for multi_select
  acceptedAnswers?: string[]; // for fill_blank, short_answer
  explanation?: string;
  rubric?: string; // for essay
}

export interface FirestoreQuizAnswerKey {
  id: string; // matches quizId
  quizId: string;
  questions: QuizQuestionAnswerKey[];
  updatedAt: string;
}

export type QuizAttemptStatus = 'in_progress' | 'submitted' | 'timed_out' | 'locked';

export interface QuizViolation {
  id: string;
  type: 'tab_switch' | 'blur' | 'copy_attempt' | 'paste_attempt' | 'context_menu';
  message: string;
  timestamp: string;
}

export interface FirestoreQuizAttempt {
  id: string;
  quizId: string;
  quizTitle: string;
  quizType: QuizType;
  classId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  attemptNumber: number;
  startTime: string;
  submissionTime?: string;
  status: QuizAttemptStatus;
  timeRemainingSeconds: number;
  shuffledQuestions: QuizQuestion[]; // persisted order of questions and options
  answers: Record<string, any>; // questionId -> answer
  violations: QuizViolation[];
  violationsCount: number;
  isLocked: boolean;
  score?: number;
  maxScore?: number;
  percentage?: number;
  feedback?: Record<string, { isCorrect?: boolean; pointsAwarded?: number; feedback?: string }>;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface FirestoreAnnouncement {
  id: string;
  classId?: string;
  authorId: string;
  authorName: string;
  authorRole: 'teacher' | 'admin';
  title: string;
  content: string;
  targetAudience: 'everyone' | 'teachers' | 'students';
  isPlatformWide: boolean;
  attachments?: { name: string; url: string; size: string }[];
  createdAt: string;
}

export interface FirestoreResource {
  id: string;
  classId: string;
  title: string;
  fileName: string;
  fileSize: string;
  fileType: string;
  category: string;
  uploadedBy: string;
  downloadUrl?: string;
  createdAt: string;
}

export interface FirestoreDiscussion {
  id: string;
  classId: string;
  authorId: string;
  authorName: string;
  authorRole: 'student' | 'teacher' | 'admin';
  title: string;
  content: string;
  tag: string;
  pinned?: boolean;
  locked?: boolean;
  replies: {
    id: string;
    authorId: string;
    authorName: string;
    authorRole: 'student' | 'teacher' | 'admin';
    content: string;
    createdAt: string;
  }[];
  createdAt: string;
}

// -------------------------------------------------------------
// CLASSES
// -------------------------------------------------------------

export function subscribeClasses(onData: (classes: FirestoreClass[]) => void) {
  const colRef = collection(db, 'classes');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: FirestoreClass[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...d.data() } as FirestoreClass);
      });
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'classes');
    }
  );
}

export async function createClass(data: Omit<FirestoreClass, 'id'>): Promise<string> {
  try {
    const colRef = collection(db, 'classes');
    const docRef = await addDoc(colRef, {
      ...data,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'classes');
  }
}

export async function updateClass(classId: string, updates: Partial<FirestoreClass>): Promise<void> {
  try {
    const docRef = doc(db, 'classes', classId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `classes/${classId}`);
  }
}

export async function deleteClass(classId: string): Promise<void> {
  try {
    const docRef = doc(db, 'classes', classId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `classes/${classId}`);
  }
}

// -------------------------------------------------------------
// CLASS MEMBERS
// -------------------------------------------------------------

export function subscribeClassMembers(classId: string, onData: (members: FirestoreClassMember[]) => void) {
  const colRef = collection(db, 'class_members');
  const q = query(colRef, where('classId', '==', classId));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: FirestoreClassMember[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...d.data() } as FirestoreClassMember);
      });
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'class_members');
    }
  );
}

export function subscribeAllClassMembers(onData: (members: FirestoreClassMember[]) => void) {
  const colRef = collection(db, 'class_members');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: FirestoreClassMember[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...d.data() } as FirestoreClassMember);
      });
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'class_members');
    }
  );
}

export async function addClassMember(data: Omit<FirestoreClassMember, 'id'> & { joinedAt?: string }): Promise<string> {
  try {
    const colRef = collection(db, 'class_members');
    const docRef = await addDoc(colRef, {
      ...data,
      joinedAt: data.joinedAt || new Date().toISOString()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'class_members');
  }
}

export async function removeClassMember(memberId: string): Promise<void> {
  try {
    const docRef = doc(db, 'class_members', memberId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `class_members/${memberId}`);
  }
}

// -------------------------------------------------------------
// ASSIGNMENTS
// -------------------------------------------------------------

export function subscribeAssignments(onData: (assignments: FirestoreAssignment[]) => void) {
  const colRef = collection(db, 'assignments');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: FirestoreAssignment[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...d.data() } as FirestoreAssignment);
      });
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'assignments');
    }
  );
}

export async function createAssignment(data: Omit<FirestoreAssignment, 'id' | 'createdAt'> & { createdAt?: string }): Promise<string> {
  try {
    const colRef = collection(db, 'assignments');
    const docRef = await addDoc(colRef, {
      ...data,
      createdAt: data.createdAt || new Date().toISOString()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'assignments');
  }
}

export async function updateAssignment(id: string, updates: Partial<FirestoreAssignment>): Promise<void> {
  try {
    const docRef = doc(db, 'assignments', id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `assignments/${id}`);
  }
}

export async function publishAssignment(id: string): Promise<void> {
  return updateAssignment(id, { status: 'published' });
}

export async function unpublishAssignment(id: string): Promise<void> {
  return updateAssignment(id, { status: 'draft' });
}

export async function archiveAssignment(id: string): Promise<void> {
  return updateAssignment(id, { status: 'archived' });
}

export async function restoreAssignment(id: string): Promise<void> {
  return updateAssignment(id, { status: 'published' });
}

export async function duplicateAssignment(original: FirestoreAssignment): Promise<string> {
  try {
    const { id, ...rest } = original;
    return await createAssignment({
      ...rest,
      title: `${original.title} (Copy)`,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'assignments');
  }
}

export async function deleteAssignment(id: string): Promise<void> {
  try {
    const docRef = doc(db, 'assignments', id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `assignments/${id}`);
  }
}

// -------------------------------------------------------------
// SUBMISSIONS
// -------------------------------------------------------------

export function subscribeSubmissions(onData: (submissions: FirestoreSubmission[]) => void) {
  const colRef = collection(db, 'submissions');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: FirestoreSubmission[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...d.data() } as FirestoreSubmission);
      });
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'submissions');
    }
  );
}

export async function createSubmission(data: Omit<FirestoreSubmission, 'id' | 'submittedAt'> & { submittedAt?: string }): Promise<string> {
  try {
    const colRef = collection(db, 'submissions');
    const docRef = await addDoc(colRef, {
      ...data,
      submittedAt: data.submittedAt || new Date().toISOString()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'submissions');
  }
}

export async function updateSubmission(id: string, updates: Partial<FirestoreSubmission>): Promise<void> {
  try {
    const docRef = doc(db, 'submissions', id);
    await updateDoc(docRef, updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `submissions/${id}`);
  }
}

/**
 * Uploads a student submission file (Image/PDF) to Firebase Storage.
 * Falls back to resilient data URL if cloud storage has CORS or bucket rules restriction.
 */
export async function uploadSubmissionFile(
  file: File | Blob,
  path: string
): Promise<string> {
  try {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return downloadUrl;
  } catch (error) {
    console.warn('Firebase Storage upload error, falling back to data URL:', error);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}

// -------------------------------------------------------------
// QUIZZES
// -------------------------------------------------------------

export function subscribeQuizzes(onData: (quizzes: FirestoreQuiz[]) => void) {
  const colRef = collection(db, 'quizzes');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: FirestoreQuiz[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...d.data() } as FirestoreQuiz);
      });
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'quizzes');
    }
  );
}

export async function createQuiz(data: Omit<FirestoreQuiz, 'id' | 'createdAt'> & { createdAt?: string }): Promise<string> {
  try {
    const colRef = collection(db, 'quizzes');
    const docRef = await addDoc(colRef, {
      ...data,
      createdAt: data.createdAt || new Date().toISOString()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'quizzes');
  }
}

/**
 * Creates a Quiz with complete separation of student questions and instructor answer keys.
 * Student document (/quizzes/{quizId}) has question text, choices, points, difficulty.
 * Instructor document (/quiz_answers/{quizId}) contains correct indices, accepted answers, and explanations.
 */
export async function createQuizWithSecureAnswers(
  quizData: Omit<FirestoreQuiz, 'id' | 'createdAt'> & { createdAt?: string },
  answerKeys: QuizQuestionAnswerKey[]
): Promise<string> {
  try {
    // 1. Sanitize student-facing questions: NEVER send answer keys to students
    const sanitizedQuestions: QuizQuestion[] = quizData.questions.map(q => {
      const sanitized: QuizQuestion = {
        id: q.id,
        type: q.type || 'mcq',
        question: q.question,
        points: q.points || 1,
        difficulty: q.difficulty || 'medium',
      };
      if (q.options && q.options.length > 0) {
        sanitized.options = q.options;
      }
      return sanitized;
    });

    // 2. Write public quiz document
    const colRef = collection(db, 'quizzes');
    const docRef = await addDoc(colRef, {
      ...quizData,
      questions: sanitizedQuestions,
      createdAt: quizData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const quizId = docRef.id;

    // 3. Write instructor-only answer keys document (/quiz_answers/{quizId})
    const answersDocRef = doc(db, 'quiz_answers', quizId);
    await setDoc(answersDocRef, {
      id: quizId,
      quizId,
      questions: answerKeys,
      updatedAt: new Date().toISOString(),
    });

    return quizId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'quizzes');
  }
}

export async function updateQuizWithSecureAnswers(
  quizId: string,
  quizUpdates: Partial<FirestoreQuiz>,
  answerKeys?: QuizQuestionAnswerKey[]
): Promise<void> {
  try {
    const updates: Partial<FirestoreQuiz> = { ...quizUpdates, updatedAt: new Date().toISOString() };
    if (quizUpdates.questions) {
      updates.questions = quizUpdates.questions.map(q => {
        const sanitized: QuizQuestion = {
          id: q.id,
          type: q.type || 'mcq',
          question: q.question,
          points: q.points || 1,
          difficulty: q.difficulty || 'medium',
        };
        if (q.options) sanitized.options = q.options;
        return sanitized;
      });
    }

    const quizDocRef = doc(db, 'quizzes', quizId);
    await updateDoc(quizDocRef, updates as any);

    if (answerKeys) {
      const answersDocRef = doc(db, 'quiz_answers', quizId);
      await setDoc(
        answersDocRef,
        {
          id: quizId,
          quizId,
          questions: answerKeys,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `quizzes/${quizId}`);
  }
}

export async function deleteQuiz(quizId: string): Promise<void> {
  try {
    // Delete main quiz
    const quizDocRef = doc(db, 'quizzes', quizId);
    await deleteDoc(quizDocRef);

    // Also attempt deletion of secret answer key doc
    try {
      const answersDocRef = doc(db, 'quiz_answers', quizId);
      await deleteDoc(answersDocRef);
    } catch (_err) {
      // Ignore if not present
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `quizzes/${quizId}`);
  }
}

/**
 * Loads the instructor-only answer keys from /quiz_answers/{quizId}.
 * Fails with permission-denied if user is a student!
 */
export async function getQuizAnswerKey(quizId: string): Promise<FirestoreQuizAnswerKey | null> {
  try {
    const docRef = doc(db, 'quiz_answers', quizId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as FirestoreQuizAnswerKey;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `quiz_answers/${quizId}`);
    return null;
  }
}

/**
 * Penetration Test: Attempts to bypass answer security by issuing a direct
 * Firestore request to /quiz_answers/{quizId}.
 * Returns full diagnostics proving that security rules successfully intercept & deny the request.
 */
export async function verifyDirectFirestoreAnswerKeyBypass(quizId: string): Promise<{
  attemptedPath: string;
  blocked: boolean;
  errorCode: string;
  errorMessage: string;
  timestamp: string;
}> {
  const targetPath = `quiz_answers/${quizId}`;
  try {
    const docRef = doc(db, 'quiz_answers', quizId);
    const snap = await getDoc(docRef);
    // If it succeeded, it means user has teacher role or rule is open
    return {
      attemptedPath: targetPath,
      blocked: false,
      errorCode: 'ALLOWED_OR_AUTHORIZED',
      errorMessage: snap.exists()
        ? 'Direct read succeeded (Caller has authorized instructor role).'
        : 'Direct read succeeded but document does not exist.',
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    const msg = error instanceof Error ? error.message : String(error);
    const isPermissionDenied =
      msg.toLowerCase().includes('permission') ||
      msg.toLowerCase().includes('insufficient') ||
      msg.toLowerCase().includes('denied');

    return {
      attemptedPath: targetPath,
      blocked: true,
      errorCode: isPermissionDenied ? 'PERMISSION_DENIED_ENFORCED' : 'FIREBASE_ERROR',
      errorMessage: msg,
      timestamp: new Date().toISOString(),
    };
  }
}

// -------------------------------------------------------------
// QUIZ ATTEMPTS
// -------------------------------------------------------------

export function subscribeStudentAttempts(
  studentId: string,
  onData: (attempts: FirestoreQuizAttempt[]) => void
) {
  const colRef = collection(db, 'quiz_attempts');
  const q = query(colRef, where('studentId', '==', studentId));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: FirestoreQuizAttempt[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...d.data() } as FirestoreQuizAttempt);
      });
      // Sort in-memory by startTime desc
      items.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'quiz_attempts');
    }
  );
}

export function subscribeQuizAttempts(
  quizId: string,
  onData: (attempts: FirestoreQuizAttempt[]) => void
) {
  const colRef = collection(db, 'quiz_attempts');
  const q = query(colRef, where('quizId', '==', quizId));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: FirestoreQuizAttempt[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...d.data() } as FirestoreQuizAttempt);
      });
      items.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'quiz_attempts');
    }
  );
}

export function subscribeAllQuizAttempts(onData: (attempts: FirestoreQuizAttempt[]) => void) {
  const colRef = collection(db, 'quiz_attempts');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: FirestoreQuizAttempt[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...d.data() } as FirestoreQuizAttempt);
      });
      items.sort((a, b) => new Date(b.startTime || 0).getTime() - new Date(a.startTime || 0).getTime());
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'quiz_attempts');
    }
  );
}

export async function createQuizAttempt(
  data: Omit<FirestoreQuizAttempt, 'id' | 'createdAt'>
): Promise<string> {
  try {
    const colRef = collection(db, 'quiz_attempts');
    const docRef = await addDoc(colRef, {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'quiz_attempts');
  }
}

export async function updateQuizAttempt(
  attemptId: string,
  updates: Partial<FirestoreQuizAttempt>
): Promise<void> {
  try {
    const docRef = doc(db, 'quiz_attempts', attemptId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `quiz_attempts/${attemptId}`);
  }
}

export async function gradeQuizAttempt(
  attemptId: string,
  grading: {
    score: number;
    maxScore: number;
    percentage: number;
    feedback?: Record<string, { isCorrect?: boolean; pointsAwarded?: number; feedback?: string }>;
    reviewedBy: string;
  }
): Promise<void> {
  try {
    const docRef = doc(db, 'quiz_attempts', attemptId);
    await updateDoc(docRef, {
      ...grading,
      status: 'submitted',
      reviewedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `quiz_attempts/${attemptId}`);
  }
}

// -------------------------------------------------------------
// ANNOUNCEMENTS
// -------------------------------------------------------------

export function subscribeAnnouncements(onData: (announcements: FirestoreAnnouncement[]) => void) {
  const colRef = collection(db, 'announcements');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: FirestoreAnnouncement[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...d.data() } as FirestoreAnnouncement);
      });
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'announcements');
    }
  );
}

export async function createAnnouncement(data: Omit<FirestoreAnnouncement, 'id'>): Promise<string> {
  try {
    const colRef = collection(db, 'announcements');
    const docRef = await addDoc(colRef, {
      ...data,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'announcements');
  }
}

// -------------------------------------------------------------
// RESOURCES
// -------------------------------------------------------------

export function subscribeResources(classId: string, onData: (resources: FirestoreResource[]) => void) {
  const colRef = collection(db, 'resources');
  const q = query(colRef, where('classId', '==', classId));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: FirestoreResource[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...d.data() } as FirestoreResource);
      });
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'resources');
    }
  );
}

export async function createResource(data: Omit<FirestoreResource, 'id'>): Promise<string> {
  try {
    const colRef = collection(db, 'resources');
    const docRef = await addDoc(colRef, {
      ...data,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'resources');
  }
}

export async function deleteResource(id: string): Promise<void> {
  try {
    const docRef = doc(db, 'resources', id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `resources/${id}`);
  }
}

// -------------------------------------------------------------
// DISCUSSIONS
// -------------------------------------------------------------

export function subscribeDiscussions(classId: string, onData: (discussions: FirestoreDiscussion[]) => void) {
  const colRef = collection(db, 'discussions');
  const q = query(colRef, where('classId', '==', classId));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: FirestoreDiscussion[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...d.data() } as FirestoreDiscussion);
      });
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'discussions');
    }
  );
}

export async function createDiscussion(data: Omit<FirestoreDiscussion, 'id'>): Promise<string> {
  try {
    const colRef = collection(db, 'discussions');
    const docRef = await addDoc(colRef, {
      ...data,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'discussions');
  }
}

export async function updateDiscussion(id: string, updates: Partial<FirestoreDiscussion>): Promise<void> {
  try {
    const docRef = doc(db, 'discussions', id);
    await updateDoc(docRef, updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `discussions/${id}`);
  }
}

export async function deleteDiscussion(id: string): Promise<void> {
  try {
    const docRef = doc(db, 'discussions', id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `discussions/${id}`);
  }
}

// -------------------------------------------------------------
// USERS
// -------------------------------------------------------------

export function subscribeUsers(onData: (users: OnyxUser[]) => void) {
  const colRef = collection(db, 'users');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: OnyxUser[] = [];
      snapshot.forEach((d) => {
        items.push(d.data() as OnyxUser);
      });
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    }
  );
}

// -------------------------------------------------------------
// QUESTION BANK
// -------------------------------------------------------------

export interface QuestionBankItem {
  id: string;
  question: QuizQuestion;
  answerKey?: QuizQuestionAnswerKey;
  topic: string;
  subject?: string;
  difficulty: QuestionDifficulty;
  type: QuestionType;
  tags: string[];
  source?: string;
  timesUsed?: number;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

export function subscribeQuestionBank(onData: (items: QuestionBankItem[]) => void) {
  const colRef = collection(db, 'question_bank');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: QuestionBankItem[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...d.data() } as QuestionBankItem);
      });
      items.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'question_bank');
    }
  );
}

export async function saveToQuestionBank(
  item: Omit<QuestionBankItem, 'id' | 'createdAt'>
): Promise<string> {
  try {
    const colRef = collection(db, 'question_bank');
    const docRef = await addDoc(colRef, {
      ...item,
      timesUsed: item.timesUsed ?? 0,
      tags: item.tags || [],
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'question_bank');
    throw error;
  }
}

export async function updateQuestionBankItem(
  id: string,
  updates: Partial<QuestionBankItem>
): Promise<void> {
  try {
    const docRef = doc(db, 'question_bank', id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `question_bank/${id}`);
    throw error;
  }
}

export async function deleteQuestionBankItem(id: string): Promise<void> {
  try {
    const docRef = doc(db, 'question_bank', id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `question_bank/${id}`);
    throw error;
  }
}

// -------------------------------------------------------------
// NOTIFICATIONS
// -------------------------------------------------------------

export type NotificationType =
  | 'assignment'
  | 'deadline'
  | 'submission'
  | 'announcement'
  | 'grading'
  | 'enrollment'
  | 'student_leaving';

export interface OnyxNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  classId?: string;
  className?: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export function subscribeNotifications(
  userId: string,
  onData: (notifications: OnyxNotification[]) => void
) {
  const colRef = collection(db, 'notifications');
  const q = query(colRef, where('userId', '==', userId));
  return onSnapshot(
    q,
    snapshot => {
      const items: OnyxNotification[] = [];
      snapshot.forEach(d => {
        items.push({ id: d.id, ...d.data() } as OnyxNotification);
      });
      // Sort newest first
      items.sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
      onData(items);
    },
    error => {
      handleFirestoreError(error, OperationType.LIST, `notifications?userId=${userId}`);
    }
  );
}

export async function createNotification(
  notification: Omit<OnyxNotification, 'id' | 'createdAt' | 'isRead'>
): Promise<string> {
  try {
    const colRef = collection(db, 'notifications');
    const docRef = await addDoc(colRef, {
      ...notification,
      isRead: false,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'notifications');
    throw error;
  }
}

export async function markNotificationAsRead(id: string): Promise<void> {
  try {
    const docRef = doc(db, 'notifications', id);
    await updateDoc(docRef, { isRead: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `notifications/${id}`);
  }
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  try {
    const colRef = collection(db, 'notifications');
    const q = query(colRef, where('userId', '==', userId), where('isRead', '==', false));
    const snap = await getDocs(q);
    const promises = snap.docs.map(d => updateDoc(d.ref, { isRead: true }));
    await Promise.all(promises);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `notifications?userId=${userId}`);
  }
}

export async function deleteNotification(id: string): Promise<void> {
  try {
    const docRef = doc(db, 'notifications', id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `notifications/${id}`);
  }
}

/**
 * Dispatches persistent notification to all students enrolled in a course section.
 */
export async function notifyClassStudents({
  classId,
  className,
  type,
  title,
  message,
  link,
  excludeUserId
}: {
  classId: string;
  className?: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  excludeUserId?: string;
}): Promise<void> {
  try {
    const studentUserIds = new Set<string>();

    // 1. Check class_members collection
    const membersRef = collection(db, 'class_members');
    const q = query(membersRef, where('classId', '==', classId));
    const memberSnap = await getDocs(q);
    memberSnap.forEach(d => {
      const data = d.data();
      if (data.userId && data.userId !== excludeUserId) {
        studentUserIds.add(data.userId);
      }
    });

    // 2. Also check class roster in classes collection
    const classDocRef = doc(db, 'classes', classId);
    const classSnap = await getDoc(classDocRef);
    let resolvedClassName = className;
    if (classSnap.exists()) {
      const classData = classSnap.data();
      if (!resolvedClassName) resolvedClassName = classData.name || classData.code;
      if (classData.roster && Array.isArray(classData.roster)) {
        classData.roster.forEach((r: any) => {
          if (r.id && r.id !== excludeUserId) {
            studentUserIds.add(r.id);
          }
        });
      }
    }

    const promises = Array.from(studentUserIds).map(uid =>
      createNotification({
        userId: uid,
        type,
        title,
        message,
        classId,
        className: resolvedClassName,
        link
      })
    );
    await Promise.all(promises);
  } catch (err) {
    console.error('Error dispatching notifications to class students:', err);
  }
}

/**
 * Dispatches persistent notification to a course teacher or faculty instructor.
 */
export async function notifyTeacher({
  teacherId,
  classId,
  className,
  type,
  title,
  message,
  link
}: {
  teacherId: string;
  classId?: string;
  className?: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}): Promise<void> {
  try {
    if (!teacherId) return;
    await createNotification({
      userId: teacherId,
      type,
      title,
      message,
      classId,
      className,
      link
    });
  } catch (err) {
    console.error('Error dispatching notification to teacher:', err);
  }
}

/**
 * Scans upcoming deadlines for the user and generates persistent notifications
 * for assignments approaching within the user's configured reminder lead time.
 */
export async function checkImpendingDeadlines(userId: string): Promise<void> {
  try {
    const settings = await getUserSettings(userId);
    if (settings && settings.inAppNotifications === false) return;
    if (settings && settings.assignmentAlerts === false) return;

    const leadHours = settings?.reminderLeadTimeHours || 24;
    const now = new Date();
    const cutoff = new Date(now.getTime() + leadHours * 60 * 60 * 1000);

    // Enrolled class IDs
    const userClassIds = new Set<string>();
    const membersRef = collection(db, 'class_members');
    const qMembers = query(membersRef, where('userId', '==', userId));
    const memberSnap = await getDocs(qMembers);
    memberSnap.forEach(d => userClassIds.add(d.data().classId));

    const classesRef = collection(db, 'classes');
    const classesSnap = await getDocs(classesRef);
    classesSnap.forEach(d => {
      const c = d.data();
      if (c.roster?.some((r: any) => r.id === userId)) {
        userClassIds.add(d.id);
      }
    });

    if (userClassIds.size === 0) return;

    // Check assignments
    const assignRef = collection(db, 'assignments');
    const assignSnap = await getDocs(assignRef);
    const pendingAssignments: FirestoreAssignment[] = [];

    assignSnap.forEach(d => {
      const a = { id: d.id, ...d.data() } as FirestoreAssignment;
      if (userClassIds.has(a.classId) && (a.status === 'published' || (a.status as string) === 'Published') && a.dueDate) {
        const dueObj = new Date(a.dueDate);
        if (dueObj > now && dueObj <= cutoff) {
          pendingAssignments.push(a);
        }
      }
    });

    if (pendingAssignments.length === 0) return;

    // Check submissions to avoid alerting for completed work
    const subsRef = collection(db, 'submissions');
    const qSubs = query(subsRef, where('studentId', '==', userId));
    const subsSnap = await getDocs(qSubs);
    const submittedAssignIds = new Set<string>();
    subsSnap.forEach(d => submittedAssignIds.add(d.data().assignmentId));

    // Existing notifications to prevent duplicate creation
    const notifsRef = collection(db, 'notifications');
    const qNotifs = query(notifsRef, where('userId', '==', userId), where('type', '==', 'deadline'));
    const notifSnap = await getDocs(qNotifs);
    const existingNotifTitles = new Set<string>();
    notifSnap.forEach(d => existingNotifTitles.add(d.data().title));

    for (const a of pendingAssignments) {
      if (submittedAssignIds.has(a.id)) continue;
      const expectedTitle = `⏰ Impending Deadline: ${a.title}`;
      if (existingNotifTitles.has(expectedTitle)) continue;

      const dueObj = new Date(a.dueDate!);
      const hoursRemaining = Math.max(1, Math.round((dueObj.getTime() - now.getTime()) / (1000 * 60 * 60)));

      await createNotification({
        userId,
        type: 'deadline',
        title: expectedTitle,
        message: `Assignment "${a.title}" is due in ${hoursRemaining} hours (${dueObj.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}). Complete and turn in your solution.`,
        classId: a.classId,
        className: a.className,
        link: '/assignments'
      });
    }
  } catch (err) {
    console.error('Error checking impending deadlines:', err);
  }
}

// -------------------------------------------------------------
// POINT LEDGER & GAMIFICATION
// -------------------------------------------------------------

export interface PointLedgerEntry {
  id: string;
  userId: string;
  userName: string;
  classId?: string;
  className?: string;
  points: number;
  reason: string;
  category: 'assignment' | 'quiz' | 'streak' | 'achievement' | 'bonus';
  createdAt: string;
}

export function subscribePointLedger(onData: (entries: PointLedgerEntry[]) => void) {
  const colRef = collection(db, 'point_ledger');
  return onSnapshot(
    colRef,
    snapshot => {
      const items: PointLedgerEntry[] = [];
      snapshot.forEach(d => {
        items.push({ id: d.id, ...d.data() } as PointLedgerEntry);
      });
      items.sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
      onData(items);
    },
    error => {
      handleFirestoreError(error, OperationType.LIST, 'point_ledger');
    }
  );
}

export async function awardPoints(
  entry: Omit<PointLedgerEntry, 'id' | 'createdAt'>
): Promise<string> {
  try {
    const colRef = collection(db, 'point_ledger');
    const docRef = await addDoc(colRef, {
      ...entry,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'point_ledger');
    throw error;
  }
}

// -------------------------------------------------------------
// USER BADGES (EARNED ACHIEVEMENTS)
// -------------------------------------------------------------

export interface UserBadgeRecord {
  id: string;
  userId: string;
  badgeId: string;
  badgeTitle: string;
  badgeCategory: string;
  badgeIcon: string;
  pointsAwarded: number;
  unlockedAt: string;
}

export function subscribeUserBadges(
  userId: string,
  onData: (badges: UserBadgeRecord[]) => void
) {
  const colRef = collection(db, 'user_badges');
  const q = query(colRef, where('userId', '==', userId));
  return onSnapshot(
    q,
    snapshot => {
      const items: UserBadgeRecord[] = [];
      snapshot.forEach(d => {
        items.push({ id: d.id, ...d.data() } as UserBadgeRecord);
      });
      items.sort(
        (a, b) => new Date(b.unlockedAt || 0).getTime() - new Date(a.unlockedAt || 0).getTime()
      );
      onData(items);
    },
    error => {
      handleFirestoreError(error, OperationType.LIST, `user_badges?userId=${userId}`);
    }
  );
}

export function subscribeAllUserBadges(onData: (badges: UserBadgeRecord[]) => void) {
  const colRef = collection(db, 'user_badges');
  return onSnapshot(
    colRef,
    snapshot => {
      const items: UserBadgeRecord[] = [];
      snapshot.forEach(d => {
        items.push({ id: d.id, ...d.data() } as UserBadgeRecord);
      });
      onData(items);
    },
    error => {
      handleFirestoreError(error, OperationType.LIST, 'user_badges');
    }
  );
}

export async function awardBadge(
  badge: Omit<UserBadgeRecord, 'id' | 'unlockedAt'>
): Promise<string> {
  try {
    const colRef = collection(db, 'user_badges');
    const docRef = await addDoc(colRef, {
      ...badge,
      unlockedAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'user_badges');
    throw error;
  }
}

// -------------------------------------------------------------
// USER SETTINGS & PREFERENCES
// -------------------------------------------------------------

export interface UserSettings {
  userId: string;
  emailNotifications: boolean;
  inAppNotifications: boolean;
  assignmentAlerts: boolean;
  gradeAlerts: boolean;
  announcementAlerts: boolean;
  reminderLeadTimeHours: number; // e.g. 24, 12, 2, 1
  dailyStudyTargetMinutes: number; // e.g. 45
  teacherDefaults: {
    defaultQuizDurationMinutes: number;
    defaultPassingPercentage: number;
    autoLockdown: boolean;
    autoGradeObjective: boolean;
  };
  submissionPreferences: {
    preferredMode: 'handwritten' | 'typed';
    canvasDarkMode: boolean;
    inkSmoothing: boolean;
  };
  updatedAt?: string;
}

export const DEFAULT_USER_SETTINGS: Omit<UserSettings, 'userId'> = {
  emailNotifications: true,
  inAppNotifications: true,
  assignmentAlerts: true,
  gradeAlerts: true,
  announcementAlerts: true,
  reminderLeadTimeHours: 24,
  dailyStudyTargetMinutes: 45,
  teacherDefaults: {
    defaultQuizDurationMinutes: 30,
    defaultPassingPercentage: 60,
    autoLockdown: true,
    autoGradeObjective: true
  },
  submissionPreferences: {
    preferredMode: 'handwritten',
    canvasDarkMode: false,
    inkSmoothing: true
  }
};

export async function getUserSettings(userId: string): Promise<UserSettings | null> {
  try {
    const docRef = doc(db, 'user_settings', userId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as UserSettings;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `user_settings/${userId}`);
    return null;
  }
}

export async function saveUserSettings(
  userId: string,
  settings: Partial<UserSettings>
): Promise<void> {
  try {
    const docRef = doc(db, 'user_settings', userId);
    await setDoc(
      docRef,
      {
        userId,
        ...settings,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `user_settings/${userId}`);
    throw error;
  }
}


