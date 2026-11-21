import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';

// PDF'ten kırpılan soru görsellerini diskten verir (public klasörüne derlemeden sonra eklenen dosyalar
// üretim sunucusunda her zaman servis edilmediği için bu yol kullanılır).
export async function GET(_req: NextRequest, ctx: { params: Promise<{ pdf: string; file: string }> }) {
  const { pdf, file } = await ctx.params;
  if (!/^[A-Za-z0-9_-]+$/.test(pdf) || !/^q_\d+\.png$/.test(file)) {
    return NextResponse.json({ error: 'Geçersiz görsel yolu.' }, { status: 400 });
  }
  try {
    const buf = await readFile(path.join(process.cwd(), 'public', 'uploads', 'questions', pdf, file));
    return new NextResponse(new Uint8Array(buf), {
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000, immutable' },
    });
  } catch {
    return NextResponse.json({ error: 'Görsel bulunamadı.' }, { status: 404 });
  }
}
