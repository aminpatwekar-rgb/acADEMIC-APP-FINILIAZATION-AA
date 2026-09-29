import React, { useState, useEffect } from 'react';
import {
  LayoutGrid,
  GraduationCap,
  BookOpen,
  FileQuestion,
  Trophy,
  Award,
  Settings,
  ShieldAlert,
  Search,
  Moon,
  Sun,
  LogOut,
  ChevronDown,
  Check,
  Menu,
  X,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useViewRole } from '../../lib/viewRole';
import { UserRole } from '../../lib/auth';
import { GlobalSearchModal } from './GlobalSearchModal';
import { NotificationCenter } from './NotificationCenter';
import { FeedbackModal } from '../common/FeedbackModal';

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export function Sidebar({ currentPath, onNavigate }: SidebarProps) {
  const { user, profile, signOut } = useAuth();
  const { isDark, setMode } = useTheme();
  const { actualRole, effectiveRole, setPreviewRole, isPreviewing } = useViewRole();
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  // Global ⌘K / Ctrl+K keyboard shortcut & Escape handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      } else if (e.key === 'Escape') {
        if (mobileOpen) setMobileOpen(false);
        if (roleDropdownOpen) setRoleDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen, roleDropdownOpen]);

  const getInitials = (name?: string) => {
    if (!name) return 'MA';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutGrid },
    { label: 'Classes', path: '/classes', icon: GraduationCap },
    { label: 'Assignments', path: '/assignments', icon: BookOpen },
    { label: 'Quizzes', path: '/quizzes', icon: FileQuestion },
    { label: 'Leaderboard', path: '/leaderboard', icon: Trophy },
    { label: 'Achievements', path: '/achievements', icon: Award },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  // If actual role is admin, show Admin nav link
  if (actualRole === 'admin') {
    navItems.push({ label: 'Admin', path: '/admin', icon: ShieldAlert });
  }

  const roleLabel = effectiveRole.charAt(0).toUpperCase() + effectiveRole.slice(1);

  return (
    <>
      {/* Accessible Skip to Content Link */}
      <a
        href="#main-content"
        className="sr-only-focusable z-50 px-4 py-2 bg-brand text-white font-semibold text-xs rounded-br-xl shadow-lg focus:not-sr-only focus:fixed focus:top-0 focus:left-0"
      >
        Skip to main content
      </a>

      {/* Mobile Top Header */}
      <header className="lg:hidden w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-slate-950 dark:bg-white text-white dark:text-slate-950 flex items-center justify-center font-black tracking-tighter text-xs">
            OX
          </div>
          <span className="font-extrabold text-base tracking-widest text-slate-900 dark:text-white">ONYX</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <NotificationCenter onNavigate={onNavigate} />
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Open global search (Command K)"
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Persistent Left Sidebar */}
      <aside
        aria-label="Main Navigation"
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 flex flex-col justify-between transition-transform duration-200 ease-in-out shrink-0
          lg:static lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Top: Logo & Role Pill */}
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                onNavigate('/dashboard');
                setMobileOpen(false);
              }}
              className="flex items-center gap-2.5 group cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none rounded-lg"
            >
              <div className="w-8 h-8 rounded-full bg-slate-950 dark:bg-white text-white dark:text-slate-950 flex items-center justify-center font-black text-xs shadow-xs group-hover:scale-105 transition-transform">
                OX
              </div>
              <span className="font-extrabold text-base tracking-widest text-slate-900 dark:text-white">ONYX</span>
            </button>

            {/* Right: Notifications & Role Switcher */}
            <div className="flex items-center gap-1.5">
              <NotificationCenter onNavigate={onNavigate} />

              {/* Role Switcher Pill for Admin, or Static Role Badge for Student/Teacher */}
              {actualRole === 'admin' ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                    aria-haspopup="listbox"
                    aria-expanded={roleDropdownOpen}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
                    title="Role Simulation (Admin Clearance)"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${effectiveRole === 'admin' ? 'bg-amber-500' : effectiveRole === 'teacher' ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                    <span>{roleLabel}</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>

                  {/* Role Dropdown */}
                  {roleDropdownOpen && (
                    <div
                      role="listbox"
                      className="absolute right-0 mt-1.5 w-48 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100"
                    >
                      <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800">
                        Role Simulation
                      </div>
                      {(['admin', 'teacher', 'student'] as UserRole[]).map((r) => {
                        const isActualOption = r === 'admin';
                        const isSelected = isActualOption ? !isPreviewing : effectiveRole === r;
                        return (
                          <button
                            key={r}
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => {
                              setPreviewRole(isActualOption ? null : r);
                              setRoleDropdownOpen(false);
                            }}
                            className="w-full px-3 py-2 text-left flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer capitalize focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
                          >
                            <div className="flex items-center gap-2">
                              <span className={`w-1.5 h-1.5 rounded-full ${r === 'admin' ? 'bg-amber-500' : r === 'teacher' ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                              <span>{r} {isActualOption ? '(Actual)' : '(Preview)'}</span>
                            </div>
                            {isSelected && <Check className="w-3.5 h-3.5 text-amber-500" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  <span className={`w-1.5 h-1.5 rounded-full ${effectiveRole === 'teacher' ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                  <span>{roleLabel}</span>
                </div>
              )}
            </div>
          </div>

          {/* Global Search Input Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Search classes, assignments, and notes"
              className="w-full pl-8.5 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950 text-xs text-left text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex items-center cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
            >
              <Search className="w-3.5 h-3.5 absolute left-3 text-slate-400" />
              <span>Search...</span>
              <kbd className="absolute right-2.5 text-[10px] font-mono text-slate-400 bg-slate-200/60 dark:bg-slate-800 px-1 py-0.5 rounded">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Navigation Links */}
          <nav aria-label="Sections" className="space-y-1 pt-1">
            {navItems.map((item) => {
              const active = currentPath === item.path;
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => {
                    onNavigate(item.path);
                    setMobileOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer relative focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none
                    ${active
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-brand dark:text-blue-400 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }
                  `}
                >
                  {active && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r bg-brand" />
                  )}
                  <Icon className={`w-4 h-4 ml-1 ${active ? 'text-brand dark:text-blue-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Feedback, Profile Card, Dark Mode, Sign Out */}
        <div className="p-4 border-t border-slate-200/80 dark:border-slate-800 space-y-3">
          {/* Quick Issue Report Trigger */}
          <button
            type="button"
            onClick={() => setFeedbackOpen(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950 text-slate-600 dark:text-slate-300 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
          >
            <MessageSquare className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Report Issue / Feedback</span>
          </button>

          {/* User Profile Box */}
          <div className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-900">
              {getInitials(profile?.displayName)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                {profile?.displayName || 'Mohammed Amin Patwekar'}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {roleLabel} {isPreviewing ? '(Preview)' : ''}
              </div>
            </div>
          </div>

          {/* Quick Buttons: Dark / Light toggle & Sign Out */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode(isDark ? 'light' : 'dark')}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
            >
              {isDark ? <Sun className="w-3.5 h-3.5 text-amber-500" /> : <Moon className="w-3.5 h-3.5 text-slate-500" />}
              <span>{isDark ? 'Light' : 'Dark'}</span>
            </button>

            <button
              type="button"
              onClick={() => signOut()}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Exit</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          aria-hidden="true"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-2xs"
        />
      )}

      {/* Global Search Command Dialog */}
      <GlobalSearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNavigate={onNavigate}
      />

      {/* Global In-App Feedback Dialog */}
      <FeedbackModal
        isOpen={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        userEmail={user?.email || undefined}
        userName={profile?.displayName || user?.displayName || undefined}
      />
    </>
  );
}
