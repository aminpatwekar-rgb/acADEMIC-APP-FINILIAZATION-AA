import React, { useState, useRef } from 'react';
import { NotebookCanvas } from '../notebook/NotebookCanvas';
import {
  PenTool,
  Sparkles,
  Download,
  Share2,
  Trash2,
  FileText,
  Sigma,
  BookOpen,
  Check,
  Copy,
  Layers,
  HelpCircle
} from 'lucide-react';
import { RenderMathText } from '../math/RenderMathText';

export function NotebookPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<'blank' | 'math' | 'physics' | 'notes'>('math');
  const [copied, setCopied] = useState(false);
  const [notesTranscription, setNotesTranscription] = useState<string | null>(null);

  const handleCopyLatex = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#005fb8] dark:text-blue-400 mb-1">
            <PenTool className="w-3.5 h-3.5" />
            <span>ONYX Digital Ink Studio</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Handwriting & Math Notebook
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Zero-latency digital ink canvas with KaTeX formula support, ruled paper patterns, and AI handwriting transcription.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setSelectedTemplate('math')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                selectedTemplate === 'math'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Math Proof
            </button>
            <button
              type="button"
              onClick={() => setSelectedTemplate('notes')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                selectedTemplate === 'notes'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Lecture Notes
            </button>
            <button
              type="button"
              onClick={() => setSelectedTemplate('physics')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                selectedTemplate === 'physics'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Grid Graph
            </button>
          </div>
        </div>
      </div>

      {/* Feature Highlights Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start gap-3 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <PenTool className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-slate-900 dark:text-white">Vector Inking</div>
            <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">Smooth Bézier curve smoothing with pressure sensitivity and highlighter layering.</div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start gap-3 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-slate-900 dark:text-white">AI Stroke Recognition</div>
            <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">Automatically converts handwritten strokes into clean LaTeX math formulas.</div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start gap-3 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-slate-900 dark:text-white">Grid & Ruled Paper</div>
            <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">Switch between college-ruled, engineering dot grid, graph paper, or blank sheets.</div>
          </div>
        </div>
      </div>

      {/* Embedded Notebook Canvas */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-2 sm:p-4 shadow-sm">
        <NotebookCanvas
          assignmentTitle={
            selectedTemplate === 'math'
              ? 'Calculus & Linear Algebra Scratchpad'
              : selectedTemplate === 'physics'
              ? 'Mechanics & Free-Body Diagram'
              : 'Lecture & Seminar Journal'
          }
          onSave={(_doc, _images) => {
            // Optional save handler
          }}
        />
      </div>

      {/* Formula Reference Helper */}
      <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sigma className="w-4 h-4 text-[#005fb8] dark:text-blue-400" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              KaTeX Math Expressions Quick Reference
            </h3>
          </div>
          <span className="text-xs text-slate-400">Click formula to copy</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          {[
            { label: 'Gaussian Integral', code: '\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}' },
            { label: 'Quadratic Formula', code: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}' },
            { label: 'Euler Identity', code: 'e^{i\\pi} + 1 = 0' },
            { label: 'Matrix Determinant', code: '\\det(A) = ad - bc' },
            { label: 'Derivative Definition', code: 'f\'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}' },
            { label: 'Einstein Mass-Energy', code: 'E^2 = (mc^2)^2 + (pc)^2' },
          ].map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleCopyLatex(item.code)}
              className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 text-left hover:border-blue-400 dark:hover:border-blue-500 transition-colors group cursor-pointer"
            >
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium mb-1">
                <span>{item.label}</span>
                <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-blue-600 dark:text-blue-400" />
              </div>
              <div className="py-1 text-slate-800 dark:text-slate-200 overflow-x-auto text-xs">
                <RenderMathText content={`$$${item.code}$$`} />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
