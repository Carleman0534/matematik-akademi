// Veli Yetkilendirme ve İzin Filtreleme Yardımcıları (Section 20.9 & 20.10)

export interface GuardianPermissionConfig {
  showExamResults: boolean;
  showQuestionDetails: boolean;
  showTopicAnalytics: boolean;
  showAssignments: boolean;
  showTeacherNotes: boolean;
  showProgressReports: boolean;
}

export function isGuardianAuthorizedForStudent(
  guardianUserId: string,
  targetStudentId: string,
  activeLinks: { guardian_user_id: string; student_id: string; status: string }[]
): boolean {
  if (!guardianUserId || !targetStudentId) return false;
  return activeLinks.some(
    link => link.guardian_user_id === guardianUserId && 
            link.student_id === targetStudentId && 
            link.status === 'active'
  );
}

export function filterStudentDataForGuardian<T extends Record<string, any>>(
  rawData: T,
  perms: GuardianPermissionConfig
): Partial<T> {
  const result: any = { ...rawData };

  if (!perms.showExamResults) {
    delete result.examResults;
  }
  if (!perms.showTopicAnalytics) {
    delete result.topicMastery;
  }
  if (!perms.showAssignments) {
    delete result.assignments;
  }
  if (!perms.showTeacherNotes) {
    delete result.teacherNotes;
  }

  return result;
}
