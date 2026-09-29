import {
  QuizQuestion,
  QuizQuestionAnswerKey,
  QuestionType,
  QuestionDifficulty
} from '../firebase/firestoreService';

export interface GenerateQuestionsOptions {
  material: string;
  count: number;
  difficulty: QuestionDifficulty | 'mixed';
  types: QuestionType[];
  topic?: string;
  includeExplanations?: boolean;
  existingQuestions?: QuizQuestion[]; // For duplicate prevention
}

export interface AiServiceResponse {
  questions: QuizQuestion[];
  answerKeys: QuizQuestionAnswerKey[];
  tokensUsed?: number;
  provider: string;
  filteredDuplicatesCount: number;
  warnings?: string[];
}

export class AiServiceUnavailableError extends Error {
  constructor(
    message: string,
    public readonly code: 'PROVIDER_UNAVAILABLE' | 'API_KEY_MISSING' | 'QUOTA_EXCEEDED' | 'NETWORK_ERROR' = 'PROVIDER_UNAVAILABLE'
  ) {
    super(message);
    this.name = 'AiServiceUnavailableError';
  }
}

export class AiMalformedResponseError extends Error {
  constructor(message: string, public readonly rawOutput?: string) {
    super(message);
    this.name = 'AiMalformedResponseError';
  }
}

export interface IAiService {
  name: string;
  isAvailable(): Promise<boolean>;
  generateQuestions(options: GenerateQuestionsOptions): Promise<AiServiceResponse>;
  regenerateQuestion(
    question: QuizQuestion,
    materialContext: string,
    existingQuestions?: QuizQuestion[]
  ): Promise<{ question: QuizQuestion; answerKey: QuizQuestionAnswerKey }>;
}

/**
 * Calculates string similarity ratio (Jaccard similarity on word tokens)
 */
export function calculateTextSimilarity(a: string, b: string): number {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2);

  const wordsA = new Set(normalize(a));
  const wordsB = new Set(normalize(b));

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersection = 0;
  wordsA.forEach(w => {
    if (wordsB.has(w)) intersection++;
  });

  const union = new Set([...wordsA, ...wordsB]).size;
  return union > 0 ? intersection / union : 0;
}

/**
 * Checks whether a candidate question is a duplicate of any existing question
 */
export function isDuplicateQuestion(
  candidateText: string,
  existingList: (QuizQuestion | { question: string })[]
): boolean {
  const normCandidate = candidateText.trim().toLowerCase();
  for (const item of existingList) {
    const existingText = (item.question || '').trim().toLowerCase();
    if (normCandidate === existingText) return true;
    if (calculateTextSimilarity(normCandidate, existingText) > 0.82) return true;
  }
  return false;
}

/**
 * Validates the schema of an AI-generated question
 */
export function validateAiQuestion(
  q: any,
  index: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!q) {
    return { valid: false, errors: [`Item #${index + 1}: Question object is null or undefined`] };
  }

  if (typeof q.question !== 'string' || q.question.trim().length < 8) {
    errors.push(`Item #${index + 1}: Question text must be at least 8 characters long`);
  }

  const validTypes: QuestionType[] = ['mcq', 'multi_select', 'true_false', 'fill_blank', 'short_answer', 'essay'];
  if (!validTypes.includes(q.type)) {
    errors.push(`Item #${index + 1}: Invalid question type "${q.type}"`);
  }

  if (q.type === 'mcq' || q.type === 'multi_select') {
    if (!Array.isArray(q.options) || q.options.length < 2) {
      errors.push(`Item #${index + 1}: Multiple choice questions must provide at least 2 options`);
    }
  }

  if (q.type === 'mcq' || q.type === 'true_false') {
    if (typeof q.correctIndex !== 'number' || isNaN(q.correctIndex)) {
      errors.push(`Item #${index + 1}: Missing or invalid correctIndex for ${q.type}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Gemini AI Assessment Provider
 * Interacts with /api/ai/generate-questions endpoint or direct server integration.
 * Adheres strictly to the requirement: NEVER fake generated content.
 */
export class GeminiAssessmentAiProvider implements IAiService {
  public readonly name = 'Google Gemini 2.5 Assessment Engine';

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch('/api/ai/health', { method: 'GET' });
      if (res.ok) {
        const body = await res.json();
        return Boolean(body.available);
      }
      return false;
    } catch {
      return false;
    }
  }

  async generateQuestions(options: GenerateQuestionsOptions): Promise<AiServiceResponse> {
    if (!options.material.trim() && !options.topic?.trim()) {
      throw new Error('Please supply study notes, chapter content, or a syllabus topic.');
    }

    const payload = {
      material: options.material,
      count: Math.min(30, Math.max(1, options.count)),
      difficulty: options.difficulty,
      types: options.types,
      topic: options.topic,
      includeExplanations: options.includeExplanations ?? true
    };

    let response: Response;
    try {
      response = await fetch('/api/ai/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (networkErr: any) {
      throw new AiServiceUnavailableError(
        `AI Assessment Service connection failed: ${networkErr.message}. Ensure backend server is running.`,
        'NETWORK_ERROR'
      );
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      if (response.status === 401 || errData.code === 'API_KEY_MISSING') {
        throw new AiServiceUnavailableError(
          'GEMINI_API_KEY is not configured or invalid. Please check your credentials in the environment settings.',
          'API_KEY_MISSING'
        );
      }
      if (response.status === 429 || errData.code === 'QUOTA_EXCEEDED') {
        throw new AiServiceUnavailableError(
          'Gemini model rate limit or daily quota reached. Please retry in a few moments.',
          'QUOTA_EXCEEDED'
        );
      }
      throw new AiServiceUnavailableError(
        errData.error || `AI generation failed with HTTP status ${response.status}`,
        'PROVIDER_UNAVAILABLE'
      );
    }

    const data = await response.json().catch(() => null);
    if (!data || !Array.isArray(data.items)) {
      throw new AiMalformedResponseError(
        'AI provider returned an unexpected payload structure. Expected an array of question items.',
        JSON.stringify(data)
      );
    }

    const rawItems: any[] = data.items;
    const validatedQuestions: QuizQuestion[] = [];
    const validatedAnswerKeys: QuizQuestionAnswerKey[] = [];
    const validationErrors: string[] = [];
    let duplicateCount = 0;

    const existingPool = options.existingQuestions || [];

    rawItems.forEach((raw, i) => {
      const check = validateAiQuestion(raw, i);
      if (!check.valid) {
        validationErrors.push(...check.errors);
        return;
      }

      // Duplicate prevention check
      if (isDuplicateQuestion(raw.question, existingPool) || isDuplicateQuestion(raw.question, validatedQuestions)) {
        duplicateCount++;
        return;
      }

      const questionId = `q-ai-${Date.now()}-${i + 1}-${Math.random().toString(36).substring(2, 6)}`;
      const qObj: QuizQuestion = {
        id: questionId,
        type: raw.type,
        question: raw.question.trim(),
        points: Number(raw.points) || 1,
        difficulty: raw.difficulty || (options.difficulty === 'mixed' ? 'medium' : options.difficulty),
        options: raw.options ? raw.options.map((o: any) => String(o).trim()) : undefined,
        correctIndex: raw.correctIndex !== undefined ? Number(raw.correctIndex) : undefined,
        correctIndices: Array.isArray(raw.correctIndices) ? raw.correctIndices.map(Number) : undefined,
        acceptedAnswers: Array.isArray(raw.acceptedAnswers) ? raw.acceptedAnswers.map((a: any) => String(a).trim()) : undefined,
        explanation: raw.explanation ? String(raw.explanation).trim() : '',
        rubric: raw.rubric ? String(raw.rubric).trim() : ''
      };

      const keyObj: QuizQuestionAnswerKey = {
        questionId,
        correctIndex: qObj.correctIndex,
        correctIndices: qObj.correctIndices,
        acceptedAnswers: qObj.acceptedAnswers,
        explanation: qObj.explanation,
        rubric: qObj.rubric
      };

      validatedQuestions.push(qObj);
      validatedAnswerKeys.push(keyObj);
    });

    if (validatedQuestions.length === 0 && rawItems.length > 0) {
      if (duplicateCount === rawItems.length) {
        throw new Error('All generated questions were duplicates of existing questions in this assessment.');
      }
      throw new AiMalformedResponseError(
        `All ${rawItems.length} candidate questions failed validation: ${validationErrors.join('; ')}`
      );
    }

    return {
      questions: validatedQuestions,
      answerKeys: validatedAnswerKeys,
      tokensUsed: data.tokensUsed,
      provider: this.name,
      filteredDuplicatesCount: duplicateCount,
      warnings: validationErrors.length > 0 ? validationErrors : undefined
    };
  }

  async regenerateQuestion(
    question: QuizQuestion,
    materialContext: string,
    existingQuestions?: QuizQuestion[]
  ): Promise<{ question: QuizQuestion; answerKey: QuizQuestionAnswerKey }> {
    const singleResult = await this.generateQuestions({
      material: materialContext || question.question,
      count: 1,
      difficulty: question.difficulty,
      types: [question.type],
      topic: question.difficulty,
      includeExplanations: true,
      existingQuestions: existingQuestions || [question]
    });

    if (!singleResult.questions[0]) {
      throw new Error('Failed to regenerate individual question.');
    }

    return {
      question: singleResult.questions[0],
      answerKey: singleResult.answerKeys[0]
    };
  }
}

// Active default AI Service instance
export const aiService: IAiService = new GeminiAssessmentAiProvider();
