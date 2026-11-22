import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db/database';
import { getSession } from '@/lib/auth';
import { loadPdfAnswerSheet, type SheetFallback } from '@/lib/pdfExtraction/answerSheetDb';
import { getPdfExamSessionState, loadPdfQuestionSolutions } from '@/lib/pdfExamSession';
import { POST as submitStudentExam } from '@/app/api/exam-results/submit-student-exam/route';

export const dynamic = 'force-dynamic';

// PDF denemesini sunucuda cevap anahtarıyla puanlar ve sonucu öğrenci sınav kayıtlarına
// (öğretmen paneli, yanlış havuzu, konu başarısı) mevcut gönderme akışıyla işler.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Oturumunuz sona erdi; yeniden giriş yapın. Cevaplarınız cihazda saklı.' }, { status: 401 });
  }
  if (session.role !== 'student' || !session.studentId) {
    return NextResponse.json({ success: false, error: 'Bu hesapla sınav gönderilemez; öğrenci hesabıyla giriş yapın (öğretmen hesabı sınavı gönderemez).' }, { status: 403 });
  }
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const answers: Record<string, string> = body?.answers && typeof body.answers === 'object' ? body.answers : {};
  const fallback: SheetFallback | undefined = body?.fallback && typeof body.fallback === 'object' ? body.fallback : undefined;

  const db = await getDb();
  const state = getPdfExamSessionState(db, id, session.studentId);
  if (state.submittedAt) {
    return NextResponse.json({ success: false, error: 'Bu denemeyi zaten tamamladınız; sonuçlarınızı inceleyebilirsiniz.' }, { status: 409 });
  }
  // Süre, sunucuda kaydedilen başlangıç anından hesaplanır (sayfa yenilense de doğru kalır).
  const startedMs = state.startedAt ? new Date(state.startedAt).getTime() : NaN;
  const durationSeconds = Number.isFinite(startedMs)
    ? Math.max(1, Math.round((Date.now() - startedMs) / 1000))
    : Math.max(1, Number(body?.durationSeconds) || 1);
  const solutions = loadPdfQuestionSolutions(db, id);
  const sheet = loadPdfAnswerSheet(db, id, fallback);
  const keyedNos = Object.keys(sheet.key).map(Number).filter(n => n >= 1 && n <= sheet.questionCount).sort((a, b) => a - b);
  if (keyedNos.length === 0) {
    return NextResponse.json(
      { success: false, error: 'Bu deneme için cevap anahtarı bulunamadı; cevaplarınız puanlanamadı. Öğretmeninizden PDF\'e cevap anahtarı eklemesini ya da PDF\'ten soru çıkarıp onaylamasını isteyin.' },
      { status: 422 }
    );
  }

  const payload = keyedNos.map(no => {
    const q = sheet.questions[no];
    const sol = solutions[no];
    const studentAnswer = String(answers[String(no)] || '').trim().toUpperCase() || null;
    return {
      questionNo: no,
      questionId: q?.id,
      questionText: sol?.questionText || q?.text || `${sheet.title} — Soru ${no}`,
      options: q?.options || undefined,
      studentAnswer,
      correctAnswer: sheet.key[no],
      topicName: sol?.topicName || q?.topicName || undefined,
      solutionExplanation: sol?.solutionText || undefined,
    };
  });

  // Mevcut gönderme uç noktasını aynı istek bağlamında (oturum çerezleriyle) çağır
  const inner = new NextRequest(new URL('/api/exam-results/submit-student-exam', req.url), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: req.headers.get('cookie') || '' },
    body: JSON.stringify({ examId: id, examTitle: sheet.title, durationSeconds, answers: payload }),
  });
  const res = await submitStudentExam(inner);
  const data = await res.json();
  if (!res.ok || !data?.success) {
    return NextResponse.json({ success: false, error: data?.error || 'Sonuç kaydedilemedi.' }, { status: 500 });
  }
  if (state.startedAt) {
    try {
      db.run('UPDATE exam_results SET started_at = ? WHERE exam_id = ? AND student_id = ?', [state.startedAt, id, session.studentId]);
      saveDb();
    } catch {}
  }

  return NextResponse.json({
    success: true,
    result: data.result,
    gradedCount: keyedNos.length,
    questionCount: sheet.questionCount,
    // Sınav bittiği için doğru cevaplar ve çözümler artık gösterilebilir
    details: payload.map(p => ({
      questionNo: p.questionNo,
      studentAnswer: p.studentAnswer,
      correctAnswer: p.correctAnswer,
      isCorrect: p.studentAnswer ? p.studentAnswer === p.correctAnswer : null,
      questionText: solutions[p.questionNo]?.questionText || null,
      solutionText: p.solutionExplanation || null,
      topicName: p.topicName || null,
    })),
  });
}
