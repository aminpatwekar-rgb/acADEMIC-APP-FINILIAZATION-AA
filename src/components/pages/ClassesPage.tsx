import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useViewRole } from '../../lib/viewRole';
import {
  subscribeClasses,
  subscribeAllClassMembers,
  subscribeAnnouncements,
  subscribeUsers,
  createClass as firestoreCreateClass,
  updateClass as firestoreUpdateClass,
  deleteClass as firestoreDeleteClass,
  addClassMember as firestoreAddClassMember,
  removeClassMember as firestoreRemoveClassMember,
  FirestoreClass,
  FirestoreClassMember,
  FirestoreAnnouncement
} from '../../lib/firebase/firestoreService';
import {
  ClassItem,
  EnrolledStudent,
  BANNER_PRESETS,
  generateJoinCode
} from '../../lib/classes/classStore';
import { OnyxUser } from '../../lib/auth';
import { JoinClassModal } from '../classes/JoinClassModal';
import { CreateEditClassModal } from '../classes/CreateEditClassModal';
import { OwnershipTransferModal } from '../classes/OwnershipTransferModal';
import { ClassHubModal } from '../classes/ClassHubModal';
import { SkeletonCard } from '../common/Skeleton';
import {
  GraduationCap,
  Users,
  Plus,
  BookOpen,
  Clock,
  Search,
  CheckCircle2,
  ChevronRight,
  DoorOpen,
  Archive,
  Megaphone
} from 'lucide-react';

export function ClassesPage() {
  const { user, profile } = useAuth();
  const { effectiveRole } = useViewRole();

  const isTeacherOrAdmin = effectiveRole === 'teacher' || effectiveRole === 'admin';
  const isAdmin = effectiveRole === 'admin';

  const [firestoreClasses, setFirestoreClasses] = useState<FirestoreClass[]>([]);
  const [allMembers, setAllMembers] = useState<FirestoreClassMember[]>([]);
  const [announcements, setAnnouncements] = useState<FirestoreAnnouncement[]>([]);
  const [facultyUsers, setFacultyUsers] = useState<OnyxUser[]>([]);

  // Views & Filters
  const [viewStatus, setViewStatus] = useState<'active' | 'archived'>('active');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [activeClassHub, setActiveClassHub] = useState<ClassItem | null>(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinModalInitialCode, setJoinModalInitialCode] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [transferClass, setTransferClass] = useState<ClassItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Real-time Firestore subscriptions
  useEffect(() => {
    let loadedClasses = false;
    let loadedMembers = false;
    const checkDone = () => {
      if (loadedClasses && loadedMembers) setIsLoading(false);
    };

    const unsubClasses = subscribeClasses((cls) => {
      setFirestoreClasses(cls);
      loadedClasses = true;
      checkDone();
    });
    const unsubMembers = subscribeAllClassMembers((m) => {
      setAllMembers(m);
      loadedMembers = true;
      checkDone();
    });
    const unsubAnn = subscribeAnnouncements(setAnnouncements);
    const unsubUsers = subscribeUsers(setFacultyUsers);

    const timer = setTimeout(() => setIsLoading(false), 1200);

    return () => {
      clearTimeout(timer);
      unsubClasses();
      unsubMembers();
      unsubAnn();
      unsubUsers();
    };
  }, []);

  // Check URL query parameters for auto-join link (e.g. ?join=CS-9A4K)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get('join');
    if (codeParam) {
      setJoinModalInitialCode(codeParam);
      setShowJoinModal(true);
    }
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Convert FirestoreClass + real ClassMembers to ClassItem format
  const classes: ClassItem[] = firestoreClasses.map(fc => {
    const classMembers = allMembers.filter(m => m.classId === fc.id);
    const classRoster: EnrolledStudent[] = classMembers.map(m => ({
      id: m.id,
      name: m.name,
      email: m.email,
      rollNumber: m.rollNumber || 'N/A',
      erNumber: m.erNumber || 'N/A',
      srNumber: m.srNumber || 'N/A',
      avatarBg: m.avatarBg || 'bg-blue-600',
      attendance: m.attendance || 100,
      progress: m.progress || 0,
      grade: m.grade || 100,
      joinedAt: m.joinedAt
    }));

    const classAnnouncements = announcements.filter(a => a.classId === fc.id);

    return {
      id: fc.id,
      code: fc.code,
      name: fc.name,
      subject: fc.subject || 'General',
      section: fc.section || 'Section A-01',
      description: fc.description || '',
      ownerId: fc.ownerId,
      instructor: fc.instructor || 'Instructor',
      schedule: fc.schedule || 'TBA',
      room: fc.room || 'TBA',
      bannerPreset: (fc.bannerPreset as any) || 'cobalt',
      bannerColor: fc.bannerColor || '#2563eb',
      archived: Boolean(fc.archived),
      joinCode: fc.joinCode || fc.code,
      createdAt: fc.createdAt || new Date().toISOString(),
      roster: classRoster,
      announcements: classAnnouncements as any,
      resources: [],
      discussions: []
    };
  });

  // Keep activeClassHub in sync with real-time class data
  useEffect(() => {
    if (activeClassHub) {
      const refreshed = classes.find(c => c.id === activeClassHub.id);
      if (refreshed) {
        setActiveClassHub(refreshed);
      }
    }
  }, [firestoreClasses, allMembers, announcements]);

  // Class Actions with Firestore persistence
  const handleSaveClass = async (classData: Partial<ClassItem>) => {
    try {
      if (editingClass) {
        await firestoreUpdateClass(editingClass.id, {
          name: classData.name,
          code: classData.code,
          subject: classData.subject,
          section: classData.section,
          description: classData.description,
          schedule: classData.schedule,
          room: classData.room,
          bannerPreset: classData.bannerPreset,
          bannerColor: classData.bannerColor,
          joinCode: classData.joinCode
        });
        setEditingClass(null);
        showToast(`Class "${classData.name}" updated in Firestore.`);
      } else {
        const id = await firestoreCreateClass({
          code: classData.code || generateJoinCode('CLS'),
          name: classData.name || 'Untitled Course',
          subject: classData.subject || 'General Studies',
          section: classData.section || 'Section 1',
          description: classData.description || '',
          ownerId: classData.ownerId || (user?.uid || ''),
          instructor: classData.instructor || (profile?.displayName || user?.displayName || 'Instructor'),
          schedule: classData.schedule || 'TBA',
          room: classData.room || 'TBA',
          bannerPreset: classData.bannerPreset || 'cobalt',
          bannerColor: classData.bannerColor || '#2563eb',
          archived: false,
          joinCode: classData.joinCode || 'OX-NEW',
          createdAt: new Date().toISOString()
        });
        showToast(`Class "${classData.name}" created with code: ${classData.joinCode}`);
      }
    } catch (e: any) {
      showToast(e.message || 'Error saving class to Firestore.');
    }
  };

  const handleUpdateClass = async (updated: ClassItem) => {
    try {
      await firestoreUpdateClass(updated.id, {
        name: updated.name,
        code: updated.code,
        subject: updated.subject,
        section: updated.section,
        description: updated.description,
        schedule: updated.schedule,
        room: updated.room,
        bannerPreset: updated.bannerPreset,
        bannerColor: updated.bannerColor,
        joinCode: updated.joinCode,
        archived: updated.archived,
        ownerId: updated.ownerId,
        instructor: updated.instructor
      });
    } catch (e: any) {
      showToast(e.message || 'Error updating class in Firestore.');
    }
  };

  const handleDeleteClass = async (classId: string) => {
    try {
      await firestoreDeleteClass(classId);
      setActiveClassHub(null);
      showToast('Course section deleted permanently from Firestore.');
    } catch (e: any) {
      showToast(e.message || 'Error deleting class from Firestore.');
    }
  };

  const handleEnrollSuccess = async (updatedClass: ClassItem) => {
    // Add student to Firestore class_members
    try {
      const latestMember = updatedClass.roster[updatedClass.roster.length - 1];
      if (latestMember) {
        await firestoreAddClassMember({
          classId: updatedClass.id,
          userId: user?.uid || latestMember.id,
          name: latestMember.name,
          email: latestMember.email,
          role: 'student',
          rollNumber: latestMember.rollNumber,
          erNumber: latestMember.erNumber,
          srNumber: latestMember.srNumber,
          avatarBg: latestMember.avatarBg,
          attendance: 100,
          progress: 0,
          grade: 100,
          joinedAt: latestMember.joinedAt
        });
      }
      showToast(`Successfully enrolled in ${updatedClass.code}: ${updatedClass.name}!`);
    } catch (e: any) {
      showToast(e.message || 'Failed to record enrollment in Firestore.');
    }
  };

  const handleConfirmTransfer = async (classId: string, newOwnerId: string, newOwnerName: string) => {
    try {
      await firestoreUpdateClass(classId, {
        ownerId: newOwnerId,
        instructor: newOwnerName
      });
      showToast(`Class ownership transferred to ${newOwnerName}.`);
    } catch (e: any) {
      showToast(e.message || 'Failed to transfer ownership.');
    }
  };

  // Filtered classes list
  const filteredClasses = classes.filter(c => {
    const matchesArchived = viewStatus === 'archived' ? c.archived : !c.archived;
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (c.subject && c.subject.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          c.instructor.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.joinCode.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesArchived && matchesSearch;
  });

  const activeCount = classes.filter(c => !c.archived).length;
  const archivedCount = classes.filter(c => c.archived).length;

  const platformAnns = announcements.filter(a => a.isPlatformWide);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xl text-xs font-semibold animate-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Platform Announcements Banner (if targeted) */}
      {platformAnns.length > 0 && (
        <div className="p-4 rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/30 flex items-start gap-3.5 shadow-xs">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
            <Megaphone className="w-4 h-4" />
          </div>
          <div className="flex-1 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-blue-900 dark:text-blue-200">
                {platformAnns[0].title}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-blue-200/80 dark:bg-blue-900 text-blue-800 dark:text-blue-300 font-semibold">
                Platform Broadcast
              </span>
            </div>
            <p className="text-blue-800 dark:text-blue-300 mt-0.5 leading-relaxed">
              {platformAnns[0].content}
            </p>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-brand dark:text-blue-400 mb-1">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Academic Curriculum</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Classes & Academic Cohorts
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isTeacherOrAdmin
              ? 'Manage course rosters, customize banners, roll join codes, and moderate discussions.'
              : 'Join sections with academic identifiers, download course resources, and collaborate with peers.'}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setJoinModalInitialCode('');
              setShowJoinModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-card text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-xs"
          >
            <DoorOpen className="w-4 h-4 text-blue-500" />
            <span>Join Section</span>
          </button>

          {isTeacherOrAdmin && (
            <button
              type="button"
              onClick={() => {
                setEditingClass(null);
                setShowCreateModal(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand hover:bg-brand-hover] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Class</span>
            </button>
          )}
        </div>
      </div>

      {/* Active vs Archived Switcher & Search Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Active vs Archived pills */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs w-fit">
            <button
              type="button"
              onClick={() => setViewStatus('active')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                viewStatus === 'active'
                  ? 'bg-card text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>Active Sections</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                {activeCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setViewStatus('archived')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                viewStatus === 'archived'
                  ? 'bg-card text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Archived</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                {archivedCount}
              </span>
            </button>
          </div>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search classes by title, course code, join code, or instructor..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-card border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-xs"
          />
        </div>
      </div>

      {/* Class Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredClasses.map(c => {
          const bannerObj = BANNER_PRESETS.find(p => p.id === c.bannerPreset) || BANNER_PRESETS[0];

          return (
            <div
              key={c.id}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-card shadow-xs hover:border-blue-400 dark:hover:border-blue-600 transition-all flex flex-col justify-between overflow-hidden group"
            >
              {/* Card Banner Top */}
              <div
                className="h-28 p-4 text-white flex flex-col justify-between relative shadow-inner"
                style={{ background: bannerObj.gradient }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-black/30 backdrop-blur-xs">
                    {c.code}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white/20 backdrop-blur-xs">
                      {c.section}
                    </span>
                    {c.archived && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500 text-slate-950">
                        Archived
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-sm sm:text-base line-clamp-1 drop-shadow-xs">
                    {c.name}
                  </h3>
                  <div className="text-[11px] text-white/90">
                    {c.instructor}
                  </div>
                </div>
              </div>

              {/* Card Body Details */}
              <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {c.description || 'No description provided.'}
                </p>

                <div className="space-y-1.5 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{c.schedule}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{c.room}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                      <Users className="w-3.5 h-3.5 text-blue-500" />
                      <span>{c.roster.length} Registered Scholars</span>
                    </span>
                    <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded font-bold">
                      {c.joinCode}
                    </span>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>{c.subject}</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => setActiveClassHub(c)}
                    className="flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors cursor-pointer"
                  >
                    <span>Class Hub</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Proper Empty State when 0 classes in Firestore */}
      {!isLoading && filteredClasses.length === 0 && (
        <div className="p-12 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/30 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-base font-semibold text-slate-800 dark:text-slate-200">
              {viewStatus === 'archived' ? 'No archived classes' : 'No classes yet'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              {viewStatus === 'archived'
                ? 'Archived course sections will appear here when archived from class controls.'
                : isTeacherOrAdmin
                  ? 'Create your first class to get started with rosters, assignments, and announcements.'
                  : 'You have not joined any classes yet. Click "Join Section" to enter a course code.'}
            </p>
          </div>

          {isTeacherOrAdmin && viewStatus === 'active' && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setEditingClass(null);
                  setShowCreateModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand hover:bg-brand-hover] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Your First Class</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: Full Class Hub Drawer / Modal */}
      {activeClassHub && (
        <ClassHubModal
          isOpen={Boolean(activeClassHub)}
          onClose={() => setActiveClassHub(null)}
          targetClass={activeClassHub}
          onUpdateClass={handleUpdateClass}
          onDeleteClass={handleDeleteClass}
          onOpenEditModal={() => {
            setEditingClass(activeClassHub);
            setShowCreateModal(true);
          }}
          onOpenTransferModal={() => {
            setTransferClass(activeClassHub);
          }}
          onToast={showToast}
        />
      )}

      {/* MODAL 2: Join Class Modal with 5 Identifiers and Duplicate Detection */}
      <JoinClassModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        classes={classes}
        initialCode={joinModalInitialCode}
        onEnrollSuccess={handleEnrollSuccess}
      />

      {/* MODAL 3: Create & Edit Class Modal with Banner Presets */}
      <CreateEditClassModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingClass(null);
        }}
        onSave={handleSaveClass}
        editingClass={editingClass}
      />

      {/* MODAL 4: Admin Ownership Transfer Modal */}
      {transferClass && (
        <OwnershipTransferModal
          isOpen={Boolean(transferClass)}
          onClose={() => setTransferClass(null)}
          targetClass={transferClass}
          facultyUsers={facultyUsers}
          onConfirmTransfer={handleConfirmTransfer}
        />
      )}
    </div>
  );
}
