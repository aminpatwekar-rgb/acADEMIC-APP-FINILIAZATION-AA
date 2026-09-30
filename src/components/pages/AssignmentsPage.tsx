import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useViewRole } from '../../lib/viewRole';
import {
  subscribeAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  publishAssignment,
  unpublishAssignment,
  archiveAssignment,
  restoreAssignment,
  duplicateAssignment,
  subscribeSubmissions,
  createSubmission,
  updateSubmission,
  subscribeClasses,
  notifyClassStudents,
  notifyTeacher,
  createNotification,
  awardPoints,
  FirestoreAssignment,
  FirestoreSubmission,
  FirestoreClass,
  AssignmentPriority,
  AssignmentSubmissionType,
  AssignmentLifecycleStatus,
  StudentSubmissionStatus,
  HandwrittenPage,
  TypedInsertedImage,
  SubmissionViolation
} from '../../lib/firebase/firestoreService';
import { TypedEditor, CheatViolation } from '../editor/TypedEditor';
import { HandwrittenWorkspace } from '../handwritten/HandwrittenWorkspace';
import confetti from 'canvas-confetti';
import { SkeletonCard } from '../common/Skeleton';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase/index';
import {
  BookOpen,
  Calendar,
  Clock,
  Plus,
  PenTool,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Sigma,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Search,
  ChevronRight,
  Sparkles,
  ArrowRight,
  X,
  Send,
  Eye,
  Award,
  Layers,
  Check,
  Filter,
  Inbox,
  Copy,
  Archive,
  ArchiveRestore,
  Trash2,
  Edit,
  Save,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Tag,
  Flame,
  FileUp,
  Image as ImageIcon,
  Play,
  Loader2
} from 'lucide-react';

export function AssignmentsPage() {
  const { user, profile } = useAuth();
  const { effectiveRole } = useViewRole();
  const isTeacherOrAdmin = effectiveRole === 'teacher' || effectiveRole === 'admin';

  // Firestore collections
  const [rawAssignments, setRawAssignments] = useState<FirestoreAssignment[]>([]);
  const [submissions, setSubmissions] = useState<FirestoreSubmission[]>([]);
  const [classes, setClasses] = useState<FirestoreClass[]>([]);

  // Navigation & Filtering
  const [teacherStatusTab, setTeacherStatusTab] = useState<'all' | 'published' | 'draft' | 'archived'>('published');
  const [studentStatusTab, setStudentStatusTab] = useState<'all' | 'pending' | 'submitted' | 'completed' | 'returned'>('all');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Drawers
  const [showCreateEditModal, setShowCreateEditModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<FirestoreAssignment | null>(null);
  const [activeWorkspaceAssignment, setActiveWorkspaceAssignment] = useState<FirestoreAssignment | null>(null);
  const [activeTeacherGradingAssignment, setActiveTeacherGradingAssignment] = useState<FirestoreAssignment | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showSecurityAuditModal, setShowSecurityAuditModal] = useState(false);
  const [isTestingTamper, setIsTestingTamper] = useState(false);
  const [tamperTestStatus, setTamperTestStatus] = useState<string | null>(null);
  const [tamperTestPassed, setTamperTestPassed] = useState<boolean | null>(null);

  // Student Workspace State
  const [workspaceMode, setWorkspaceMode] = useState<'handwritten' | 'typed'>('handwritten');
  const [typedText, setTypedText] = useState('');
  const [typedImages, setTypedImages] = useState<TypedInsertedImage[]>([]);
  const [violations, setViolations] = useState<CheatViolation[]>([]);
  const [handwrittenPages, setHandwrittenPages] = useState<HandwrittenPage[]>([]);
  const [handwrittenNotes, setHandwrittenNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Teacher Grading Form State
  const [selectedSubmissionIdx, setSelectedSubmissionIdx] = useState<number>(0);
  const [gradeInput, setGradeInput] = useState<string>('95');
  const [feedbackInput, setFeedbackInput] = useState<string>('');
  const [improvementNotesInput, setImprovementNotesInput] = useState<string>('');
  const [savingGrade, setSavingGrade] = useState(false);

  // Create / Edit Assignment Form State
  const [formTitle, setFormTitle] = useState('');
  const [formClassId, setFormClassId] = useState('');
  const [formSubject, setFormSubject] = useState('');
  const [formInstructions, setFormInstructions] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formDueTime, setFormDueTime] = useState('11:59 PM');
  const [formMaxMarks, setFormMaxMarks] = useState('100');
  const [formPriority, setFormPriority] = useState<AssignmentPriority>('medium');
  const [formSubmissionType, setFormSubmissionType] = useState<AssignmentSubmissionType>('both');
  const [formAllowImages, setFormAllowImages] = useState(true);
  const [formAllowAutocorrect, setFormAllowAutocorrect] = useState(true);
  const [formAllowVoiceTyping, setFormAllowVoiceTyping] = useState(true);
  const [formStatus, setFormStatus] = useState<AssignmentLifecycleStatus>('published');
  const [isLoading, setIsLoading] = useState(true);

  // Real-time Firestore Subscriptions
  useEffect(() => {
    let loadedAsg = false;
    let loadedClasses = false;
    const checkDone = () => {
      if (loadedAsg && loadedClasses) setIsLoading(false);
    };

    const unsubAssignments = subscribeAssignments((data) => {
      setRawAssignments(data);
      loadedAsg = true;
      checkDone();
    });
    const unsubSubmissions = subscribeSubmissions(setSubmissions);
    const unsubClasses = subscribeClasses((data) => {
      setClasses(data);
      loadedClasses = true;
      checkDone();
    });

    const timer = setTimeout(() => setIsLoading(false), 1200);

    return () => {
      clearTimeout(timer);
      unsubAssignments();
      unsubSubmissions();
      unsubClasses();
    };
  }, []);

  // Update default selected class when classes load
  useEffect(() => {
    if (classes.length > 0 && !formClassId) {
      setFormClassId(classes[0].id);
      setFormSubject(classes[0].subject || classes[0].name);
    }
  }, [classes, formClassId]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Determine late status: whether a submission is late compared to assignment due date
  const isSubmissionLate = (dueDateStr: string, dueTimeStr?: string): boolean => {
    try {
      if (!dueDateStr) return false;
      const dueParsed = new Date(`${dueDateStr} ${dueTimeStr || '23:59:59'}`);
      if (isNaN(dueParsed.getTime())) return false;
      return new Date() > dueParsed;
    } catch {
      return false;
    }
  };

  // Derive Student Status for an assignment
  const getStudentStatusForAssignment = (
    asg: FirestoreAssignment,
    sub?: FirestoreSubmission
  ): StudentSubmissionStatus => {
    if (!sub) return 'Not Started';
    return sub.status;
  };

  // Compute status for the current user for each assignment
  const processedAssignments = rawAssignments.map(asg => {
    const asgSubmissions = submissions.filter(s => s.assignmentId === asg.id);
    const mySub = user ? asgSubmissions.find(s => s.studentId === user.uid) : undefined;
    const studentStatus = getStudentStatusForAssignment(asg, mySub);

    return {
      ...asg,
      maximumMarks: asg.maximumMarks || asg.points || 100,
      studentStatus,
      mySubmission: mySub,
      allSubmissions: asgSubmissions,
    };
  });

  // Filter assignments based on Role, Status Tab, Course, Search
  const filteredAssignments = processedAssignments.filter(asg => {
    // 1. Role-specific filtering
    if (isTeacherOrAdmin) {
      if (teacherStatusTab !== 'all' && asg.status !== teacherStatusTab) {
        return false;
      }
    } else {
      // Students should only see published assignments (unless they have an existing draft/submission)
      if (asg.status !== 'published' && asg.studentStatus === 'Not Started') {
        return false;
      }

      if (studentStatusTab === 'pending') {
        if (asg.studentStatus !== 'Not Started' && asg.studentStatus !== 'In Progress') return false;
      } else if (studentStatusTab === 'submitted') {
        if (asg.studentStatus !== 'Submitted' && asg.studentStatus !== 'Late' && asg.studentStatus !== 'Reviewed') return false;
      } else if (studentStatusTab === 'completed') {
        if (asg.studentStatus !== 'Completed') return false;
      } else if (studentStatusTab === 'returned') {
        if (asg.studentStatus !== 'Returned') return false;
      }
    }

    // 2. Class Filter
    const matchesClass =
      selectedClassFilter === 'All' ||
      asg.classCode === selectedClassFilter ||
      asg.classId === selectedClassFilter;

    // 3. Search Filter
    const matchesSearch =
      asg.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (asg.classCode && asg.classCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (asg.className && asg.className.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (asg.subject && asg.subject.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesClass && matchesSearch;
  });

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingAssignment(null);
    setFormTitle('');
    setFormClassId(classes[0]?.id || '');
    setFormSubject(classes[0]?.subject || 'General');
    setFormInstructions('');
    setFormDueDate('');
    setFormDueTime('11:59 PM');
    setFormMaxMarks('100');
    setFormPriority('medium');
    setFormSubmissionType('both');
    setFormAllowImages(true);
    setFormAllowAutocorrect(true);
    setFormAllowVoiceTyping(true);
    setFormStatus('published');
    setShowCreateEditModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (asg: FirestoreAssignment) => {
    setEditingAssignment(asg);
    setFormTitle(asg.title);
    setFormClassId(asg.classId);
    setFormSubject(asg.subject || asg.className || 'General');
    setFormInstructions(asg.instructions || asg.description || '');
    setFormDueDate(asg.dueDate);
    setFormDueTime(asg.dueTime || '11:59 PM');
    setFormMaxMarks(String(asg.maximumMarks || asg.points || 100));
    setFormPriority(asg.priority || 'medium');
    setFormSubmissionType(asg.submissionType || 'both');
    setFormAllowImages(asg.allowImages !== false);
    setFormAllowAutocorrect(asg.allowAutocorrect !== false);
    setFormAllowVoiceTyping(asg.allowVoiceTyping !== false);
    setFormStatus(asg.status || 'published');
    setShowCreateEditModal(true);
  };

  // Save Assignment (Create or Edit)
  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const chosenClass = classes.find(c => c.id === formClassId) || classes[0];
    const classCode = chosenClass ? chosenClass.code : 'OX';
    const className = chosenClass ? chosenClass.name : 'Course';

    const payload = {
      classId: chosenClass ? chosenClass.id : 'default-class',
      classCode,
      className,
      title: formTitle.trim(),
      subject: formSubject.trim() || (chosenClass?.subject || 'General'),
      instructions: formInstructions.trim(),
      description: formInstructions.trim(),
      dueDate: formDueDate.trim() || 'Next Week',
      dueTime: formDueTime.trim() || '11:59 PM',
      maximumMarks: parseInt(formMaxMarks, 10) || 100,
      points: parseInt(formMaxMarks, 10) || 100,
      priority: formPriority,
      submissionType: formSubmissionType,
      allowImages: formAllowImages,
      allowAutocorrect: formAllowAutocorrect,
      allowVoiceTyping: formAllowVoiceTyping,
      status: formStatus
    };

    try {
      if (editingAssignment) {
        await updateAssignment(editingAssignment.id, payload);
        showToast(`Assignment "${formTitle.trim()}" updated successfully.`);
      } else {
        await createAssignment(payload);
        showToast(`Assignment "${formTitle.trim()}" created successfully.`);
        if (formStatus === 'published') {
          notifyClassStudents({
            classId: payload.classId,
            className: payload.className,
            type: 'assignment',
            title: `New Assignment: ${payload.title}`,
            message: `A new assignment "${payload.title}" was published. Due: ${payload.dueDate ? new Date(payload.dueDate).toLocaleDateString() : 'No set deadline'}.`,
            link: '/assignments'
          }).catch(console.error);
        }
      }
      setShowCreateEditModal(false);
      setEditingAssignment(null);
    } catch (err) {
      console.error(err);
      showToast('Error saving assignment. Please check permissions.');
    }
  };

  // Operations: Duplicate, Publish, Unpublish, Archive, Restore, Delete
  const handleDuplicate = async (asg: FirestoreAssignment) => {
    try {
      await duplicateAssignment(asg);
      showToast(`Duplicated "${asg.title}" as draft.`);
    } catch (err) {
      console.error(err);
      showToast('Error duplicating assignment.');
    }
  };

  const handleTogglePublish = async (asg: FirestoreAssignment) => {
    try {
      if (asg.status === 'published') {
        await unpublishAssignment(asg.id);
        showToast(`Assignment "${asg.title}" unpublished (set to draft).`);
      } else {
        await publishAssignment(asg.id);
        showToast(`Assignment "${asg.title}" published!`);
        notifyClassStudents({
          classId: asg.classId,
          className: asg.className,
          type: 'assignment',
          title: `New Assignment: ${asg.title}`,
          message: `Course assignment "${asg.title}" has been published. Due: ${asg.dueDate ? new Date(asg.dueDate).toLocaleDateString() : 'No set deadline'}.`,
          link: '/assignments'
        }).catch(console.error);
      }
    } catch (err) {
      console.error(err);
      showToast('Error updating publish status.');
    }
  };

  const handleToggleArchive = async (asg: FirestoreAssignment) => {
    try {
      if (asg.status === 'archived') {
        await restoreAssignment(asg.id);
        showToast(`Assignment "${asg.title}" restored.`);
      } else {
        await archiveAssignment(asg.id);
        showToast(`Assignment "${asg.title}" archived.`);
      }
    } catch (err) {
      console.error(err);
      showToast('Error changing archive status.');
    }
  };

  const handleDelete = async (asg: FirestoreAssignment) => {
    if (!window.confirm(`Are you sure you want to delete assignment "${asg.title}"?`)) return;
    try {
      await deleteAssignment(asg.id);
      showToast(`Assignment "${asg.title}" deleted.`);
    } catch (err) {
      console.error(err);
      showToast('Error deleting assignment.');
    }
  };

  // Open Student Workspace
  const handleOpenWorkspace = (asg: FirestoreAssignment) => {
    setActiveWorkspaceAssignment(asg);

    // Initialise mode based on submissionType
    const preferredMode =
      asg.submissionType === 'typed' ? 'typed' : 'handwritten';
    setWorkspaceMode(preferredMode);

    // Load existing draft/submission if present
    const existing = submissions.find(
      s => s.assignmentId === asg.id && s.studentId === user?.uid
    );

    if (existing) {
      setTypedText(existing.content || '');
      setTypedImages(existing.typedImages || []);
      setHandwrittenPages(existing.handwrittenPages || []);
      setHandwrittenNotes(existing.content || '');
      setViolations((existing.violations as CheatViolation[]) || []);
      if (existing.mode) setWorkspaceMode(existing.mode);
    } else {
      setTypedText('');
      setTypedImages([]);
      setHandwrittenPages([
        {
          pageNumber: 1,
          imageUrl: '',
          caption: 'Page 1 — Solution'
        }
      ]);
      setHandwrittenNotes('');
      setViolations([]);
    }
  };

  // Student: Save Draft (In Progress)
  const handleSaveDraft = async (
    mode: 'handwritten' | 'typed',
    contentOrPages: any,
    extraNotes: string = ''
  ) => {
    if (!activeWorkspaceAssignment || !user) return;
    setSubmitting(true);

    const existingSub = submissions.find(
      s => s.assignmentId === activeWorkspaceAssignment.id && s.studentId === user.uid
    );

    const isHandwritten = mode === 'handwritten';
    const payload: Partial<FirestoreSubmission> = {
      assignmentId: activeWorkspaceAssignment.id,
      classId: activeWorkspaceAssignment.classId,
      studentId: user.uid,
      studentName: profile?.displayName || user.displayName || 'Scholar',
      mode,
      content: isHandwritten ? extraNotes : (contentOrPages as string),
      handwrittenPages: isHandwritten ? (contentOrPages as HandwrittenPage[]) : [],
      typedImages: isHandwritten ? [] : typedImages,
      violations: violations as SubmissionViolation[],
      violationsCount: violations.length,
      status: 'In Progress',
      savedAt: new Date().toISOString()
    };

    try {
      if (existingSub) {
        await updateSubmission(existingSub.id, payload);
      } else {
        await createSubmission({
          ...payload,
          submittedAt: new Date().toISOString()
        } as any);
      }
      showToast('Draft saved successfully! (In Progress)');
    } catch (err) {
      console.error(err);
      showToast('Error saving draft.');
    } finally {
      setSubmitting(false);
    }
  };

  // Student: Final Submit
  const handleFinalSubmit = async (
    mode: 'handwritten' | 'typed',
    contentOrPages: any,
    extraNotes: string = ''
  ) => {
    if (!activeWorkspaceAssignment || !user) return;
    setSubmitting(true);

    const existingSub = submissions.find(
      s => s.assignmentId === activeWorkspaceAssignment.id && s.studentId === user.uid
    );

    const isLate = isSubmissionLate(
      activeWorkspaceAssignment.dueDate,
      activeWorkspaceAssignment.dueTime
    );
    const finalStatus: StudentSubmissionStatus = isLate ? 'Late' : 'Submitted';

    const isHandwritten = mode === 'handwritten';
    const payload: Partial<FirestoreSubmission> = {
      assignmentId: activeWorkspaceAssignment.id,
      classId: activeWorkspaceAssignment.classId,
      studentId: user.uid,
      studentName: profile?.displayName || user.displayName || 'Scholar',
      mode,
      content: isHandwritten ? extraNotes : (contentOrPages as string),
      handwrittenPages: isHandwritten ? (contentOrPages as HandwrittenPage[]) : [],
      typedImages: isHandwritten ? [] : typedImages,
      violations: violations as SubmissionViolation[],
      violationsCount: violations.length,
      status: finalStatus,
      submittedAt: new Date().toISOString()
    };

    try {
      if (existingSub) {
        await updateSubmission(existingSub.id, payload);
      } else {
        await createSubmission(payload as any);
      }

      // 1. Award Points to student in point ledger
      awardPoints({
        userId: user.uid,
        userName: profile?.displayName || user.displayName || 'Scholar',
        classId: activeWorkspaceAssignment.classId,
        className: activeWorkspaceAssignment.className,
        points: 50,
        reason: `Turned in: ${activeWorkspaceAssignment.title}`,
        category: 'assignment'
      }).catch(console.error);

      // 2. Notify course instructor persistently in Firestore
      const targetClass = classes.find(c => c.id === activeWorkspaceAssignment.classId);
      if (targetClass?.ownerId) {
        notifyTeacher({
          teacherId: targetClass.ownerId,
          classId: activeWorkspaceAssignment.classId,
          className: activeWorkspaceAssignment.className,
          type: 'submission',
          title: `New Submission: ${profile?.displayName || 'Student'}`,
          message: `${profile?.displayName || 'Student'} submitted assignment "${activeWorkspaceAssignment.title}". Ready for evaluation.`,
          link: '/assignments'
        }).catch(console.error);
      }

      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (_e) {}

      showToast(
        isLate
          ? 'Assignment submitted (Marked Late as deadline has passed).'
          : 'Assignment submitted successfully!'
      );
      setActiveWorkspaceAssignment(null);
    } catch (err) {
      console.error(err);
      showToast('Error submitting assignment.');
    } finally {
      setSubmitting(false);
    }
  };

  // Teacher: Grade & Review submission
  const handleGradeSubmission = async (action: 'draft_review' | 'return_revision' | 'release_grade') => {
    if (!activeTeacherGradingAssignment) return;
    const curSub = activeTeacherGradingAssignment
      ? submissions.filter(s => s.assignmentId === activeTeacherGradingAssignment.id)[selectedSubmissionIdx]
      : null;

    if (!curSub) return;
    setSavingGrade(true);

    const scoreVal = parseInt(gradeInput, 10) || 0;

    let targetStatus: StudentSubmissionStatus = 'Reviewed';
    let isReleased = false;

    if (action === 'release_grade') {
      targetStatus = 'Completed';
      isReleased = true;
    } else if (action === 'return_revision') {
      targetStatus = 'Returned';
      isReleased = false;
    } else {
      targetStatus = 'Reviewed';
      isReleased = false;
    }

    try {
      await updateSubmission(curSub.id, {
        score: scoreVal,
        grade: scoreVal,
        gradeFeedback: feedbackInput.trim(),
        improvementNotes: improvementNotesInput.trim(),
        reviewerId: user?.uid || 'instructor',
        reviewerName: profile?.displayName || user?.displayName || 'Faculty Instructor',
        status: targetStatus,
        gradeReleased: isReleased,
        reviewedAt: new Date().toISOString()
      });

      if (action === 'release_grade') {
        showToast(`Grade released! Status marked Completed for ${curSub.studentName}.`);

        // 1. Award points in Point Ledger
        awardPoints({
          userId: curSub.studentId,
          userName: curSub.studentName,
          classId: curSub.classId,
          points: scoreVal,
          reason: `Grade awarded for: ${activeTeacherGradingAssignment.title} (+${scoreVal} pts)`,
          category: 'assignment'
        }).catch(console.error);

        // 2. Persistent notification to student in Firestore
        createNotification({
          userId: curSub.studentId,
          type: 'grading',
          title: `Grade Released: ${activeTeacherGradingAssignment.title}`,
          message: `Your instructor marked your submission as Completed with a score of ${scoreVal} points.${feedbackInput.trim() ? ' Feedback: "' + feedbackInput.trim() + '"' : ''}`,
          link: '/assignments',
          classId: curSub.classId
        }).catch(console.error);
      } else if (action === 'return_revision') {
        showToast(`Submission returned to ${curSub.studentName} for revision.`);
      } else {
        showToast('Draft review saved (unreleased to student).');
      }
    } catch (err) {
      console.error(err);
      showToast('Error updating grade.');
    } finally {
      setSavingGrade(false);
    }
  };

  // -------------------------------------------------------------
  // PHASE 4 SYSTEM & SECURITY VERIFICATION SUITE
  // -------------------------------------------------------------
  const handleRunTamperTest = async () => {
    if (!user) {
      showToast('Please sign in to run security manipulation audit.');
      return;
    }
    setIsTestingTamper(true);
    setTamperTestStatus('Executing direct client-side write to modify grade & reviewer fields in Firestore...');
    setTamperTestPassed(null);

    try {
      let targetSubId = submissions.find(s => s.studentId === user.uid)?.id;
      if (!targetSubId) {
        targetSubId = await createSubmission({
          assignmentId: rawAssignments[0]?.id || 'test-assignment',
          classId: classes[0]?.id || 'test-class',
          studentId: user.uid,
          studentName: profile?.displayName || user.displayName || 'Scholar Auditor',
          mode: 'typed',
          content: 'Audit test submission document',
          violationsCount: 0,
          status: 'In Progress',
          submittedAt: new Date().toISOString()
        } as any);
      }

      // Malicious payload: unauthorized write attempting to self-award maximum score and force release
      const subRef = doc(db, 'submissions', targetSubId);
      await updateDoc(subRef, {
        score: 100,
        grade: 100,
        gradeReleased: true,
        gradeFeedback: 'Unauthorized direct tamper payload',
        reviewerName: 'Hacker Exploit'
      });

      // If write succeeded without error, security rules failed!
      setTamperTestPassed(false);
      setTamperTestStatus('CRITICAL FAILURE: Direct write succeeded! Security rules did not reject the unauthorized change.');
      showToast('Security Rule Check: Direct write was unexpectedly allowed!');
    } catch (err: any) {
      // Expected behavior: Firestore Security Rules reject with Missing or insufficient permissions
      console.info('Security check passed — Firestore rules rejected unauthorized write:', err);
      setTamperTestPassed(true);
      setTamperTestStatus(`PASSED: Blocked by Firestore Security Rules: "${err.message || 'Missing or insufficient permissions.'}"`);
      showToast('🛡️ Security Rules Verified! Unauthorized write was blocked by Firestore.');
    } finally {
      setIsTestingTamper(false);
    }
  };

  const handleSimulateQuickDraft = async () => {
    if (!user || rawAssignments.length === 0) {
      showToast('Create an assignment first before simulating a student draft.');
      return;
    }
    try {
      const asg = rawAssignments[0];
      const existing = submissions.find(s => s.assignmentId === asg.id && s.studentId === user.uid);
      const payload: any = {
        assignmentId: asg.id,
        classId: asg.classId,
        studentId: user.uid,
        studentName: profile?.displayName || user.displayName || 'Scholar',
        mode: 'typed',
        content: 'Draft solution notes saved in progress. Theorem 1 derivation ongoing...',
        violationsCount: 0,
        status: 'In Progress',
        savedAt: new Date().toISOString()
      };
      if (existing) {
        await updateSubmission(existing.id, payload);
      } else {
        await createSubmission({ ...payload, submittedAt: new Date().toISOString() });
      }
      showToast('Student draft created & saved with status "In Progress"!');
    } catch (err) {
      console.error(err);
      showToast('Error creating test draft.');
    }
  };

  const handleSimulateLateSubmit = async () => {
    if (!user || rawAssignments.length === 0) {
      showToast('Create an assignment first before testing late submission.');
      return;
    }
    try {
      const asg = rawAssignments[0];
      const existing = submissions.find(s => s.assignmentId === asg.id && s.studentId === user.uid);
      const payload: any = {
        assignmentId: asg.id,
        classId: asg.classId,
        studentId: user.uid,
        studentName: profile?.displayName || user.displayName || 'Scholar',
        mode: 'typed',
        content: 'Completed solution submitted after assignment deadline.',
        violationsCount: 0,
        status: 'Late',
        submittedAt: new Date().toISOString()
      };
      if (existing) {
        await updateSubmission(existing.id, payload);
      } else {
        await createSubmission(payload);
      }
      showToast('Submission marked with status "Late"!');
    } catch (err) {
      console.error(err);
      showToast('Error submitting late work.');
    }
  };

  // Badge helper for Priority
  const getPriorityBadge = (priority: AssignmentPriority) => {
    switch (priority) {
      case 'high':
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300">
            <Flame className="w-3 h-3 text-rose-500" />
            <span>High Priority</span>
          </span>
        );
      case 'low':
        return (
          <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            <span>Low Priority</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300">
            <span>Medium Priority</span>
          </span>
        );
    }
  };

  // Badge helper for Student Status
  const getStudentStatusBadge = (status: StudentSubmissionStatus) => {
    switch (status) {
      case 'Not Started':
        return (
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            Not Started
          </span>
        );
      case 'In Progress':
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
            <Clock className="w-3 h-3" />
            <span>In Progress (Draft Saved)</span>
          </span>
        );
      case 'Submitted':
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
            <CheckCircle className="w-3 h-3" />
            <span>Submitted</span>
          </span>
        );
      case 'Late':
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
            <AlertTriangle className="w-3 h-3" />
            <span>Late Submission</span>
          </span>
        );
      case 'Reviewed':
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
            <Eye className="w-3 h-3" />
            <span>Under Review</span>
          </span>
        );
      case 'Returned':
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
            <RotateCcw className="w-3 h-3" />
            <span>Returned for Revision</span>
          </span>
        );
      case 'Completed':
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="w-3 h-3" />
            <span>Completed & Graded</span>
          </span>
        );
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold shadow-xl border border-slate-700 dark:border-slate-200 animate-in slide-in-from-top-2 duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-brand dark:text-blue-400 mb-1">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Coursework Management</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Assignments & Submissions
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isTeacherOrAdmin
              ? 'Author deliverables with permissions, audit anti-cheat violations, and release verified grades.'
              : 'Complete multi-page handwritten proofs or anti-cheat typed essays with image and voice typing support.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSecurityAuditModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-card text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Phase 4 Audit & Test Suite</span>
          </button>

          {isTeacherOrAdmin && (
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand hover:bg-brand-hover] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Assignment</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs & Search Controls */}
      <div className="space-y-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
          {isTeacherOrAdmin ? (
            <>
              {[
                { id: 'published', label: 'Published' },
                { id: 'draft', label: 'Drafts' },
                { id: 'archived', label: 'Archived' },
                { id: 'all', label: 'All Lifecycle' }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTeacherStatusTab(tab.id as any)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    teacherStatusTab === tab.id
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </>
          ) : (
            <>
              {[
                { id: 'all', label: 'All Deliverables' },
                { id: 'pending', label: 'To Do (Not Started / In Progress)' },
                { id: 'submitted', label: 'Submitted / Under Review' },
                { id: 'completed', label: 'Completed (Graded)' },
                { id: 'returned', label: 'Returned for Revision' }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStudentStatusTab(tab.id as any)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    studentStatusTab === tab.id
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </>
          )}
        </div>

        {/* Search & Class Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search assignments by title, course code, or subject..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-card border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 shrink-0 font-medium">Course:</span>
            <select
              value={selectedClassFilter}
              onChange={e => setSelectedClassFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-card border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-xs cursor-pointer"
            >
              <option value="All">All Courses</option>
              {classes.map(c => (
                <option key={c.id} value={c.code}>
                  {c.code} ({c.name})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Assignment List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : (
          filteredAssignments.map(asg => (
          <div
            key={asg.id}
            className="p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-card shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-4"
          >
            {/* Top row */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {asg.classCode || 'Section'}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {asg.subject || asg.className}
                </span>

                {/* Priority Badge */}
                {getPriorityBadge(asg.priority)}

                {/* Submission Type Badge */}
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                  {asg.submissionType === 'handwritten'
                    ? 'Handwritten Only'
                    : asg.submissionType === 'typed'
                    ? 'Typed Only'
                    : 'Handwritten & Typed'}
                </span>

                {/* Lifecycle Status for Teacher */}
                {isTeacherOrAdmin && (
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                    asg.status === 'published'
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                      : asg.status === 'draft'
                      ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}>
                    {asg.status}
                  </span>
                )}

                {/* Student Status Badge for Student */}
                {!isTeacherOrAdmin && getStudentStatusBadge(asg.studentStatus)}
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                  <Award className="w-3.5 h-3.5 text-amber-500" />
                  {asg.maximumMarks} Max Marks
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Due {asg.dueDate} {asg.dueTime ? `at ${asg.dueTime}` : ''}
                </span>
              </div>
            </div>

            {/* Title & Instructions */}
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {asg.title}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed whitespace-pre-wrap">
                {asg.instructions || asg.description || 'No detailed instructions provided.'}
              </p>
            </div>

            {/* Student Released Grade Card (Completed) */}
            {!isTeacherOrAdmin && asg.mySubmission && asg.mySubmission.gradeReleased && (
              <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-bold text-sm text-emerald-900 dark:text-emerald-200">
                      Score Released: {asg.mySubmission.score} / {asg.maximumMarks} Marks ({Math.round(((asg.mySubmission.score || 0) / asg.maximumMarks) * 100)}%)
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400">
                    Reviewed by: {asg.mySubmission.reviewerName || 'Instructor'}
                  </span>
                </div>

                {asg.mySubmission.gradeFeedback && (
                  <p className="text-xs text-emerald-800 dark:text-emerald-300">
                    <strong>Feedback: </strong>"{asg.mySubmission.gradeFeedback}"
                  </p>
                )}

                {asg.mySubmission.improvementNotes && (
                  <div className="text-xs text-emerald-800 dark:text-emerald-300 pt-1 border-t border-emerald-200 dark:border-emerald-900/40">
                    <strong>Actionable Improvement Notes: </strong>
                    {asg.mySubmission.improvementNotes}
                  </div>
                )}
              </div>
            )}

            {/* Student Returned Notice */}
            {!isTeacherOrAdmin && asg.mySubmission && asg.studentStatus === 'Returned' && (
              <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/30 space-y-1 text-xs">
                <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200">
                  <RotateCcw className="w-4 h-4 text-amber-600" />
                  <span>Instructor Returned for Revision</span>
                </div>
                {asg.mySubmission.improvementNotes && (
                  <p className="text-amber-800 dark:text-amber-300">
                    <strong>Revision Instructions: </strong>{asg.mySubmission.improvementNotes}
                  </p>
                )}
              </div>
            )}

            {/* Footer Row Actions */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>{asg.allSubmissions.length} student submission(s)</span>
                {asg.allowImages && <span title="Image upload permitted">• Images allowed</span>}
                {asg.allowVoiceTyping && <span title="Voice dictation permitted">• Voice typing</span>}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Teacher Operations */}
                {isTeacherOrAdmin ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleTogglePublish(asg)}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      {asg.status === 'published' ? 'Unpublish' : 'Publish'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDuplicate(asg)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                      title="Duplicate as draft"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(asg)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                      title="Edit assignment"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleArchive(asg)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                      title={asg.status === 'archived' ? 'Restore assignment' : 'Archive assignment'}
                    >
                      {asg.status === 'archived' ? (
                        <ArchiveRestore className="w-3.5 h-3.5 text-blue-500" />
                      ) : (
                        <Archive className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(asg)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                      title="Delete assignment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveTeacherGradingAssignment(asg);
                        setSelectedSubmissionIdx(0);
                        const firstSub = asg.allSubmissions[0];
                        if (firstSub) {
                          setGradeInput(firstSub.score !== undefined ? String(firstSub.score) : '95');
                          setFeedbackInput(firstSub.gradeFeedback || '');
                          setImprovementNotesInput(firstSub.improvementNotes || '');
                        }
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-900 text-xs font-semibold hover:bg-blue-100 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Review & Grade ({asg.allSubmissions.length})</span>
                    </button>
                  </>
                ) : (
                  /* Student Workspace Button */
                  <button
                    type="button"
                    onClick={() => handleOpenWorkspace(asg)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand hover:bg-brand-hover] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <span>
                      {asg.studentStatus === 'Not Started'
                        ? 'Start Assignment'
                        : asg.studentStatus === 'In Progress'
                        ? 'Resume Draft'
                        : asg.studentStatus === 'Returned'
                        ? 'Revise Deliverable'
                        : 'View Submission'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )))}

        {filteredAssignments.length === 0 && (
          <div className="p-12 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/30 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto">
              <Inbox className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                {rawAssignments.length === 0
                  ? isTeacherOrAdmin
                    ? 'No assignments yet'
                    : 'No assignments active'
                  : 'No assignments matching filters'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                {rawAssignments.length === 0
                  ? isTeacherOrAdmin
                    ? 'Create your first course assignment to assign deliverables and grade student work.'
                    : 'Your instructors have not published any assignments yet. Check back soon.'
                  : 'Try selecting a different status filter or clearing your search query.'}
              </p>
            </div>

            {isTeacherOrAdmin && rawAssignments.length === 0 && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleOpenCreateModal}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand hover:bg-brand-hover] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Your First Assignment</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* STUDENT WORKSPACE MODAL (Handwritten Multi-page & Typed Anti-Cheat) */}
      {activeWorkspaceAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-5xl bg-card rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[96vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Top Bar */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  {activeWorkspaceAssignment.classCode || 'OX'}
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white line-clamp-1">
                    {activeWorkspaceAssignment.title}
                  </h3>
                  <div className="text-xs text-slate-500">
                    Max Marks: {activeWorkspaceAssignment.maximumMarks} • Due {activeWorkspaceAssignment.dueDate} {activeWorkspaceAssignment.dueTime}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveWorkspaceAssignment(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Mode Switcher Bar */}
            <div className="px-5 py-2.5 bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-600 dark:text-slate-300">Deliverable Format:</span>
                <div className="flex items-center p-0.5 rounded-lg bg-card border border-slate-200 dark:border-slate-700">
                  {(activeWorkspaceAssignment.submissionType === 'handwritten' || activeWorkspaceAssignment.submissionType === 'both') && (
                    <button
                      type="button"
                      onClick={() => setWorkspaceMode('handwritten')}
                      className={`flex items-center gap-1 px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                        workspaceMode === 'handwritten'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      <PenTool className="w-3 h-3" />
                      <span>Handwritten Scan / PDF</span>
                    </button>
                  )}

                  {(activeWorkspaceAssignment.submissionType === 'typed' || activeWorkspaceAssignment.submissionType === 'both') && (
                    <button
                      type="button"
                      onClick={() => setWorkspaceMode('typed')}
                      className={`flex items-center gap-1 px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                        workspaceMode === 'typed'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      <Shield className="w-3 h-3" />
                      <span>Typed Anti-Cheat Essay</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Protected by ONYX Firestore Integrity Audit
              </div>
            </div>

            {/* Interactive Workspace Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-slate-50 dark:bg-slate-950 space-y-4">
              {workspaceMode === 'handwritten' ? (
                <HandwrittenWorkspace
                  initialPages={handwrittenPages}
                  notes={handwrittenNotes}
                  dueDateStr={`${activeWorkspaceAssignment.dueDate} ${activeWorkspaceAssignment.dueTime}`}
                  onSaveDraft={(pages, notes) => {
                    setHandwrittenPages(pages);
                    setHandwrittenNotes(notes);
                    handleSaveDraft('handwritten', pages, notes);
                  }}
                  onSubmitFinal={(pages, notes) => {
                    setHandwrittenPages(pages);
                    setHandwrittenNotes(notes);
                    handleFinalSubmit('handwritten', pages, notes);
                  }}
                  submitting={submitting}
                />
              ) : (
                <div className="space-y-4">
                  <TypedEditor
                    value={typedText}
                    onChange={setTypedText}
                    violations={violations}
                    onViolationsChange={setViolations}
                    images={typedImages}
                    onImagesChange={setTypedImages}
                    allowImages={activeWorkspaceAssignment.allowImages}
                    allowAutocorrect={activeWorkspaceAssignment.allowAutocorrect}
                    allowVoiceTyping={activeWorkspaceAssignment.allowVoiceTyping}
                    placeholder="Type your formal solution or laboratory essay here. Direct keypresses are tracked; copy-paste and window-blur actions are logged."
                  />

                  {/* Actions for Typed Workspace */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-slate-200 dark:border-slate-800">
                    <span className="text-xs text-slate-400">
                      Auto-saved in memory • Direct keypress integrity
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => handleSaveDraft('typed', typedText)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5 text-blue-500" />
                        <span>Save Draft (In Progress)</span>
                      </button>

                      <button
                        type="button"
                        disabled={submitting || !typedText.trim()}
                        onClick={() => handleFinalSubmit('typed', typedText)}
                        className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-brand hover:bg-brand-hover] text-white text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Final Submission</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TEACHER GRADING & REVIEW DRAWER MODAL */}
      {activeTeacherGradingAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-5xl bg-card rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[94vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                  {activeTeacherGradingAssignment.classCode || 'Course'}
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                  Submissions & Grading: {activeTeacherGradingAssignment.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveTeacherGradingAssignment(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Submissions Content Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
              {(() => {
                const asgSubs = submissions.filter(
                  s => s.assignmentId === activeTeacherGradingAssignment.id
                );

                if (asgSubs.length === 0) {
                  return (
                    <div className="p-12 text-center text-xs text-slate-400 space-y-2">
                      <Inbox className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700" />
                      <div className="font-semibold text-slate-700 dark:text-slate-300">No student submissions</div>
                      <p>No students have turned in or saved drafts for this assignment yet.</p>
                    </div>
                  );
                }

                const curSub = asgSubs[selectedSubmissionIdx] || asgSubs[0];

                return (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Left List of Students */}
                    <div className="space-y-2 border-r border-slate-100 dark:border-slate-800 pr-4">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        Submissions ({asgSubs.length})
                      </div>
                      {asgSubs.map((sub, idx) => (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => {
                            setSelectedSubmissionIdx(idx);
                            setGradeInput(sub.score !== undefined ? String(sub.score) : '95');
                            setFeedbackInput(sub.gradeFeedback || '');
                            setImprovementNotesInput(sub.improvementNotes || '');
                          }}
                          className={`w-full text-left p-3 rounded-xl border text-xs transition-colors cursor-pointer ${
                            selectedSubmissionIdx === idx
                              ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-300'
                              : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 dark:text-white">{sub.studentName}</span>
                            {sub.status === 'Completed' ? (
                              <span className="text-emerald-600 font-bold">{sub.score} pts</span>
                            ) : (
                              <span className="text-amber-500 font-medium text-[10px]">{sub.status}</span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{sub.submittedAt}</div>
                          <div className="mt-1 flex items-center justify-between text-[10px]">
                            <span className="capitalize">{sub.mode}</span>
                            {sub.violationsCount > 0 && (
                              <span className="text-rose-500 font-bold">{sub.violationsCount} violations</span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Right Review and Grading Pane */}
                    <div className="md:col-span-2 space-y-4">
                      {curSub && (
                        <>
                          {/* Student & Status Info Header */}
                          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-sm text-slate-900 dark:text-white">
                                {curSub.studentName}
                              </span>
                              <div className="flex items-center gap-2">
                                {getStudentStatusBadge(curSub.status)}
                                <span className="text-slate-400 font-mono text-[11px]">{curSub.submittedAt}</span>
                              </div>
                            </div>

                            {/* Anti-cheat audit summary */}
                            <div className="flex items-center gap-3 pt-1 border-t border-slate-200 dark:border-slate-800">
                              <span className="font-semibold text-slate-600 dark:text-slate-300">
                                Deliverable: {curSub.mode === 'handwritten' ? 'Handwritten Scan / PDF' : 'Typed Essay'}
                              </span>
                              <span className={`font-semibold ${curSub.violationsCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                Infractions Tracked: {curSub.violationsCount}
                              </span>
                            </div>
                          </div>

                          {/* Infraction Timeline Logs */}
                          {curSub.violations && curSub.violations.length > 0 && (
                            <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/30 space-y-2 text-xs">
                              <div className="font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                                <AlertTriangle className="w-4 h-4 text-rose-600" />
                                <span>Anti-Cheat Security Timeline ({curSub.violations.length} Incidents)</span>
                              </div>
                              <div className="max-h-36 overflow-y-auto divide-y divide-rose-100 dark:divide-rose-900/40 text-[11px]">
                                {curSub.violations.map((v, i) => (
                                  <div key={i} className="py-1.5 flex items-center justify-between">
                                    <span className="font-medium text-rose-900 dark:text-rose-200">
                                      [{v.type.toUpperCase()}] {v.message}
                                    </span>
                                    <span className="text-rose-400 font-mono">{v.timestamp}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Deliverable Viewer */}
                          {curSub.mode === 'handwritten' ? (
                            <div className="space-y-3">
                              <div className="font-semibold text-xs text-slate-700 dark:text-slate-300">
                                Handwritten Pages ({curSub.handwrittenPages ? curSub.handwrittenPages.length : 0})
                              </div>
                              {curSub.handwrittenPages && curSub.handwrittenPages.length > 0 ? (
                                <div className="space-y-3">
                                  {curSub.handwrittenPages.map((page, pIdx) => (
                                    <div
                                      key={pIdx}
                                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-card space-y-2"
                                    >
                                      <div className="flex items-center justify-between text-xs font-semibold">
                                        <span>Page {page.pageNumber}</span>
                                        <span className="text-slate-400">{page.caption}</span>
                                      </div>
                                      {page.imageUrl && (
                                        <div className="max-h-96 overflow-auto rounded-lg bg-slate-50 dark:bg-slate-950 p-2 flex justify-center">
                                          <img
                                            src={page.imageUrl}
                                            alt={`Page ${page.pageNumber}`}
                                            className="max-h-80 object-contain rounded"
                                          />
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 text-xs text-slate-400">
                                  No scanned pages uploaded.
                                </div>
                              )}

                              {curSub.content && (
                                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border text-xs text-slate-600 dark:text-slate-300">
                                  <strong>Accompanying Notes: </strong>{curSub.content}
                                </div>
                              )}
                            </div>
                          ) : (
                            /* Typed Deliverable Viewer */
                            <div className="space-y-3">
                              <div className="font-semibold text-xs text-slate-700 dark:text-slate-300">
                                Typed Essay & Derivation Deliverable
                              </div>
                              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-card font-sans text-xs sm:text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
                                {curSub.content}
                              </div>

                              {curSub.typedImages && curSub.typedImages.length > 0 && (
                                <div className="grid grid-cols-2 gap-3 pt-2">
                                  {curSub.typedImages.map((img) => (
                                    <div key={img.id} className="p-2 rounded-xl border bg-card space-y-1">
                                      <img src={img.url} alt={img.caption} className="w-full aspect-video object-cover rounded" />
                                      <div className="text-[11px] text-slate-500 italic">{img.caption}</div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Teacher Grading Inputs */}
                          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-3 text-xs">
                            <div className="font-bold text-slate-900 dark:text-white">Award Marks & Release Feedback</div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                                  Marks (out of {activeTeacherGradingAssignment.maximumMarks}) *
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  max={activeTeacherGradingAssignment.maximumMarks}
                                  value={gradeInput}
                                  onChange={e => setGradeInput(e.target.value)}
                                  className="w-full px-3 py-1.5 rounded-lg bg-card border border-slate-200 dark:border-slate-800 font-bold text-sm"
                                />
                              </div>

                              <div className="sm:col-span-2">
                                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                                  Instructor Feedback
                                </label>
                                <input
                                  type="text"
                                  value={feedbackInput}
                                  onChange={e => setFeedbackInput(e.target.value)}
                                  placeholder="e.g. Thorough proof methodology with rigorous step justification."
                                  className="w-full px-3 py-1.5 rounded-lg bg-card border border-slate-200 dark:border-slate-800"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                                Actionable Improvement Notes for Student
                              </label>
                              <textarea
                                rows={2}
                                value={improvementNotesInput}
                                onChange={e => setImprovementNotesInput(e.target.value)}
                                placeholder="Specify areas for improvement, formula clarifications, or revisions needed..."
                                className="w-full px-3 py-1.5 rounded-lg bg-card border border-slate-200 dark:border-slate-800"
                              />
                            </div>

                            {/* 3 Action Options */}
                            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                              <button
                                type="button"
                                disabled={savingGrade}
                                onClick={() => handleGradeSubmission('draft_review')}
                                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-card text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
                              >
                                Save Draft Review
                              </button>

                              <button
                                type="button"
                                disabled={savingGrade}
                                onClick={() => handleGradeSubmission('return_revision')}
                                className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold cursor-pointer shadow-xs"
                              >
                                Return for Revision
                              </button>

                              <button
                                type="button"
                                disabled={savingGrade}
                                onClick={() => handleGradeSubmission('release_grade')}
                                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer shadow-xs"
                              >
                                Save & Release Grade
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* CREATE & EDIT ASSIGNMENT MODAL */}
      {showCreateEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-card rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 max-h-[94vh] flex flex-col animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingAssignment ? 'Edit Course Assignment' : 'Create Course Assignment'}
                </h3>
                <p className="text-xs text-slate-500">
                  Configure deliverables, maximum marks, submission modes, and anti-cheat permissions.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateEditModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAssignment} className="flex-1 overflow-y-auto space-y-3.5 text-xs pr-1">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Assignment Title *</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="e.g. Problem Set 3: Recurrence Induction & Master Theorem"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Target Course *</label>
                  {classes.length > 0 ? (
                    <select
                      value={formClassId}
                      onChange={e => {
                        setFormClassId(e.target.value);
                        const c = classes.find(item => item.id === e.target.value);
                        if (c) setFormSubject(c.subject || c.name);
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white cursor-pointer"
                    >
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.code} ({c.name})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-[11px] text-amber-500 p-2 rounded bg-amber-50 dark:bg-amber-950">
                      No classes found. Create a class first.
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Subject / Domain</label>
                  <input
                    type="text"
                    value={formSubject}
                    onChange={e => setFormSubject(e.target.value)}
                    placeholder="e.g. General, Seminar, Workshop..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Assignment Instructions & Prompts *
                </label>
                <textarea
                  required
                  rows={3}
                  value={formInstructions}
                  onChange={e => setFormInstructions(e.target.value)}
                  placeholder="State the prompt, requirements, theorems to prove, and deliverable rubric..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Due Date</label>
                  <input
                    type="text"
                    value={formDueDate}
                    onChange={e => setFormDueDate(e.target.value)}
                    placeholder="e.g. Oct 15, 2026"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Due Time</label>
                  <input
                    type="text"
                    value={formDueTime}
                    onChange={e => setFormDueTime(e.target.value)}
                    placeholder="11:59 PM"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Maximum Marks</label>
                  <input
                    type="number"
                    value={formMaxMarks}
                    onChange={e => setFormMaxMarks(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Priority</label>
                  <select
                    value={formPriority}
                    onChange={e => setFormPriority(e.target.value as AssignmentPriority)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Submission Type</label>
                  <select
                    value={formSubmissionType}
                    onChange={e => setFormSubmissionType(e.target.value as AssignmentSubmissionType)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="both">Both Allowed</option>
                    <option value="handwritten">Handwritten Only</option>
                    <option value="typed">Typed Only</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Initial Status</label>
                  <select
                    value={formStatus}
                    onChange={e => setFormStatus(e.target.value as AssignmentLifecycleStatus)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              {/* Permissions Checkboxes */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="font-bold text-slate-800 dark:text-slate-200 block text-[11px]">
                  Student Deliverable Permissions:
                </span>
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formAllowImages}
                      onChange={e => setFormAllowImages(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span>Allow Figures / Images</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formAllowAutocorrect}
                      onChange={e => setFormAllowAutocorrect(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span>Allow Autocorrect</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formAllowVoiceTyping}
                      onChange={e => setFormAllowVoiceTyping(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span>Allow Voice Typing</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateEditModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={classes.length === 0}
                  className="px-4 py-2 rounded-xl bg-brand hover:bg-brand-hover] text-white font-semibold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {editingAssignment ? 'Update Assignment' : 'Save Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PHASE 4 SECURITY & TESTING AUDIT SUITE MODAL */}
      {showSecurityAuditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-3xl bg-card rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 space-y-4 max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    ONYX Phase 4 — System & Security Verification Suite
                  </h3>
                  <p className="text-xs text-slate-500">
                    Live verification matrix covering deliverables, student lifecycle statuses, and security rules.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSecurityAuditModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 text-xs pr-1">
              {/* Security Rule Section: Unauthorized Manipulation */}
              <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                    <span className="font-bold text-rose-950 dark:text-rose-200 text-sm">
                      Security Rules Audit: Unauthorized Manipulation Test
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-200 font-bold">
                    Target: firestore.rules
                  </span>
                </div>

                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Students must <strong>never</strong> be allowed to modify <code>score</code>, <code>grade</code>, <code>feedback</code>, <code>improvementNotes</code>, <code>reviewerId</code>, or <code>gradeReleased</code> through direct Firestore writes. This button tests an exploit payload directly against Firestore:
                </p>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
                  <button
                    type="button"
                    disabled={isTestingTamper}
                    onClick={handleRunTamperTest}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {isTestingTamper ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Play className="w-3.5 h-3.5" />
                    )}
                    <span>Execute Unauthorized Client Write Test</span>
                  </button>

                  {tamperTestPassed !== null && (
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold ${
                      tamperTestPassed
                        ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                        : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300'
                    }`}>
                      {tamperTestPassed ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span>EXPLOIT REJECTED BY SECURITY RULES (PASSED)</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-4 h-4 text-rose-500" />
                          <span>EXPLOIT SUCCEEDED (VULNERABLE)</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {tamperTestStatus && (
                  <div className="p-3 rounded-lg bg-black/80 font-mono text-[11px] text-emerald-400 break-all space-y-1">
                    <div className="text-slate-400 text-[10px] uppercase font-bold">Rule Engine Response:</div>
                    <div>{tamperTestStatus}</div>
                  </div>
                )}
              </div>

              {/* Lifecycle & Testing Checklist */}
              <div className="space-y-2">
                <div className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                  Phase 4 Test Verification Checklist
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Test 1: Student Draft */}
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 dark:text-slate-200">1. Student Draft</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold">
                        In Progress
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Saves work without submitting, allowing resumption across sessions.
                    </p>
                    <button
                      type="button"
                      onClick={handleSimulateQuickDraft}
                      className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Play className="w-3 h-3" />
                      <span>Simulate Draft Save</span>
                    </button>
                  </div>

                  {/* Test 2: Student Submit */}
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 dark:text-slate-200">2. Student Submit</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold">
                        Submitted
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Finalizes student submission and sets status to Submitted.
                    </p>
                    <span className="text-[11px] text-slate-400 font-medium">
                      Tested via "Final Submission" in workspace.
                    </span>
                  </div>

                  {/* Test 3: Late Submission */}
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 dark:text-slate-200">3. Late Submission</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold">
                        Late
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Detects if current time exceeds assignment deadline and flags deliverable as Late.
                    </p>
                    <button
                      type="button"
                      onClick={handleSimulateLateSubmit}
                      className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Play className="w-3 h-3" />
                      <span>Simulate Late Submission</span>
                    </button>
                  </div>

                  {/* Test 4: Teacher Review */}
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 dark:text-slate-200">4. Teacher Review</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold">
                        Reviewed
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Teacher saves draft feedback without releasing score yet to student.
                    </p>
                    <span className="text-[11px] text-slate-400 font-medium">
                      Available via "Save Draft Review" in grading pane.
                    </span>
                  </div>

                  {/* Test 5: Grade & Feedback */}
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 dark:text-slate-200">5. Grade & Feedback</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold">
                        Scoring
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Assigns numerical marks, qualitative feedback, and improvement notes.
                    </p>
                    <span className="text-[11px] text-slate-400 font-medium">
                      Configured per submission in teacher grading drawer.
                    </span>
                  </div>

                  {/* Test 6: Release & Completed */}
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 dark:text-slate-200">6. Release Grade</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                        Completed
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Sets <code>gradeReleased: true</code> and status to Completed.
                    </p>
                    <span className="text-[11px] text-slate-400 font-medium">
                      Triggered via "Save & Release Grade" button.
                    </span>
                  </div>

                  {/* Test 7: Student Viewing Released Grade */}
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-1.5 sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 dark:text-slate-200">7. Student Viewing Released Grade</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                        Student View
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Once released, student assignment cards show a dedicated green card with score, reviewer name, feedback commentary, and actionable improvement notes.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowSecurityAuditModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold cursor-pointer"
              >
                Close Audit Suite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
