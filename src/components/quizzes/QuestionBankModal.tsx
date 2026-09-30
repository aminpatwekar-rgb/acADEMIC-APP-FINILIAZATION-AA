import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  QuestionBankItem,
  QuizQuestion,
  QuizQuestionAnswerKey,
  QuestionType,
  QuestionDifficulty,
  subscribeQuestionBank,
  saveToQuestionBank,
  updateQuestionBankItem,
  deleteQuestionBankItem
} from '../../lib/firebase/firestoreService';
import {
  BookOpen,
  Search,
  Filter,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Layers,
  Sparkles,
  ArrowRight,
  FolderPlus,
  Tag,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface QuestionBankModalProps {
  onClose: () => void;
  onReuseQuestion: (question: QuizQuestion, answerKey?: QuizQuestionAnswerKey) => void;
  initialQuestionToSave?: QuizQuestion | null;
}

export function QuestionBankModal({
  onClose,
  onReuseQuestion,
  initialQuestionToSave
}: QuestionBankModalProps) {
  const { user } = useAuth();
  const [items, setItems] = useState<QuestionBankItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');

  // Creation / Editing State
  const [isCreating, setIsCreating] = useState(Boolean(initialQuestionToSave));
  const [editingItem, setEditingItem] = useState<QuestionBankItem | null>(null);

  // Form Fields
  const [formStatement, setFormStatement] = useState(initialQuestionToSave?.question || '');
  const [formType, setFormType] = useState<QuestionType>(initialQuestionToSave?.type || 'mcq');
  const [formDifficulty, setFormDifficulty] = useState<QuestionDifficulty>(
    initialQuestionToSave?.difficulty || 'medium'
  );
  const [formPoints, setFormPoints] = useState(initialQuestionToSave?.points || 1);
  const [formTopic, setFormTopic] = useState('');
  const [formSubject, setFormSubject] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formExplanation, setFormExplanation] = useState(initialQuestionToSave?.explanation || '');
  const [formOptions, setFormOptions] = useState<string[]>(
    initialQuestionToSave?.options || ['Option 1', 'Option 2', 'Option 3', 'Option 4']
  );
  const [formCorrectIndex, setFormCorrectIndex] = useState(initialQuestionToSave?.correctIndex ?? 0);

  // Toast
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const unsub = subscribeQuestionBank(data => {
      setItems(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Collect unique tags
  const allTags = Array.from(
    new Set(items.flatMap(item => item.tags || []).filter(Boolean))
  );

  // Filter items
  const filteredItems = items.filter(item => {
    if (filterDifficulty !== 'all' && item.difficulty !== filterDifficulty) return false;
    if (filterType !== 'all' && item.type !== filterType) return false;
    if (selectedTag !== 'all' && !(item.tags || []).includes(selectedTag)) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchQ = (item.question.question || '').toLowerCase().includes(q);
      const matchTopic = (item.topic || '').toLowerCase().includes(q);
      const matchSubject = (item.subject || '').toLowerCase().includes(q);
      const matchTags = (item.tags || []).some(t => t.toLowerCase().includes(q));
      if (!matchQ && !matchTopic && !matchSubject && !matchTags) return false;
    }
    return true;
  });

  // Save new or updated question
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formStatement.trim()) {
      showToast('Question statement is required.');
      return;
    }

    const tagsArray = formTags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const questionObj: QuizQuestion = {
      id: editingItem ? editingItem.question.id : `q-bank-${Date.now()}`,
      type: formType,
      question: formStatement.trim(),
      points: Number(formPoints) || 1,
      difficulty: formDifficulty,
      options: formType === 'mcq' || formType === 'multi_select' ? formOptions : undefined,
      correctIndex: formType === 'mcq' || formType === 'true_false' ? formCorrectIndex : undefined,
      explanation: formExplanation.trim()
    };

    const answerKeyObj: QuizQuestionAnswerKey = {
      questionId: questionObj.id,
      correctIndex: questionObj.correctIndex,
      explanation: formExplanation.trim()
    };

    try {
      if (editingItem) {
        await updateQuestionBankItem(editingItem.id, {
          question: questionObj,
          answerKey: answerKeyObj,
          topic: formTopic.trim() || 'General',
          subject: formSubject.trim() || 'Curriculum',
          difficulty: formDifficulty,
          type: formType,
          tags: tagsArray
        });
        showToast('Question updated in bank.');
        setEditingItem(null);
      } else {
        await saveToQuestionBank({
          question: questionObj,
          answerKey: answerKeyObj,
          topic: formTopic.trim() || 'General',
          subject: formSubject.trim() || 'Curriculum',
          difficulty: formDifficulty,
          type: formType,
          tags: tagsArray,
          createdBy: user?.uid || 'instructor'
        });
        showToast('Question saved to repository.');
        setIsCreating(false);
      }

      // Reset form
      setFormStatement('');
      setFormTopic('');
      setFormSubject('');
      setFormTags('');
      setFormExplanation('');
    } catch (err: any) {
      showToast(err.message || 'Error saving to question bank.');
    }
  };

  const handleEditClick = (item: QuestionBankItem) => {
    setEditingItem(item);
    setFormStatement(item.question.question);
    setFormType(item.type);
    setFormDifficulty(item.difficulty);
    setFormPoints(item.question.points || 1);
    setFormTopic(item.topic || '');
    setFormSubject(item.subject || '');
    setFormTags((item.tags || []).join(', '));
    setFormExplanation(item.question.explanation || item.answerKey?.explanation || '');
    setFormOptions(item.question.options || ['Option 1', 'Option 2', 'Option 3', 'Option 4']);
    setFormCorrectIndex(item.question.correctIndex ?? 0);
  };

  const handleDeleteClick = async (id: string) => {
    if (confirm('Are you sure you want to delete this question from the bank?')) {
      try {
        await deleteQuestionBankItem(id);
        showToast('Question removed from repository.');
      } catch (err: any) {
        showToast(err.message || 'Error deleting question.');
      }
    }
  };

  const handleReuse = (item: QuestionBankItem) => {
    const freshId = `q-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const clonedQuestion: QuizQuestion = {
      ...item.question,
      id: freshId
    };
    const clonedKey: QuizQuestionAnswerKey = {
      ...(item.answerKey || { questionId: freshId }),
      questionId: freshId
    };

    onReuseQuestion(clonedQuestion, clonedKey);
    showToast(`Added "${item.question.question.slice(0, 30)}..." to assessment.`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-5xl max-h-[92vh] flex flex-col bg-card rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Toast */}
        {toast && (
          <div className="absolute top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold shadow-lg">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>{toast}</span>
          </div>
        )}

        {/* TOP BAR */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-brand/10 text-brand flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Institutional Question Bank
              </h2>
              <p className="text-xs text-slate-500">
                Browse, search, edit, and reuse standardized pedagogical items across assessments.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isCreating && !editingItem && (
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand text-white hover:bg-brand-hover] text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>New Item</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MAIN BODY: SPLIT VIEW OR CREATION */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* CREATION / EDITING ACCORDION */}
          {(isCreating || editingItem) && (
            <form
              onSubmit={handleSaveForm}
              className="p-5 rounded-2xl border border-blue-200 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-950/20 space-y-4 animate-in fade-in duration-150"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand dark:text-blue-400">
                  {editingItem ? 'Edit Question Bank Item' : 'Add Question to Repository'}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingItem(null);
                  }}
                  className="text-slate-400 hover:text-slate-700 text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  Question Statement
                </label>
                <textarea
                  rows={2}
                  value={formStatement}
                  onChange={e => setFormStatement(e.target.value)}
                  placeholder="e.g. Explain how Dijkstra's algorithm calculates the shortest path..."
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs sm:text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Type
                  </label>
                  <select
                    value={formType}
                    onChange={e => setFormType(e.target.value as QuestionType)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                  >
                    <option value="mcq">Multiple Choice</option>
                    <option value="true_false">True / False</option>
                    <option value="multi_select">Multi-Select</option>
                    <option value="fill_blank">Fill Blank</option>
                    <option value="short_answer">Short Answer</option>
                    <option value="essay">Essay</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Difficulty
                  </label>
                  <select
                    value={formDifficulty}
                    onChange={e => setFormDifficulty(e.target.value as QuestionDifficulty)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Topic
                  </label>
                  <input
                    type="text"
                    value={formTopic}
                    onChange={e => setFormTopic(e.target.value)}
                    placeholder="Algorithms"
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={formTags}
                    onChange={e => setFormTags(e.target.value)}
                    placeholder="graphs, greedy, midterms"
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Form Options for MCQ */}
              {formType === 'mcq' && (
                <div className="space-y-2">
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Choices (Select the correct option)
                  </label>
                  {formOptions.map((opt, optIdx) => (
                    <div key={optIdx} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="correctOpt"
                        checked={formCorrectIndex === optIdx}
                        onChange={() => setFormCorrectIndex(optIdx)}
                        className="w-4 h-4 accent-blue-600"
                      />
                      <input
                        type="text"
                        value={opt}
                        onChange={e => {
                          const updated = [...formOptions];
                          updated[optIdx] = e.target.value;
                          setFormOptions(updated);
                        }}
                        className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Explanation Field */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Pedagogical Explanation
                </label>
                <input
                  type="text"
                  value={formExplanation}
                  onChange={e => setFormExplanation(e.target.value)}
                  placeholder="Explains why this answer is correct..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingItem(null);
                  }}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-brand text-white text-xs font-semibold shadow-xs"
                >
                  {editingItem ? 'Save Changes' : 'Commit to Bank'}
                </button>
              </div>
            </form>
          )}

          {/* SEARCH & FILTERS BAR */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search questions by text, topic, tag or subject..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={filterDifficulty}
                onChange={e => setFilterDifficulty(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-200 font-medium"
              >
                <option value="all">All Difficulties</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>

              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-200 font-medium"
              >
                <option value="all">All Types</option>
                <option value="mcq">Multiple Choice</option>
                <option value="true_false">True / False</option>
                <option value="multi_select">Multi-Select</option>
                <option value="fill_blank">Fill in Blank</option>
                <option value="short_answer">Short Answer</option>
                <option value="essay">Essay</option>
              </select>
            </div>
          </div>

          {/* TAG CHIPS */}
          {allTags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-semibold text-slate-400 mr-1 flex items-center gap-1">
                <Tag className="w-3 h-3" />
                Tags:
              </span>
              <button
                type="button"
                onClick={() => setSelectedTag('all')}
                className={`px-2.5 py-0.5 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer ${
                  selectedTag === 'all'
                    ? 'bg-brand text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                All
              </button>
              {allTags.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedTag(tag === selectedTag ? 'all' : tag)}
                  className={`px-2.5 py-0.5 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer ${
                    selectedTag === tag
                      ? 'bg-brand text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}

          {/* QUESTIONS LIST */}
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Loading standardized question bank...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-16 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 space-y-2">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                No matching questions in repository
              </p>
              <p className="text-xs text-slate-400">
                {items.length === 0
                  ? 'Your question bank is empty. Click "New Item" or save questions from your assessments.'
                  : 'Try adjusting your filters or search keywords.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map(item => (
                <div
                  key={item.id}
                  className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-card hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-2xs space-y-2.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-mono text-[10px] font-bold uppercase">
                        {item.type.replace('_', ' ')}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-semibold capitalize">
                        {item.difficulty}
                      </span>
                      {item.topic && (
                        <span className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-[10px] font-semibold">
                          {item.topic}
                        </span>
                      )}
                      {(item.tags || []).map(t => (
                        <span key={t} className="text-[10px] text-slate-400">
                          #{t}
                        </span>
                      ))}
                    </div>

                    {/* Actions: Edit, Delete, Reuse */}
                    <div className="flex items-center gap-1.5 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleEditClick(item)}
                        title="Edit repository item"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteClick(item.id)}
                        title="Delete from bank"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleReuse(item)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Insert into Assessment</span>
                      </button>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm font-medium text-slate-900 dark:text-white">
                    {item.question.question}
                  </p>

                  {/* Render Options Preview */}
                  {item.question.options && item.question.options.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-xs">
                      {item.question.options.map((opt, oIdx) => {
                        const isCorrect = item.question.correctIndex === oIdx;
                        return (
                          <div
                            key={oIdx}
                            className={`px-3 py-1 rounded-lg border text-xs flex items-center gap-2 ${
                              isCorrect
                                ? 'border-emerald-500/60 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 font-semibold'
                                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px]">
                              {String.fromCharCode(65 + oIdx)}
                            </span>
                            <span className="truncate">{opt}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {item.question.explanation && (
                    <p className="text-[11px] text-slate-400 italic pt-1">
                      Explanation: {item.question.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
