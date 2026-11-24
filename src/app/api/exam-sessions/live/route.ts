import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db/database';

// Canlı takip: son 24 saatte başlayan ya da hâlâ teslim edilmemiş deneme oturumları (gerçek veri)
export async function GET() {
  const s = await getSession();
  if (!s || s.role !== 'teacher') return NextResponse.json({ error: 'Yetkiniz yok.' }, { status: 403 });

  try {
    const db = await getDb();
    const st = db.prepare(`
      SELECT
        es.id, es.exam_id, es.student_id, es.started_at, es.deadline, es.submitted_at, es.last_seen_at,
        COALESCE(u.name, 'Öğrenci') AS student_name,
        COALESCE(e.title, p.title, 'Deneme') AS exam_title,
        COALESCE(e.question_count, p.question_count, 0) AS total_questions,
        er.net_score,
        MAX(
          COALESCE(es.progress_count, 0),
          (SELECT COUNT(*) FROM exam_answers ea
            WHERE ea.session_id = es.id AND COALESCE(ea.answer, ea.student_answer, '') <> '')
        ) AS answered_count
      FROM exam_sessions es
      LEFT JOIN students stu ON stu.id = es.student_id
      LEFT JOIN users u ON u.id = stu.user_id
      LEFT JOIN exams e ON e.id = es.exam_id
      LEFT JOIN pdf_documents p ON p.id = es.exam_id
      LEFT JOIN exam_results er ON er.exam_id = es.exam_id AND er.student_id = es.student_id
      -- Yalnızca gerçekten başlamış oturumlar: atanmış ama açılmamış deneme "devam ediyor" sayılmaz
      WHERE es.started_at IS NOT NULL
        AND (es.submitted_at IS NULL OR es.started_at >= datetime('now', '-1 day') OR es.submitted_at >= datetime('now', '-1 day'))
      GROUP BY es.id
      ORDER BY (es.submitted_at IS NULL) DESC, er.net_score DESC, es.started_at DESC
    `);
    const sessions: Record<string, unknown>[] = [];
    while (st.step()) sessions.push(st.getAsObject() as Record<string, unknown>);
    st.free();
    return NextResponse.json({ sessions });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: 'Canlı oturumlar alınamadı: ' + msg }, { status: 500 });
  }
}
