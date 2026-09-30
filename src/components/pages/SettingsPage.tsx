import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme, THEME_PRESETS, ACCENT_SWATCHES } from '../../context/ThemeContext';
import { useViewRole } from '../../lib/viewRole';
import {
  getUserSettings,
  saveUserSettings,
  UserSettings,
  DEFAULT_USER_SETTINGS
} from '../../lib/firebase/firestoreService';
import { getCapturedErrors, clearCapturedErrors } from '../../lib/error-capture';
import { getStoredIssueReports, clearStoredIssueReports } from '../../lib/lovable-error-reporting';
import { FeedbackModal } from '../common/FeedbackModal';
import {
  User,
  Building,
  Sun,
  Moon,
  Laptop,
  Check,
  Palette,
  Loader2,
  CheckCircle2,
  Bell,
  Clock,
  Target,
  Sliders,
  PenTool,
  Shield,
  Save,
  Mail,
  GraduationCap,
  AlertTriangle,
  MessageSquare,
  Trash2,
  Bug
} from 'lucide-react';

export function SettingsPage() {
  const { user, profile, updateProfileData } = useAuth();
  const { mode, setMode, themeStyle, setThemeStyle, accentColor, setAccentColor } = useTheme();
  const { actualRole, effectiveRole } = useViewRole();

  // Profile State
  const [fullName, setFullName] = useState(profile?.displayName || '');
  const [institution, setInstitution] = useState(profile?.institution || 'ONYX Academy');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Settings State (Loaded & Persisted in Firestore)
  const [settings, setSettings] = useState<UserSettings>({
    userId: user?.uid || '',
    ...DEFAULT_USER_SETTINGS
  });
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Reliability & Diagnostic reports state
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [simulateError, setSimulateError] = useState(false);
  const [reportsCount, setReportsCount] = useState(() => getStoredIssueReports().length);
  const [errorsCount, setErrorsCount] = useState(() => getCapturedErrors().length);

  if (simulateError) {
    throw new Error('Test Error Boundary simulation: intentionally triggered from Settings.');
  }

  // Load User Settings from Firestore
  useEffect(() => {
    if (profile) {
      setFullName(profile.displayName || '');
      setInstitution(profile.institution || 'ONYX Academy');
    }

    if (user?.uid) {
      getUserSettings(user.uid).then(remote => {
        if (remote) {
          setSettings(remote);
        } else {
          setSettings({
            userId: user.uid,
            ...DEFAULT_USER_SETTINGS
          });
        }
        setIsLoadingSettings(false);
      });
    }
  }, [profile, user?.uid]);

  // Save Profile Handler
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileSuccess(false);
    try {
      await updateProfileData({
        displayName: fullName,
        institution,
      });
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Save All Settings to Firestore
  const handleSaveAllSettings = async () => {
    if (!user?.uid) return;
    setIsSavingSettings(true);
    setSettingsSuccess(false);
    try {
      await saveUserSettings(user.uid, settings);
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
    } catch (e) {
      console.error('Error saving settings to Firestore:', e);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const isTeacherOrAdmin = effectiveRole === 'teacher' || effectiveRole === 'admin';
  const roleTitle = actualRole.charAt(0).toUpperCase() + actualRole.slice(1);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 animate-in fade-in duration-200 pb-20">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Settings & Preferences
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Persist notification preferences, reminder lead times, daily study targets, and default behaviors.
          </p>
        </div>

        {/* Global Save Button */}
        <button
          type="button"
          disabled={isSavingSettings}
          onClick={handleSaveAllSettings}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand hover:bg-brand-hover] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50 self-start sm:self-center"
        >
          {isSavingSettings ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : settingsSuccess ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>{settingsSuccess ? 'Preferences Saved!' : 'Save Preferences'}</span>
        </button>
      </div>

      {/* SECTION 1: PROFILE */}
      <section className="space-y-3">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          PROFILE
        </h2>

        <div className="bg-card border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xs space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-950 dark:bg-white text-white dark:text-slate-950 flex items-center justify-center font-black text-lg shadow-sm">
              {getInitials(fullName)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-slate-950 dark:text-white">{fullName || 'Scholar'}</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-mono font-semibold uppercase text-slate-600 dark:text-slate-300">
                  {roleTitle}
                </span>
              </div>
              <p className="text-xs text-slate-400">{profile?.email || user?.email}</p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Display name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs sm:text-sm text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Institution / University
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs sm:text-sm text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              {profileSuccess && (
                <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Profile updated
                </span>
              )}
              <button
                type="submit"
                disabled={isSavingProfile}
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSavingProfile ? 'Saving...' : 'Update Profile'}
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* SECTION 2: NOTIFICATION PREFERENCES & REMINDER LEAD TIME */}
      <section className="space-y-3">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Bell className="w-3.5 h-3.5 text-brand" />
          <span>NOTIFICATIONS & REMINDERS</span>
        </h2>

        <div className="bg-card border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xs space-y-6">
          <div className="space-y-4">
            {/* 1. In-App Notifications */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                  In-App Notification Center
                </h4>
                <p className="text-[11px] text-slate-400">
                  Receive persistent alert badges and dropdown updates in the sidebar.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSettings(prev => ({ ...prev, inAppNotifications: !prev.inAppNotifications }))}
                className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                  settings.inAppNotifications ? 'bg-brand' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    settings.inAppNotifications ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* 2. Email Notifications */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                  Email Digests & Alerts
                </h4>
                <p className="text-[11px] text-slate-400">
                  Dispatch email notifications to your institutional address.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSettings(prev => ({ ...prev, emailNotifications: !prev.emailNotifications }))}
                className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                  settings.emailNotifications ? 'bg-brand' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    settings.emailNotifications ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* 3. Assignment Alerts */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                  New Assignment & Problem Set Releases
                </h4>
                <p className="text-[11px] text-slate-400">
                  Notify immediately when faculty publish course assignments.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSettings(prev => ({ ...prev, assignmentAlerts: !prev.assignmentAlerts }))}
                className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                  settings.assignmentAlerts ? 'bg-brand' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    settings.assignmentAlerts ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* 4. Grade Alerts */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                  Grades & Evaluation Feedback
                </h4>
                <p className="text-[11px] text-slate-400">
                  Notify when instructor rubric reviews, scores, and exam keys are released.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSettings(prev => ({ ...prev, gradeAlerts: !prev.gradeAlerts }))}
                className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                  settings.gradeAlerts ? 'bg-brand' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    settings.gradeAlerts ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* 5. Announcement Alerts */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                  Course Announcements
                </h4>
                <p className="text-[11px] text-slate-400">
                  Notify for syllabus updates, classroom relocations, and professor broadcasts.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSettings(prev => ({ ...prev, announcementAlerts: !prev.announcementAlerts }))}
                className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                  settings.announcementAlerts ? 'bg-brand' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    settings.announcementAlerts ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Reminder Lead Time */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Deadline Reminder Lead Time
                </label>
                <p className="text-[11px] text-slate-400">
                  How far in advance to trigger impending deadline alerts.
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {[48, 24, 12, 2, 1].map(hours => (
                  <button
                    key={hours}
                    type="button"
                    onClick={() => setSettings(prev => ({ ...prev, reminderLeadTimeHours: hours }))}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-colors cursor-pointer ${
                      settings.reminderLeadTimeHours === hours
                        ? 'bg-brand text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    {hours}h
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: DAILY STUDY TARGET */}
      <section className="space-y-3">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5 text-brand" />
          <span>DAILY STUDY TARGET</span>
        </h2>

        <div className="bg-card border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                Daily Focus Commitment: {settings.dailyStudyTargetMinutes} minutes/day
              </h4>
              <p className="text-[11px] text-slate-400">
                Sets your daily streak pacing goal for completing problem sets and review sessions.
              </p>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {[15, 30, 45, 60, 90, 120].map(mins => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setSettings(prev => ({ ...prev, dailyStudyTargetMinutes: mins }))}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-colors cursor-pointer ${
                    settings.dailyStudyTargetMinutes === mins
                      ? 'bg-brand text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {mins}m
                </button>
              ))}
            </div>
          </div>

          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, (settings.dailyStudyTargetMinutes / 120) * 100)}%` }}
            />
          </div>
        </div>
      </section>

      {/* SECTION 4: SUBMISSION & INK PREFERENCES */}
      <section className="space-y-3">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <PenTool className="w-3.5 h-3.5 text-brand" />
          <span>SUBMISSION & CANVAS PREFERENCES</span>
        </h2>

        <div className="bg-card border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xs space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Default Submission Mode
              </label>
              <select
                value={settings.submissionPreferences?.preferredMode || 'handwritten'}
                onChange={e =>
                  setSettings(prev => ({
                    ...prev,
                    submissionPreferences: {
                      ...prev.submissionPreferences,
                      preferredMode: e.target.value as any
                    }
                  }))
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-800 dark:text-slate-200"
              >
                <option value="handwritten">Vector Ink Handwritten Canvas</option>
                <option value="typed">Proctored Anti-Cheat Typed Editor</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Canvas Dark Mode Inversion
              </label>
              <select
                value={settings.submissionPreferences?.canvasDarkMode ? 'dark' : 'light'}
                onChange={e =>
                  setSettings(prev => ({
                    ...prev,
                    submissionPreferences: {
                      ...prev.submissionPreferences,
                      canvasDarkMode: e.target.value === 'dark'
                    }
                  }))
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-800 dark:text-slate-200"
              >
                <option value="light">Standard Light Grid / Lined Paper</option>
                <option value="dark">Chalkboard Obsidian Contrast</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: TEACHER DEFAULTS (ONLY VISIBLE TO TEACHERS OR ADMINS) */}
      {isTeacherOrAdmin && (
        <section className="space-y-3">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-brand" />
            <span>TEACHER ASSESSMENT DEFAULTS</span>
          </h2>

          <div className="bg-card border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xs space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Default Quiz Duration (Minutes)
                </label>
                <input
                  type="number"
                  min="5"
                  max="180"
                  value={settings.teacherDefaults?.defaultQuizDurationMinutes || 30}
                  onChange={e =>
                    setSettings(prev => ({
                      ...prev,
                      teacherDefaults: {
                        ...prev.teacherDefaults,
                        defaultQuizDurationMinutes: parseInt(e.target.value, 10) || 30
                      }
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Default Passing Threshold (%)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={settings.teacherDefaults?.defaultPassingPercentage || 60}
                  onChange={e =>
                    setSettings(prev => ({
                      ...prev,
                      teacherDefaults: {
                        ...prev.teacherDefaults,
                        defaultPassingPercentage: parseInt(e.target.value, 10) || 60
                      }
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                    Auto-Enable Anti-Cheat Lockdown
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Default new assessments to proctored window-blur lockouts.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setSettings(prev => ({
                      ...prev,
                      teacherDefaults: {
                        ...prev.teacherDefaults,
                        autoLockdown: !prev.teacherDefaults.autoLockdown
                      }
                    }))
                  }
                  className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                    settings.teacherDefaults?.autoLockdown ? 'bg-brand' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      settings.teacherDefaults?.autoLockdown ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                    Instant Auto-Grading on Submission
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Automatically grade MCQ, True/False, and Multi-Select objective questions immediately upon receipt.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setSettings(prev => ({
                      ...prev,
                      teacherDefaults: {
                        ...prev.teacherDefaults,
                        autoGradeObjective: !prev.teacherDefaults.autoGradeObjective
                      }
                    }))
                  }
                  className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                    settings.teacherDefaults?.autoGradeObjective ? 'bg-brand' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      settings.teacherDefaults?.autoGradeObjective ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* SECTION 6: APPEARANCE & THEME */}
      <section className="space-y-3">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          APPEARANCE & THEME
        </h2>

        <div className="bg-card border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xs space-y-6">
          {/* Mode Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Interface mode
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'light', label: 'Light', icon: Sun },
                { id: 'dark', label: 'Dark', icon: Moon },
                { id: 'system', label: 'System', icon: Laptop },
              ].map((m) => {
                const isSelected = mode === m.id;
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMode(m.id as any)}
                    className={`
                      p-3 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer
                      ${isSelected
                        ? 'border-brand bg-brand-tint dark:bg-blue-950/40 text-brand dark:text-blue-300 font-semibold ring-1 ring-brand'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-xs">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Theme Presets */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Palette theme preset
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              {THEME_PRESETS.map((preset) => {
                const isSelected = themeStyle === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setThemeStyle(preset.id)}
                    className={`
                      p-3 rounded-xl border text-left space-y-2 transition-all cursor-pointer relative
                      ${isSelected
                        ? 'border-brand bg-brand-tint/60 dark:bg-blue-950/30 ring-1 ring-brand'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300'
                      }
                    `}
                  >
                    <div className="w-full h-9 rounded-lg overflow-hidden flex relative shadow-inner">
                      <div className="w-1/2 h-full" style={{ backgroundColor: preset.previewLeft }} />
                      <div className="w-1/2 h-full" style={{ backgroundColor: preset.previewRight }} />
                      {isSelected && (
                        <div className="absolute right-1 bottom-1 w-4 h-4 rounded-full bg-white text-brand flex items-center justify-center shadow-xs">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                      {preset.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Accent Color Swatches */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Accent colour
                </label>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select a preset swatch or pick a custom hex colour.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-slate-500 uppercase">{accentColor}</span>
                <div
                  className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-700 shadow-xs"
                  style={{ backgroundColor: accentColor }}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <label
                className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer relative shadow-xs"
                title="Choose custom colour"
              >
                <Palette className="w-4 h-4" />
                <input
                  type="color"
                  value={accentColor.startsWith('#') && accentColor.length === 7 ? accentColor : '#d97706'}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                />
              </label>

              {ACCENT_SWATCHES.map((color) => {
                const active = accentColor.toLowerCase() === color.toLowerCase();
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setAccentColor(color)}
                    className={`
                      w-8 h-8 rounded-full transition-transform cursor-pointer flex items-center justify-center
                      ${active ? 'scale-115 ring-2 ring-offset-2 ring-slate-950 dark:ring-white dark:ring-offset-slate-900' : 'hover:scale-105'}
                    `}
                    style={{ backgroundColor: color }}
                    title={color}
                  >
                    {active && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: RELIABILITY & ERROR TELEMETRY */}
      <section className="space-y-3">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          SYSTEM RELIABILITY & ISSUE REPORTING
        </h2>

        <div className="bg-card border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-900 dark:text-white">Enterprise Error Shield & Telemetry</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                  Active
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-xl">
                Global Error Boundaries and scrubbed telemetry automatically normalize Firebase and runtime exceptions, shielding sensitive bearer tokens and private keys while providing zero-downtime recovery.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowFeedbackModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand hover:bg-brand-hover] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
              >
                <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Report Issue</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Captured Exceptions</span>
              <div className="text-xl font-mono font-bold text-slate-900 dark:text-white mt-1">
                {errorsCount}
              </div>
              <span className="text-[10px] text-slate-400">Sanitized (Zero secrets leaked)</span>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Stored User Reports</span>
              <div className="text-xl font-mono font-bold text-blue-600 dark:text-blue-400 mt-1">
                {reportsCount}
              </div>
              <span className="text-[10px] text-slate-400">Local diagnostic buffer</span>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Diagnostics Cache</span>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    clearCapturedErrors();
                    clearStoredIssueReports();
                    setErrorsCount(0);
                    setReportsCount(0);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3 h-3 text-slate-400" />
                  <span>Clear Cache</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSimulateError(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 text-[11px] font-medium text-amber-800 dark:text-amber-300 hover:bg-amber-100 transition-colors cursor-pointer"
                  title="Simulate runtime crash to test global ErrorBoundary and ErrorPage"
                >
                  <Bug className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  <span>Test Boundary</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Global Feedback Modal */}
      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => {
          setShowFeedbackModal(false);
          setReportsCount(getStoredIssueReports().length);
        }}
        userEmail={user?.email || undefined}
        userName={profile?.displayName || user?.displayName || undefined}
      />
    </div>
  );
}
