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
    const { id, primaryTopicId, difficulty, approvalStatus, questionText, correctAnswer, options, pdfId, approveAll } = body;

    // Bir PDF'in cevabı belli olan tüm bekleyen sorularını toplu onayla
    if (approveAll && pdfId) {
      const db = await getDb();
      db.run(
        `UPDATE pdf_extracted_questions SET approval_status = 'approved'
         WHERE pdf_id = ? AND approval_status IN ('pending','edited') AND correct_answer IS NOT NULL AND correct_answer != ''`,
        [pdfId]
      );
      const changed = db.getRowsModified();
      saveDb(db);
      return NextResponse.json({ success: true, approved: changed });
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'Soru kimliği belirtilmedi' }, { status: 400 });
    }

    const db = await getDb();

    if (options !== undefined && options && typeof options === 'object') {
      db.run('UPDATE pdf_extracted_questions SET options_json = ? WHERE id = ?', [JSON.stringify(options), id]);
    }

    if (primaryTopicId !== undefined) {
      db.run('UPDATE pdf_extracted_questions SET primary_topic_id = ? WHERE id = ?', [primaryTopicId || null, id]);
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
      db.run('UPDATE pdf_extracted_questions SET correct_answer = ? WHERE id = ?', [correctAnswer || null, id]);
    }

    saveDb(db);
    return NextResponse.json({ success: true, message: 'Soru güncellendi' });
  } catch (error: any) {
    console.error('Error updating extracted question:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { questions } = body;

    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ success: false, error: 'Geçersiz soru listesi' }, { status: 400 });
    }

    const db = await getDb();
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO pdf_extracted_questions 
      (id, pdf_id, question_no, page_no, question_text, options_json, correct_answer, primary_topic_id, difficulty, question_type, approval_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const q of questions) {
      const qId = q.id || `ext_q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      stmt.run([
        qId,
        q.pdf_id || q.pdfId || 'custom_pdf',
        q.question_no || q.questionNo || 1,
        q.page_no || q.pageNo || 1,
        q.question_text || q.questionText || '',
        typeof q.options_json === 'string' ? q.options_json : JSON.stringify(q.options || { A: '', B: '', C: '', D: '' }),
        q.correct_answer || q.correctAnswer || 'A',
        q.primary_topic_id || q.primaryTopicId || 'top_carpanlar_katlar',
        q.difficulty || 3,
        q.question_type || q.questionType || 'yeni_nesil',
        q.approval_status || q.approvalStatus || 'approved'
      ]);
    }
    stmt.free();
    saveDb(db);

    return NextResponse.json({ success: true, count: questions.length, message: `${questions.length} adet soru başarıyla eklendi` });
  } catch (error: any) {
    console.error('Error adding extracted questions:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
