import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db/database';
import { getStudentExamList, batchAssignExamToStudents, examExists } from '@/lib/pdfDocs';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Oturum gerekli.' }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const examId = searchParams.get('examId');
    const studentIdParam = searchParams.get('studentId');

    // Öğrenci yalnızca kendi denemelerini görür; öğretmen istediği öğrenciyi seçebilir.
    if (session.role !== 'teacher' && session.role !== 'student') {
      return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });
    }
    const effectiveStudentId = session.role === 'teacher'
      ? (studentIdParam || '')
      : (session.studentId || '');
    if (examId && session.role !== 'teacher') {
      return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });
    }

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
      return NextResponse.json({ error: 'Bu deneme sistemde bulunamadı; öğrenciye atanamaz.' }, { status: 404 });
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
      message: `${res.assignedCount} öğrenciye başarıyla atandı.`,
      assignedCount: res.assignedCount,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: 'Atama işlemi başarısız: ' + msg }, { status: 500 });
  }
}
