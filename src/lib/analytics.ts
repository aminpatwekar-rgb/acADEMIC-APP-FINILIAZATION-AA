export interface ClassAnalytics {
  totalSubmissions: number;
  gradedCount: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  cheatIncidentsTotal: number;
  gradeDistribution: {
    A: number;
    B: number;
    C: number;
    D: number;
    F: number;
  };
}

export function computeClassAnalytics(submissions: { grade?: number; cheatFlagsCount?: number }[]): ClassAnalytics {
  const graded = submissions.filter(s => typeof s.grade === 'number');
  if (graded.length === 0) {
    return {
      totalSubmissions: submissions.length,
      gradedCount: 0,
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0,
      cheatIncidentsTotal: submissions.reduce((acc, s) => acc + (s.cheatFlagsCount || 0), 0),
      gradeDistribution: { A: 0, B: 0, C: 0, D: 0, F: 0 },
    };
  }

  const scores = graded.map(s => s.grade as number);
  const averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const highestScore = Math.max(...scores);
  const lowestScore = Math.min(...scores);
  const cheatIncidentsTotal = submissions.reduce((acc, s) => acc + (s.cheatFlagsCount || 0), 0);

  const distribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  scores.forEach(s => {
    if (s >= 90) distribution.A++;
    else if (s >= 80) distribution.B++;
    else if (s >= 70) distribution.C++;
    else if (s >= 60) distribution.D++;
    else distribution.F++;
  });

  return {
    totalSubmissions: submissions.length,
    gradedCount: graded.length,
    averageScore,
    highestScore,
    lowestScore,
    cheatIncidentsTotal,
    gradeDistribution: distribution,
  };
}
