import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db/database';
import { v4 as uuidv4 } from 'uuid';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const db = await getDb();

    // Oturum ve deneme bilgilerini al
    const sStmt = db.prepare(`
      SELECT es.*, e.id as exam_id, e.question_count, e.penalty_divisor
      FROM exam_sessions es
      JOIN exams e ON e.id = es.exam_id
      WHERE es.id = ?
    `);
    sStmt.bind([sessionId]);

    if (!sStmt.step()) {
      sStmt.free();
      return NextResponse.json({ error: 'Sınav oturumu bulunamadı.' }, { status: 404 });
    }
    const sess = sStmt.getAsObject() as any;
    sStmt.free();

    // submitted_at güncelle
    const nowIso = new Date().toISOString();
    db.run(
      `UPDATE exam_sessions SET submitted_at = ?, last_seen_at = ? WHERE id = ?`,
      [nowIso, nowIso, sessionId]
    );

    // exam_assignments durumunu completed yap
    db.run(
      `UPDATE exam_assignments SET status = 'completed' WHERE exam_id = ? AND student_id = ?`,
      [sess.exam_id, sess.student_id]
    );

    // Cevap anahtarını al
    const keyStmt = db.prepare('SELECT question_no, correct FROM exam_key WHERE exam_id = ?');
    keyStmt.bind([sess.exam_id]);
    const correctKey = new Map<number, string>();
    while (keyStmt.step()) {
      const row = keyStmt.getAsObject() as any;
      if (row.correct) correctKey.set(row.question_no, row.correct);
    }
    keyStmt.free();

    // Öğrencinin cevaplarını al
    const ansStmt = db.prepare('SELECT question_no, answer FROM exam_answers WHERE session_id = ?');
    ansStmt.bind([sessionId]);
    const studentAnswers = new Map<number, string>();
    while (ansStmt.step()) {
      const row = ansStmt.getAsObject() as any;
      if (row.answer) studentAnswers.set(row.question_no, row.answer);
    }
    ansStmt.free();

    // Net ve doğru/yanlış hesapla
    let correctCount = 0;
    let wrongCount = 0;
    let blankCount = 0;
    const questionCount = sess.question_count || 40;
    const penaltyDivisor = sess.penalty_divisor ?? 4;

    for (let q = 1; q <= questionCount; q++) {
      const studentAns = studentAnswers.get(q);
      const correctAns = correctKey.get(q);

      if (!studentAns) {
        blankCount++;
      } else if (correctAns && studentAns === correctAns) {
        correctCount++;
      } else {
        wrongCount++;
      }
    }

    const netScore = penaltyDivisor > 0
      ? parseFloat((correctCount - wrongCount / penaltyDivisor).toFixed(2))
      : correctCount;

    // exam_results tablosuna kaydet
    const resultId = uuidv4();
    db.run(
      `INSERT OR REPLACE INTO exam_results (id, exam_id, student_id, correct_count, wrong_count, blank_count, net_score, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [resultId, sess.exam_id, sess.student_id, correctCount, wrongCount, blankCount, netScore, nowIso]
    );

    // Event log
    db.run(
      `INSERT INTO exam_events (id, exam_id, session_id, student_id, event_type, details)
       VALUES (?, ?, ?, ?, 'submitted', ?)`,
      [uuidv4(), sess.exam_id, sessionId, sess.student_id, JSON.stringify({ correctCount, wrongCount, blankCount, netScore })]
    );

    saveDb();

    return NextResponse.json({
      success: true,
      result: {
        correctCount,
        wrongCount,
        blankCount,
        netScore,
        submittedAt: nowIso,
      },
    });
  } catch (err: any) {
    console.error('Submit exam error:', err);
    return NextResponse.json({ error: 'Sınav tamamlanırken hata oluştu.' }, { status: 500 });
  }
}
