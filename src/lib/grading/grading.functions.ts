export interface RubricCriteria {
  id: string;
  name: string;
  maxPoints: number;
  awardedPoints: number;
  comment?: string;
}

export interface GradingResult {
  totalScore: number;
  maxScore: number;
  percentage: number;
  letterGrade: string;
  passed: boolean;
  status: 'draft' | 'reviewed' | 'graded';
}

export function calculateGrade(
  rubric: RubricCriteria[],
  cheatDeduction: number = 0
): GradingResult {
  const maxScore = rubric.reduce((acc, r) => acc + r.maxPoints, 0);
  const rawScore = rubric.reduce((acc, r) => acc + r.awardedPoints, 0);
  const totalScore = Math.max(0, rawScore - cheatDeduction);
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  let letterGrade = 'F';
  if (percentage >= 93) letterGrade = 'A';
  else if (percentage >= 90) letterGrade = 'A-';
  else if (percentage >= 87) letterGrade = 'B+';
  else if (percentage >= 83) letterGrade = 'B';
  else if (percentage >= 80) letterGrade = 'B-';
  else if (percentage >= 75) letterGrade = 'C+';
  else if (percentage >= 70) letterGrade = 'C';
  else if (percentage >= 60) letterGrade = 'D';

  return {
    totalScore,
    maxScore,
    percentage,
    letterGrade,
    passed: percentage >= 70,
    status: 'graded',
  };
}
