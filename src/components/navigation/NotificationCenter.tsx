import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  OnyxNotification,
  NotificationType,
  subscribeNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  checkImpendingDeadlines
} from '../../lib/firebase/firestoreService';
import {
  Bell,
  CheckCircle2,
  BookOpen,
  Clock,
  Send,
  Megaphone,
  Award,
  UserX,
  Trash2,
  Check,
  X,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

interface NotificationCenterProps {
  onNavigate: (path: string) => void;
}

export function NotificationCenter({ onNavigate }: NotificationCenterProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<OnyxNotification[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Subscribe to persistent Firestore notifications
  useEffect(() => {
    if (!user?.uid) {
      setNotifications([]);
      return;
    }
    const unsub = subscribeNotifications(user.uid, setNotifications);
    checkImpendingDeadlines(user.uid);
    return () => unsub();
  }, [user?.uid]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const filteredNotifications = notifications.filter(n => {
    if (filterType === 'unread') return !n.isRead;
    if (filterType === 'assignment') return n.type === 'assignment' || n.type === 'deadline';
    if (filterType === 'grading') return n.type === 'grading';
    return true;
  });

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'assignment':
        return <BookOpen className="w-4 h-4 text-blue-600" />;
      case 'deadline':
        return <Clock className="w-4 h-4 text-amber-600" />;
      case 'submission':
        return <Send className="w-4 h-4 text-purple-600" />;
      case 'announcement':
        return <Megaphone className="w-4 h-4 text-emerald-600" />;
      case 'grading':
        return <Award className="w-4 h-4 text-emerald-600" />;
      case 'enrollment':
      case 'student_leaving':
        return <UserX className="w-4 h-4 text-rose-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-600" />;
    }
  };

  const handleNotificationClick = async (n: OnyxNotification) => {
    if (!n.isRead) {
      await markNotificationAsRead(n.id);
    }
    if (n.link) {
      setIsOpen(false);
      onNavigate(n.link);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        title="Notifications"
        aria-label="Open notifications menu"
      >
        <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-rose-600 text-white font-mono text-[10px] font-bold flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* DROPDOWN POPUP */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-card border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-brand dark:text-blue-400 font-mono text-[10px] font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && user?.uid && (
                <button
                  type="button"
                  onClick={() => markAllNotificationsAsRead(user.uid)}
                  className="text-[11px] font-semibold text-brand dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Check className="w-3 h-3 stroke-[3]" />
                  <span>Mark all read</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 px-3 py-2 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800 text-[11px]">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer font-medium ${
                filterType === 'all'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('unread')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer font-medium ${
                filterType === 'unread'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('assignment')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer font-medium ${
                filterType === 'assignment'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Assignments
            </button>
            <button
              type="button"
              onClick={() => setFilterType('grading')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer font-medium ${
                filterType === 'grading'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Grades
            </button>
          </div>

          {/* Notification Items List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
            {filteredNotifications.length === 0 ? (
              <div className="py-10 text-center px-4 space-y-1">
                <Bell className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto" />
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  No notifications
                </p>
                <p className="text-[11px] text-slate-400">
                  {filterType === 'unread'
                    ? "You're all caught up! No unread alerts."
                    : 'Class announcements and grading updates will appear here.'}
                </p>
              </div>
            ) : (
              filteredNotifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-3 sm:p-3.5 flex items-start gap-3 transition-colors cursor-pointer relative group ${
                    n.isRead
                      ? 'bg-card hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      : 'bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-50/80 dark:hover:bg-blue-950/40'
                  }`}
                >
                  {/* Left Icon Pill */}
                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                    {getNotificationIcon(n.type)}
                  </div>

                  {/* Text Content */}
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center justify-between gap-1">
                      <h4
                        className={`text-xs font-bold truncate ${
                          n.isRead
                            ? 'text-slate-800 dark:text-slate-200'
                            : 'text-slate-950 dark:text-white'
                        }`}
                      >
                        {n.title}
                      </h4>
                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {n.message}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                      <span>{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {n.className && (
                        <span className="truncate max-w-28 font-medium text-slate-500 dark:text-slate-400">
                          {n.className}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Delete Action (visible on hover) */}
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      deleteNotification(n.id);
                    }}
                    title="Delete notification"
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 p-1 rounded-lg transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
