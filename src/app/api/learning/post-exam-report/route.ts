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
    const examId = searchParams.get('examId');
    const studentIdParam = searchParams.get('studentId');
    const evalId = searchParams.get('evalId');

    const db = await getDb();

    let query = `
      SELECT 
        pe.id, pe.exam_id, pe.student_id, pe.teacher_id,
        pe.summary_json, pe.topics_json, pe.subtopics_json, pe.difficulty_json,
        pe.time_management_json, pe.mistake_reasons_json, pe.previous_comparison_json,
        pe.strengths_text, pe.priorities_text, pe.study_recommendations,
        pe.ai_evaluation_text, pe.teacher_approved, pe.approved_at, pe.created_at,
        u.name as user_full_name,
        e.title as exam_title
      FROM post_exam_evaluations pe
      LEFT JOIN students s ON pe.student_id = s.id
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN exams e ON pe.exam_id = e.id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    if (evalId) {
      query += ` AND pe.id = ?`;
      params.push(evalId);
    }
    if (examId) {
      query += ` AND pe.exam_id = ?`;
      params.push(examId);
    }
    if (studentIdParam) {
      query += ` AND pe.student_id = ?`;
      params.push(studentIdParam);
    }

    // Role-based Security check (Section 19):
    // Students can only see their own report
    if (session.role === 'student') {
      query += ` AND pe.student_id = ?`;
      params.push(session.studentId || '');
    }
    // Parents and students can only view reports that have been approved by the teacher
    if (session.role === 'parent' || session.role === 'student') {
      query += ` AND pe.teacher_approved = 1`;
    }

    query += ` ORDER BY pe.created_at DESC`;

    const stmt = db.prepare(query);
    stmt.bind(params);

    const evaluations = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      const parseJsonSafe = (raw: unknown) => {
        if (!raw || typeof raw !== 'string') return null;
        try {
          return JSON.parse(raw);
        } catch {
          return raw;
        }
      };

      evaluations.push({
        id: row.id,
        exam_id: row.exam_id,
        exam_title: row.exam_title || 'LGS Matematik Deneme Sınavı',
        student_id: row.student_id,
        student_name: (row.user_full_name as string) || `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'Öğrenci',
        teacher_id: row.teacher_id,
        summary: parseJsonSafe(row.summary_json),
        topics: parseJsonSafe(row.topics_json),
        subtopics: parseJsonSafe(row.subtopics_json),
        difficulty: parseJsonSafe(row.difficulty_json),
        time_management: parseJsonSafe(row.time_management_json),
        mistake_reasons: parseJsonSafe(row.mistake_reasons_json),
        previous_comparison: parseJsonSafe(row.previous_comparison_json),
        strengths_text: row.strengths_text,
        priorities_text: row.priorities_text,
        study_recommendations: row.study_recommendations,
        ai_evaluation_text: row.ai_evaluation_text,
        teacher_approved: Number(row.teacher_approved) === 1,
        approved_at: row.approved_at,
        created_at: row.created_at
      });
    }
    stmt.free();

    return NextResponse.json({ success: true, evaluations });
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
      examId,
      studentId,
      summary,
      topics,
      subtopics,
      difficulty,
      timeManagement,
      mistakeReasons,
      previousComparison,
      strengthsText,
      prioritiesText,
      studyRecommendations,
      aiEvaluationText,
      teacherApproved = false
    } = body;

    if (!examId || !studentId) {
      return NextResponse.json({ error: 'examId ve studentId zorunludur' }, { status: 400 });
    }

    const db = await getDb();
    const evalId = `eval-${uuidv4().slice(0, 8)}`;

    const stringify = (val: unknown) => (typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val || ''));

    db.run(
      `INSERT INTO post_exam_evaluations (
        id, exam_id, student_id, teacher_id,
        summary_json, topics_json, subtopics_json, difficulty_json,
        time_management_json, mistake_reasons_json, previous_comparison_json,
        strengths_text, priorities_text, study_recommendations,
        ai_evaluation_text, teacher_approved, approved_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [
        evalId,
        examId,
        studentId,
        session.userId,
        stringify(summary),
        stringify(topics),
        stringify(subtopics),
        stringify(difficulty),
        stringify(timeManagement),
        stringify(mistakeReasons),
        stringify(previousComparison),
        strengthsText || '',
        prioritiesText || '',
        studyRecommendations || '',
        aiEvaluationText || '',
        teacherApproved ? 1 : 0,
        teacherApproved ? new Date().toISOString() : null
      ]
    );

    saveDb(db);

    await logAuditEvent({
      userId: session.userId,
      action: 'CREATE_POST_EXAM_EVAL',
      resourceType: 'post_exam_evaluations',
      resourceId: evalId,
      details: { examId, studentId, teacherApproved }
    });

    return NextResponse.json({ success: true, evalId, message: 'Akıllı deneme değerlendirme raporu kaydedildi' });
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
    const { evalId, teacherApproved, aiEvaluationText, studyRecommendations, strengthsText, prioritiesText } = body;

    if (!evalId) {
      return NextResponse.json({ error: 'evalId zorunludur' }, { status: 400 });
    }

    const db = await getDb();

    const updates: string[] = [];
    const params: (string | number)[] = [];

    if (teacherApproved !== undefined) {
      updates.push(`teacher_approved = ?`);
      params.push(teacherApproved ? 1 : 0);
      if (teacherApproved) {
        updates.push(`approved_at = datetime('now')`);
      }
    }
    if (aiEvaluationText !== undefined) {
      updates.push(`ai_evaluation_text = ?`);
      params.push(aiEvaluationText);
    }
    if (studyRecommendations !== undefined) {
      updates.push(`study_recommendations = ?`);
      params.push(studyRecommendations);
    }
    if (strengthsText !== undefined) {
      updates.push(`strengths_text = ?`);
      params.push(strengthsText);
    }
    if (prioritiesText !== undefined) {
      updates.push(`priorities_text = ?`);
      params.push(prioritiesText);
    }

    updates.push(`updated_at = datetime('now')`);
    params.push(evalId);

    db.run(
      `UPDATE post_exam_evaluations SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    saveDb(db);

    await logAuditEvent({
      userId: session.userId,
      action: 'UPDATE_POST_EXAM_EVAL',
      resourceType: 'post_exam_evaluations',
      resourceId: evalId,
      details: { teacherApproved }
    });

    return NextResponse.json({ success: true, message: 'Değerlendirme raporu güncellendi' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bilinmeyen hata';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
