import React, { useState } from 'react';
import { NotebookCanvas } from '../notebook/NotebookCanvas';
import { HandwrittenPage, uploadSubmissionFile } from '../../lib/firebase/firestoreService';
import {
  Upload,
  FileText,
  Image as ImageIcon,
  Plus,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Save,
  CheckCircle2,
  Eye,
  PenTool,
  Loader2,
  ExternalLink,
  Edit2
} from 'lucide-react';

interface HandwrittenWorkspaceProps {
  initialPages?: HandwrittenPage[];
  onSaveDraft: (pages: HandwrittenPage[], notes: string) => void;
  onSubmitFinal: (pages: HandwrittenPage[], notes: string) => void;
  submitting?: boolean;
  readOnly?: boolean;
  dueDateStr?: string;
  notes?: string;
  onNotesChange?: (notes: string) => void;
}

export function HandwrittenWorkspace({
  initialPages = [],
  onSaveDraft,
  onSubmitFinal,
  submitting = false,
  readOnly = false,
  dueDateStr,
  notes = '',
  onNotesChange
}: HandwrittenWorkspaceProps) {
  const [pages, setPages] = useState<HandwrittenPage[]>(
    initialPages.length > 0
      ? initialPages
      : [
          {
            pageNumber: 1,
            imageUrl: '',
            caption: 'Page 1 — Handwritten Work & Solutions'
          }
        ]
  );
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [inputNotes, setInputNotes] = useState(notes);
  const [activeTab, setActiveTab] = useState<'upload' | 'draw'>('upload');
  const [isUploading, setIsUploading] = useState(false);
  const [editingCaption, setEditingCaption] = useState(false);

  const currentPage = pages[activePageIndex] || pages[0];

  const isPdf = (url?: string, fileName?: string): boolean => {
    if (!url) return false;
    return (
      url.startsWith('data:application/pdf') ||
      url.toLowerCase().includes('.pdf') ||
      Boolean(fileName && fileName.toLowerCase().endsWith('.pdf'))
    );
  };

  const handleNotesChange = (val: string) => {
    setInputNotes(val);
    if (onNotesChange) onNotesChange(val);
  };

  const handleAddPage = () => {
    const newPageNum = pages.length + 1;
    const newPage: HandwrittenPage = {
      pageNumber: newPageNum,
      imageUrl: '',
      caption: `Page ${newPageNum} — Additional Proofs`
    };
    const updated = [...pages, newPage];
    setPages(updated);
    setActivePageIndex(updated.length - 1);
  };

  const handleDeletePage = (index: number) => {
    if (pages.length <= 1) return;
    const updated = pages.filter((_, i) => i !== index).map((p, i) => ({
      ...p,
      pageNumber: i + 1
    }));
    setPages(updated);
    setActivePageIndex(Math.min(activePageIndex, updated.length - 1));
  };

  const handleMovePage = (index: number, direction: 'prev' | 'next') => {
    const targetIndex = direction === 'prev' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= pages.length) return;
    const updated = [...pages];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    const renumbered = updated.map((p, i) => ({ ...p, pageNumber: i + 1 }));
    setPages(renumbered);
    setActivePageIndex(targetIndex);
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `submissions/handwritten/${Date.now()}_p${activePageIndex + 1}_${safeName}`;
      const downloadUrl = await uploadSubmissionFile(file, storagePath);

      const updated = pages.map((p, i) =>
        i === activePageIndex ? { ...p, imageUrl: downloadUrl, fileName: file.name } : p
      );
      setPages(updated);
    } catch (err) {
      console.error('File upload error:', err);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleCanvasSave = (_doc: any, previewImages: string[]) => {
    if (previewImages && previewImages.length > 0) {
      const updated = pages.map((p, i) =>
        i === activePageIndex ? { ...p, imageUrl: previewImages[0], fileName: `Canvas_Page_${i + 1}.png` } : p
      );
      setPages(updated);
    }
  };

  const handleUpdateCaption = (caption: string) => {
    const updated = pages.map((p, i) =>
      i === activePageIndex ? { ...p, caption } : p
    );
    setPages(updated);
  };

  return (
    <div className="w-full flex flex-col space-y-4">
      {/* Top Page Thumbnails Bar & Page Manager */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 shadow-xs space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 dark:text-white">
              Handwritten Pages ({pages.length})
            </span>
            <span className="text-slate-400">
              Active: Page {activePageIndex + 1} of {pages.length}
            </span>
          </div>

          {!readOnly && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAddPage}
                className="flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900 font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Page</span>
              </button>
            </div>
          )}
        </div>

        {/* Thumbnail Strip */}
        <div className="flex items-center gap-3 overflow-x-auto pb-1 pt-1">
          {pages.map((page, idx) => {
            const hasPdf = isPdf(page.imageUrl, page.fileName);
            return (
              <div
                key={idx}
                onClick={() => setActivePageIndex(idx)}
                className={`relative shrink-0 w-28 h-36 rounded-xl border-2 transition-all p-2 flex flex-col justify-between cursor-pointer ${
                  activePageIndex === idx
                    ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/40 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-bold">
                  <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    P.{page.pageNumber}
                  </span>
                  {!readOnly && pages.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePage(idx);
                      }}
                      className="text-slate-400 hover:text-rose-500 p-0.5"
                      title="Delete page"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {page.imageUrl ? (
                  hasPdf ? (
                    <div className="flex-1 my-1 rounded overflow-hidden bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex flex-col items-center justify-center p-1 text-center">
                      <FileText className="w-6 h-6 text-rose-500 mb-1" />
                      <span className="text-[9px] font-bold text-rose-700 dark:text-rose-300 truncate max-w-full">
                        {page.fileName || 'PDF Page'}
                      </span>
                    </div>
                  ) : (
                    <div className="flex-1 my-1 rounded overflow-hidden bg-white dark:bg-slate-900 flex items-center justify-center">
                      <img src={page.imageUrl} alt={`Page ${page.pageNumber}`} className="max-h-full object-contain" />
                    </div>
                  )
                ) : (
                  <div className="flex-1 my-1 rounded border border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 text-[10px] text-center p-1">
                    <FileText className="w-4 h-4 mb-0.5" />
                    <span>Empty Page</span>
                  </div>
                )}

                {!readOnly && (
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMovePage(idx, 'prev');
                      }}
                      className="hover:text-blue-500 disabled:opacity-30 cursor-pointer"
                      title="Move left"
                    >
                      <ArrowLeft className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === pages.length - 1}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMovePage(idx, 'next');
                      }}
                      className="hover:text-blue-500 disabled:opacity-30 cursor-pointer"
                      title="Move right"
                    >
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Page Working Area */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#005fb8] text-white">
                Page {activePageIndex + 1} of {pages.length}
              </span>
              {editingCaption && !readOnly ? (
                <div className="flex items-center gap-1 flex-1 max-w-sm">
                  <input
                    type="text"
                    value={currentPage?.caption || ''}
                    onChange={(e) => handleUpdateCaption(e.target.value)}
                    onBlur={() => setEditingCaption(false)}
                    onKeyDown={(e) => e.key === 'Enter' && setEditingCaption(false)}
                    autoFocus
                    className="w-full text-xs px-2 py-1 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setEditingCaption(false)}
                    className="text-xs px-2 py-1 rounded bg-blue-600 text-white font-semibold cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-900 dark:text-white">
                    {currentPage?.caption || 'Handwritten Problem Set Sheet'}
                  </span>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => setEditingCaption(true)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                      title="Edit caption"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
            {dueDateStr && (
              <p className="text-[11px] text-slate-400 mt-0.5">
                Due: {dueDateStr}
              </p>
            )}
          </div>

          {!readOnly && (
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                  activeTab === 'upload'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Scan / PDF</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('draw')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                  activeTab === 'draw'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>Digital Ink Canvas</span>
              </button>
            </div>
          )}
        </div>

        {/* Content Viewer / Editor for Active Page */}
        {activeTab === 'upload' || readOnly ? (
          <div className="space-y-4">
            {isUploading ? (
              <div className="p-12 border-2 border-dashed border-blue-300 dark:border-blue-800 rounded-2xl flex flex-col items-center justify-center text-center space-y-3 bg-blue-50/30 dark:bg-blue-950/20 animate-pulse">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                <div>
                  <h4 className="font-semibold text-sm text-slate-900 dark:text-white">
                    Uploading to Firebase Storage...
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Securing scan deliverable in Firebase cloud storage bucket.
                  </p>
                </div>
              </div>
            ) : currentPage?.imageUrl ? (
              <div className="flex flex-col items-center space-y-3">
                {isPdf(currentPage.imageUrl, currentPage.fileName) ? (
                  <div className="w-full h-[520px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 flex flex-col">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-slate-200/80 dark:bg-slate-800/80 text-xs border-b border-slate-300 dark:border-slate-700">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-rose-500" />
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {currentPage.fileName || 'Uploaded PDF Document'}
                        </span>
                      </div>
                      <a
                        href={currentPage.imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open Document</span>
                      </a>
                    </div>
                    <iframe
                      src={currentPage.imageUrl}
                      title={currentPage.fileName || 'PDF Document'}
                      className="w-full flex-1 border-0"
                    />
                  </div>
                ) : (
                  <div className="w-full max-h-[500px] overflow-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2 flex items-center justify-center">
                    <img
                      src={currentPage.imageUrl}
                      alt={`Page ${activePageIndex + 1}`}
                      className="max-h-[460px] object-contain shadow-xs rounded-lg"
                    />
                  </div>
                )}

                {!readOnly && (
                  <div className="flex items-center gap-3 text-xs">
                    <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                      <Upload className="w-3.5 h-3.5 text-blue-500" />
                      <span>Replace This Page</span>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleFileSelected}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-10 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center space-y-3 bg-slate-50/50 dark:bg-slate-950/40">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-slate-900 dark:text-white">
                    Upload Page {activePageIndex + 1} Document
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Supports camera photos, high-resolution scans, JPG, PNG, and multi-page PDFs via Firebase Storage.
                  </p>
                </div>
                {!readOnly && (
                  <label className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#005fb8] hover:bg-[#004e9a] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Select Scan or PDF File</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileSelected}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-xs text-blue-700 dark:text-blue-300 flex items-center justify-between">
              <span>Write or draw with vector digital ink. Strokes are automatically captured for Page {activePageIndex + 1}.</span>
              <span className="font-semibold">Digital Ink Engine</span>
            </div>
            <NotebookCanvas
              assignmentTitle={`Page ${activePageIndex + 1}`}
              onSave={handleCanvasSave}
            />
          </div>
        )}

        {/* Accompanying Notes for Student */}
        <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Accompanying Proof Notes & Derivation Annotations (Optional)
          </label>
          <textarea
            value={inputNotes}
            readOnly={readOnly}
            onChange={(e) => handleNotesChange(e.target.value)}
            rows={2}
            placeholder="Add any clarifying remarks, theorem citations, or page index guide for the instructor..."
            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
          />
        </div>

        {/* Action Controls for Draft and Final Submit */}
        {!readOnly && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="text-xs text-slate-400">
              {pages.filter(p => Boolean(p.imageUrl)).length} of {pages.length} pages filled
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={submitting || isUploading}
                onClick={() => onSaveDraft(pages, inputNotes)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5 text-blue-500" />
                <span>Save Draft (In Progress)</span>
              </button>

              <button
                type="button"
                disabled={submitting || isUploading || pages.filter(p => Boolean(p.imageUrl)).length === 0}
                onClick={() => onSubmitFinal(pages, inputNotes)}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#005fb8] hover:bg-[#004e9a] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>Final Submission</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
