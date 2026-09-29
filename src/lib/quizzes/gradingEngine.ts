import {
  QuizQuestion,
  QuizQuestionAnswerKey,
  QuestionType
} from '../firebase/firestoreService';

export interface StudentQuestionAnswer {
  questionId: string;
  selectedOptionIndex?: number; // for mcq, true_false
  selectedOptionIndices?: number[]; // for multi_select
  textAnswer?: string; // for fill_blank, short_answer, essay
}

export interface QuestionGradingResult {
  questionId: string;
  questionType: QuestionType;
  pointsPossible: number;
  pointsEarned: number;
  isCorrect: boolean;
  isPartiallyCorrect?: boolean;
  isUnanswered: boolean;
  requiresManualGrading: boolean;
  manualOverride?: boolean;
  teacherFeedback?: string;
  correctAnswerSummary?: string;
  explanation?: string;
}

export interface QuizEvaluationResult {
  totalPointsPossible: number;
  totalPointsEarned: number;
  normalizedPercentage: number;
  isPassing: boolean;
  questionsCount: number;
  answeredCount: number;
  unansweredCount: number;
  correctCount: number;
  partiallyCorrectCount: number;
  incorrectCount: number;
  pendingManualReviewCount: number;
  questionResults: QuestionGradingResult[];
}

/**
 * Normalizes user textual input for objective string comparison
 */
export function normalizeAnswerText(text: string | undefined): string {
  if (!text) return '';
  return text
    .trim()
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Evaluates a single question automatically based on answer keys.
 */
export function evaluateQuestionAutomatic(
  question: QuizQuestion,
  answerKey: QuizQuestionAnswerKey | undefined,
  studentAnswer: StudentQuestionAnswer | undefined
): QuestionGradingResult {
  const pointsPossible = Number(question.points) || 1;
  const baseResult: QuestionGradingResult = {
    questionId: question.id,
    questionType: question.type,
    pointsPossible,
    pointsEarned: 0,
    isCorrect: false,
    isUnanswered: false,
    requiresManualGrading: false,
    explanation: answerKey?.explanation || question.explanation || ''
  };

  // 1. Check for Unanswered state
  if (!studentAnswer) {
    baseResult.isUnanswered = true;
    return baseResult;
  }

  const { type } = question;

  // 2. Objective Type: True / False
  if (type === 'true_false') {
    if (studentAnswer.selectedOptionIndex === undefined) {
      baseResult.isUnanswered = true;
      return baseResult;
    }
    const expected = answerKey?.correctIndex ?? question.correctIndex ?? 0;
    const isMatch = studentAnswer.selectedOptionIndex === expected;
    baseResult.isCorrect = isMatch;
    baseResult.pointsEarned = isMatch ? pointsPossible : 0;
    baseResult.correctAnswerSummary = expected === 1 ? 'True' : 'False';
    return baseResult;
  }

  // 3. Objective Type: MCQ (Single Choice)
  if (type === 'mcq') {
    if (studentAnswer.selectedOptionIndex === undefined) {
      baseResult.isUnanswered = true;
      return baseResult;
    }
    const expected = answerKey?.correctIndex ?? question.correctIndex ?? 0;
    const isMatch = studentAnswer.selectedOptionIndex === expected;
    baseResult.isCorrect = isMatch;
    baseResult.pointsEarned = isMatch ? pointsPossible : 0;
    baseResult.correctAnswerSummary =
      question.options && question.options[expected]
        ? question.options[expected]
        : `Option ${expected + 1}`;
    return baseResult;
  }

  // 4. Objective Type: Multi-Select (Multiple Correct Choices)
  if (type === 'multi_select') {
    const selected = studentAnswer.selectedOptionIndices || [];
    if (selected.length === 0) {
      baseResult.isUnanswered = true;
      return baseResult;
    }
    const expected = answerKey?.correctIndices ?? question.correctIndices ?? [0];

    // Sorted comparison
    const sortedSelected = [...selected].sort((a, b) => a - b);
    const sortedExpected = [...expected].sort((a, b) => a - b);

    const isExactMatch =
      sortedSelected.length === sortedExpected.length &&
      sortedSelected.every((val, idx) => val === sortedExpected[idx]);

    if (isExactMatch) {
      baseResult.isCorrect = true;
      baseResult.pointsEarned = pointsPossible;
    } else {
      // Partial credit calculation: correct picks minus incorrect picks normalized to 0
      const correctPicks = selected.filter(idx => expected.includes(idx)).length;
      const incorrectPicks = selected.filter(idx => !expected.includes(idx)).length;
      const netScore = Math.max(0, correctPicks - incorrectPicks);
      const ratio = expected.length > 0 ? netScore / expected.length : 0;

      if (ratio > 0) {
        baseResult.isPartiallyCorrect = true;
        baseResult.pointsEarned = Math.round(ratio * pointsPossible * 10) / 10;
      } else {
        baseResult.pointsEarned = 0;
      }
    }

    baseResult.correctAnswerSummary = expected
      .map(i => (question.options ? question.options[i] : `Choice ${i + 1}`))
      .join(', ');
    return baseResult;
  }

  // 5. Objective Type: Fill in the Blank & Short Answer
  if (type === 'fill_blank' || type === 'short_answer') {
    const rawAnswer = (studentAnswer.textAnswer || '').trim();
    if (!rawAnswer) {
      baseResult.isUnanswered = true;
      return baseResult;
    }

    const acceptedList = (answerKey?.acceptedAnswers || question.acceptedAnswers || []).filter(
      Boolean
    );
    const normalizedStudent = normalizeAnswerText(rawAnswer);

    // Exact or normalized synonym match
    const isMatch = acceptedList.some(accepted => {
      const normAccepted = normalizeAnswerText(accepted);
      return (
        normalizedStudent === normAccepted ||
        (normAccepted.length > 3 && normalizedStudent.includes(normAccepted))
      );
    });

    baseResult.isCorrect = isMatch;
    baseResult.pointsEarned = isMatch ? pointsPossible : 0;
    baseResult.correctAnswerSummary = acceptedList.join(' OR ');
    return baseResult;
  }

  // 6. Subjective Type: Essay (requires manual teacher review)
  if (type === 'essay') {
    const rawAnswer = (studentAnswer.textAnswer || '').trim();
    if (!rawAnswer) {
      baseResult.isUnanswered = true;
      baseResult.requiresManualGrading = false;
      baseResult.pointsEarned = 0;
      return baseResult;
    }

    baseResult.requiresManualGrading = true;
    baseResult.correctAnswerSummary = answerKey?.rubric || question.rubric || 'Rubric criteria required';
    return baseResult;
  }

  return baseResult;
}

/**
 * Calculates complete assessment evaluation, including normalization and percentages.
 */
export function evaluateQuizAttempt(
  questions: QuizQuestion[],
  answerKeys: QuizQuestionAnswerKey[],
  answers: Record<string, StudentQuestionAnswer>,
  passingPercentage: number = 60,
  manualOverrides?: Record<string, { pointsEarned: number; feedback?: string }>
): QuizEvaluationResult {
  const totalPointsPossible = questions.reduce((sum, q) => sum + (Number(q.points) || 1), 0);
  let totalPointsEarned = 0;
  let correctCount = 0;
  let partiallyCorrectCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;
  let pendingManualReviewCount = 0;

  const questionResults: QuestionGradingResult[] = questions.map(q => {
    const answerKey = answerKeys.find(k => k.questionId === q.id);
    const studentAnswer = answers[q.id];
    let result = evaluateQuestionAutomatic(q, answerKey, studentAnswer);

    // Apply manual instructor override if provided
    if (manualOverrides && manualOverrides[q.id] !== undefined) {
      const override = manualOverrides[q.id];
      result = {
        ...result,
        pointsEarned: Math.min(result.pointsPossible, Math.max(0, override.pointsEarned)),
        isCorrect: override.pointsEarned >= result.pointsPossible,
        isPartiallyCorrect: override.pointsEarned > 0 && override.pointsEarned < result.pointsPossible,
        manualOverride: true,
        requiresManualGrading: false,
        teacherFeedback: override.feedback || result.teacherFeedback
      };
    }

    totalPointsEarned += result.pointsEarned;

    if (result.isUnanswered) {
      unansweredCount++;
      incorrectCount++;
    } else if (result.requiresManualGrading) {
      pendingManualReviewCount++;
    } else if (result.isCorrect) {
      correctCount++;
    } else if (result.isPartiallyCorrect) {
      partiallyCorrectCount++;
    } else {
      incorrectCount++;
    }

    return result;
  });

  const normalizedPercentage =
    totalPointsPossible > 0
      ? Math.round((totalPointsEarned / totalPointsPossible) * 100)
      : 0;

  const isPassing = normalizedPercentage >= passingPercentage;
  const answeredCount = questions.length - unansweredCount;

  return {
    totalPointsPossible,
    totalPointsEarned,
    normalizedPercentage,
    isPassing,
    questionsCount: questions.length,
    answeredCount,
    unansweredCount,
    correctCount,
    partiallyCorrectCount,
    incorrectCount,
    pendingManualReviewCount,
    questionResults
  };
}
