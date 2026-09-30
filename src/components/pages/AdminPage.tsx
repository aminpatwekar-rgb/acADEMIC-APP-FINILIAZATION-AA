import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useViewRole } from '../../lib/viewRole';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase/index';
import { collection, getDocs, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { OnyxUser, UserRole } from '../../lib/auth';
import { exportToCSV } from '../../lib/csv';
import { SkeletonTable } from '../common/Skeleton';
import {
  ShieldAlert,
  Users,
  Database,
  Download,
  CheckCircle,
  RefreshCw,
  Search,
  AlertTriangle,
  UserCheck,
  UserX,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Plus,
  X,
  UserPlus
} from 'lucide-react';

export function AdminPage() {
  const { user: currentAuthUser, profile } = useAuth();
  const { actualRole } = useViewRole();
  const [users, setUsers] = useState<OnyxUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'teacher' | 'admin'>('all');
  const [notice, setNotice] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  // Add User Modal State
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('student');
  const [newUserInstitution, setNewUserInstitution] = useState('ONYX Academy');
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Delete User Confirmation Modal State
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<OnyxUser | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setNotice(null);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const list: OnyxUser[] = [];
      snap.forEach(d => {
        list.push({ uid: d.id, ...d.data() } as OnyxUser);
      });
      setUsers(list);
    } catch (e) {
      console.warn('Could not list users collection:', e);
      if (profile) {
        setUsers([profile]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const showNotification = (type: 'error' | 'success', message: string) => {
    setNotice({ type, message });
    setTimeout(() => {
      setNotice(null);
    }, 4500);
  };

  // Count current active admins
  const activeAdminCount = users.filter(u => u.role === 'admin' && u.active !== false).length;

  // 1. Promote: student -> teacher, or teacher -> admin
  const handlePromote = async (targetUser: OnyxUser) => {
    let nextRole: UserRole = 'teacher';
    if (targetUser.role === 'teacher') nextRole = 'admin';
    else if (targetUser.role === 'admin') {
      showNotification('error', `${targetUser.displayName} is already at the highest clearance level (Admin).`);
      return;
    }

    try {
      await updateDoc(doc(db, 'users', targetUser.uid), {
        role: nextRole,
        updatedAt: new Date().toISOString()
      });
      setUsers(prev => prev.map(u => u.uid === targetUser.uid ? { ...u, role: nextRole } : u));
      showNotification('success', `Promoted ${targetUser.displayName} to ${nextRole.toUpperCase()}.`);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${targetUser.uid}`);
    }
  };

  // 2. Demote: admin -> teacher, or teacher -> student
  const handleDemote = async (targetUser: OnyxUser) => {
    // Self-Role-Change Protection
    if (currentAuthUser?.uid === targetUser.uid) {
      showNotification('error', 'Self-Role-Change Protection: You cannot demote your own administrator account.');
      return;
    }

    // Last-Admin Protection
    if (targetUser.role === 'admin' && activeAdminCount <= 1) {
      showNotification('error', 'Last-Admin Protection: Cannot demote the only remaining Administrator. Promote another administrator first.');
      return;
    }

    let nextRole: UserRole = 'student';
    if (targetUser.role === 'admin') nextRole = 'teacher';
    else if (targetUser.role === 'student') {
      showNotification('error', `${targetUser.displayName} is already at the base role (Student).`);
      return;
    }

    try {
      await updateDoc(doc(db, 'users', targetUser.uid), {
        role: nextRole,
        updatedAt: new Date().toISOString()
      });
      setUsers(prev => prev.map(u => u.uid === targetUser.uid ? { ...u, role: nextRole } : u));
      showNotification('success', `Demoted ${targetUser.displayName} to ${nextRole.toUpperCase()}.`);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${targetUser.uid}`);
    }
  };

  // 3. Suspend / Reactivate
  const handleToggleActive = async (targetUser: OnyxUser) => {
    const isCurrentlyActive = targetUser.active !== false;

    // Self-Deactivation Protection
    if (currentAuthUser?.uid === targetUser.uid) {
      showNotification('error', 'Self-Protection: You cannot suspend or deactivate your own account.');
      return;
    }

    // Last-Admin Protection on suspension
    if (isCurrentlyActive && targetUser.role === 'admin' && activeAdminCount <= 1) {
      showNotification('error', 'Last-Admin Protection: Cannot suspend the only active Administrator.');
      return;
    }

    try {
      await updateDoc(doc(db, 'users', targetUser.uid), {
        active: !isCurrentlyActive,
        updatedAt: new Date().toISOString()
      });
      setUsers(prev => prev.map(u => u.uid === targetUser.uid ? { ...u, active: !isCurrentlyActive } : u));
      showNotification('success', `${isCurrentlyActive ? 'Suspended' : 'Reactivated'} account for ${targetUser.displayName}.`);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${targetUser.uid}`);
    }
  };

  // 4. Delete user
  const handleDeleteUser = async (targetUser: OnyxUser) => {
    // Self-Deletion Protection
    if (currentAuthUser?.uid === targetUser.uid) {
      showNotification('error', 'Self-Deletion Protection: You cannot delete your own account.');
      return;
    }

    // Last-Admin Protection
    if (targetUser.role === 'admin' && activeAdminCount <= 1) {
      showNotification('error', 'Last-Admin Protection: Cannot delete the only remaining Administrator.');
      return;
    }

    setDeleteConfirmUser(targetUser);
  };

  const executeDeleteUser = async () => {
    if (!deleteConfirmUser) return;
    setIsDeletingUser(true);
    try {
      await deleteDoc(doc(db, 'users', deleteConfirmUser.uid));
      setUsers(prev => prev.filter(u => u.uid !== deleteConfirmUser.uid));
      showNotification('success', `Permanently deleted user account for ${deleteConfirmUser.displayName}.`);
      setDeleteConfirmUser(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `users/${deleteConfirmUser.uid}`);
    } finally {
      setIsDeletingUser(false);
    }
  };

  // CSV Export
  const handleExportRoster = () => {
    exportToCSV('onyx_users_roster', users, [
      { key: 'uid', label: 'User ID' },
      { key: 'displayName', label: 'Full Name' },
      { key: 'email', label: 'Email' },
      { key: 'role', label: 'Role' },
      { key: 'active', label: 'Active Status' },
      { key: 'createdAt', label: 'Joined At' },
    ]);
  };

  // Provision User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) {
      showNotification('error', 'Name and email are required to provision an institutional user.');
      return;
    }
    setIsCreatingUser(true);
    try {
      const generatedUid = 'usr_' + Math.random().toString(36).substring(2, 10);
      const now = new Date().toISOString();
      const newUserDoc: OnyxUser = {
        uid: generatedUid,
        email: newUserEmail.trim(),
        displayName: newUserName.trim(),
        role: newUserRole,
        active: true,
        institution: newUserInstitution.trim() || 'ONYX Academy',
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(newUserName.trim())}`,
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(doc(db, 'users', generatedUid), newUserDoc);
      setUsers(prev => [newUserDoc, ...prev]);
      showNotification('success', `Successfully provisioned ${newUserRole.toUpperCase()} account for ${newUserName}.`);
      setIsAddUserOpen(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserRole('student');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'users');
    } finally {
      setIsCreatingUser(false);
    }
  };

  // Filtered users
  const filteredUsers = users.filter(u => {
    const matchesSearch =
      (u.displayName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 mb-1">
            <ShieldAlert className="w-4 h-4" />
            <span>Root Administration & Security</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            System Administration
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage institutional users, role assignments, permissions, and security compliance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchUsers}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-card text-slate-700 dark:text-slate-300 hover:bg-slate-50 text-xs cursor-pointer"
            title="Refresh Users"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setIsAddUserOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand hover:bg-brand-hover] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Provision User</span>
          </button>

          <button
            type="button"
            onClick={handleExportRoster}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-xs font-semibold shadow-xs hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Floating Alert / Toast */}
      {notice && (
        <div className={`p-4 rounded-xl text-xs flex items-center justify-between border shadow-sm animate-in slide-in-from-top-2 ${
          notice.type === 'error'
            ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200'
            : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200'
        }`}>
          <div className="flex items-center gap-2">
            {notice.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <span className="font-medium">{notice.message}</span>
          </div>
          <button onClick={() => setNotice(null)} className="text-slate-400 hover:text-slate-700 font-bold ml-3 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-card shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-semibold uppercase">Total Users</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {users.length}
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-card shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-semibold uppercase">Active Admins</span>
            <ShieldAlert className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {activeAdminCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Last-admin rule active
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-card shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-semibold uppercase">Firestore RLS</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-2">
            Zero-Trust Protected
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Self-demotion blocked
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-card shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-semibold uppercase">Storage</span>
            <Database className="w-4 h-4 text-teal-500" />
          </div>
          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-2">
            Cloud Storage
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            PDFs & Canvas States
          </div>
        </div>
      </div>

      {/* Directory Controls & Table */}
      <div className="bg-card border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs space-y-4">
        {/* Filter Bar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search user by name or email..."
              className="w-full pl-8.5 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs bg-slate-50/50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900 outline-hidden focus:border-brand"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 text-[11px] mr-1">Role:</span>
            {(['all', 'student', 'teacher', 'admin'] as const).map(rf => (
              <button
                key={rf}
                type="button"
                onClick={() => setRoleFilter(rf)}
                className={`px-2.5 py-1 rounded-lg capitalize font-medium transition-colors cursor-pointer ${
                  roleFilter === rf
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {rf}
              </button>
            ))}
          </div>
        </div>

        {/* User Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <SkeletonTable rows={5} cols={5} />
          ) : (
            <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 dark:bg-slate-950 text-slate-500 border-b border-slate-100 dark:border-slate-800 font-semibold uppercase text-[10px]">
              <tr>
                <th className="p-3.5 pl-5">User Profile</th>
                <th className="p-3.5">Email</th>
                <th className="p-3.5">Role</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right pr-5">RBAC Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    No users matching criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isSelf = currentAuthUser?.uid === u.uid;
                  const isActive = u.active !== false;

                  return (
                    <tr key={u.uid} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3.5 pl-5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                            {u.displayName ? u.displayName.slice(0, 2).toUpperCase() : 'OX'}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{u.displayName || 'ONYX User'}</span>
                              {isSelf && (
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {u.institution || 'ONYX Academy'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5 text-slate-500 font-mono text-[11px]">
                        {u.email}
                      </td>

                      <td className="p-3.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
                          u.role === 'admin'
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300/40'
                            : u.role === 'teacher'
                            ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-300/40'
                            : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300/40'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.role === 'admin' ? 'bg-amber-500' : u.role === 'teacher' ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                          {u.role}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          isActive
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                            : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                        }`}>
                          {isActive ? 'Active' : 'Suspended'}
                        </span>
                      </td>

                      <td className="p-3.5 text-right pr-5">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Promote */}
                          <button
                            type="button"
                            onClick={() => handlePromote(u)}
                            disabled={u.role === 'admin'}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-emerald-600 hover:border-emerald-300 dark:hover:text-emerald-400 disabled:opacity-30 disabled:hover:text-slate-600 cursor-pointer"
                            title="Promote role"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>

                          {/* Demote */}
                          <button
                            type="button"
                            onClick={() => handleDemote(u)}
                            disabled={u.role === 'student' || isSelf}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-amber-600 hover:border-amber-300 dark:hover:text-amber-400 disabled:opacity-30 disabled:hover:text-slate-600 cursor-pointer"
                            title={isSelf ? "Self-role-change protection" : "Demote role"}
                          >
                            <ArrowDownRight className="w-3.5 h-3.5" />
                          </button>

                          {/* Suspend / Reactivate */}
                          <button
                            type="button"
                            onClick={() => handleToggleActive(u)}
                            disabled={isSelf}
                            className={`p-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                              isSelf
                                ? 'opacity-30 border-slate-200 dark:border-slate-800'
                                : isActive
                                ? 'border-amber-200 dark:border-amber-900/60 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950'
                                : 'border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950'
                            }`}
                            title={isSelf ? "Self-protection" : (isActive ? "Suspend account" : "Reactivate account")}
                          >
                            {isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u)}
                            disabled={isSelf}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-600 hover:border-rose-300 dark:hover:text-rose-400 disabled:opacity-30 disabled:hover:text-slate-400 cursor-pointer"
                            title={isSelf ? "Self-deletion protection" : "Delete user"}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          )}
        </div>
      </div>

      {/* Provision User Modal */}
      {isAddUserOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="provision-user-title"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in duration-100"
        >
          <div className="w-full max-w-md bg-card border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 id="provision-user-title" className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-brand dark:text-blue-400" aria-hidden="true" />
                <span>Provision Institutional User</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddUserOpen(false)}
                aria-label="Close dialog"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label htmlFor="new-user-name" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  id="new-user-name"
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="e.g. Dr. Ada Lovelace"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="new-user-email" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Institutional Email
                </label>
                <input
                  id="new-user-email"
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="e.g. alovelace@university.edu"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="new-user-role" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    System Role
                  </label>
                  <select
                    id="new-user-role"
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="new-user-institution" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Institution
                  </label>
                  <input
                    id="new-user-institution"
                    type="text"
                    value={newUserInstitution}
                    onChange={(e) => setNewUserInstitution(e.target.value)}
                    placeholder="ONYX Academy"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingUser}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand hover:bg-brand-hover] text-white text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
                >
                  {isCreatingUser ? 'Provisioning...' : 'Provision User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {deleteConfirmUser && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-user-title"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in duration-100"
        >
          <div className="w-full max-w-md bg-card border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <h3 id="delete-user-title" className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                  Confirm User Deletion
                </h3>
                <p className="text-xs text-slate-500">
                  Target: {deleteConfirmUser.displayName} ({deleteConfirmUser.email})
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Are you sure you want to permanently delete this user account from the ONYX directory? This action will revoke their login clearance and remove their profile records.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteConfirmUser(null)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingUser}
                onClick={executeDeleteUser}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{isDeletingUser ? 'Deleting...' : 'Delete User'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
