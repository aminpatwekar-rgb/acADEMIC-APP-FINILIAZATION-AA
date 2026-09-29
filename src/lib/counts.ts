export interface StudentCounts {
  pendingWork: number;
  overdue: number;
  completed: number;
  enrolledClasses: number;
  completionRate: number;
}

export interface TeacherCounts {
  activeClasses: number;
  enrolledStudents: number;
  activeAssignments: number;
  pendingReview: number;
}

export function computeStudentCounts(
  assignments: { id: string; dueDate?: string }[],
  submissions: { assignmentId: string; status: string }[],
  enrolledClassesCount: number
): StudentCounts {
  const completedIds = new Set(
    submissions.filter(s => s.status === 'submitted' || s.status === 'graded').map(s => s.assignmentId)
  );

  let pending = 0;
  let overdue = 0;
  const now = new Date();

  assignments.forEach(a => {
    if (completedIds.has(a.id)) return;
    if (a.dueDate && new Date(a.dueDate) < now) {
      overdue++;
    } else {
      pending++;
    }
  });

  const total = assignments.length;
  const completed = completedIds.size;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    pendingWork: pending,
    overdue,
    completed,
    enrolledClasses: enrolledClassesCount,
    completionRate,
  };
}

export function computeTeacherCounts(
  classesCount: number,
  studentsCount: number,
  assignmentsCount: number,
  pendingSubmissionsCount: number
): TeacherCounts {
  return {
    activeClasses: classesCount,
    enrolledStudents: studentsCount,
    activeAssignments: assignmentsCount,
    pendingReview: pendingSubmissionsCount,
  };
}
