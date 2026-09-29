/**
 * ONYX Class & Communication Types and Utilities
 * Firebase Firestore is the source of truth.
 * Zero mock/fake records.
 */

export interface EnrolledStudent {
  id: string;
  name: string;
  email: string;
  rollNumber: string;
  erNumber: string;
  srNumber: string;
  avatarBg: string;
  attendance: number;
  progress: number;
  grade: number;
  joinedAt: string;
}

export interface ClassResource {
  id: string;
  classId: string;
  title: string;
  fileName: string;
  fileSize: string;
  fileType: 'pdf' | 'zip' | 'docx' | 'py' | 'code';
  category: 'Lecture Slides' | 'Syllabus' | 'Problem Set' | 'Lab Manual' | 'Solutions';
  uploadedBy: string;
  uploadedAt: string;
  downloadUrl?: string;
}

export interface DiscussionReply {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: 'student' | 'teacher' | 'admin';
  content: string;
  createdAt: string;
}

export interface DiscussionPost {
  id: string;
  classId: string;
  authorId: string;
  authorName: string;
  authorRole: 'student' | 'teacher' | 'admin';
  title: string;
  content: string;
  tag: 'Question' | 'Proof Help' | 'Exam Prep' | 'General';
  pinned?: boolean;
  locked?: boolean;
  replies: DiscussionReply[];
  createdAt: string;
}

export interface ClassAnnouncement {
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

export interface ClassItem {
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
  bannerPreset: 'cobalt' | 'emerald' | 'sunset' | 'violet' | 'crimson' | 'amber';
  bannerColor: string;
  archived: boolean;
  joinCode: string;
  createdAt: string;
  roster: EnrolledStudent[];
  announcements: ClassAnnouncement[];
  resources: ClassResource[];
  discussions: DiscussionPost[];
  leaveLog?: { studentName: string; leftAt: string }[];
}

export const BANNER_PRESETS = [
  { id: 'cobalt', label: 'Cobalt Matrix', gradient: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', color: '#2563eb' },
  { id: 'emerald', label: 'Emerald Quantum', gradient: 'linear-gradient(135deg, #064e3b 0%, #10b981 100%)', color: '#059669' },
  { id: 'sunset', label: 'Sunset Horizon', gradient: 'linear-gradient(135deg, #7c2d12 0%, #f97316 100%)', color: '#ea580c' },
  { id: 'violet', label: 'Violet Tensor', gradient: 'linear-gradient(135deg, #4c1d95 0%, #8b5cf6 100%)', color: '#7c3aed' },
  { id: 'crimson', label: 'Crimson Poly', gradient: 'linear-gradient(135deg, #881337 0%, #f43f5e 100%)', color: '#e11d48' },
  { id: 'amber', label: 'Amber Kinetic', gradient: 'linear-gradient(135deg, #78350f 0%, #f59e0b 100%)', color: '#d97706' },
];

export function generateJoinCode(prefix: string = 'OX'): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix.toUpperCase()}-${result}`;
}

const STORAGE_KEY = 'onyx_classes_cache_v1';
const PLATFORM_ANN_KEY = 'onyx_platform_ann_cache_v1';

export function loadClassesFromStorage(): ClassItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Could not load classes from storage:', e);
  }
  return []; // Pure empty array. No fake/mock classes!
}

export function saveClassesToStorage(classes: ClassItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(classes));
  } catch (e) {
    console.warn('Could not save classes to storage:', e);
  }
}

export function loadPlatformAnnouncements(): ClassAnnouncement[] {
  try {
    const raw = localStorage.getItem(PLATFORM_ANN_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Could not load platform announcements:', e);
  }
  return []; // Pure empty array. No fake announcements!
}

export function savePlatformAnnouncements(anns: ClassAnnouncement[]) {
  try {
    localStorage.setItem(PLATFORM_ANN_KEY, JSON.stringify(anns));
  } catch (e) {
    console.warn('Could not save platform announcements:', e);
  }
}
