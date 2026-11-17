import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { batchAssignExamToStudents } from '@/lib/pdfDocs';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const teacherId = session?.userId || 'teacher-admin';

    const body = await request.json();
    const { examId, studentIds, startsAt, dueAt, durationMin } = body;

    if (!examId || !studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json({ error: 'Lütfen bir deneme ve en az bir öğrenci seçin.' }, { status: 400 });
    }

    const res = await batchAssignExamToStudents({
      examId,
      studentIds,
      assignedBy: teacherId,
      startsAt,
      dueAt,
      durationMin: durationMin ? parseInt(durationMin) : 60,
    });

    return NextResponse.json({
      success: true,
      message: `${res.assignedCount} öğrenciye deneme başarıyla atandı.`,
      assignedCount: res.assignedCount,
    });
  } catch (err: any) {
    console.error('Error in batch-assign:', err);
    return NextResponse.json({ error: 'Toplu atama sırasında hata oluştu: ' + err.message }, { status: 500 });
  }
}
