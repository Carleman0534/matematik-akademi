import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/database';
import { loadPdfAnswerSheet, type SheetFallback } from '@/lib/pdfExtraction/answerSheetDb';
import { POST as submitStudentExam } from '@/app/api/exam-results/submit-student-exam/route';

export const dynamic = 'force-dynamic';

// PDF denemesini sunucuda cevap anahtarıyla puanlar ve sonucu öğrenci sınav kayıtlarına
// (öğretmen paneli, yanlış havuzu, konu başarısı) mevcut gönderme akışıyla işler.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const answers: Record<string, string> = body?.answers && typeof body.answers === 'object' ? body.answers : {};
  const durationSeconds = Math.max(0, Number(body?.durationSeconds) || 0);
  const fallback: SheetFallback | undefined = body?.fallback && typeof body.fallback === 'object' ? body.fallback : undefined;

  const db = await getDb();
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
    const studentAnswer = String(answers[String(no)] || '').trim().toUpperCase() || null;
    return {
      questionNo: no,
      questionId: q?.id,
      questionText: q?.text || `${sheet.title} — Soru ${no}`,
      options: q?.options || undefined,
      studentAnswer,
      correctAnswer: sheet.key[no],
      topicName: q?.topicName || undefined,
    };
  });

  // Mevcut gönderme uç noktasını aynı istek bağlamında (oturum çerezleriyle) çağır
  const inner = new NextRequest(new URL('/api/exam-results/submit-student-exam', req.url), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: req.headers.get('cookie') || '' },
    body: JSON.stringify({ examId: id, examTitle: sheet.title, durationSeconds: durationSeconds || 1200, answers: payload }),
  });
  const res = await submitStudentExam(inner);
  const data = await res.json();
  if (!res.ok || !data?.success) {
    return NextResponse.json({ success: false, error: data?.error || 'Sonuç kaydedilemedi.' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    result: data.result,
    gradedCount: keyedNos.length,
    questionCount: sheet.questionCount,
    // Sınav bittiği için doğru cevaplar artık gösterilebilir
    details: payload.map(p => ({
      questionNo: p.questionNo,
      studentAnswer: p.studentAnswer,
      correctAnswer: p.correctAnswer,
      isCorrect: p.studentAnswer ? p.studentAnswer === p.correctAnswer : null,
    })),
  });
}
