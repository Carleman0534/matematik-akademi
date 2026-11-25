import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db/database';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const body = await request.json();
    const { questionNo, answer } = body;

    if (!sessionId || !questionNo) {
      return NextResponse.json({ error: 'Eksik parametre.' }, { status: 400 });
    }

    const db = await getDb();

    // Oturumun teslim edilip edilmediğini kontrol et
    const sStmt = db.prepare('SELECT deadline, submitted_at FROM exam_sessions WHERE id = ?');
    sStmt.bind([sessionId]);
    if (!sStmt.step()) {
      sStmt.free();
      return NextResponse.json({ error: 'Sınav oturumu bulunamadı.' }, { status: 404 });
    }
    const sess = sStmt.getAsObject() as unknown as { deadline: string; submitted_at: string | null };
    sStmt.free();

    if (sess.submitted_at) {
      return NextResponse.json({ error: 'Sınav zaten tamamlanmış ve teslim edilmiş.' }, { status: 400 });
    }

    // Cevabı kaydet veya güncelle
    db.run(
      `INSERT INTO exam_answers (session_id, question_no, answer, updated_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(session_id, question_no) DO UPDATE SET
         answer = excluded.answer,
         updated_at = datetime('now')`,
      [sessionId, parseInt(questionNo), answer || null]
    );

    // Heartbeat ve son soru numarasını güncelle
    db.run(
      `UPDATE exam_sessions SET last_seen_at = datetime('now'), current_q = ? WHERE id = ?`,
      [parseInt(questionNo), sessionId]
    );

    saveDb();

    return NextResponse.json({
      success: true,
      savedAt: new Date().toISOString(),
      questionNo,
      answer,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Answer save error:', msg);
    return NextResponse.json({ error: 'Cevap kaydedilemedi: ' + msg }, { status: 500 });
  }
}
