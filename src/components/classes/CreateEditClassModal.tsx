import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  ClassItem,
  BANNER_PRESETS,
  generateJoinCode
} from '../../lib/classes/classStore';
import { X, Sparkles, RefreshCw, Palette, Layers, BookOpen, Clock, Calendar } from 'lucide-react';

interface CreateEditClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (classData: Partial<ClassItem>) => void;
  editingClass?: ClassItem | null;
}

export function CreateEditClassModal({
  isOpen,
  onClose,
  onSave,
  editingClass
}: CreateEditClassModalProps) {
  const { profile } = useAuth();
  const isEditing = Boolean(editingClass);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [subject, setSubject] = useState('');
  const [section, setSection] = useState('Section A-01');
  const [description, setDescription] = useState('');
  const [schedule, setSchedule] = useState('');
  const [room, setRoom] = useState('');
  const [bannerPreset, setBannerPreset] = useState<ClassItem['bannerPreset']>('cobalt');
  const [joinCode, setJoinCode] = useState('');

  useEffect(() => {
    if (editingClass) {
      setName(editingClass.name);
      setCode(editingClass.code);
      setSubject(editingClass.subject || '');
      setSection(editingClass.section || 'Section A');
      setDescription(editingClass.description);
      setSchedule(editingClass.schedule);
      setRoom(editingClass.room);
      setBannerPreset(editingClass.bannerPreset || 'cobalt');
      setJoinCode(editingClass.joinCode);
    } else {
      setName('');
      setCode('');
      setSubject('');
      setSection('');
      setDescription('');
      setSchedule('');
      setRoom('');
      setBannerPreset('cobalt');
      setJoinCode(generateJoinCode('CLS'));
    }
  }, [editingClass, isOpen]);

  if (!isOpen) return null;

  const handleRollCode = () => {
    const prefix = code.split('-')[0] || 'OX';
    setJoinCode(generateJoinCode(prefix));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;

    const selectedPresetObj = BANNER_PRESETS.find(p => p.id === bannerPreset) || BANNER_PRESETS[0];

    const data: Partial<ClassItem> = {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      subject: subject.trim(),
      section: section.trim(),
      description: description.trim(),
      schedule: schedule.trim() || 'Mon / Wed 10:00 AM',
      room: room.trim() || 'Main Lecture Hall',
      bannerPreset,
      bannerColor: selectedPresetObj.color,
      joinCode: joinCode.trim().toUpperCase() || generateJoinCode('OX'),
      archived: editingClass ? editingClass.archived : false,
      instructor: editingClass ? editingClass.instructor : (profile?.displayName || 'Dr. Sarah Chen'),
      ownerId: editingClass ? editingClass.ownerId : (profile?.uid || 't1'),
    };

    onSave(data);
    onClose();
  };

  const selectedPresetObj = BANNER_PRESETS.find(p => p.id === bannerPreset) || BANNER_PRESETS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-card rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {isEditing ? 'Edit Course Section' : 'Create New Course Section'}
            </h3>
            <p className="text-xs text-slate-500">
              {isEditing ? 'Update course syllabus, meeting schedule, and visual banner.' : 'Set up course details, visual banner, and auto-generated join code.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Banner Preview */}
        <div
          className="w-full h-24 rounded-2xl p-4 flex flex-col justify-between text-white shadow-sm transition-all"
          style={{ background: selectedPresetObj.gradient }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-black/25 backdrop-blur-xs">
              {code || 'CODE'}
            </span>
            <span className="text-[11px] font-medium opacity-90">
              {section || 'Section'}
            </span>
          </div>

          <div>
            <h4 className="font-bold text-sm sm:text-base line-clamp-1 drop-shadow-xs">
              {name || 'Course Title'}
            </h4>
            <div className="text-[11px] opacity-80 mt-0.5">
              {subject || 'Subject'} • {schedule || 'Schedule TBA'}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Banner Preset Selector */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Banner Theme Preset
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {BANNER_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setBannerPreset(preset.id as any)}
                  className={`h-11 rounded-xl p-1 border-2 transition-all flex flex-col items-center justify-center cursor-pointer ${
                    bannerPreset === preset.id
                      ? 'border-blue-600 dark:border-blue-400 scale-105 shadow-xs'
                      : 'border-transparent opacity-80 hover:opacity-100'
                  }`}
                  style={{ background: preset.gradient }}
                  title={preset.label}
                >
                  <span className="text-[10px] font-bold text-white drop-shadow-xs truncate max-w-full px-1">
                    {preset.id}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Code & Subject */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Course Code *
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="e.g. CS-201"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white uppercase font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Academic Subject *
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="e.g. Science, Humanities, Arts..."
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Title & Section */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Course Title *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Distributed Operating Systems"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Section
              </label>
              <input
                type="text"
                value={section}
                onChange={e => setSection(e.target.value)}
                placeholder="e.g. Section A-01"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Schedule & Room */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Meeting Schedule
              </label>
              <input
                type="text"
                value={schedule}
                onChange={e => setSchedule(e.target.value)}
                placeholder="e.g. Mon / Wed 10:00 AM - 11:30 AM"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Lecture Room / Hall
              </label>
              <input
                type="text"
                value={room}
                onChange={e => setRoom(e.target.value)}
                placeholder="e.g. Science Building 302"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Course Description & Syllabus Summary
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Core learning objectives, grading breakdown, and lecture scope..."
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Join Code with Regenerate button */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Student Join Code
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                className="flex-1 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-sm uppercase tracking-wider text-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={handleRollCode}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Roll New</span>
              </button>
            </div>
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
              type="submit"
              className="px-5 py-2 rounded-xl bg-brand hover:bg-brand-hover] text-white font-semibold shadow-xs cursor-pointer"
            >
              {isEditing ? 'Save Changes' : 'Create Section'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
