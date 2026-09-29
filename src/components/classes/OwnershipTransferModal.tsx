import React, { useState } from 'react';
import { ClassItem } from '../../lib/classes/classStore';
import { OnyxUser } from '../../lib/auth';
import { X, ShieldAlert, ArrowRight, UserCheck, AlertTriangle } from 'lucide-react';

interface OwnershipTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetClass: ClassItem;
  facultyUsers?: OnyxUser[];
  onConfirmTransfer: (classId: string, newOwnerId: string, newOwnerName: string) => void;
}

export function OwnershipTransferModal({
  isOpen,
  onClose,
  targetClass,
  facultyUsers = [],
  onConfirmTransfer
}: OwnershipTransferModalProps) {
  const eligibleFaculty = facultyUsers.filter(u => u.role === 'teacher' || u.role === 'admin');

  const [selectedTeacherId, setSelectedTeacherId] = useState(
    eligibleFaculty.find(t => t.uid !== targetClass.ownerId)?.uid || eligibleFaculty[0]?.uid || ''
  );
  const [confirmedChecked, setConfirmedChecked] = useState(false);

  if (!isOpen) return null;

  const currentTeacher = facultyUsers.find(t => t.uid === targetClass.ownerId) || {
    uid: targetClass.ownerId,
    displayName: targetClass.instructor,
    email: 'faculty@school.edu'
  };

  const newTeacher = eligibleFaculty.find(t => t.uid === selectedTeacherId) || eligibleFaculty[0];

  const handleTransfer = () => {
    if (!confirmedChecked || !newTeacher) return;
    onConfirmTransfer(targetClass.id, newTeacher.uid, newTeacher.displayName);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Transfer Class Ownership</h3>
              <p className="text-xs text-slate-500">Administrator Governance Control</p>
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

        {/* Warning Banner */}
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300 space-y-1">
          <div className="font-bold flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" />
            <span>Administrative Reassignment</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            Transferring ownership assigns full pedagogical control, grading authority, and roster management of <span className="font-bold">{targetClass.code}</span> to the selected faculty member.
          </p>
        </div>

        <div className="space-y-3 text-xs">
          {/* Current Owner */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
            <div className="text-[11px] font-semibold text-slate-400 uppercase">Current Section Owner</div>
            <div className="font-bold text-slate-900 dark:text-white text-sm">{currentTeacher.displayName}</div>
            <div className="text-[11px] text-slate-500">{currentTeacher.email}</div>
          </div>

          <div className="flex items-center justify-center text-slate-400">
            <ArrowRight className="w-4 h-4 rotate-90 sm:rotate-0" />
          </div>

          {/* New Owner Dropdown */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Select New Faculty Owner
            </label>
            {eligibleFaculty.length === 0 ? (
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                No additional faculty accounts registered in the database.
              </div>
            ) : (
              <select
                value={selectedTeacherId}
                onChange={e => setSelectedTeacherId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                {eligibleFaculty.map(teacher => (
                  <option key={teacher.uid} value={teacher.uid}>
                    {teacher.displayName} ({teacher.email}) — {teacher.role}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Confirmation Checkbox */}
          {newTeacher && (
            <label className="flex items-start gap-2.5 pt-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={confirmedChecked}
                onChange={e => setConfirmedChecked(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-700 text-primary focus:ring-primary mt-0.5 cursor-pointer"
              />
              <span className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                I confirm that primary authority over grades, announcements, and submissions for this section will be transferred to <span className="font-semibold text-slate-900 dark:text-white">{newTeacher.displayName}</span>.
              </span>
            </label>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!confirmedChecked || !newTeacher}
            onClick={handleTransfer}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-40"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Confirm Ownership Transfer</span>
          </button>
        </div>
      </div>
    </div>
  );
}
