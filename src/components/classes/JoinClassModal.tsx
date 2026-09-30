import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ClassItem, EnrolledStudent } from '../../lib/classes/classStore';
import { X, DoorOpen, AlertCircle, CheckCircle2, ShieldCheck, User, Hash } from 'lucide-react';

interface JoinClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassItem[];
  initialCode?: string;
  onEnrollSuccess: (updatedClass: ClassItem) => void;
}

export function JoinClassModal({
  isOpen,
  onClose,
  classes,
  initialCode = '',
  onEnrollSuccess,
}: JoinClassModalProps) {
  const { profile } = useAuth();

  const [joinCode, setJoinCode] = useState(initialCode);
  const [fullName, setFullName] = useState(profile?.displayName || '');
  const [rollNumber, setRollNumber] = useState('');
  const [erNumber, setErNumber] = useState('');
  const [srNumber, setSrNumber] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanCode = joinCode.trim().toUpperCase();
    const cleanName = fullName.trim();
    const cleanRoll = rollNumber.trim().toUpperCase();
    const cleanEr = erNumber.trim().toUpperCase();
    const cleanSr = srNumber.trim().toUpperCase();

    if (!cleanCode || !cleanName || !cleanRoll || !cleanEr || !cleanSr) {
      setError('All 5 identifier fields are mandatory to register in the course roster.');
      return;
    }

    // Find class matching code
    const targetClass = classes.find(c => c.joinCode.toUpperCase() === cleanCode || c.code.toUpperCase() === cleanCode);

    if (!targetClass) {
      setError(`No active class found matching join code "${cleanCode}". Please verify code with your instructor.`);
      return;
    }

    if (targetClass.archived) {
      setError(`"${targetClass.name}" is currently archived and is not accepting student registrations.`);
      return;
    }

    // Check if user is already enrolled
    const studentEmail = profile?.email || 'student@onyx.edu';
    const isAlreadyEnrolled = targetClass.roster.some(
      s => s.email.toLowerCase() === studentEmail.toLowerCase() || (profile?.uid && s.id === profile.uid)
    );

    if (isAlreadyEnrolled) {
      setError(`You are already enrolled in ${targetClass.code} (${targetClass.name}).`);
      return;
    }

    // STRICT PREVENT DUPLICATE IDENTIFIERS:
    // 1. Check duplicate Roll Number
    const duplicateRoll = targetClass.roster.find(
      s => s.rollNumber.toUpperCase() === cleanRoll
    );
    if (duplicateRoll) {
      setError(`Duplicate Identifier: Roll Number "${cleanRoll}" is already registered to a student in this section.`);
      return;
    }

    // 2. Check duplicate ER Number
    const duplicateEr = targetClass.roster.find(
      s => s.erNumber.toUpperCase() === cleanEr
    );
    if (duplicateEr) {
      setError(`Duplicate Identifier: Enrollment (ER) Number "${cleanEr}" is already registered to a student in this section.`);
      return;
    }

    // 3. Check duplicate Sr Number
    const duplicateSr = targetClass.roster.find(
      s => s.srNumber.toUpperCase() === cleanSr
    );
    if (duplicateSr) {
      setError(`Duplicate Identifier: Serial (Sr) Number "${cleanSr}" is already registered to a student in this section.`);
      return;
    }

    // All validations passed! Create new enrolled student
    const avatarColors = ['bg-blue-600', 'bg-indigo-600', 'bg-emerald-600', 'bg-purple-600', 'bg-amber-600', 'bg-cyan-600'];
    const randomAvatarBg = avatarColors[Math.floor(Math.random() * avatarColors.length)];

    const newStudent: EnrolledStudent = {
      id: profile?.uid || `u-${Date.now()}`,
      name: cleanName,
      email: studentEmail,
      rollNumber: cleanRoll,
      erNumber: cleanEr,
      srNumber: cleanSr,
      avatarBg: randomAvatarBg,
      attendance: 100,
      progress: 0,
      grade: 100,
      joinedAt: new Date().toISOString().split('T')[0]
    };

    const updatedClass: ClassItem = {
      ...targetClass,
      roster: [...targetClass.roster, newStudent]
    };

    onEnrollSuccess(updatedClass);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-card rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <DoorOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Enroll in Course Section</h3>
              <p className="text-xs text-slate-500">Provide official academic identifiers to join the roster.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* Join Code */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Class Join Code *
            </label>
            <input
              type="text"
              required
              value={joinCode}
              onChange={e => {
                setJoinCode(e.target.value);
                setError(null);
              }}
              placeholder="e.g. Enter Join Code"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-sm uppercase tracking-wider text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Full Name */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Student Full Legal Name *
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Enter your full name"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* 3 Identifiers Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Roll Number *
              </label>
              <input
                type="text"
                required
                value={rollNumber}
                onChange={e => {
                  setRollNumber(e.target.value);
                  setError(null);
                }}
                placeholder="e.g. R-2026-030"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-slate-900 dark:text-white uppercase focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                ER Number *
              </label>
              <input
                type="text"
                required
                value={erNumber}
                onChange={e => {
                  setErNumber(e.target.value);
                  setError(null);
                }}
                placeholder="e.g. ER-88430"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-slate-900 dark:text-white uppercase focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Sr Number *
              </label>
              <input
                type="text"
                required
                value={srNumber}
                onChange={e => {
                  setSrNumber(e.target.value);
                  setError(null);
                }}
                placeholder="e.g. SR-030"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-slate-900 dark:text-white uppercase focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Privacy & Anti-Duplicate Advisory */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 space-y-1 text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
              <span>Identity Verification & Duplicate Prevention</span>
            </div>
            <p>
              Your official Roll, ER, and Sr numbers must be unique within this section. They are strictly protected and visible only to authorized course instructors.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-brand hover:bg-brand-hover] text-white font-semibold shadow-xs cursor-pointer"
            >
              Verify & Register
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
