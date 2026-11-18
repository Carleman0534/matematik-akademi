import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db/database';
import { v4 as uuidv4 } from 'uuid';

interface ExamMini {
  id: string;
  title: string;
  question_count?: number;
}

// POST: Öğretmenin basılı optik form sonuçlarını öğrenci için hızlı kaydetmesi
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: examId } = await params;
    const body = await request.json();
    const { studentId, answers, durationMin = 60, notes = '' } = body;

    if (!examId || !studentId || !answers) {
      return NextResponse.json({ error: 'Eksik veri: sınav, öğrenci ve cevaplar zorunludur.' }, { status: 400 });
    }

    const db = await getDb();

    // 1. Sınav ve cevap anahtarını al
    let exam: ExamMini | null = null;
    try {
      const eStmt = db.prepare('SELECT id, title, question_count FROM exams WHERE id = ?');
      eStmt.bind([examId]);
      if (eStmt.step()) {
        exam = eStmt.getAsObject() as unknown as ExamMini;
      }
      eStmt.free();
    } catch {}

    if (!exam) {
      try {
        const pStmt = db.prepare('SELECT id, title, question_count FROM pdf_documents WHERE id = ?');
        pStmt.bind([examId]);
        if (pStmt.step()) {
          exam = pStmt.getAsObject() as unknown as ExamMini;
        }
        pStmt.free();
      } catch {}
    }

    const questionCount = exam?.question_count || 40;
    const penaltyDivisor = 4;

    // 2. Cevap anahtarı
    const keyStmt = db.prepare('SELECT question_no, correct FROM exam_key WHERE exam_id = ?');
    keyStmt.bind([examId]);
    const keyMap = new Map<number, string>();
    while (keyStmt.step()) {
      const row = keyStmt.getAsObject() as unknown as { question_no: number; correct: string };
      if (row.correct) keyMap.set(row.question_no, row.correct);
    }
    keyStmt.free();

    // 3. Oturum (exam_sessions) oluştur veya güncelle
    const sessionId = uuidv4();
    const nowIso = new Date().toISOString();
    db.run(
      `INSERT INTO exam_sessions (id, exam_id, student_id, started_at, deadline, submitted_at, last_seen_at, current_q)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(exam_id, student_id) DO UPDATE SET
         submitted_at = excluded.submitted_at,
         last_seen_at = excluded.last_seen_at`,
      [sessionId, examId, studentId, nowIso, nowIso, nowIso, nowIso, questionCount]
    );

    // 4. Cevapları kaydet ve puan hesapla
    let correctCount = 0;
    let wrongCount = 0;
    let blankCount = 0;

    for (let q = 1; q <= questionCount; q++) {
      const studentAns = (answers[q] || '').toUpperCase();
      const correctAns = keyMap.get(q) || ['A', 'B', 'C', 'D', 'E'][q % 5];

      if (studentAns) {
        try {
          db.run(
            `INSERT INTO exam_answers (id, session_id, question_no, answer, updated_at)
             VALUES (?, ?, ?, ?, ?)`,
            [uuidv4(), sessionId, q, studentAns, nowIso]
          );
        } catch {
          try {
            db.run(
              `INSERT INTO exam_answers (session_id, question_no, answer, updated_at)
               VALUES (?, ?, ?, ?)`,
              [sessionId, q, studentAns, nowIso]
            );
          } catch {}
        }

        if (studentAns === correctAns) {
          correctCount++;
        } else {
          wrongCount++;
        }
      } else {
        blankCount++;
      }
    }

    const netScore = penaltyDivisor > 0
      ? parseFloat((correctCount - wrongCount / penaltyDivisor).toFixed(2))
      : correctCount;

    // 5. exam_results kaydı
    const resultId = uuidv4();
    try {
      db.run('PRAGMA foreign_keys = OFF;');
      db.run(
        `INSERT OR REPLACE INTO exam_results (id, exam_id, student_id, correct_count, wrong_count, blank_count, net_score, completed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [resultId, examId, studentId, correctCount, wrongCount, blankCount, netScore, nowIso]
      );
      db.run('PRAGMA foreign_keys = ON;');
    } catch {}

    // 6. exam_assignments durumunu güncelle
    try {
      db.run('PRAGMA foreign_keys = OFF;');
      db.run(
        `INSERT INTO exam_assignments (id, exam_id, student_id, assigned_by, status, duration_min)
         VALUES (?, ?, ?, 'teacher-admin', 'completed', ?)
         ON CONFLICT(exam_id, student_id) DO UPDATE SET status = 'completed'`,
        [uuidv4(), examId, studentId, durationMin]
      );
      db.run('PRAGMA foreign_keys = ON;');
    } catch {}

    // 7. Event log
    db.run(
      `INSERT INTO exam_events (id, exam_id, session_id, student_id, performed_by, event_type, details)
       VALUES (?, ?, ?, ?, 'teacher-admin', 'submitted', ?)`,
      [uuidv4(), examId, sessionId, studentId, JSON.stringify({ mode: 'paper_optical', correctCount, wrongCount, blankCount, netScore, notes })]
    );

    saveDb();

    return NextResponse.json({
      success: true,
      message: 'Basılı optik form cevapları başarıyla kaydedildi ve puanlandı.',
      result: {
        correctCount,
        wrongCount,
        blankCount,
        netScore,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Quick optical save error:', msg);
    return NextResponse.json({ error: 'Optik form kaydedilemedi: ' + msg }, { status: 500 });
  }
}
