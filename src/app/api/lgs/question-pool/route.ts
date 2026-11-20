import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/database';

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(req.url);
    const topicId = searchParams.get('topicId');
    const source = searchParams.get('source'); // 'all', 'pdf', 'ai'
    const difficulty = searchParams.get('difficulty');
    const hasVisual = searchParams.get('hasVisual');
    const search = searchParams.get('search');

    const pool: any[] = [];

    // 1. PDF extracted questions
    if (!source || source === 'all' || source === 'pdf') {
      let qSql = `
        SELECT q.id, q.question_text, q.options_json, q.correct_answer, q.primary_topic_id, q.difficulty, q.question_type,
               p.title as source_title, 'pdf_extracted' as source_type, t.name as topic_name, NULL as svg_content
        FROM pdf_extracted_questions q
        LEFT JOIN pdf_documents p ON q.pdf_id = p.id
        LEFT JOIN curriculum_topics t ON q.primary_topic_id = t.id
        WHERE q.approval_status != 'rejected'
      `;
      const qParams: any[] = [];
      if (topicId) {
        qSql += ' AND (q.primary_topic_id = ? OR q.secondary_topic_id = ?)';
        qParams.push(topicId, topicId);
      }
      if (difficulty) {
        qSql += ' AND q.difficulty = ?';
        qParams.push(Number(difficulty));
      }
      const pdfId = searchParams.get('pdfId');
      const pdfIds = searchParams.get('pdfIds');
      if (pdfId) {
        qSql += ' AND q.pdf_id = ?';
        qParams.push(pdfId);
      } else if (pdfIds) {
        const idsList = pdfIds.split(',').map(s => s.trim()).filter(Boolean);
        if (idsList.length > 0) {
          qSql += ` AND q.pdf_id IN (${idsList.map(() => '?').join(',')})`;
          qParams.push(...idsList);
        }
      }

      const qStmt = db.prepare(qSql);
      qStmt.bind(qParams);
      while (qStmt.step()) {
        const item = qStmt.getAsObject();
        pool.push({
          ...item,
          options: typeof item.options_json === 'string' ? JSON.parse(item.options_json || '{}') : item.options_json,
          has_visual: item.question_type === 'grafik_tablo' || item.question_type === 'geometrik_gorsel'
        });
      }
      qStmt.free();
    }

    // 2. AI generated questions
    if (!source || source === 'all' || source === 'ai') {
      let aiSql = `
        SELECT q.id, q.question_text, q.options_json, q.correct_answer, q.primary_topic_id, q.difficulty, q.question_type,
               'Yapay Zekâ (Gemini LGS)' as source_title, 'ai_generated' as source_type, t.name as topic_name, q.svg_content
        FROM ai_generated_questions q
        LEFT JOIN curriculum_topics t ON q.primary_topic_id = t.id
        WHERE q.status != 'rejected'
      `;
      const aiParams: any[] = [];
      if (topicId) {
        aiSql += ' AND (q.primary_topic_id = ? OR q.secondary_topic_id = ?)';
        aiParams.push(topicId, topicId);
      }
      if (difficulty) {
        aiSql += ' AND q.difficulty = ?';
        aiParams.push(Number(difficulty));
      }

      const aiStmt = db.prepare(aiSql);
      aiStmt.bind(aiParams);
      while (aiStmt.step()) {
        const item = aiStmt.getAsObject();
        pool.push({
          ...item,
          options: typeof item.options_json === 'string' ? JSON.parse(item.options_json || '{}') : item.options_json,
          has_visual: Boolean(item.svg_content)
        });
      }
      aiStmt.free();
    }

    // Filtreleme (arama ve görsel filtresi)
    let filtered = pool;
    if (hasVisual === 'true') {
      filtered = filtered.filter(q => q.has_visual);
    }
    if (search && search.trim() !== '') {
      const s = search.toLowerCase();
      filtered = filtered.filter(q => (q.question_text || '').toLowerCase().includes(s) || (q.topic_name || '').toLowerCase().includes(s));
    }

    return NextResponse.json({
      success: true,
      totalCount: filtered.length,
      questions: filtered
    });
  } catch (error: any) {
    console.error('Error in question pool API:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
