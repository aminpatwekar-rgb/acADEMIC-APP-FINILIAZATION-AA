import React, { useState } from 'react';
import {
  QuizQuestion,
  QuizQuestionAnswerKey,
  QuestionType,
  QuestionDifficulty
} from '../../lib/firebase/firestoreService';
import {
  aiService,
  AiServiceUnavailableError,
  AiMalformedResponseError
} from '../../lib/ai/aiService';
import {
  Sparkles,
  UploadCloud,
  FileText,
  AlertCircle,
  CheckCircle2,
  RotateCw,
  Plus,
  Trash2,
  Check,
  X,
  FileCheck,
  ShieldAlert,
  Sliders,
  Layers,
  ArrowRight,
  BookOpen
} from 'lucide-react';

interface AiGeneratorPanelProps {
  existingQuestions: QuizQuestion[];
  onAddQuestions: (questions: QuizQuestion[], answerKeys: QuizQuestionAnswerKey[]) => void;
  onClose?: () => void;
}

export function AiGeneratorPanel({
  existingQuestions,
  onAddQuestions,
  onClose
}: AiGeneratorPanelProps) {
  // Inputs
  const [studyMaterial, setStudyMaterial] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedFileSize, setUploadedFileSize] = useState<string | null>(null);
  const [topicFocus, setTopicFocus] = useState('');
  const [questionCount, setQuestionCount] = useState<number>(8);
  const [difficulty, setDifficulty] = useState<QuestionDifficulty | 'mixed'>('mixed');
  const [includeExplanations, setIncludeExplanations] = useState(true);

  // Question Types selection
  const [selectedTypes, setSelectedTypes] = useState<Record<QuestionType, boolean>>({
    mcq: true,
    multi_select: false,
    true_false: true,
    fill_blank: false,
    short_answer: true,
    essay: false
  });

  // State for Generation
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingProgress, setGeneratingProgress] = useState<string | null>(null);
  const [errorState, setErrorState] = useState<{ message: string; code?: string } | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<number>(0);

  // Staged generated items before adding to quiz
  const [stagedQuestions, setStagedQuestions] = useState<QuizQuestion[]>([]);
  const [stagedAnswerKeys, setStagedAnswerKeys] = useState<QuizQuestionAnswerKey[]>([]);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);

  // File Upload Parser (TXT, PDF, DOCX, PPTX)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    setUploadedFileName(file.name);
    setUploadedFileSize(`${sizeMb} MB`);
    setErrorState(null);

    const ext = file.name.split('.').pop()?.toLowerCase();

    // Plain text reading
    if (ext === 'txt') {
      const reader = new FileReader();
      reader.onload = ev => {
        const text = ev.target?.result as string;
        setStudyMaterial(text || '');
      };
      reader.readAsText(file);
      return;
    }

    // PDF, DOCX, PPTX text extraction
    try {
      const arrayBuffer = await file.arrayBuffer();
      const decoder = new TextDecoder('utf-8', { fatal: false });
      const rawText = decoder.decode(arrayBuffer);

      // Clean ASCII readable text strings
      const cleaned = rawText
        .replace(/[^\x20-\x7E\t\n\r]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const extractedSample = cleaned.slice(0, 15000);
      setStudyMaterial(
        `[Extracted from ${file.name}]\n\n${extractedSample}`
      );
    } catch {
      setStudyMaterial(
        `[Document file: ${file.name}]\nPlease type or paste specific chapter notes and lecture context below.`
      );
    }
  };

  // Main Generation Handler
  const handleGenerate = async () => {
    const typesToGenerate = (Object.keys(selectedTypes) as QuestionType[]).filter(
      t => selectedTypes[t]
    );

    if (typesToGenerate.length === 0) {
      setErrorState({ message: 'Please select at least one question type.' });
      return;
    }

    if (!studyMaterial.trim() && !topicFocus.trim()) {
      setErrorState({
        message: 'Please provide study material text, upload a document, or specify a topic focus.'
      });
      return;
    }

    setIsGenerating(true);
    setErrorState(null);
    setDuplicateWarning(0);
    setGeneratingProgress('Synthesizing academically aligned questions...');

    try {
      const result = await aiService.generateQuestions({
        material: studyMaterial,
        count: Math.min(30, Math.max(1, questionCount)),
        difficulty,
        types: typesToGenerate,
        topic: topicFocus,
        includeExplanations,
        existingQuestions
      });

      setStagedQuestions(result.questions);
      setStagedAnswerKeys(result.answerKeys);
      setDuplicateWarning(result.filteredDuplicatesCount);
    } catch (err: any) {
      console.error(err);
      if (err instanceof AiServiceUnavailableError) {
        setErrorState({
          message: err.message,
          code: err.code
        });
      } else if (err instanceof AiMalformedResponseError) {
        setErrorState({
          message: `Malformed AI Response: ${err.message}`,
          code: 'MALFORMED_RESPONSE'
        });
      } else {
        setErrorState({
          message: err?.message || 'Failed to generate assessment questions.',
          code: 'GENERATION_ERROR'
        });
      }
    } finally {
      setIsGenerating(false);
      setGeneratingProgress(null);
    }
  };

  // Individual Question Regeneration
  const handleRegenerateSingle = async (idx: number) => {
    const target = stagedQuestions[idx];
    if (!target) return;

    setRegeneratingIndex(idx);
    setErrorState(null);

    try {
      const refreshed = await aiService.regenerateQuestion(
        target,
        studyMaterial || topicFocus || target.question,
        [...existingQuestions, ...stagedQuestions]
      );

      setStagedQuestions(prev =>
        prev.map((q, i) => (i === idx ? refreshed.question : q))
      );
      setStagedAnswerKeys(prev =>
        prev.map((k, i) => (i === idx ? refreshed.answerKey : k))
      );
    } catch (err: any) {
      setErrorState({
        message: `Failed to regenerate question #${idx + 1}: ${err.message}`,
        code: 'REGENERATE_FAILED'
      });
    } finally {
      setRegeneratingIndex(null);
    }
  };

  // Remove single staged question
  const handleRemoveStaged = (idx: number) => {
    setStagedQuestions(prev => prev.filter((_, i) => i !== idx));
    setStagedAnswerKeys(prev => prev.filter((_, i) => i !== idx));
  };

  // Commit staged questions to active quiz
  const handleCommitAll = () => {
    if (stagedQuestions.length === 0) return;
    onAddQuestions(stagedQuestions, stagedAnswerKeys);
    setStagedQuestions([]);
    setStagedAnswerKeys([]);
    if (onClose) onClose();
  };

  const wordCount = studyMaterial.trim() ? studyMaterial.trim().split(/\s+/).length : 0;

  return (
    <div className="space-y-6">
      {/* ERROR / UNAVAILABILITY BANNER */}
      {errorState && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-3 animate-in fade-in duration-150">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold">AI Assessment Engine Notice</h4>
            <p>{errorState.message}</p>
            {errorState.code === 'API_KEY_MISSING' && (
              <p className="text-[11px] text-rose-700/80 dark:text-rose-300/80 pt-1">
                Tip: Ensure <code className="px-1 py-0.5 rounded bg-rose-100 dark:bg-rose-900 font-mono">GEMINI_API_KEY</code> is set in your environment secrets.
              </p>
            )}
          </div>
        </div>
      )}

      {/* DUPLICATE PREVENTION NOTICE */}
      {duplicateWarning > 0 && (
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Duplicate Prevention Active:</strong> Filtered out {duplicateWarning}{' '}
            duplicate {duplicateWarning === 1 ? 'question' : 'questions'} that already matched existing assessment items.
          </span>
        </div>
      )}

      {/* DASHED DRAG & DROP UPLOAD BOX (MATCHING SCREENSHOT 2) */}
      <div className="p-8 sm:p-10 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-center space-y-3 bg-slate-50/50 dark:bg-slate-950/40 transition-colors hover:border-slate-300 dark:hover:border-slate-700">
        <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center mx-auto shadow-2xs">
          <UploadCloud className="w-5 h-5" />
        </div>

        <div>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Drop notes here or upload
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            PDF, DOCX, PPTX or TXT — up to 20 MB each
          </p>
        </div>

        {uploadedFileName ? (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 text-xs font-semibold text-blue-700 dark:text-blue-300">
            <FileCheck className="w-3.5 h-3.5" />
            <span>{uploadedFileName}</span>
            <span className="text-[11px] opacity-70">({uploadedFileSize})</span>
            <button
              type="button"
              onClick={() => {
                setUploadedFileName(null);
                setUploadedFileSize(null);
                setStudyMaterial('');
              }}
              className="hover:text-rose-500 ml-1 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <label className="inline-block px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer shadow-2xs transition-colors">
            <span>Choose files</span>
            <input
              type="file"
              className="hidden"
              accept=".pdf,.docx,.pptx,.txt"
              onChange={handleFileUpload}
            />
          </label>
        )}
      </div>

      {/* STUDY MATERIAL TEXTAREA (MATCHING SCREENSHOT 2) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
            Study material
          </label>
          <span className="text-[11px] text-slate-400 font-mono">
            {wordCount} words
          </span>
        </div>
        <textarea
          rows={4}
          value={studyMaterial}
          onChange={e => setStudyMaterial(e.target.value)}
          placeholder="Paste the chapter, notes or syllabus text the questions should come from."
          className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* CONTROLS ROW: QUESTIONS COUNT, DIFFICULTY, TOPIC FOCUS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
            Questions (Up to 30)
          </label>
          <input
            type="number"
            min="1"
            max="30"
            value={questionCount}
            onChange={e => setQuestionCount(Math.min(30, Math.max(1, parseInt(e.target.value, 10) || 1)))}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
            Difficulty
          </label>
          <select
            value={difficulty}
            onChange={e => setDifficulty(e.target.value as any)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
          >
            <option value="mixed">Mixed</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
            Topic focus (optional)
          </label>
          <input
            type="text"
            value={topicFocus}
            onChange={e => setTopicFocus(e.target.value)}
            placeholder="Photosynthesis, Raft consensus..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
          />
        </div>
      </div>

      {/* QUESTION TYPES SELECTION CHECKBOXES */}
      <div className="space-y-2">
        <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
          Question types
        </span>
        <div className="flex items-center gap-4 flex-wrap text-xs text-slate-700 dark:text-slate-300">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedTypes.mcq}
              onChange={e => setSelectedTypes(prev => ({ ...prev, mcq: e.target.checked }))}
              className="w-4 h-4 accent-blue-600 rounded"
            />
            <span>Multiple choice</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedTypes.multi_select}
              onChange={e => setSelectedTypes(prev => ({ ...prev, multi_select: e.target.checked }))}
              className="w-4 h-4 accent-blue-600 rounded"
            />
            <span>Multiple correct</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedTypes.true_false}
              onChange={e => setSelectedTypes(prev => ({ ...prev, true_false: e.target.checked }))}
              className="w-4 h-4 accent-blue-600 rounded"
            />
            <span>True / False</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedTypes.fill_blank}
              onChange={e => setSelectedTypes(prev => ({ ...prev, fill_blank: e.target.checked }))}
              className="w-4 h-4 accent-blue-600 rounded"
            />
            <span>Fill in the blank</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedTypes.short_answer}
              onChange={e => setSelectedTypes(prev => ({ ...prev, short_answer: e.target.checked }))}
              className="w-4 h-4 accent-blue-600 rounded"
            />
            <span>Short answer</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedTypes.essay}
              onChange={e => setSelectedTypes(prev => ({ ...prev, essay: e.target.checked }))}
              className="w-4 h-4 accent-blue-600 rounded"
            />
            <span>Essay</span>
          </label>
        </div>
      </div>

      {/* INCLUDE ANSWER EXPLANATIONS TOGGLE */}
      <div>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
          <input
            type="checkbox"
            checked={includeExplanations}
            onChange={e => setIncludeExplanations(e.target.checked)}
            className="w-4 h-4 accent-blue-600 rounded"
          />
          <span>Include answer explanations</span>
        </label>
      </div>

      {/* MAIN GENERATE ACTION BUTTON */}
      <button
        type="button"
        disabled={isGenerating}
        onClick={handleGenerate}
        className="w-full py-3 rounded-xl bg-brand hover:bg-brand-hover] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
      >
        <Sparkles className="w-4 h-4" />
        <span>{isGenerating ? generatingProgress || 'Generating...' : `Generate ${questionCount} questions`}</span>
      </button>

      {/* STAGED GENERATED QUESTIONS REVIEW & INDIVIDUAL REGENERATION */}
      {stagedQuestions.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Generated Assessment Questions ({stagedQuestions.length})
              </h3>
              <p className="text-xs text-slate-500">
                Review, individually regenerate, or commit questions to the assessment.
              </p>
            </div>

            <button
              type="button"
              onClick={handleCommitAll}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-colors"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>Add All {stagedQuestions.length} to Assessment</span>
            </button>
          </div>

          <div className="space-y-3">
            {stagedQuestions.map((q, idx) => {
              const isItemRegenerating = regeneratingIndex === idx;

              return (
                <div
                  key={q.id}
                  className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 relative overflow-hidden shadow-2xs"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-mono text-[10px] font-semibold uppercase">
                        {q.type.replace('_', ' ')}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-semibold capitalize">
                        {q.difficulty}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {q.points} mark
                      </span>
                    </div>

                    {/* Actions: Regenerate Individual Question & Remove */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={isItemRegenerating}
                        onClick={() => handleRegenerateSingle(idx)}
                        title="Regenerate this specific question"
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium cursor-pointer transition-colors disabled:opacity-50"
                      >
                        <RotateCw className={`w-3.5 h-3.5 ${isItemRegenerating ? 'animate-spin text-blue-600' : ''}`} />
                        <span>Regenerate</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveStaged(idx)}
                        title="Discard question"
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm font-medium text-slate-900 dark:text-white">
                    {q.question}
                  </p>

                  {/* Render Choices */}
                  {q.options && q.options.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {q.options.map((opt, optIdx) => {
                        const isCorrect = q.correctIndex === optIdx || (q.correctIndices || []).includes(optIdx);
                        return (
                          <div
                            key={optIdx}
                            className={`px-3 py-1.5 rounded-xl border text-xs flex items-center gap-2 ${
                              isCorrect
                                ? 'border-emerald-500/60 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 font-semibold'
                                : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px]">
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <span className="truncate">{opt}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {q.type === 'true_false' && (
                    <div className="flex items-center gap-2 pt-1 text-xs">
                      <span className="text-slate-500">Correct answer:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {q.correctIndex === 1 ? 'True' : 'False'}
                      </span>
                    </div>
                  )}

                  {q.explanation && (
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
                      <strong className="text-slate-800 dark:text-slate-200">Explanation: </strong>
                      {q.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
