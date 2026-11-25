import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/database';
import { getSession } from '@/lib/auth';
import type { SheetFallback } from '@/lib/pdfExtraction/answerSheetDb';
import { getPdfExamSessionState } from '@/lib/pdfExamSession';
import { scoreAndStorePdfExam, storeUngradedSubmission } from '@/lib/pdfExamSubmit';

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

  const out = await scoreAndStorePdfExam(req, db, {
    examId: id,
    studentId: session.studentId,
    answers,
    durationSeconds,
    fallback,
    startedAtIso: state.startedAt,
  });
  // Cevap anahtarı henüz yok: cevapları sakla, puanlama anahtar eklenince yapılır
  if (!out.ok && out.status === 422) {
    storeUngradedSubmission(db, id, session.studentId, answers, durationSeconds);
    return NextResponse.json({ success: true, pendingGrade: true, durationSeconds });
  }
  if (!out.ok) return NextResponse.json({ success: false, error: out.error }, { status: out.status });

  return NextResponse.json({
    success: true,
    result: out.result,
    gradedCount: out.gradedCount,
    questionCount: out.questionCount,
    details: out.details,
  });
}
