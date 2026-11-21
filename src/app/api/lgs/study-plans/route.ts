import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db/database';
import { getSession } from '@/lib/auth';
import { INITIAL_LGS_TOPICS } from '@/lib/ai/lgsCurriculum';

const TOPIC_IDS = new Set(INITIAL_LGS_TOPICS.map(t => t.id));

// study_plan_questions.question_source yalnızca 'extracted_pdf' | 'ai_generated' | 'bank' kabul eder (CHECK kısıtı)
function toQuestionSource(raw: unknown): 'extracted_pdf' | 'ai_generated' | 'bank' {
  const s = String(raw || '').toLowerCase();
  if (s === 'pdf' || s === 'extracted_pdf' || s === 'pdf_extracted') return 'extracted_pdf';
  if (s === 'bank') return 'bank';
  return 'ai_generated';
}

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(req.url);
    let studentId = searchParams.get('studentId');

    // Eğer istekte studentId yoksa aktif oturumdan öğrenciyi çözümle
    if (!studentId) {
      try {
        const session = await getSession();
        if (session && session.role === 'student' && session.studentId) {
          studentId = session.studentId;
        }
      } catch {}
    }

    let sql = `
      SELECT p.*, s.parent_name, u.name as student_name
      FROM personalized_study_plans p
      LEFT JOIN students s ON p.student_id = s.id
      LEFT JOIN users u ON s.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (studentId) {
      sql += ' AND (p.student_id = ? OR p.student_id IS NULL)';
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
        (id, plan_id, question_source, source_question_id, question_text, options_json, correct_answer, solution_explanation, svg_content, image_url, topic_id, difficulty, question_type, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      questions.forEach((q: any, idx: number) => {
        const sqId = 'spq_' + Math.random().toString(36).substring(2, 10);
        const rawText = q.question_text || q.questionText || '';
        // Öğrenciye sunulan sorularda yapay zekâ veya iç etiketler kesinlikle temizlenir
        const cleanText = rawText
          .replace(/^\d+\.\s*Soru\s*\[[^\]]+\]:\s*/gi, '')
          .replace(/^\[[^\]]+\]:\s*/gi, '')
          .trim();

        const topicId = q.topic_id || q.topicId;
        qStmt.run([
          sqId,
          planId,
          toQuestionSource(q.source_type || q.sourceType),
          String(q.id || sqId),
          cleanText || rawText,
          JSON.stringify(q.options || { A: '', B: '', C: '', D: '' }),
          q.correct_answer || q.correctAnswer || 'A',
          q.solution_explanation || q.solutionExplanation || 'Çözüm hazır.',
          q.svg_content || q.svgContent || null,
          q.image_url || q.imageUrl || null,
          topicId && TOPIC_IDS.has(topicId) ? topicId : null,
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
