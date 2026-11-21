import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/database';
import { loadPdfAnswerSheet } from '@/lib/pdfExtraction/answerSheetDb';

export const dynamic = 'force-dynamic';

// Öğrencinin optik formu için soru sayısı ve şıklar. Cevap anahtarı burada gönderilmez.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const db = await getDb();
  const sheet = loadPdfAnswerSheet(db, id);
  return NextResponse.json({
    success: true,
    found: sheet.found,
    title: sheet.title,
    questionCount: sheet.questionCount,
    letters: sheet.letters,
    hasKey: sheet.keySource !== 'none',
    keySource: sheet.keySource,
  });
}
