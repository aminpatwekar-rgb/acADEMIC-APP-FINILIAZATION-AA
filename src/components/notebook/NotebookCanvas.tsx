import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  NotebookEngine,
  CanvasTool,
  PaperPattern,
  CanvasStroke
} from '../../lib/notebook/engine';
import {
  NotebookDocument,
  NotebookPage,
  createEmptyDocument,
  saveDocumentToFirebaseStorage
} from '../../lib/notebook/pdf';
import {
  Pen,
  Highlighter,
  Eraser,
  Minus,
  Square,
  Circle,
  Type,
  Undo2,
  Redo2,
  Trash2,
  Upload,
  ChevronLeft,
  ChevronRight,
  Plus,
  Grid,
  FileText,
  Sparkles,
  Download,
  Maximize2
} from 'lucide-react';
import { recognizeHandwrittenStrokes } from '../../lib/ai/recognition';

interface NotebookCanvasProps {
  initialDocument?: NotebookDocument;
  onSave?: (doc: NotebookDocument, pageImages: string[]) => void;
  assignmentTitle?: string;
  readOnly?: boolean;
}

const PALETTE = [
  { name: 'Onyx Black', value: '#0f172a' },
  { name: 'Royal Blue', value: '#2563eb' },
  { name: 'Emerald', value: '#059669' },
  { name: 'Ruby', value: '#dc2626' },
  { name: 'Amber Gold', value: '#d97706' },
  { name: 'Purple', value: '#7c3aed' },
  { name: 'White', value: '#ffffff' },
];

const STROKE_WIDTHS = [
  { label: 'Fine', value: 2 },
  { label: 'Medium', value: 4 },
  { label: 'Thick', value: 8 },
  { label: 'Broad', value: 14 },
];

export function NotebookCanvas({
  initialDocument,
  onSave,
  assignmentTitle = 'Assignment Notebook',
  readOnly = false,
}: NotebookCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<NotebookEngine | null>(null);

  const [doc, setDoc] = useState<NotebookDocument>(() => initialDocument || createEmptyDocument(assignmentTitle));
  const [activeTool, setActiveTool] = useState<CanvasTool>('pen');
  const [activeColor, setActiveColor] = useState<string>('#0f172a');
  const [activeWidth, setActiveWidth] = useState<number>(3);
  const [pattern, setPattern] = useState<PaperPattern>('ruled');
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [recognizedText, setRecognizedText] = useState<string | null>(null);

  const currentPage: NotebookPage = doc.pages[doc.currentPageIndex] || doc.pages[0];

  // Initialize Canvas & Engine
  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new NotebookEngine(canvasRef.current);
    engineRef.current = engine;

    engine.setTool(activeTool);
    engine.setColor(activeColor);
    engine.setWidth(activeWidth);
    engine.setPattern(currentPage.pattern || 'ruled');

    if (currentPage.strokes && currentPage.strokes.length > 0) {
      engine.setStrokes(currentPage.strokes);
    }

    if (currentPage.backgroundImage) {
      engine.setBackgroundImage(currentPage.backgroundImage);
    }

    const handleResize = () => {
      engine.setupResolution();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Update engine properties when user changes tools
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setTool(activeTool);
      engineRef.current.setColor(activeColor);
      engineRef.current.setWidth(activeWidth);
    }
  }, [activeTool, activeColor, activeWidth]);

  // Sync page state when switching pages
  const syncCurrentPageStrokes = useCallback(() => {
    if (!engineRef.current) return;
    const strokes = engineRef.current.getStrokes();
    setDoc(prev => {
      const updatedPages = [...prev.pages];
      if (updatedPages[prev.currentPageIndex]) {
        updatedPages[prev.currentPageIndex] = {
          ...updatedPages[prev.currentPageIndex],
          strokes,
          pattern,
        };
      }
      return { ...prev, pages: updatedPages };
    });
  }, [pattern]);

  const loadPage = (pageIndex: number) => {
    syncCurrentPageStrokes();
    const targetPage = doc.pages[pageIndex];
    if (!targetPage || !engineRef.current) return;

    setDoc(prev => ({ ...prev, currentPageIndex: pageIndex }));
    setPattern(targetPage.pattern || 'ruled');
    engineRef.current.setPattern(targetPage.pattern || 'ruled');
    engineRef.current.setStrokes(targetPage.strokes || []);

    if (targetPage.backgroundImage) {
      engineRef.current.setBackgroundImage(targetPage.backgroundImage);
    } else {
      engineRef.current.clearBackgroundImage();
    }
  };

  const handlePatternChange = (newPattern: PaperPattern) => {
    setPattern(newPattern);
    if (engineRef.current) {
      engineRef.current.setPattern(newPattern);
    }
  };

  const handleAddPage = () => {
    syncCurrentPageStrokes();
    const newPage: NotebookPage = {
      id: Math.random().toString(36).substring(2, 9),
      pageNumber: doc.pages.length + 1,
      strokes: [],
      pattern: 'ruled',
    };
    setDoc(prev => ({
      ...prev,
      pages: [...prev.pages, newPage],
      currentPageIndex: prev.pages.length,
    }));
    setTimeout(() => {
      if (engineRef.current) {
        engineRef.current.clear();
        engineRef.current.clearBackgroundImage();
        engineRef.current.setPattern('ruled');
      }
    }, 50);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result && engineRef.current) {
        engineRef.current.setBackgroundImage(result);
        setDoc(prev => {
          const updated = [...prev.pages];
          updated[prev.currentPageIndex].backgroundImage = result;
          return { ...prev, pages: updated };
        });
      }
    };
    reader.readAsDataURL(file);
  };

  // Mouse & Touch handling
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (readOnly || !engineRef.current || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    canvasRef.current.setPointerCapture(e.pointerId);
    engineRef.current.startStroke(x, y, e.pressure || 0.5);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (readOnly || !engineRef.current || !canvasRef.current) return;
    if (e.buttons !== 1) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    engineRef.current.addPoint(x, y, e.pressure || 0.5);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (readOnly || !engineRef.current || !canvasRef.current) return;
    try {
      canvasRef.current.releasePointerCapture(e.pointerId);
    } catch {}
    engineRef.current.endStroke();
  };

  // AI Recognition
  const handleAIRecognition = async () => {
    if (!engineRef.current) return;
    setIsRecognizing(true);
    setRecognizedText(null);
    try {
      const strokes = engineRef.current.getStrokes();
      const res = await recognizeHandwrittenStrokes(strokes);
      setRecognizedText(res.transcription || 'Could not transcribe strokes.');
    } catch (e) {
      console.error(e);
      setRecognizedText('AI recognition encountered an issue.');
    } finally {
      setIsRecognizing(false);
    }
  };

  // Save / Export
  const handleExport = () => {
    syncCurrentPageStrokes();
    if (!engineRef.current) return;
    const dataUrl = engineRef.current.toDataURL();
    if (onSave) {
      onSave(doc, [dataUrl]);
    }

    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${assignmentTitle.replace(/\s+/g, '_')}_page_${doc.currentPageIndex + 1}.png`;
    a.click();
  };

  return (
    <div className="w-full flex flex-col bg-slate-900 rounded-xl border border-slate-800 shadow-xl overflow-hidden text-slate-200">
      {/* Top Header Bar */}
      <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
          <span className="font-semibold text-sm text-white">{assignmentTitle}</span>
          <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md font-mono">
            Page {doc.currentPageIndex + 1} of {doc.pages.length}
          </span>
        </div>

        {/* Page Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800 text-xs">
          <button
            type="button"
            disabled={doc.currentPageIndex === 0}
            onClick={() => loadPage(doc.currentPageIndex - 1)}
            className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-2 font-medium">Page {doc.currentPageIndex + 1}</span>
          <button
            type="button"
            disabled={doc.currentPageIndex >= doc.pages.length - 1}
            onClick={() => loadPage(doc.currentPageIndex + 1)}
            className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleAddPage}
            className="ml-1 p-1 rounded bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 flex items-center gap-1 font-medium"
            title="Add Page"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAIRecognition}
            disabled={isRecognizing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30 text-xs font-medium cursor-pointer transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>{isRecognizing ? 'Transcribing...' : 'AI Transcribe'}</span>
          </button>

          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-xs cursor-pointer transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Work</span>
          </button>
        </div>
      </div>

      {/* Main Tool Ribbon */}
      <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Drawing Tools */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTool('pen')}
            className={`p-1.5 rounded-md flex items-center gap-1 transition-all ${activeTool === 'pen' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            title="Pen Tool"
          >
            <Pen className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setActiveTool('highlighter')}
            className={`p-1.5 rounded-md flex items-center gap-1 transition-all ${activeTool === 'highlighter' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            title="Highlighter"
          >
            <Highlighter className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setActiveTool('eraser')}
            className={`p-1.5 rounded-md flex items-center gap-1 transition-all ${activeTool === 'eraser' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            title="Eraser"
          >
            <Eraser className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-4 bg-slate-800 mx-0.5" />
          <button
            type="button"
            onClick={() => setActiveTool('line')}
            className={`p-1.5 rounded-md transition-all ${activeTool === 'line' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            title="Line"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setActiveTool('rect')}
            className={`p-1.5 rounded-md transition-all ${activeTool === 'rect' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            title="Rectangle"
          >
            <Square className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setActiveTool('circle')}
            className={`p-1.5 rounded-md transition-all ${activeTool === 'circle' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            title="Circle"
          >
            <Circle className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Color Palette */}
        <div className="flex items-center gap-1.5">
          {PALETTE.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setActiveColor(c.value)}
              className={`w-5 h-5 rounded-full border transition-transform ${activeColor === c.value ? 'scale-125 border-white ring-2 ring-amber-500/50' : 'border-slate-700 hover:scale-110'}`}
              style={{ backgroundColor: c.value }}
              title={c.name}
            />
          ))}
        </div>

        {/* Stroke Width Slider */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          {STROKE_WIDTHS.map(sw => (
            <button
              key={sw.value}
              type="button"
              onClick={() => setActiveWidth(sw.value)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${activeWidth === sw.value ? 'bg-slate-800 text-amber-400' : 'text-slate-400 hover:text-white'}`}
            >
              {sw.label}
            </button>
          ))}
        </div>

        {/* Paper Background Pattern */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => handlePatternChange('ruled')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${pattern === 'ruled' ? 'bg-slate-800 text-amber-400' : 'text-slate-400 hover:text-white'}`}
          >
            Ruled
          </button>
          <button
            type="button"
            onClick={() => handlePatternChange('grid')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${pattern === 'grid' ? 'bg-slate-800 text-amber-400' : 'text-slate-400 hover:text-white'}`}
          >
            Grid
          </button>
          <button
            type="button"
            onClick={() => handlePatternChange('dotted')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${pattern === 'dotted' ? 'bg-slate-800 text-amber-400' : 'text-slate-400 hover:text-white'}`}
          >
            Dotted
          </button>
          <button
            type="button"
            onClick={() => handlePatternChange('blank')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${pattern === 'blank' ? 'bg-slate-800 text-amber-400' : 'text-slate-400 hover:text-white'}`}
          >
            Blank
          </button>
        </div>

        {/* Utilities: Undo, Redo, Upload Background Scan, Clear */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => engineRef.current?.undo()}
            className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300"
            title="Undo"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => engineRef.current?.redo()}
            className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300"
            title="Redo"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
          <label className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 cursor-pointer" title="Annotate PDF or Image Scan">
            <Upload className="w-3.5 h-3.5" />
            <input type="file" accept="image/*,.pdf" onChange={handleImageUpload} className="hidden" />
          </label>
          <button
            type="button"
            onClick={() => engineRef.current?.clear()}
            className="p-1.5 rounded-lg bg-slate-950 hover:bg-rose-950 hover:text-rose-400 border border-slate-800 text-slate-400 transition-colors"
            title="Clear Page"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* AI Handwriting Transcription Alert Banner */}
      {recognizedText && (
        <div className="bg-indigo-950/80 border-b border-indigo-800/80 px-4 py-2.5 text-xs flex items-center justify-between text-indigo-200">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
            <span><strong>AI Transcription:</strong> {recognizedText}</span>
          </div>
          <button
            type="button"
            onClick={() => setRecognizedText(null)}
            className="text-indigo-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Drawing Canvas Area */}
      <div className="relative w-full overflow-hidden bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl bg-white rounded-lg shadow-2xl overflow-hidden aspect-[4/3] relative">
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="w-full h-full touch-none cursor-crosshair block"
          />
        </div>
      </div>

      {/* Footer bar */}
      <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
        <span>Handwritten Engine v2.0 • Pressure & Stylus Enabled</span>
        <span>Canvas states stored in Firebase Storage</span>
      </div>
    </div>
  );
}
