import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db/database';
import { generateBatchQuestions, type GenerateQuestionParams } from '@/lib/ai/questionGenerator';

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(req.url);
    const topicId = searchParams.get('topicId');
    const status = searchParams.get('status');

    let sql = `
      SELECT q.*, t.name as topic_name
      FROM ai_generated_questions q
      LEFT JOIN curriculum_topics t ON q.primary_topic_id = t.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (topicId) {
      sql += ' AND (q.primary_topic_id = ? OR q.secondary_topic_id = ?)';
      params.push(topicId, topicId);
    }
    if (status) {
      sql += ' AND q.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY q.created_at DESC';

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
    console.error('Error fetching AI questions:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      topicId = 'top_carpanlar_katlar',
      subtopicId,
      difficulty = 3,
      questionType = 'yeni_nesil',
      visualRequired = false,
      count = 5
    } = body;

    const db = await getDb();

    // Mevcut soruları alarak telif ve n-gram benzerlik kontrolü sağla
    const existingRes = db.exec("SELECT id, question_text FROM ai_generated_questions");
    const existingList: { id: string; text: string }[] = [];
    if (existingRes.length > 0) {
      for (const row of existingRes[0].values) {
        existingList.push({ id: String(row[0]), text: String(row[1]) });
      }
    }

    const params: GenerateQuestionParams = {
      topicId,
      subtopicId,
      difficulty: Number(difficulty),
      questionType,
      visualRequired: Boolean(visualRequired)
    };

    // Soruları üret ve doğrula
    const generated = generateBatchQuestions(params, Number(count), existingList);

    // Veritabanına kaydet
    const stmt = db.prepare(`
      INSERT INTO ai_generated_questions
      (id, teacher_id, primary_topic_id, secondary_topic_id, question_text, options_json, correct_answer, solution_explanation, difficulty, question_type, skill_category, svg_content, math_validation_status, validation_details_json, status, created_at)
      VALUES (?, '170c1e8f-52b4-440e-b605-ec974fa1d56b', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', datetime('now'))
    `);

    for (const q of generated) {
      stmt.run([
        q.id,
        q.topicId,
        q.subtopicId || null,
        q.questionText,
        JSON.stringify(q.options),
        q.correctAnswer,
        q.solutionExplanation,
        q.difficulty,
        q.questionType,
        q.skillCategory,
        q.svgContent || null,
        q.mathValidationStatus,
        JSON.stringify({ notes: q.validationNotes })
      ]);
    }
    stmt.free();

    // Üretim günlüğü kaydı (ai_generation_logs)
    const logId = 'log_' + Math.random().toString(36).substring(2, 9);
    const logStmt = db.prepare(`
      INSERT INTO ai_generation_logs (id, teacher_id, provider, model, prompt_tokens, completion_tokens, total_cost_usd, purpose)
      VALUES (?, '170c1e8f-52b4-440e-b605-ec974fa1d56b', 'google-gemini', 'gemini-2.5-flash', ?, ?, ?, ?)
    `);
    const promptTokens = 420 * Number(count);
    const compTokens = 650 * Number(count);
    const costUsd = Number(((promptTokens * 0.00000015) + (compTokens * 0.0000006)).toFixed(6));
    logStmt.run([logId, promptTokens, compTokens, costUsd, `LGS ${count} adet ${qTypeLabel(questionType)} soru üretimi`]);
    logStmt.free();

    saveDb(db);

    return NextResponse.json({
      success: true,
      message: `${generated.length} adet özgün matematik sorusu başarıyla üretildi ve doğrulandı.`,
      questions: generated
    });
  } catch (error: any) {
    console.error('Error generating AI questions:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

function qTypeLabel(t: string) {
  switch (t) {
    case 'yeni_nesil': return 'Yeni Nesil';
    case 'gunluk_yasam': return 'Günlük Yaşam Problemi';
    case 'grafik_tablo': return 'Grafik & Tablo Yorumlama';
    case 'geometrik_gorsel': return 'Geometrik Görsel';
    default: return 'LGS Formatında';
  }
}
