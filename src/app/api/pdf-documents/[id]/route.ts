import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { updatePdfAnswerKey } from '@/lib/pdfDocs';
import { parseAnswerKey } from '@/lib/pdfExtraction/answerKey';
import { getDb } from '@/lib/db/database';
import { gradePendingSubmissions } from '@/lib/pdfExamSubmit';

export const dynamic = 'force-dynamic';

// PATCH { answerKey }: PDF denemesinin cevap anahtarını sonradan girer/düzeltir.
// Anahtar "ABCD…" ya da "1-A 2-C …" biçiminde olabilir; soru sayısı anahtardaki en büyük numaraya ayarlanır.
// Boş anahtar, anahtarı siler (soru sayısı değişmez).
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || (session.role !== 'teacher')) {
    return NextResponse.json({ success: false, error: 'Bu işlem için öğretmen girişi gerekli.' }, { status: 403 });
  }
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const raw = typeof body?.answerKey === 'string' ? body.answerKey.trim() : '';
  if (raw.length > 2000) {
    return NextResponse.json({ success: false, error: 'Cevap anahtarı çok uzun.' }, { status: 400 });
  }

  const parsed = parseAnswerKey(raw);
  const nos = Object.keys(parsed).map(Number);
  if (raw && nos.length === 0) {
    return NextResponse.json({ success: false, error: 'Cevap anahtarında A–E harfi bulunamadı.' }, { status: 400 });
  }
  const questionCount = nos.length ? Math.max(...nos) : null;

  const found = await updatePdfAnswerKey(id, raw, questionCount);
  if (!found) {
    return NextResponse.json({ success: false, error: 'PDF sunucuda bulunamadı.' }, { status: 404 });
  }
  // Anahtarsız teslim edilmiş denemeler varsa şimdi puanla
  let gradedPending = 0;
  if (nos.length) {
    try { gradedPending = await gradePendingSubmissions(req, await getDb(), id); } catch (e) { console.error('Bekleyen denemeler puanlanamadı:', e); }
  }
  return NextResponse.json({ success: true, answerKey: raw, questionCount, answeredCount: nos.length, gradedPending });
}
