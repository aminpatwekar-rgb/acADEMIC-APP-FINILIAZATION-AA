import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useViewRole } from '../../lib/viewRole';
import {
  ClassItem,
  EnrolledStudent,
  ClassAnnouncement,
  ClassResource,
  DiscussionPost,
  DiscussionReply,
  BANNER_PRESETS,
  generateJoinCode
} from '../../lib/classes/classStore';
import { exportToCSV } from '../../lib/csv';
import {
  notifyClassStudents,
  notifyTeacher,
  createNotification
} from '../../lib/firebase/firestoreService';
import {
  X,
  Copy,
  Check,
  RefreshCw,
  Share2,
  Calendar,
  Clock,
  BookOpen,
  Users,
  Download,
  Upload,
  Plus,
  Trash2,
  FileText,
  MessageSquare,
  Pin,
  Lock,
  Unlock,
  Shield,
  ShieldAlert,
  Archive,
  ArchiveRestore,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Paperclip,
  Send,
  AlertTriangle,
  Sparkles,
  Search,
  Eye,
  EyeOff
} from 'lucide-react';

interface ClassHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetClass: ClassItem;
  onUpdateClass: (updatedClass: ClassItem) => void;
  onDeleteClass: (classId: string) => void;
  onOpenEditModal: () => void;
  onOpenTransferModal: () => void;
  onToast: (msg: string) => void;
}

export function ClassHubModal({
  isOpen,
  onClose,
  targetClass,
  onUpdateClass,
  onDeleteClass,
  onOpenEditModal,
  onOpenTransferModal,
  onToast
}: ClassHubModalProps) {
  const { profile } = useAuth();
  const { effectiveRole } = useViewRole();

  const isTeacherOrAdmin = effectiveRole === 'teacher' || effectiveRole === 'admin';
  const isAdmin = effectiveRole === 'admin';
  const isStudent = effectiveRole === 'student';

  const [activeTab, setActiveTab] = useState<'overview' | 'roster' | 'announcements' | 'resources' | 'discussions' | 'settings'>('overview');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Roster Pagination & Search
  const [rosterPage, setRosterPage] = useState(1);
  const [rosterSearch, setRosterSearch] = useState('');
  const pageSize = 5;

  // Announcements form
  const [showAnnComposer, setShowAnnComposer] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annAudience, setAnnAudience] = useState<'everyone' | 'teachers' | 'students'>('everyone');
  const [annAttachName, setAnnAttachName] = useState('');
  const [annAttachSize, setAnnAttachSize] = useState('1.2 MB');

  // Resources form
  const [showResComposer, setShowResComposer] = useState(false);
  const [resTitle, setResTitle] = useState('');
  const [resFileName, setResFileName] = useState('');
  const [resCategory, setResCategory] = useState<ClassResource['category']>('Lecture Slides');
  const [resFileSize, setResFileSize] = useState('2.4 MB');

  // Discussions form
  const [showDiscComposer, setShowDiscComposer] = useState(false);
  const [discTitle, setDiscTitle] = useState('');
  const [discContent, setDiscContent] = useState('');
  const [discTag, setDiscTag] = useState<DiscussionPost['tag']>('Question');
  const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});
  const [activeReplyPostId, setActiveReplyPostId] = useState<string | null>(null);

  // Leave Class confirmation
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Keyboard Escape listener
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (showLeaveConfirm) {
          setShowLeaveConfirm(false);
        } else if (showDeleteConfirm) {
          setShowDeleteConfirm(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showLeaveConfirm, showDeleteConfirm, onClose]);

  if (!isOpen) return null;

  const currentBanner = BANNER_PRESETS.find(p => p.id === targetClass.bannerPreset) || BANNER_PRESETS[0];

  // Copy invitation link
  const handleCopyInviteLink = () => {
    const inviteUrl = `${window.location.origin}/classes?join=${targetClass.joinCode}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    onToast('Invitation link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Copy Join Code
  const handleCopyCode = () => {
    navigator.clipboard.writeText(targetClass.joinCode);
    setCopiedCode(true);
    onToast(`Join code "${targetClass.joinCode}" copied!`);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  // Regenerate Join Code (Teacher/Admin)
  const handleRegenerateCode = () => {
    const prefix = targetClass.code.split('-')[0] || 'OX';
    const newCode = generateJoinCode(prefix);
    const updated: ClassItem = {
      ...targetClass,
      joinCode: newCode
    };
    onUpdateClass(updated);
    onToast(`New join code generated: ${newCode}`);
  };

  // Archive / Restore Toggle
  const handleToggleArchive = () => {
    const nextArchived = !targetClass.archived;
    const updated: ClassItem = {
      ...targetClass,
      archived: nextArchived
    };
    onUpdateClass(updated);
    onToast(nextArchived ? `"${targetClass.name}" archived.` : `"${targetClass.name}" restored to active status.`);
  };

  // Student Leave Class
  const handleLeaveClass = () => {
    const studentName = profile?.displayName || 'Student';
    const studentEmail = profile?.email || '';

    const updatedRoster = targetClass.roster.filter(s => s.email !== studentEmail && s.id !== profile?.uid);
    const nowStr = new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

    const newLeaveEntry = {
      studentName,
      leftAt: nowStr
    };

    const updated: ClassItem = {
      ...targetClass,
      roster: updatedRoster,
      leaveLog: [...(targetClass.leaveLog || []), newLeaveEntry]
    };

    onUpdateClass(updated);

    // Notify Course Instructor persistently in Firestore
    if (targetClass.ownerId) {
      notifyTeacher({
        teacherId: targetClass.ownerId,
        classId: targetClass.id,
        className: targetClass.name,
        type: 'student_leaving',
        title: `Student Left Class: ${studentName}`,
        message: `${studentName} has departed from ${targetClass.code}: ${targetClass.name}. Course roster updated.`,
        link: '/classes'
      }).catch(console.error);
    }

    setShowLeaveConfirm(false);
    onToast(`You have departed from ${targetClass.code}. Course instructor notified.`);
    onClose();
  };

  // Remove Student (Teacher/Admin)
  const handleRemoveStudent = (studentId: string, studentName: string) => {
    if (!window.confirm(`Are you sure you want to remove ${studentName} from the course roster?`)) return;

    const updatedRoster = targetClass.roster.filter(s => s.id !== studentId);
    const updated: ClassItem = {
      ...targetClass,
      roster: updatedRoster
    };
    onUpdateClass(updated);
    onToast(`Student ${studentName} removed from roster.`);
  };

  // CSV Export
  const handleExportCSV = () => {
    const rows = targetClass.roster.map(s => ({
      name: s.name,
      email: s.email,
      rollNumber: s.rollNumber,
      erNumber: s.erNumber,
      srNumber: s.srNumber,
      attendance: `${s.attendance}%`,
      progress: `${s.progress}%`,
      grade: `${s.grade}%`,
      joinedAt: s.joinedAt
    }));

    exportToCSV(`${targetClass.code}_Roster_${new Date().toISOString().split('T')[0]}`, rows, [
      { key: 'name', label: 'Student Legal Name' },
      { key: 'email', label: 'University Email' },
      { key: 'rollNumber', label: 'Roll Number' },
      { key: 'erNumber', label: 'ER Number' },
      { key: 'srNumber', label: 'Sr Number' },
      { key: 'attendance', label: 'Attendance' },
      { key: 'progress', label: 'Progress' },
      { key: 'grade', label: 'Grade' },
      { key: 'joinedAt', label: 'Enrolled Date' },
    ]);

    onToast('Course roster exported to CSV successfully.');
  };

  // Post Announcement
  const handlePublishAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annContent.trim()) return;

    const attachments = annAttachName.trim()
      ? [{ name: annAttachName.trim(), url: '#', size: annAttachSize }]
      : undefined;

    const newAnn: ClassAnnouncement = {
      id: `ann-${Date.now()}`,
      classId: targetClass.id,
      authorId: profile?.uid || 't1',
      authorName: profile?.displayName || targetClass.instructor,
      authorRole: isTeacherOrAdmin ? 'teacher' : 'student' as any,
      title: annTitle.trim(),
      content: annContent.trim(),
      targetAudience: annAudience,
      isPlatformWide: false,
      attachments,
      createdAt: 'Just now'
    };

    const updated: ClassItem = {
      ...targetClass,
      announcements: [newAnn, ...targetClass.announcements]
    };

    onUpdateClass(updated);

    // Notify all students in this course section persistently in Firestore
    notifyClassStudents({
      classId: targetClass.id,
      className: targetClass.name,
      type: 'announcement',
      title: `Announcement: ${annTitle.trim()}`,
      message: `${annContent.trim().slice(0, 140)}`,
      link: '/classes',
      excludeUserId: profile?.uid
    }).catch(console.error);

    setShowAnnComposer(false);
    setAnnTitle('');
    setAnnContent('');
    setAnnAttachName('');
    onToast('Announcement published to section feed.');
  };

  // Upload Resource
  const handleUploadResource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resTitle.trim() || !resFileName.trim()) return;

    const newRes: ClassResource = {
      id: `res-${Date.now()}`,
      classId: targetClass.id,
      title: resTitle.trim(),
      fileName: resFileName.trim(),
      fileSize: resFileSize,
      fileType: resFileName.endsWith('.zip') ? 'zip' : 'pdf',
      category: resCategory,
      uploadedBy: profile?.displayName || targetClass.instructor,
      uploadedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      downloadUrl: '#'
    };

    const updated: ClassItem = {
      ...targetClass,
      resources: [newRes, ...targetClass.resources]
    };

    onUpdateClass(updated);
    setShowResComposer(false);
    setResTitle('');
    setResFileName('');
    onToast(`Resource "${newRes.title}" uploaded.`);
  };

  // Download resource simulation
  const handleDownloadResource = (res: ClassResource) => {
    const dummyContent = `ONYX Learning Management System\nClass: ${targetClass.code} - ${targetClass.name}\nResource: ${res.title}\nFile: ${res.fileName}\nCategory: ${res.category}\nUploaded By: ${res.uploadedBy} on ${res.uploadedAt}\n\n[Protected Course Material for Enrolled Students Only]`;
    const blob = new Blob([dummyContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = res.fileName.endsWith('.txt') ? res.fileName : `${res.fileName}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    onToast(`Downloading "${res.fileName}"...`);
  };

  // Delete Resource
  const handleDeleteResource = (resId: string) => {
    const updated: ClassItem = {
      ...targetClass,
      resources: targetClass.resources.filter(r => r.id !== resId)
    };
    onUpdateClass(updated);
    onToast('Course material deleted.');
  };

  // Post Discussion Question
  const handlePostDiscussion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!discTitle.trim() || !discContent.trim()) return;

    const newPost: DiscussionPost = {
      id: `disc-${Date.now()}`,
      classId: targetClass.id,
      authorId: profile?.uid || 'u-me',
      authorName: profile?.displayName || 'Scholar',
      authorRole: isTeacherOrAdmin ? 'teacher' : 'student',
      title: discTitle.trim(),
      content: discContent.trim(),
      tag: discTag,
      pinned: false,
      locked: false,
      replies: [],
      createdAt: 'Just now'
    };

    const updated: ClassItem = {
      ...targetClass,
      discussions: [newPost, ...targetClass.discussions]
    };

    onUpdateClass(updated);
    setShowDiscComposer(false);
    setDiscTitle('');
    setDiscContent('');
    onToast('Discussion inquiry posted.');
  };

  // Reply to Discussion
  const handleReplyDiscussion = (postId: string) => {
    const text = replyTextMap[postId]?.trim();
    if (!text) return;

    const newReply: DiscussionReply = {
      id: `rep-${Date.now()}`,
      authorId: profile?.uid || 'u-me',
      authorName: profile?.displayName || (isTeacherOrAdmin ? 'Dr. Instructor' : 'Scholar'),
      authorRole: isTeacherOrAdmin ? 'teacher' : 'student',
      content: text,
      createdAt: 'Just now'
    };

    const updatedDiscussions = targetClass.discussions.map(d => {
      if (d.id === postId) {
        return {
          ...d,
          replies: [...d.replies, newReply]
        };
      }
      return d;
    });

    onUpdateClass({ ...targetClass, discussions: updatedDiscussions });
    setReplyTextMap(prev => ({ ...prev, [postId]: '' }));
    setActiveReplyPostId(null);
    onToast('Reply posted.');
  };

  // Moderate Discussion (Pin / Lock / Delete)
  const handleTogglePinDiscussion = (postId: string) => {
    const updatedDiscussions = targetClass.discussions.map(d => {
      if (d.id === postId) return { ...d, pinned: !d.pinned };
      return d;
    });
    onUpdateClass({ ...targetClass, discussions: updatedDiscussions });
  };

  const handleToggleLockDiscussion = (postId: string) => {
    const updatedDiscussions = targetClass.discussions.map(d => {
      if (d.id === postId) return { ...d, locked: !d.locked };
      return d;
    });
    onUpdateClass({ ...targetClass, discussions: updatedDiscussions });
    onToast('Discussion thread lock state updated.');
  };

  const handleDeleteDiscussion = (postId: string) => {
    const updatedDiscussions = targetClass.discussions.filter(d => d.id !== postId);
    onUpdateClass({ ...targetClass, discussions: updatedDiscussions });
    onToast('Discussion thread removed.');
  };

  // Filtered Roster for pagination
  const filteredRoster = targetClass.roster.filter(s =>
    s.name.toLowerCase().includes(rosterSearch.toLowerCase()) ||
    s.rollNumber.toLowerCase().includes(rosterSearch.toLowerCase()) ||
    s.erNumber.toLowerCase().includes(rosterSearch.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filteredRoster.length / pageSize));
  const currentRosterPageItems = filteredRoster.slice((rosterPage - 1) * pageSize, rosterPage * pageSize);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="class-hub-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="w-full max-w-5xl bg-card rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[95vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Visual Banner Header */}
        <div
          className="w-full p-5 sm:p-6 text-white flex flex-col justify-between relative shadow-inner shrink-0"
          style={{ background: currentBanner.gradient }}
        >
          {/* Top banner controls */}
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-black/30 backdrop-blur-xs text-white">
                {targetClass.code}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-white/20 backdrop-blur-xs">
                {targetClass.section}
              </span>
              {targetClass.archived && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-amber-500 text-slate-950">
                  Archived Section
                </span>
              )}
            </div>

            {/* Action Bar in Header */}
            <div className="flex items-center gap-1.5">
              {/* Copy Invite Link */}
              <button
                type="button"
                onClick={handleCopyInviteLink}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/30 hover:bg-black/50 backdrop-blur-xs text-xs font-semibold transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                title="Copy shareable invitation link"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{copiedLink ? 'Copied Link!' : 'Invite Link'}</span>
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close class hub"
                className="p-1 rounded-lg bg-black/30 hover:bg-black/50 backdrop-blur-xs transition-colors cursor-pointer text-white focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Banner Middle Content */}
          <div className="space-y-1">
            <h2 id="class-hub-title" className="text-xl sm:text-2xl font-black drop-shadow-sm line-clamp-1">
              {targetClass.name}
            </h2>
            <div className="text-xs sm:text-sm text-white/90 flex flex-wrap items-center gap-3">
              <span>{targetClass.instructor}</span>
              <span>•</span>
              <span>{targetClass.subject}</span>
              <span>•</span>
              <span className="flex items-center gap-1 font-mono font-bold bg-white/15 px-2 py-0.5 rounded">
                Code: {targetClass.joinCode}
              </span>
              {isTeacherOrAdmin && (
                <button
                  type="button"
                  onClick={handleRegenerateCode}
                  className="hover:underline flex items-center gap-1 text-[11px] text-white/80 hover:text-white cursor-pointer"
                  title="Roll new student join code"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Regen</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-5 border-b border-slate-200 dark:border-slate-800 bg-card text-xs font-semibold overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Overview & Syllabus
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('roster')}
            className={`py-3 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'roster'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Roster</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800">
              {targetClass.roster.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('announcements')}
            className={`py-3 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'announcements'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Announcements</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800">
              {targetClass.announcements.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('resources')}
            className={`py-3 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'resources'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Resources</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800">
              {targetClass.resources.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('discussions')}
            className={`py-3 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'discussions'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Discussions</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800">
              {targetClass.discussions.length}
            </span>
          </button>
          {isTeacherOrAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`py-3 px-3 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'settings'
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Class Controls
            </button>
          )}
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50/50 dark:bg-slate-950/40">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6 text-xs sm:text-sm">
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-card space-y-2 shadow-xs">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">Course Syllabus & Description</h4>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  {targetClass.description}
                </p>
              </div>

              {/* Grid with Schedule & Room */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-card space-y-1.5 shadow-xs">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                    <span>Meeting Schedule</span>
                  </div>
                  <div className="font-bold text-slate-900 dark:text-white text-sm">{targetClass.schedule}</div>
                  <div className="text-xs text-slate-500">Regular attendance required for lab credit</div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-card space-y-1.5 shadow-xs">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                    <span>Lecture Location</span>
                  </div>
                  <div className="font-bold text-slate-900 dark:text-white text-sm">{targetClass.room}</div>
                  <div className="text-xs text-slate-500">Instructor: {targetClass.instructor}</div>
                </div>
              </div>

              {/* Student Leave Section Button */}
              {isStudent && (
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-card flex items-center justify-between shadow-xs">
                  <div>
                    <h5 className="font-semibold text-slate-900 dark:text-white text-xs">Enrolled Section Status</h5>
                    <p className="text-slate-500 text-xs">You are currently an enrolled scholar in this section.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowLeaveConfirm(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 text-xs font-semibold cursor-pointer transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Leave Class</span>
                  </button>
                </div>
              )}

              {/* Teacher view of recent departures */}
              {isTeacherOrAdmin && targetClass.leaveLog && targetClass.leaveLog.length > 0 && (
                <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 space-y-2 text-xs">
                  <span className="font-bold text-amber-900 dark:text-amber-300">
                    Recent Student Departures ({targetClass.leaveLog.length})
                  </span>
                  <div className="divide-y divide-amber-200/60 dark:divide-amber-900/40">
                    {targetClass.leaveLog.map((log, i) => (
                      <div key={i} className="py-1.5 flex items-center justify-between text-[11px] text-amber-800 dark:text-amber-400">
                        <span>Scholar <strong className="text-slate-900 dark:text-white">{log.studentName}</strong> left the section.</span>
                        <span>{log.leftAt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ROSTER & PRIVACY */}
          {activeTab === 'roster' && (
            <div className="space-y-4">
              {/* Privacy Notice Banner */}
              <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/30 flex items-start justify-between gap-3 text-xs">
                <div className="flex items-start gap-2.5">
                  <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-blue-900 dark:text-blue-200">
                      {isStudent ? 'Student Privacy Shield Active' : 'Faculty Roster Management & Governance'}
                    </span>
                    <p className="text-blue-800 dark:text-blue-300 text-[11px] mt-0.5">
                      {isStudent
                        ? 'Peer identifiers (Roll, ER, Sr numbers, and private contact emails) are masked to prevent identity tracking.'
                        : 'You have full access to student Roll, ER, and Sr numbers. CSV export is enabled for attendance audits.'}
                    </p>
                  </div>
                </div>

                {isTeacherOrAdmin && (
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shrink-0 cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </button>
                )}
              </div>

              {/* Roster Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={rosterSearch}
                  onChange={e => {
                    setRosterSearch(e.target.value);
                    setRosterPage(1);
                  }}
                  placeholder="Filter student by name or roll number..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-card border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-xs"
                />
              </div>

              {/* Roster Table */}
              <div className="bg-card border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-semibold text-[10px] tracking-wider">
                      <tr>
                        <th className="p-3.5">Student</th>
                        <th className="p-3.5">Roll No</th>
                        <th className="p-3.5">ER / Sr No</th>
                        <th className="p-3.5">Attendance</th>
                        <th className="p-3.5">Progress</th>
                        <th className="p-3.5">Grade</th>
                        {isTeacherOrAdmin && <th className="p-3.5 text-right">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {currentRosterPageItems.map(student => (
                        <tr key={student.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="p-3.5">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full ${student.avatarBg} text-white font-bold text-xs flex items-center justify-center shrink-0`}>
                                {student.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-semibold text-slate-900 dark:text-white">
                                  {student.name}
                                </div>
                                <div className="text-[11px] text-slate-400">
                                  {isStudent ? '••••••••@onyx.edu' : student.email}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="p-3.5 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                            {isStudent ? '••••••' : student.rollNumber}
                          </td>

                          <td className="p-3.5 font-mono text-[11px] text-slate-500">
                            {isStudent ? '•••••• / ••••••' : `${student.erNumber} / ${student.srNumber}`}
                          </td>

                          <td className="p-3.5 font-semibold text-emerald-600 dark:text-emerald-400">
                            {student.attendance}%
                          </td>

                          <td className="p-3.5">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                <div
                                  className="h-full bg-blue-600 rounded-full"
                                  style={{ width: `${student.progress}%` }}
                                />
                              </div>
                              <span className="text-[11px] font-mono text-slate-500">{student.progress}%</span>
                            </div>
                          </td>

                          <td className="p-3.5 font-bold font-mono text-slate-900 dark:text-white">
                            {student.grade}%
                          </td>

                          {isTeacherOrAdmin && (
                            <td className="p-3.5 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveStudent(student.id, student.name)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-colors cursor-pointer"
                                title="Remove student from roster"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {filteredRoster.length === 0 && (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No students match the search criteria.
                  </div>
                )}

                {/* Pagination Controls */}
                <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                  <span>Showing {currentRosterPageItems.length} of {filteredRoster.length} registered students</span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={rosterPage === 1}
                      onClick={() => setRosterPage(p => Math.max(1, p - 1))}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-900 disabled:opacity-40 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Page {rosterPage} of {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={rosterPage >= totalPages}
                      onClick={() => setRosterPage(p => Math.min(totalPages, p + 1))}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-900 disabled:opacity-40 cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ANNOUNCEMENTS */}
          {activeTab === 'announcements' && (
            <div className="space-y-4">
              {isTeacherOrAdmin && (
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-card space-y-3 shadow-xs">
                  {!showAnnComposer ? (
                    <button
                      type="button"
                      onClick={() => setShowAnnComposer(true)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Compose announcement for {targetClass.code}</span>
                    </button>
                  ) : (
                    <form onSubmit={handlePublishAnnouncement} className="space-y-3 text-xs animate-in fade-in duration-150">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white">New Announcement</span>
                        <div className="flex items-center gap-2">
                          <label className="text-slate-500 font-medium">Audience:</label>
                          <select
                            value={annAudience}
                            onChange={e => setAnnAudience(e.target.value as any)}
                            className="px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-semibold"
                          >
                            <option value="everyone">Everyone (All)</option>
                            <option value="students">Students Only</option>
                            <option value="teachers">Faculty Only</option>
                          </select>
                        </div>
                      </div>

                      <input
                        type="text"
                        required
                        value={annTitle}
                        onChange={e => setAnnTitle(e.target.value)}
                        placeholder="Announcement Subject..."
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />

                      <textarea
                        required
                        rows={3}
                        value={annContent}
                        onChange={e => setAnnContent(e.target.value)}
                        placeholder="Announcement content..."
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />

                      {/* Attachment input */}
                      <div className="flex items-center gap-2">
                        <Paperclip className="w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          value={annAttachName}
                          onChange={e => setAnnAttachName(e.target.value)}
                          placeholder="Attachment filename (e.g. Lab_Manual_Ch3.pdf)..."
                          className="flex-1 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => setShowAnnComposer(false)}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 rounded-xl bg-brand text-white font-semibold shadow-xs cursor-pointer"
                        >
                          Publish Announcement
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* Announcements Feed */}
              <div className="space-y-3">
                {targetClass.announcements.map(ann => (
                  <div
                    key={ann.id}
                    className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-card space-y-2.5 shadow-xs"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">{ann.authorName}</span>
                        <span className="px-2 py-0.2 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-semibold text-[10px]">
                          Audience: {ann.targetAudience}
                        </span>
                      </div>
                      <span>{ann.createdAt}</span>
                    </div>

                    <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                      {ann.title}
                    </h4>

                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">
                      {ann.content}
                    </p>

                    {ann.attachments && ann.attachments.length > 0 && (
                      <div className="pt-2 flex flex-wrap gap-2">
                        {ann.attachments.map((att, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
                          >
                            <Paperclip className="w-3.5 h-3.5 text-blue-500" />
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{att.name}</span>
                            <span className="text-[10px] text-slate-400">({att.size})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: RESOURCES */}
          {activeTab === 'resources' && (
            <div className="space-y-4">
              {isTeacherOrAdmin && (
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-card space-y-3 shadow-xs">
                  {!showResComposer ? (
                    <button
                      type="button"
                      onClick={() => setShowResComposer(true)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Upload learning material or problem set solution</span>
                    </button>
                  ) : (
                    <form onSubmit={handleUploadResource} className="space-y-3 text-xs animate-in fade-in duration-150">
                      <div className="font-bold text-slate-900 dark:text-white">Upload Course Material</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Resource Title *</label>
                          <input
                            type="text"
                            required
                            value={resTitle}
                            onChange={e => setResTitle(e.target.value)}
                            placeholder="e.g. Graph Traversal Algorithms Reference"
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                          <select
                            value={resCategory}
                            onChange={e => setResCategory(e.target.value as any)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                          >
                            <option value="Lecture Slides">Lecture Slides</option>
                            <option value="Syllabus">Syllabus</option>
                            <option value="Problem Set">Problem Set</option>
                            <option value="Lab Manual">Lab Manual</option>
                            <option value="Solutions">Solutions</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">File Name *</label>
                          <input
                            type="text"
                            required
                            value={resFileName}
                            onChange={e => setResFileName(e.target.value)}
                            placeholder="e.g. CS101_Module3_LectureNotes.pdf"
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">File Size</label>
                          <input
                            type="text"
                            value={resFileSize}
                            onChange={e => setResFileSize(e.target.value)}
                            placeholder="e.g. 2.4 MB"
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => setShowResComposer(false)}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 rounded-xl bg-brand text-white font-semibold shadow-xs cursor-pointer"
                        >
                          Save Material
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* Resources List */}
              <div className="space-y-3">
                {targetClass.resources.map(res => (
                  <div
                    key={res.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-card flex items-center justify-between shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white">
                          {res.title}
                        </h4>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5 font-mono">
                          <span>{res.fileName}</span>
                          <span>•</span>
                          <span>{res.fileSize}</span>
                          <span>•</span>
                          <span className="font-sans font-semibold text-blue-600 dark:text-blue-400">{res.category}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleDownloadResource(res)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </button>

                      {isTeacherOrAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDeleteResource(res.id)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-colors cursor-pointer"
                          title="Delete material"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {targetClass.resources.length === 0 && (
                  <div className="p-8 text-center text-xs text-slate-400 border border-slate-200 dark:border-slate-800 rounded-2xl bg-card">
                    No learning materials uploaded yet.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: DISCUSSIONS & MODERATION */}
          {activeTab === 'discussions' && (
            <div className="space-y-4">
              {/* Discussion Composer */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-card space-y-3 shadow-xs">
                {!showDiscComposer ? (
                  <button
                    type="button"
                    onClick={() => setShowDiscComposer(true)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Ask a question or start a discussion</span>
                  </button>
                ) : (
                  <form onSubmit={handlePostDiscussion} className="space-y-3 text-xs animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white">Start Discussion Thread</span>
                      <select
                        value={discTag}
                        onChange={e => setDiscTag(e.target.value as any)}
                        className="px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-semibold"
                      >
                        <option value="Question">Question</option>
                        <option value="Proof Help">Proof Help</option>
                        <option value="Exam Prep">Exam Prep</option>
                        <option value="General">General</option>
                      </select>
                    </div>

                    <input
                      type="text"
                      required
                      value={discTitle}
                      onChange={e => setDiscTitle(e.target.value)}
                      placeholder="Thread topic or inquiry..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-semibold"
                    />

                    <textarea
                      required
                      rows={3}
                      value={discContent}
                      onChange={e => setDiscContent(e.target.value)}
                      placeholder="Explain your theoretical question or concept..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                    />

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => setShowDiscComposer(false)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded-xl bg-brand text-white font-semibold shadow-xs cursor-pointer"
                      >
                        Post Discussion
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Discussions List */}
              <div className="space-y-4">
                {targetClass.discussions.map(post => (
                  <div
                    key={post.id}
                    className={`p-5 rounded-2xl border transition-all space-y-4 bg-card shadow-xs ${
                      post.pinned ? 'border-amber-400/60 ring-1 ring-amber-400/20' : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 text-[11px]">
                          {post.pinned && (
                            <span className="flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
                              <Pin className="w-3.5 h-3.5 fill-current" />
                              Pinned
                            </span>
                          )}
                          <span className="font-semibold text-slate-900 dark:text-white">{post.authorName}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {post.authorRole}
                          </span>
                          <span className="text-slate-400">• {post.createdAt}</span>
                          <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-semibold text-[10px]">
                            {post.tag}
                          </span>
                        </div>

                        <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white mt-1">
                          {post.title}
                        </h4>
                      </div>

                      {/* Moderation Actions (Teacher/Admin) */}
                      {isTeacherOrAdmin && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleTogglePinDiscussion(post.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            title={post.pinned ? 'Unpin thread' : 'Pin thread to top'}
                          >
                            <Pin className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleLockDiscussion(post.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            title={post.locked ? 'Unlock thread' : 'Lock thread'}
                          >
                            {post.locked ? <Lock className="w-4 h-4 text-red-500" /> : <Unlock className="w-4 h-4" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDiscussion(post.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 cursor-pointer"
                            title="Delete thread"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {post.content}
                    </p>

                    {/* Threaded Replies */}
                    <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        {post.replies.length} {post.replies.length === 1 ? 'Reply' : 'Replies'}
                      </div>

                      {post.replies.map(rep => (
                        <div
                          key={rep.id}
                          className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-100 dark:border-slate-800/80 space-y-1 text-xs"
                        >
                          <div className="flex items-center justify-between text-[11px]">
                            <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                              <span>{rep.authorName}</span>
                              <span className="text-[10px] font-mono px-1 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                {rep.authorRole}
                              </span>
                            </div>
                            <span className="text-slate-400">{rep.createdAt}</span>
                          </div>
                          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                            {rep.content}
                          </p>
                        </div>
                      ))}

                      {/* Reply Input Box */}
                      {!post.locked ? (
                        <div className="pt-2 flex items-center gap-2">
                          <input
                            type="text"
                            value={replyTextMap[post.id] || ''}
                            onChange={e => setReplyTextMap(prev => ({ ...prev, [post.id]: e.target.value }))}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                handleReplyDiscussion(post.id);
                              }
                            }}
                            placeholder="Write a constructive reply to this thread..."
                            className="flex-1 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleReplyDiscussion(post.id)}
                            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs cursor-pointer shadow-xs shrink-0 flex items-center gap-1"
                          >
                            <Send className="w-3 h-3" />
                            <span>Reply</span>
                          </button>
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-400 italic flex items-center gap-1 pt-1">
                          <Lock className="w-3 h-3" />
                          <span>This discussion thread is locked by course staff.</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {targetClass.discussions.length === 0 && (
                  <div className="p-8 text-center text-xs text-slate-400 border border-slate-200 dark:border-slate-800 rounded-2xl bg-card">
                    No discussion threads initiated. Be the first to start a conversation!
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: SETTINGS & ADMIN */}
          {activeTab === 'settings' && isTeacherOrAdmin && (
            <div className="space-y-5 text-xs">
              {/* Metadata Edit Block */}
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-card space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">Course Metadata & Banner</h4>
                    <p className="text-slate-500 text-xs">Update title, schedule, lecture hall, or visual banner style.</p>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenEditModal}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold cursor-pointer shadow-xs"
                  >
                    Edit Class Details
                  </button>
                </div>
              </div>

              {/* Archive / Restore Block */}
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-card space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                      {targetClass.archived ? 'Restore Section' : 'Archive Section'}
                    </h4>
                    <p className="text-slate-500 text-xs">
                      {targetClass.archived
                        ? 'Restore this course section back to active status for students.'
                        : 'Archiving hides the section from active enrollment while preserving all historical submissions.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleArchive}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-semibold cursor-pointer shadow-xs transition-colors ${
                      targetClass.archived
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'border border-amber-300 dark:border-amber-800 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950'
                    }`}
                  >
                    {targetClass.archived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                    <span>{targetClass.archived ? 'Restore to Active' : 'Archive Section'}</span>
                  </button>
                </div>
              </div>

              {/* Admin Ownership Transfer Block */}
              {isAdmin && (
                <div className="p-5 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-300 text-sm">
                        <ShieldAlert className="w-4 h-4" />
                        <span>Administrator Class Ownership Transfer</span>
                      </div>
                      <p className="text-amber-800 dark:text-amber-400 text-xs mt-0.5">
                        Reassign full faculty ownership and primary instructor authority for this section.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onOpenTransferModal}
                      className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold cursor-pointer shadow-xs shrink-0"
                    >
                      Transfer Ownership
                    </button>
                  </div>
                </div>
              )}

              {/* Permanent Deletion Block */}
              <div className="p-5 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-950/10 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-red-600 dark:text-red-400 text-sm">Danger Zone: Delete Course Section</h4>
                    <p className="text-slate-500 text-xs">Permanently remove this section, its roster, and resources.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Permanently delete "${targetClass.name}"? This action cannot be reversed.`)) {
                        onDeleteClass(targetClass.id);
                        onClose();
                      }
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold cursor-pointer shadow-xs"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Section</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Leave Class Confirmation Modal */}
        {showLeaveConfirm && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <div className="w-full max-w-md bg-card rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xl">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold text-sm">
                <AlertTriangle className="w-5 h-5" />
                <span>Confirm Class Departure</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Are you sure you want to leave <strong className="text-slate-900 dark:text-white">{targetClass.code}: {targetClass.name}</strong>? Your attendance progress and pending deliverables will be deregistered. Course instructor <strong className="text-slate-900 dark:text-white">{targetClass.instructor}</strong> will be notified.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowLeaveConfirm(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleLeaveClass}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
                >
                  Yes, Leave Class
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
