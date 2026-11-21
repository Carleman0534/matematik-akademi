import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db/database';

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');

    let sql = `
      SELECT p.*, s.parent_name, u.name as student_name
      FROM personalized_study_plans p
      LEFT JOIN students s ON p.student_id = s.id
      LEFT JOIN users u ON s.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (studentId) {
      sql += ' AND p.student_id = ?';
      params.push(studentId);
    }
    sql += ' ORDER BY p.created_at DESC';

    const stmt = db.prepare(sql);
    stmt.bind(params);
    const plans: any[] = [];
    while (stmt.step()) {
      plans.push(stmt.getAsObject());
    }
    stmt.free();

    return NextResponse.json({ success: true, plans });
  } catch (error: any) {
    console.error('Error fetching study plans:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title,
      description = '',
      studentIds,
      topicIds = [],
      questions = [], // Array of question objects { id, text, options, correct, solution, svg, difficulty, type }
      durationMin = 30,
      isAdaptive = true,
      dueAt
    } = body;

    if (!title || !studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json({ success: false, error: 'Başlık ve en az bir öğrenci seçilmelidir' }, { status: 400 });
    }

    const db = await getDb();
    try {
      db.run('PRAGMA foreign_keys=OFF;');
    } catch {}
    const createdPlanIds: string[] = [];

    for (const sid of studentIds) {
      const planId = 'plan_' + Math.random().toString(36).substring(2, 10);
      createdPlanIds.push(planId);

      const planStmt = db.prepare(`
        INSERT INTO personalized_study_plans
        (id, teacher_id, student_id, title, description, topic_ids_json, total_questions, estimated_duration_min, is_adaptive, status, due_at, created_at)
        VALUES (?, '170c1e8f-52b4-440e-b605-ec974fa1d56b', ?, ?, ?, ?, ?, ?, ?, 'active', ?, datetime('now'))
      `);
      planStmt.run([
        planId,
        sid,
        title,
        description,
        JSON.stringify(topicIds),
        questions.length,
        durationMin,
        isAdaptive ? 1 : 0,
        dueAt || null
      ]);
      planStmt.free();

      // Soruları plan_questions tablosuna ekle
      const qStmt = db.prepare(`
        INSERT INTO study_plan_questions
        (id, plan_id, question_source, source_question_id, question_text, options_json, correct_answer, solution_explanation, svg_content, difficulty, question_type, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      questions.forEach((q: any, idx: number) => {
        const sqId = 'spq_' + Math.random().toString(36).substring(2, 10);
        const rawText = q.question_text || q.questionText || '';
        // Öğrenciye sunulan sorularda yapay zekâ veya iç etiketler kesinlikle temizlenir
        const cleanText = rawText
          .replace(/^\d+\.\s*Soru\s*\[[^\]]+\]:\s*/gi, '')
          .replace(/^\[[^\]]+\]:\s*/gi, '')
          .trim();

        qStmt.run([
          sqId,
          planId,
          q.source_type || 'lgs_curriculum',
          q.id,
          cleanText || rawText,
          JSON.stringify(q.options),
          q.correct_answer || q.correctAnswer || 'A',
          q.solution_explanation || q.solutionExplanation || 'Çözüm hazır.',
          q.svg_content || q.svgContent || null,
          q.difficulty || 3,
          q.question_type || q.questionType || 'yeni_nesil',
          idx + 1
        ]);
      });
      qStmt.free();

      // Bildirim oluştur
      const notifId = 'notif_' + Math.random().toString(36).substring(2, 10);
      db.run(`
        INSERT INTO notifications (id, user_id, title, message, type)
        SELECT ?, s.user_id, ?, ?, 'study_plan'
        FROM students s WHERE s.id = ?
      `, [notifId, `Yeni Matematik Çalışması: ${title}`, `${questions.length} soruluk kişiselleştirilmiş çalışma planınız hazırlandı.`, sid]);
    }

    saveDb(db);

    return NextResponse.json({
      success: true,
      message: `${studentIds.length} öğrenciye çalışma planı başarıyla atandı.`,
      planIds: createdPlanIds
    });
  } catch (error: any) {
    console.error('Error creating study plan:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
