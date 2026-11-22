import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { batchAssignExamToStudents, examExists } from '@/lib/pdfDocs';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'teacher') {
      return NextResponse.json({ error: 'Deneme atamak için öğretmen olarak giriş yapın.' }, { status: 403 });
    }
    const teacherId = session.userId;

    const body = await request.json();
    const { examId, studentIds, startsAt, dueAt, durationMin } = body;

    if (!examId || !studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json({ error: 'Lütfen bir deneme ve en az bir öğrenci seçin.' }, { status: 400 });
    }
    if (!(await examExists(String(examId)))) {
      return NextResponse.json({ error: 'Bu deneme sistemde bulunamadı; öğrencilere atanamaz.' }, { status: 404 });
    }

    // 0 = süresiz. Süre girilmemişse eski varsayılan (60 dk) korunur.
    const parsedDuration = Number.parseInt(String(durationMin), 10);
    const res = await batchAssignExamToStudents({
      examId,
      studentIds,
      assignedBy: teacherId,
      startsAt,
      dueAt,
      durationMin: Number.isFinite(parsedDuration) && parsedDuration >= 0 ? parsedDuration : 60,
    });

    return NextResponse.json({
      success: true,
      message: `${res.assignedCount} öğrenciye deneme başarıyla atandı.`,
      assignedCount: res.assignedCount,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Error in batch-assign:', msg);
    return NextResponse.json({ error: 'Toplu atama sırasında hata oluştu: ' + msg }, { status: 500 });
  }
}
