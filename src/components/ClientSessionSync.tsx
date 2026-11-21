'use client';

import { useEffect } from 'react';

interface Props {
  studentId: string | null;
  studentName: string | null;
  role: string;
}

export function ClientSessionSync({ studentId, studentName, role }: Props) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (role === 'student' && studentId) {
      localStorage.setItem('student_id', studentId);
      if (studentName) {
        localStorage.setItem('student_name', studentName);
      }
      document.cookie = `student_id=${studentId}; path=/; max-age=2592000; SameSite=Lax`;
      document.cookie = `studentId=${studentId}; path=/; max-age=2592000; SameSite=Lax`;
    }
  }, [studentId, studentName, role]);

  return null;
}
