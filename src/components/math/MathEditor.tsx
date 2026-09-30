import React, { useState, useRef } from 'react';
import { MATH_SYMBOLS, MathSymbol } from '../../lib/math/symbols';
import { SCIENCE_FORMULAS, ScienceFormula } from '../../lib/science/formulas';
import { RenderMathText } from './RenderMathText';
import { Sigma, BookOpen, Copy, Check, Sparkles, HelpCircle } from 'lucide-react';

interface MathEditorProps {
  initialLatex?: string;
  onInsertLatex?: (latex: string) => void;
  assignmentContext?: string;
}

export function MathEditor({
  initialLatex = '\\int_{0}^{1} x^2 \\, dx = \\left[ \\frac{x^3}{3} \\right]_0^1 = \\frac{1}{3}',
  onInsertLatex,
  assignmentContext
}: MathEditorProps) {
  const [latex, setLatex] = useState(initialLatex);
  const [activeCategory, setActiveCategory] = useState<MathSymbol['category'] | 'science'>('calculus');
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertSymbol = (symLatex: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setLatex(prev => prev + ' ' + symLatex);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = latex;
    const next = current.substring(0, start) + symLatex + current.substring(end);
    setLatex(next);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + symLatex.length, start + symLatex.length);
    }, 10);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`$$${latex}$$`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredSymbols = MATH_SYMBOLS.filter(s => s.category === activeCategory);

  return (
    <div className="w-full flex flex-col bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      {/* Editor Header */}
      <div className="px-4 py-3 bg-input border-b border-border flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Sigma className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">ONYX LaTeX & Math Editor</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Insert formulas, scientific equations, and proofs</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-foreground hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied $$' : 'Copy LaTeX'}</span>
          </button>

          {onInsertLatex && (
            <button
              type="button"
              onClick={() => onInsertLatex(`$$${latex}$$`)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-semibold shadow-xs cursor-pointer transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Insert to Submission</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="px-4 py-2 bg-slate-100/70 dark:bg-card/90 border-b border-border flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-[11px] font-bold uppercase text-slate-400 mr-2 tracking-wider">Categories:</span>
        {(['calculus', 'algebra', 'greek', 'logic', 'matrices', 'science'] as const).map(cat => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1 rounded-md font-medium capitalize transition-all cursor-pointer ${
              activeCategory === cat
                ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-xs border border-slate-200/80 dark:border-slate-700'
                : 'text-muted-foreground hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Symbol Toolbar / Chips */}
      <div className="px-4 py-2.5 bg-slate-50/50 dark:bg-card/50 border-b border-border flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
        {activeCategory === 'science' ? (
          SCIENCE_FORMULAS.map((sf, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => insertSymbol(sf.latex)}
              className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 hover:border-amber-400 dark:hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
              title={sf.description}
            >
              <span className="font-semibold text-[11px] text-slate-400">[{sf.field}]</span>
              <span>{sf.name}</span>
            </button>
          ))
        ) : (
          filteredSymbols.map((sym, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => insertSymbol(sym.latex)}
              className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-800 dark:text-slate-200 hover:border-amber-400 dark:hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400 transition-all cursor-pointer shadow-2xs"
              title={sym.description || sym.latex}
            >
              {sym.label}
            </button>
          ))
        )}
      </div>

      {/* Dual Pane: LaTeX Source & KaTeX Live Preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800 min-h-[200px]">
        {/* Input Pane */}
        <div className="p-4 flex flex-col">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-mono">LaTeX Input</span>
            <span className="text-[11px]">Wrap math with $$ for block</span>
          </div>
          <textarea
            ref={textareaRef}
            value={latex}
            onChange={(e) => setLatex(e.target.value)}
            placeholder="Type LaTeX commands (e.g. \frac{a}{b}, \int_0^\infty, \sqrt{x})"
            className="w-full flex-1 min-h-[140px] bg-input p-3 rounded-lg border border-border font-mono text-xs sm:text-sm text-foreground resize-none outline-hidden focus:ring-1 focus:ring-amber-500"
            spellCheck="false"
          />
        </div>

        {/* Live Preview Pane */}
        <div className="p-4 flex flex-col bg-slate-50/40 dark:bg-input/40">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-mono">Live KaTeX Preview</span>
            <span className="text-emerald-500 flex items-center gap-1 text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Real-time Render
            </span>
          </div>
          <div className="w-full flex-1 min-h-[140px] bg-card p-4 rounded-lg border border-border flex items-center justify-center overflow-x-auto">
            {latex.trim() ? (
              <RenderMathText content={`$$${latex}$$`} className="text-foreground text-lg" />
            ) : (
              <span className="text-xs text-slate-400 italic">Formulas will preview here in real-time</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
