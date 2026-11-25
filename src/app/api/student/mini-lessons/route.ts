import { NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db/database';
import { getSession } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const topicId = searchParams.get('topicId');

    const db = await getDb();
    let query = `
      SELECT ml.*, t.name as topic_name
      FROM mini_lesson_topics ml
      JOIN curriculum_topics t ON ml.topic_id = t.id
      WHERE ml.is_active = 1
    `;
    if (topicId) {
      query += ` AND ml.topic_id = '${topicId}'`;
    }
    query += ` ORDER BY ml.sort_order ASC`;

    const res = db.exec(query);
    const lessons: any[] = [];
    if (res.length > 0) {
      const cols = res[0].columns;
      for (const row of res[0].values) {
        const obj: any = {};
        cols.forEach((c, idx) => { obj[c] = row[idx]; });
        lessons.push({
          id: obj.id,
          topicId: obj.topic_id,
          topicName: obj.topic_name,
          title: obj.title,
          summaryText: obj.summary_text,
          formulas: typeof obj.formulas_json === 'string' ? JSON.parse(obj.formulas_json || '[]') : obj.formulas_json,
          solvedExamples: typeof obj.solved_examples_json === 'string' ? JSON.parse(obj.solved_examples_json || '[]') : obj.solved_examples_json,
          videoUrl: obj.video_url,
          pdfUrl: obj.pdf_url
        });
      }
    }

    return NextResponse.json({ lessons });
  } catch (error: any) {
    console.error('Error fetching mini lessons:', error);
    return NextResponse.json({ error: error.message || 'Hata oluştu' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'teacher') {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
    }

    const body = await req.json();
    const { topicId, title, summaryText, formulas, solvedExamples, videoUrl } = body;

    const db = await getDb();
    const id = 'ml-' + Date.now();

    db.run(`
      INSERT INTO mini_lesson_topics (
        id, topic_id, title, summary_text, formulas_json, solved_examples_json, video_url, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `, [
      id,
      topicId,
      title,
      summaryText,
      JSON.stringify(formulas || []),
      JSON.stringify(solvedExamples || []),
      videoUrl || null
    ]);

    await saveDb();
    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Ders eklenemedi' }, { status: 500 });
  }
}
