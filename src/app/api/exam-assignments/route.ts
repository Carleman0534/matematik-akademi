import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db/database';
import { getStudentExamList, batchAssignExamToStudents } from '@/lib/pdfDocs';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const { searchParams } = new URL(request.url);
    const examId = searchParams.get('examId');
    const studentIdParam = searchParams.get('studentId');

    const effectiveStudentId = studentIdParam || session?.studentId || '50fa22f6-1021-4dde-8278-2339fa65030d';

    if (examId) {
      // Denemeye atanmış öğrencileri getir
      const db = await getDb();
      const stmt = db.prepare(`
        SELECT 
          ea.*,
          COALESCE(u.name, 'Öğrenci') as student_name,
          COALESCE(st.grade, 12) as grade_level,
          es.id as session_id,
          es.started_at,
          es.submitted_at,
          es.deadline,
          er.net_score,
          er.correct_count,
          er.wrong_count,
          er.blank_count
        FROM exam_assignments ea
        JOIN students st ON st.id = ea.student_id
        JOIN users u ON u.id = st.user_id
        LEFT JOIN exam_sessions es ON es.exam_id = ea.exam_id AND es.student_id = ea.student_id
        LEFT JOIN exam_results er ON er.exam_id = ea.exam_id AND er.student_id = ea.student_id
        WHERE ea.exam_id = ?
        ORDER BY ea.assigned_at DESC
      `);
      stmt.bind([examId]);
      const assignments: Record<string, unknown>[] = [];
      while (stmt.step()) {
        assignments.push(stmt.getAsObject() as Record<string, unknown>);
      }
      stmt.free();

      return NextResponse.json({ assignments });
    }

    // Öğrenci bazlı listeleme
    const categorized = await getStudentExamList(effectiveStudentId);
    return NextResponse.json(categorized);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Error in GET /api/exam-assignments:', msg);
    return NextResponse.json({ error: 'Atamalar alınamadı.' }, { status: 500 });
  }
}

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
      message: `${res.assignedCount} öğrenciye başarıyla atandı.`,
      assignedCount: res.assignedCount,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: 'Atama işlemi başarısız: ' + msg }, { status: 500 });
  }
}
