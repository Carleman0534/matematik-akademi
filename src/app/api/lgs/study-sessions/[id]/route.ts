import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db/database';
import { getNextAdaptiveDifficulty } from '@/lib/ai/adaptiveLearning';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: planId } = await params;
    const db = await getDb();

    // 1. Plan detayını getir
    const pRes = db.exec(`SELECT * FROM personalized_study_plans WHERE id = '${planId}'`);
    if (!pRes.length || pRes[0].values.length === 0) {
      return NextResponse.json({ success: false, error: 'Çalışma planı bulunamadı' }, { status: 404 });
    }
    const pCols = pRes[0].columns;
    const plan: any = {};
    pCols.forEach((c, idx) => { plan[c] = pRes[0].values[0][idx]; });

    // 2. Plan soruları
    const qRes = db.exec(`SELECT * FROM study_plan_questions WHERE plan_id = '${planId}' ORDER BY sort_order ASC`);
    const questions: any[] = [];
    if (qRes.length > 0) {
      const qCols = qRes[0].columns;
      for (const row of qRes[0].values) {
        const obj: any = {};
        qCols.forEach((c, idx) => { obj[c] = row[idx]; });
        obj.options = typeof obj.options_json === 'string' ? JSON.parse(obj.options_json || '{}') : obj.options_json;
        questions.push(obj);
      }
    }

    // Sorular boşsa (ör. yeni atanan veya şablon plan), yapay zekâ motorundan otomatik özgün sorular üret
    if (questions.length === 0) {
      let topicIds: string[] = ['top_carpanlar_katlar'];
      try {
        topicIds = typeof plan.topic_ids_json === 'string' 
          ? JSON.parse(plan.topic_ids_json || '["top_carpanlar_katlar"]') 
          : (plan.topic_ids_json || ['top_carpanlar_katlar']);
      } catch {}
      if (!Array.isArray(topicIds) || topicIds.length === 0) topicIds = ['top_carpanlar_katlar', 'top_karekoklu_ifadeler'];

      const count = Math.min(20, Math.max(5, Number(plan.total_questions) || 10));
      const { generateCurriculumQuestion } = await import('@/lib/ai/questionGenerator');
      const stmt = db.prepare(`
        INSERT INTO study_plan_questions
        (id, plan_id, question_source, source_question_id, question_text, options_json, correct_answer, solution_explanation, svg_content, topic_id, difficulty, question_type, sort_order)
        VALUES (?, ?, 'lgs_curriculum', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (let i = 0; i < count; i++) {
        const tId = topicIds[i % topicIds.length];
        const qId = `spq_${planId}_${i + 1}`;
        const gen = generateCurriculumQuestion({
          topicId: tId,
          difficulty: 3,
          questionType: 'yeni_nesil',
          visualRequired: i % 2 === 1,
          variationIndex: i
        });

        stmt.run([
          qId,
          planId,
          gen.id,
          gen.questionText,
          JSON.stringify(gen.options),
          gen.correctAnswer,
          gen.solutionExplanation,
          gen.svgContent || null,
          tId,
          3,
          gen.questionType,
          i + 1
        ]);

        questions.push({
          id: qId,
          plan_id: planId,
          question_source: 'lgs_curriculum',
          source_question_id: gen.id,
          question_text: gen.questionText,
          options_json: JSON.stringify(gen.options),
          options: gen.options,
          correct_answer: gen.correctAnswer,
          solution_explanation: gen.solutionExplanation,
          svg_content: gen.svgContent || null,
          topic_id: tId,
          difficulty: 3,
          question_type: gen.questionType,
          sort_order: i + 1
        });
      }
      stmt.free();
      try {
        const { saveDb } = await import('@/lib/db/database');
        await saveDb();
      } catch {}
    }

    return NextResponse.json({
      success: true,
      plan,
      questions
    });
  } catch (error: any) {
    console.error('Error fetching study session:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: planId } = await params;
    const body = await req.json();
    const {
      questionId,
      studentId = '50fa22f6-1021-4dde-8278-2339fa65030d',
      studentAnswer,
      durationSeconds = 45,
      streak = 0
    } = body;

    const db = await getDb();

    // Sorunun doğru cevabını ve çözümünü bul
    const qRes = db.exec(`SELECT * FROM study_plan_questions WHERE id = '${questionId}' OR source_question_id = '${questionId}'`);
    if (!qRes.length || qRes[0].values.length === 0) {
      return NextResponse.json({ success: false, error: 'Soru bulunamadı' }, { status: 404 });
    }
    const qCols = qRes[0].columns;
    const qObj: any = {};
    qCols.forEach((c, idx) => { qObj[c] = qRes[0].values[0][idx]; });

    const isCorrect = (studentAnswer || '').trim().toUpperCase() === (qObj.correct_answer || '').trim().toUpperCase();

    // Öğrenme olayı kaydı
    const eventId = 'evt_' + Math.random().toString(36).substring(2, 10);
    db.run(`
      INSERT INTO student_learning_events
      (id, student_id, plan_id, question_id, topic_id, student_answer, is_correct, duration_seconds, cognitive_trigger, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `, [
      eventId,
      studentId,
      planId,
      questionId,
      qObj.topic_id || 'top_carpanlar_katlar',
      studentAnswer,
      isCorrect ? 1 : 0,
      durationSeconds,
      isCorrect ? 'dogru_cozum' : 'yanlis_analiz'
    ]);

    // Uyarlanabilir zorluk kademesi hesabı
    const currentDiff = qObj.difficulty || 3;
    const nextDiff = getNextAdaptiveDifficulty(currentDiff, isCorrect, streak);

    // Öğrencinin konu performansını güncelle
    if (qObj.topic_id) {
      if (isCorrect) {
        db.run(`
          UPDATE student_topic_performance 
          SET solved_count = solved_count + 1, correct_count = correct_count + 1, last_tested_at = datetime('now')
          WHERE student_id = ? AND topic_id = ?
        `, [studentId, qObj.topic_id]);
      } else {
        db.run(`
          UPDATE student_topic_performance 
          SET solved_count = solved_count + 1, wrong_count = wrong_count + 1, last_tested_at = datetime('now')
          WHERE student_id = ? AND topic_id = ?
        `, [studentId, qObj.topic_id]);
      }
    }

    saveDb(db);

    return NextResponse.json({
      success: true,
      isCorrect,
      correctAnswer: qObj.correct_answer,
      solutionExplanation: qObj.solution_explanation,
      nextDifficulty: nextDiff,
      streak: isCorrect ? streak + 1 : 0
    });
  } catch (error: any) {
    console.error('Error answering question in session:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
