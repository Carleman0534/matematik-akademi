import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db/database';
import { getSession } from '@/lib/auth';
import { getPdfExamSessionState, startPdfExamSession } from '@/lib/pdfExamSession';

export const dynamic = 'force-dynamic';

// GET: öğrencinin bu PDF denemesindeki durumu (başlangıç, süre sınırı, bittiyse sonuç ve çözümler)
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Oturum gerekli.' }, { status: 401 });
  }
  if (session.role !== 'student' || !session.studentId) {
    return NextResponse.json({ success: false, error: 'Bu bilgi yalnızca öğrenci hesabıyla görülür.' }, { status: 403 });
  }
  const { id } = await ctx.params;
  const db = await getDb();
  return NextResponse.json({ success: true, ...getPdfExamSessionState(db, id, session.studentId) });
}

// POST: denemeyi başlat (ilk açılışta başlangıç anı kaydedilir, sonraki açılışlarda değişmez)
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Oturum gerekli.' }, { status: 401 });
  }
  if (session.role !== 'student' || !session.studentId) {
    return NextResponse.json({ success: false, error: 'Denemeyi yalnızca öğrenci hesabı başlatabilir.' }, { status: 403 });
  }
  const { id } = await ctx.params;
  const db = await getDb();
  const before = getPdfExamSessionState(db, id, session.studentId);
  if (!before.submittedAt && !before.startedAt) {
    startPdfExamSession(db, id, session.studentId);
    saveDb();
  }
  return NextResponse.json({ success: true, ...getPdfExamSessionState(db, id, session.studentId) });
}
