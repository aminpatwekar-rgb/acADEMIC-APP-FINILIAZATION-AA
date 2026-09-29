import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Shield,
  ShieldAlert,
  AlertTriangle,
  Lock,
  Eye,
  Clock,
  CheckCircle2,
  History,
  Mic,
  MicOff,
  Image as ImageIcon,
  Check,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Sigma,
  Sparkles,
  SpellCheck,
  Type
} from 'lucide-react';
import { RenderMathText } from '../math/RenderMathText';

export interface CheatViolation {
  id: string;
  type: 'copy' | 'paste' | 'cut' | 'contextmenu' | 'drag' | 'tab_switch' | 'blur' | 'shortcut';
  message: string;
  timestamp: string;
}

export interface TypedInsertedImage {
  id: string;
  url: string;
  caption: string;
  order: number;
}

interface TypedEditorProps {
  value: string;
  onChange: (value: string) => void;
  violations?: CheatViolation[];
  onViolationsChange?: (violations: CheatViolation[]) => void;
  images?: TypedInsertedImage[];
  onImagesChange?: (images: TypedInsertedImage[]) => void;
  readOnly?: boolean;
  minWords?: number;
  placeholder?: string;
  assignmentTitle?: string;
  allowImages?: boolean;
  allowAutocorrect?: boolean;
  allowVoiceTyping?: boolean;
}

export function TypedEditor({
  value,
  onChange,
  violations: externalViolations,
  onViolationsChange,
  images: externalImages = [],
  onImagesChange,
  readOnly = false,
  minWords = 0,
  placeholder = "Begin typing your response directly here. External pasting, text copying, right-clicking, and text dragging are strictly locked.",
  assignmentTitle,
  allowImages = true,
  allowAutocorrect = true,
  allowVoiceTyping = true,
}: TypedEditorProps) {
  const [internalViolations, setInternalViolations] = useState<CheatViolation[]>([]);
  const violations = externalViolations || internalViolations;

  const [images, setImages] = useState<TypedInsertedImage[]>(externalImages);
  const [lastWarning, setLastWarning] = useState<string | null>(null);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showEquationPicker, setShowEquationPicker] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newImageCaption, setNewImageCaption] = useState('');

  // Voice typing state
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Spellcheck state
  const [spellCheckEnabled, setSpellCheckEnabled] = useState(true);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const words = value.trim() ? value.trim().split(/\s+/).length : 0;
  const chars = value.length;

  // Sync external images if provided
  useEffect(() => {
    if (externalImages) {
      setImages(externalImages);
    }
  }, [externalImages]);

  // Check speech recognition support
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setVoiceSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript + ' ';
          }
        }
        if (transcript) {
          onChange(value + (value.endsWith(' ') || value === '' ? '' : ' ') + transcript);
        }
      };

      recognition.onerror = (e: any) => {
        console.warn('Speech recognition error:', e.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [value, onChange]);

  const toggleVoiceTyping = () => {
    if (!allowVoiceTyping || !voiceSupported) return;
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (err) {
        console.warn('Could not start speech recognition:', err);
      }
    }
  };

  const triggerViolation = useCallback((type: CheatViolation['type'], message: string) => {
    if (readOnly) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const newViolation: CheatViolation = {
      id: Math.random().toString(36).substring(2, 9),
      type,
      message,
      timestamp: timeStr,
    };

    const updated = [...violations, newViolation];
    if (onViolationsChange) {
      onViolationsChange(updated);
    } else {
      setInternalViolations(updated);
    }

    setLastWarning(message);
    setTimeout(() => {
      setLastWarning(null);
    }, 4500);
  }, [readOnly, violations, onViolationsChange]);

  // DOM Event Listeners for strict anti-cheat security locking
  useEffect(() => {
    if (readOnly) return;

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      triggerViolation('copy', 'Clipboard copy blocked. Copying text is prohibited.');
    };

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      triggerViolation('paste', 'External paste blocked. Deliverables must be typed directly.');
    };

    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      triggerViolation('cut', 'Clipboard cut blocked.');
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      triggerViolation('contextmenu', 'Right-click context menu locked to prevent unauthorized inspection/paste.');
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerViolation('tab_switch', 'Focus lost: Tab switch or window minimizing detected.');
      }
    };

    const handleWindowBlur = () => {
      triggerViolation('blur', 'Window lost focus: Application blurred or external program opened.');
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const isModifier = e.ctrlKey || e.metaKey;
      if (isModifier) {
        const key = e.key.toLowerCase();
        if (key === 'v') {
          e.preventDefault();
          e.stopPropagation();
          triggerViolation('paste', 'Keyboard shortcut paste (Cmd/Ctrl + V) blocked.');
        } else if (key === 'c') {
          e.preventDefault();
          e.stopPropagation();
          triggerViolation('copy', 'Keyboard shortcut copy (Cmd/Ctrl + C) blocked.');
        } else if (key === 'x') {
          e.preventDefault();
          e.stopPropagation();
          triggerViolation('cut', 'Keyboard shortcut cut (Cmd/Ctrl + X) blocked.');
        }
      }
    };

    const target = textareaRef.current;
    if (target) {
      target.addEventListener('copy', handleCopy);
      target.addEventListener('paste', handlePaste);
      target.addEventListener('cut', handleCut);
      target.addEventListener('contextmenu', handleContextMenu);
    }

    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('cut', handleCut);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      if (target) {
        target.removeEventListener('copy', handleCopy);
        target.removeEventListener('paste', handlePaste);
        target.removeEventListener('cut', handleCut);
        target.removeEventListener('contextmenu', handleContextMenu);
      }
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [readOnly, triggerViolation]);

  // Autocorrect handler for common scientific and English typos
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    let newVal = e.target.value;

    if (allowAutocorrect && !readOnly) {
      const typos: Record<string, string> = {
        'teh ': 'the ',
        'adn ': 'and ',
        'recieve ': 'receive ',
        'seperate ': 'separate ',
        'definately ': 'definitely ',
        'occured ': 'occurred ',
        'theorm ': 'theorem ',
        'lemam ': 'lemma ',
        'algoritm ': 'algorithm ',
        'polynomal ': 'polynomial '
      };

      for (const [typo, replacement] of Object.entries(typos)) {
        if (newVal.endsWith(typo)) {
          newVal = newVal.slice(0, -typo.length) + replacement;
        }
      }
    }

    onChange(newVal);
  };

  // Insert Equation Helper
  const handleInsertEquation = (latex: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(value + ' $$' + latex + '$$ ');
      return;
    }
    const start = textarea.selectionStart || value.length;
    const end = textarea.selectionEnd || value.length;
    const equationText = ` $$${latex}$$ `;
    const updated = value.substring(0, start) + equationText + value.substring(end);
    onChange(updated);
    setShowEquationPicker(false);
  };

  // Image Upload / Insertion Helper
  const handleAddImage = (url: string, caption: string) => {
    if (!url.trim()) return;
    const newImg: TypedInsertedImage = {
      id: Math.random().toString(36).substring(2, 9),
      url: url.trim(),
      caption: caption.trim() || 'Figure 1',
      order: images.length + 1
    };
    const updated = [...images, newImg];
    setImages(updated);
    if (onImagesChange) onImagesChange(updated);
    setNewImageUrl('');
    setNewImageCaption('');
    setShowImageModal(false);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      handleAddImage(base64, file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleMoveImage = (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= images.length) return;
    const nextImages = [...images];
    const temp = nextImages[idx];
    nextImages[idx] = nextImages[targetIdx];
    nextImages[targetIdx] = temp;
    nextImages.forEach((img, i) => (img.order = i + 1));
    setImages(nextImages);
    if (onImagesChange) onImagesChange(nextImages);
  };

  const handleRemoveImage = (id: string) => {
    const nextImages = images.filter(img => img.id !== id);
    nextImages.forEach((img, i) => (img.order = i + 1));
    setImages(nextImages);
    if (onImagesChange) onImagesChange(nextImages);
  };

  const handleUpdateImageCaption = (id: string, caption: string) => {
    const nextImages = images.map(img => img.id === id ? { ...img, caption } : img);
    setImages(nextImages);
    if (onImagesChange) onImagesChange(nextImages);
  };

  const COMMON_EQUATIONS = [
    { label: 'Fraction', latex: '\\frac{a}{b}' },
    { label: 'Square Root', latex: '\\sqrt{x^2 + y^2}' },
    { label: 'Integral', latex: '\\int_{a}^{b} f(x) dx' },
    { label: 'Summation', latex: '\\sum_{i=1}^{n} x_i' },
    { label: 'Limit', latex: '\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1' },
    { label: 'Matrix', latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}' },
    { label: 'Gradient', latex: '\\nabla f(x, y) = \\mathbf{0}' },
    { label: 'Probability', latex: 'P(A \\mid B) = \\frac{P(B \\mid A)P(A)}{P(B)}' },
  ];

  return (
    <div className="w-full flex flex-col bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
      {/* Anti-Cheat Header Banner */}
      <div className="bg-slate-900 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-tight">ONYX Locked Typed Editor</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Anti-Cheat Active
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Copying, pasting, right-click menu, and text dragging are strictly blocked and monitored.
            </p>
          </div>
        </div>

        {/* Violations Counter */}
        <div className="flex items-center gap-2">
          {violations.length > 0 ? (
            <button
              type="button"
              onClick={() => setShowLogModal(true)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-medium hover:bg-amber-500/30 transition-colors cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{violations.length} Infraction{violations.length > 1 ? 's' : ''} Flagged</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">
              <Shield className="w-3.5 h-3.5" />
              <span>No Violations</span>
            </div>
          )}

          {violations.length > 0 && (
            <button
              type="button"
              onClick={() => setShowLogModal(true)}
              className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="View violation audit log"
            >
              <History className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Toolbar for Voice, Images, Equations, Spellcheck */}
      {!readOnly && (
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            {/* Voice Typing Button */}
            {allowVoiceTyping && (
              <button
                type="button"
                onClick={toggleVoiceTyping}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border font-medium transition-colors cursor-pointer ${
                  isListening
                    ? 'bg-rose-500 text-white border-rose-600 animate-pulse'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                }`}
                title={voiceSupported ? 'Click to dictate text' : 'Voice typing not supported in this browser'}
              >
                {isListening ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5 text-slate-400" />}
                <span>{isListening ? 'Listening...' : 'Voice Typing'}</span>
              </button>
            )}

            {/* Insert Equation */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowEquationPicker(!showEquationPicker)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <Sigma className="w-3.5 h-3.5 text-blue-500" />
                <span>Insert Equation</span>
              </button>

              {showEquationPicker && (
                <div className="absolute left-0 top-full mt-1 z-30 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-3 space-y-2 animate-in zoom-in-95">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Common Equations</div>
                  <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                    {COMMON_EQUATIONS.map((eq, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleInsertEquation(eq.latex)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-left hover:bg-blue-50 dark:hover:bg-blue-950/40 text-[11px] font-mono truncate cursor-pointer"
                      >
                        <div className="font-sans font-semibold text-[10px] text-slate-500">{eq.label}</div>
                        <div className="text-blue-600 dark:text-blue-400 truncate">{eq.latex}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Insert Image */}
            {allowImages && (
              <button
                type="button"
                onClick={() => setShowImageModal(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <ImageIcon className="w-3.5 h-3.5 text-emerald-500" />
                <span>Add Figure / Image ({images.length})</span>
              </button>
            )}

            {/* Spellcheck Toggle */}
            <button
              type="button"
              onClick={() => setSpellCheckEnabled(!spellCheckEnabled)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border cursor-pointer ${
                spellCheckEnabled
                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 border-blue-200 dark:border-blue-900'
                  : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-800'
              }`}
            >
              <SpellCheck className="w-3.5 h-3.5" />
              <span>Spellcheck: {spellCheckEnabled ? 'On' : 'Off'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            {allowAutocorrect && (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <Check className="w-3 h-3" /> Autocorrect Active
              </span>
            )}
          </div>
        </div>
      )}

      {/* Real-time warning alert toast */}
      {lastWarning && (
        <div className="bg-rose-50 dark:bg-rose-950/50 border-b border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 px-4 py-2 text-xs flex items-center justify-between animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span className="font-medium">{lastWarning}</span>
          </div>
          <span className="text-[11px] text-rose-600 dark:text-rose-400 font-mono">Infraction Logged</span>
        </div>
      )}

      {/* Editor Body */}
      <div className="relative p-4 flex-1 min-h-[340px] flex flex-col">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleTextChange}
          readOnly={readOnly}
          placeholder={placeholder}
          onCopy={(e) => {
            e.preventDefault();
            triggerViolation('copy', 'Copy attempt blocked.');
          }}
          onPaste={(e) => {
            e.preventDefault();
            triggerViolation('paste', 'Paste attempt blocked.');
          }}
          onCut={(e) => {
            e.preventDefault();
            triggerViolation('cut', 'Cut attempt blocked.');
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            triggerViolation('contextmenu', 'Right click context menu blocked.');
          }}
          onDragStart={(e) => {
            e.preventDefault();
            triggerViolation('drag', 'Text drag blocked.');
          }}
          onDrop={(e) => {
            e.preventDefault();
            triggerViolation('drag', 'Text drop blocked.');
          }}
          className="w-full flex-1 bg-transparent resize-y outline-hidden text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 leading-relaxed font-sans text-sm sm:text-base border-0 focus:ring-0 select-text p-2"
          style={{ minHeight: '300px' }}
          autoComplete="off"
          autoCorrect={allowAutocorrect ? 'on' : 'off'}
          spellCheck={spellCheckEnabled}
        />
      </div>

      {/* Render Inserted Images with Captions & Ordering */}
      {images.length > 0 && (
        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Attached Figures & Diagrams ({images.length})
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {images.map((img, idx) => (
              <div
                key={img.id}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 shadow-xs"
              >
                <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <img src={img.url} alt={img.caption} className="w-full h-full object-cover" />
                  <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-black/60 text-white">
                    Figure {img.order}
                  </span>
                </div>

                {!readOnly ? (
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      value={img.caption}
                      onChange={e => handleUpdateImageCaption(img.id, e.target.value)}
                      placeholder="Add figure caption..."
                      className="w-full px-2 py-1 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px]"
                    />
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveImage(idx, 'up')}
                          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                          title="Move up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === images.length - 1}
                          onClick={() => handleMoveImage(idx, 'down')}
                          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                          title="Move down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(img.id)}
                        className="text-rose-500 hover:text-rose-600 p-1 cursor-pointer"
                        title="Remove image"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 italic">
                    {img.caption || `Figure ${img.order}`}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Editor Status Footer */}
      <div className="bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-4">
          <span><strong>{words}</strong> words</span>
          <span><strong>{chars}</strong> characters</span>
          {minWords > 0 && (
            <span className={words >= minWords ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
              Min required: {minWords} ({words >= minWords ? 'Met' : `${minWords - words} remaining`})
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-slate-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Direct Keypress Tracking
          </span>
          <span className="flex items-center gap-1 font-mono text-[11px] text-slate-400">
            <Eye className="w-3.5 h-3.5" />
            Integrity Guard
          </span>
        </div>
      </div>

      {/* Add Image Modal */}
      {showImageModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-5 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Insert Figure / Diagram</h3>
            <p className="text-xs text-slate-500">Attach supporting figures or diagram images to your typed essay.</p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Upload File (PNG, JPG)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
              </div>

              <div className="text-center text-[11px] text-slate-400">— OR Image URL —</div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Image URL</label>
                <input
                  type="url"
                  value={newImageUrl}
                  onChange={e => setNewImageUrl(e.target.value)}
                  placeholder="https://example.com/diagram.png"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Figure Caption</label>
                <input
                  type="text"
                  value={newImageCaption}
                  onChange={e => setNewImageCaption(e.target.value)}
                  placeholder="e.g. Figure 1: State Machine Transition Diagram"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowImageModal(false)}
                className="px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleAddImage(newImageUrl, newImageCaption)}
                className="px-4 py-1.5 rounded-lg bg-[#005fb8] text-white text-xs font-semibold cursor-pointer"
              >
                Attach Image
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Log Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-lg w-full p-5 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-500" />
                <h3 className="font-semibold text-slate-900 dark:text-white">Security & Infraction Audit Log</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowLogModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              The following unauthorized actions were prevented and are persisted with your deliverable for instructor review:
            </p>

            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 rounded-lg border border-slate-100 dark:border-slate-800">
              {violations.map((v) => (
                <div key={v.id} className="p-3 text-xs flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold uppercase tracking-wider text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                        {v.type}
                      </span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">{v.message}</span>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 shrink-0 flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3" />
                    {v.timestamp}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowLogModal(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-medium cursor-pointer"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
