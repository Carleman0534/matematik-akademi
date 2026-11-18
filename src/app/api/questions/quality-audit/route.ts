import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb, saveDb } from '@/lib/db/database';
import { evaluateQuestionQuality } from '@/lib/qualityAuditEngine';
import { logAuditEvent } from '@/lib/auditLog';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'teacher') {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const verdict = searchParams.get('verdict');
    const questionId = searchParams.get('questionId');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const db = await getDb();
    let query = `
      SELECT 
        qa.id, qa.question_id, qa.math_accuracy, qa.single_correct_answer,
        qa.option_consistency, qa.root_clarity, qa.grammar_correctness,
        qa.curriculum_alignment, qa.difficulty_consistency, qa.svg_accuracy,
        qa.similarity_ratio, qa.solution_accuracy, qa.audit_verdict, qa.audit_notes, qa.audited_at,
        q.question_text, q.options, q.correct_answer, q.solution, q.topic, q.difficulty, q.image_svg
      FROM question_quality_audits qa
      LEFT JOIN questions q ON qa.question_id = q.id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    if (verdict) {
      query += ` AND qa.audit_verdict = ?`;
      params.push(verdict);
    }
    if (questionId) {
      query += ` AND qa.question_id = ?`;
      params.push(questionId);
    }

    query += ` ORDER BY qa.audited_at DESC LIMIT ?`;
    params.push(limit);

    const stmt = db.prepare(query);
    stmt.bind(params);

    const audits = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      let parsedOptions = null;
      if (row.options && typeof row.options === 'string') {
        try {
          parsedOptions = JSON.parse(row.options);
        } catch {
          parsedOptions = row.options;
        }
      }

      audits.push({
        id: row.id,
        question_id: row.question_id,
        math_accuracy: Number(row.math_accuracy),
        single_correct_answer: Number(row.single_correct_answer),
        option_consistency: Number(row.option_consistency),
        root_clarity: Number(row.root_clarity),
        grammar_correctness: Number(row.grammar_correctness),
        curriculum_alignment: Number(row.curriculum_alignment),
        difficulty_consistency: Number(row.difficulty_consistency),
        svg_accuracy: Number(row.svg_accuracy),
        similarity_ratio: Number(row.similarity_ratio),
        solution_accuracy: Number(row.solution_accuracy ?? 1),
        audit_verdict: row.audit_verdict,
        audit_notes: row.audit_notes,
        audited_at: row.audited_at,
        question: row.question_text ? {
          question_text: row.question_text,
          options: parsedOptions,
          correct_answer: row.correct_answer,
          solution: row.solution,
          topic: row.topic,
          difficulty: row.difficulty,
          image_svg: row.image_svg
        } : null
      });
    }
    stmt.free();

    return NextResponse.json({ success: true, audits });
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
    const { questionId, questionText, options, correctAnswer, solution, topic, difficulty, imageSvg } = body;

    const db = await getDb();

    // Fetch existing question pool texts for similarity comparison
    const poolStmt = db.prepare(`SELECT question_text FROM questions LIMIT 100`);
    const poolTexts: string[] = [];
    while (poolStmt.step()) {
      const r = poolStmt.getAsObject();
      if (r.question_text) poolTexts.push(String(r.question_text));
    }
    poolStmt.free();

    const evaluation = evaluateQuestionQuality(
      {
        question_text: questionText,
        options,
        correct_answer: correctAnswer,
        solution,
        topic,
        difficulty,
        image_svg: imageSvg
      },
      poolTexts
    );

    const auditId = `qa-${uuidv4().slice(0, 8)}`;
    const targetQId = questionId || `q-${uuidv4().slice(0, 8)}`;

    db.run(
      `INSERT INTO question_quality_audits (
        id, question_id, math_accuracy, single_correct_answer, option_consistency,
        root_clarity, grammar_correctness, curriculum_alignment, difficulty_consistency,
        svg_accuracy, similarity_ratio, solution_accuracy, audit_verdict, audit_notes, audited_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        auditId,
        targetQId,
        evaluation.math_accuracy,
        evaluation.single_correct_answer,
        evaluation.option_consistency,
        evaluation.root_clarity,
        evaluation.grammar_correctness,
        evaluation.curriculum_alignment,
        evaluation.difficulty_consistency,
        evaluation.svg_accuracy,
        evaluation.similarity_ratio,
        evaluation.solution_accuracy,
        evaluation.audit_verdict,
        evaluation.audit_notes
      ]
    );

    saveDb(db);

    await logAuditEvent({
      userId: session.userId,
      action: 'QUESTION_QUALITY_AUDIT',
      resourceType: 'question_quality_audits',
      resourceId: auditId,
      details: { questionId: targetQId, score: evaluation.score, verdict: evaluation.audit_verdict }
    });

    return NextResponse.json({
      success: true,
      auditId,
      evaluation
    });
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
    const { auditId, verdict, notes } = body;

    if (!auditId || !verdict) {
      return NextResponse.json({ error: 'auditId ve verdict zorunludur' }, { status: 400 });
    }

    const db = await getDb();
    db.run(
      `UPDATE question_quality_audits 
       SET audit_verdict = ?, audit_notes = ?, audited_at = datetime('now')
       WHERE id = ?`,
      [verdict, notes || null, auditId]
    );

    saveDb(db);

    await logAuditEvent({
      userId: session.userId,
      action: 'UPDATE_AUDIT_VERDICT',
      resourceType: 'question_quality_audits',
      resourceId: auditId,
      details: { verdict, notes }
    });

    return NextResponse.json({ success: true, message: 'Denetim sonucu güncellendi' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bilinmeyen hata';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
