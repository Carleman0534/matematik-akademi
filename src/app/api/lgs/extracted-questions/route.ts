import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db/database';

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(req.url);
    const pdfId = searchParams.get('pdfId');
    const topicId = searchParams.get('topicId');
    const difficulty = searchParams.get('difficulty');
    const approvalStatus = searchParams.get('approvalStatus');

    let sql = `
      SELECT q.*, p.title as pdf_title, t.name as topic_name
      FROM pdf_extracted_questions q
      LEFT JOIN pdf_documents p ON q.pdf_id = p.id
      LEFT JOIN curriculum_topics t ON q.primary_topic_id = t.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (pdfId) {
      sql += ' AND q.pdf_id = ?';
      params.push(pdfId);
    }
    if (topicId) {
      sql += ' AND (q.primary_topic_id = ? OR q.secondary_topic_id = ?)';
      params.push(topicId, topicId);
    }
    if (difficulty) {
      sql += ' AND q.difficulty = ?';
      params.push(Number(difficulty));
    }
    if (approvalStatus) {
      sql += ' AND q.approval_status = ?';
      params.push(approvalStatus);
    }

    sql += ' ORDER BY q.question_no ASC';

    const stmt = db.prepare(sql);
    stmt.bind(params);
    const questions: any[] = [];
    while (stmt.step()) {
      questions.push(stmt.getAsObject());
    }
    stmt.free();

    const formatted = questions.map(q => ({
      ...q,
      options: typeof q.options_json === 'string' ? JSON.parse(q.options_json || '{}') : q.options_json
    }));

    return NextResponse.json({ success: true, questions: formatted });
  } catch (error: any) {
    console.error('Error fetching extracted questions:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, primaryTopicId, difficulty, approvalStatus, questionText, correctAnswer } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Soru kimliği belirtilmedi' }, { status: 400 });
    }

    const db = await getDb();

    if (primaryTopicId !== undefined) {
      db.run('UPDATE pdf_extracted_questions SET primary_topic_id = ? WHERE id = ?', [primaryTopicId, id]);
    }
    if (difficulty !== undefined) {
      db.run('UPDATE pdf_extracted_questions SET difficulty = ? WHERE id = ?', [Number(difficulty), id]);
    }
    if (approvalStatus !== undefined) {
      db.run('UPDATE pdf_extracted_questions SET approval_status = ? WHERE id = ?', [approvalStatus, id]);
    }
    if (questionText !== undefined) {
      db.run('UPDATE pdf_extracted_questions SET question_text = ? WHERE id = ?', [questionText, id]);
    }
    if (correctAnswer !== undefined) {
      db.run('UPDATE pdf_extracted_questions SET correct_answer = ? WHERE id = ?', [correctAnswer, id]);
    }

    saveDb(db);
    return NextResponse.json({ success: true, message: 'Soru güncellendi' });
  } catch (error: any) {
    console.error('Error updating extracted question:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
