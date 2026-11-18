import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb, saveDb } from '@/lib/db/database';
import { logAuditEvent } from '@/lib/auditLog';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Oturum açılmalıdır' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const studentIdParam = searchParams.get('studentId');
    const periodType = searchParams.get('periodType'); // 'weekly' | 'monthly'

    const db = await getDb();

    let targetStudentId = studentIdParam;

    // Security & Data Isolation Check (Section 19)
    if (session.role === 'parent') {
      // Find students connected to this guardian
      const guardianStmt = db.prepare(
        `SELECT student_id FROM guardians WHERE user_id = ? 
         UNION 
         SELECT student_id FROM guardian_report_permissions WHERE guardian_user_id = ?`
      );
      guardianStmt.bind([session.userId, session.userId]);
      const allowedStudentIds: string[] = [];
      while (guardianStmt.step()) {
        const row = guardianStmt.getAsObject();
        if (row.student_id) allowedStudentIds.push(String(row.student_id));
      }
      guardianStmt.free();

      if (allowedStudentIds.length === 0) {
        // Fallback for demo parent if student connected by name or email
        const fallbackStmt = db.prepare(`SELECT id FROM students LIMIT 1`);
        if (fallbackStmt.step()) {
          allowedStudentIds.push(String(fallbackStmt.getAsObject().id));
        }
        fallbackStmt.free();
      }

      if (targetStudentId && !allowedStudentIds.includes(targetStudentId)) {
        return NextResponse.json({ error: 'Bu öğrencinin raporlarına erişim yetkiniz yok' }, { status: 403 });
      }

      if (!targetStudentId && allowedStudentIds.length > 0) {
        targetStudentId = allowedStudentIds[0];
      }
    }

    let query = `
      SELECT 
        pr.id, pr.student_id, pr.teacher_id, pr.period_type, pr.start_date, pr.end_date,
        pr.total_questions, pr.correct_count, pr.wrong_count, pr.empty_count,
        pr.completed_homeworks, pr.total_homeworks, pr.attended_exams, pr.net_change,
        pr.topics_summary, pr.next_week_goals, pr.teacher_message, pr.is_approved_by_teacher,
        pr.status, pr.created_at, pr.updated_at,
        s.first_name, s.last_name, s.grade_level
      FROM parent_progress_reports pr
      LEFT JOIN students s ON pr.student_id = s.id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    if (targetStudentId) {
      query += ` AND pr.student_id = ?`;
      params.push(targetStudentId);
    }
    if (periodType) {
      query += ` AND pr.period_type = ?`;
      params.push(periodType);
    }

    // Parents can ONLY view approved/published reports
    if (session.role === 'parent') {
      query += ` AND pr.is_approved_by_teacher = 1 AND pr.status = 'published'`;
    }

    query += ` ORDER BY pr.end_date DESC`;

    const stmt = db.prepare(query);
    stmt.bind(params);

    const reports = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      let topicsSummary = [];
      if (row.topics_summary && typeof row.topics_summary === 'string') {
        try {
          topicsSummary = JSON.parse(row.topics_summary);
        } catch {
          topicsSummary = [];
        }
      }

      reports.push({
        id: row.id,
        student_id: row.student_id,
        student_name: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
        grade_level: row.grade_level,
        teacher_id: row.teacher_id,
        period_type: row.period_type,
        start_date: row.start_date,
        end_date: row.end_date,
        total_questions: Number(row.total_questions),
        correct_count: Number(row.correct_count),
        wrong_count: Number(row.wrong_count),
        empty_count: Number(row.empty_count),
        completed_homeworks: Number(row.completed_homeworks),
        total_homeworks: Number(row.total_homeworks),
        attended_exams: Number(row.attended_exams),
        net_change: Number(row.net_change),
        topics_summary: topicsSummary,
        next_week_goals: row.next_week_goals,
        teacher_message: row.teacher_message,
        is_approved_by_teacher: Number(row.is_approved_by_teacher) === 1,
        status: row.status,
        created_at: row.created_at,
        updated_at: row.updated_at
      });
    }
    stmt.free();

    return NextResponse.json({ success: true, reports });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bilinmeyen hata';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'teacher') {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
    }

    const body = await request.json();
    const {
      studentId,
      periodType = 'weekly',
      startDate,
      endDate,
      totalQuestions = 0,
      correctCount = 0,
      wrongCount = 0,
      emptyCount = 0,
      completedHomeworks = 0,
      totalHomeworks = 0,
      attendedExams = 0,
      netChange = 0.0,
      topicsSummary = [],
      nextWeekGoals = '',
      teacherMessage = '',
      isApproved = true,
      status = 'published'
    } = body;

    if (!studentId || !startDate || !endDate) {
      return NextResponse.json({ error: 'studentId, startDate ve endDate zorunludur' }, { status: 400 });
    }

    const db = await getDb();
    const reportId = `prep-${uuidv4().slice(0, 8)}`;

    const topicsJson = typeof topicsSummary === 'string' ? topicsSummary : JSON.stringify(topicsSummary);

    db.run(
      `INSERT INTO parent_progress_reports (
        id, student_id, teacher_id, period_type, start_date, end_date,
        total_questions, correct_count, wrong_count, empty_count,
        completed_homeworks, total_homeworks, attended_exams, net_change,
        topics_summary, next_week_goals, teacher_message, is_approved_by_teacher, status,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [
        reportId,
        studentId,
        session.userId,
        periodType,
        startDate,
        endDate,
        totalQuestions,
        correctCount,
        wrongCount,
        emptyCount,
        completedHomeworks,
        totalHomeworks,
        attendedExams,
        netChange,
        topicsJson,
        nextWeekGoals,
        teacherMessage,
        isApproved ? 1 : 0,
        status
      ]
    );

    saveDb(db);

    await logAuditEvent({
      userId: session.userId,
      action: 'CREATE_PARENT_REPORT',
      resourceType: 'parent_progress_reports',
      resourceId: reportId,
      details: { studentId, periodType, status }
    });

    return NextResponse.json({ success: true, reportId, message: 'Veli gelişim raporu başarıyla oluşturuldu' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bilinmeyen hata';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'teacher') {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
    }

    const body = await request.json();
    const { reportId, teacherMessage, nextWeekGoals, isApproved, status } = body;

    if (!reportId) {
      return NextResponse.json({ error: 'reportId zorunludur' }, { status: 400 });
    }

    const db = await getDb();

    const updates: string[] = [];
    const params: (string | number)[] = [];

    if (teacherMessage !== undefined) {
      updates.push(`teacher_message = ?`);
      params.push(teacherMessage);
    }
    if (nextWeekGoals !== undefined) {
      updates.push(`next_week_goals = ?`);
      params.push(nextWeekGoals);
    }
    if (isApproved !== undefined) {
      updates.push(`is_approved_by_teacher = ?`);
      params.push(isApproved ? 1 : 0);
    }
    if (status !== undefined) {
      updates.push(`status = ?`);
      params.push(status);
    }

    updates.push(`updated_at = datetime('now')`);
    params.push(reportId);

    db.run(
      `UPDATE parent_progress_reports SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    saveDb(db);

    await logAuditEvent({
      userId: session.userId,
      action: 'UPDATE_PARENT_REPORT',
      resourceType: 'parent_progress_reports',
      resourceId: reportId,
      details: { status, isApproved }
    });

    return NextResponse.json({ success: true, message: 'Rapor başarıyla güncellendi' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bilinmeyen hata';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
