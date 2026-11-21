import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/database';

// PDF'ten kırpılan soru görselini veritabanından verir (pdf_question_images).
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[A-Za-z0-9_-]+$/.test(id)) {
    return NextResponse.json({ error: 'Geçersiz görsel kimliği.' }, { status: 400 });
  }
  const db = await getDb();
  const stmt = db.prepare('SELECT mime, data FROM pdf_question_images WHERE question_id = ?');
  try {
    stmt.bind([id]);
    if (!stmt.step()) return NextResponse.json({ error: 'Görsel bulunamadı.' }, { status: 404 });
    const row = stmt.getAsObject() as { mime: string; data: Uint8Array };
    return new NextResponse(new Uint8Array(row.data), {
      headers: {
        'Content-Type': row.mime || 'image/jpeg',
        // Adres her çıkarımda değişen ?v= içerir; aynı adres hep aynı görseldir
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } finally {
    stmt.free();
  }
}
