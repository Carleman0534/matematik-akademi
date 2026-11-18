import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { extendStudentExamTime, reopenStudentExam } from '@/lib/pdfDocs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const session = await getSession();
    const teacherId = session?.userId || 'teacher-admin';

    const body = await request.json();
    const { action, extraMinutes } = body;
    const mins = parseInt(extraMinutes) || 15;

    if (action === 'reopen') {
      const res = await reopenStudentExam(sessionId, mins, teacherId);
      return NextResponse.json({
        success: true,
        message: `Sınav yeniden açıldı ve +${mins} dakika süre tanımlandı.`,
        newDeadline: res.newDeadline,
      });
    }

    // Default: extend time
    const res = await extendStudentExamTime(sessionId, mins, teacherId);
    return NextResponse.json({
      success: true,
      message: `Öğrenciye başarıyla +${mins} dakika ek süre tanımlandı.`,
      newDeadline: res.newDeadline,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Error in extend-time:', msg);
    return NextResponse.json({ error: 'Süre işlemi başarısız: ' + msg }, { status: 500 });
  }
}
