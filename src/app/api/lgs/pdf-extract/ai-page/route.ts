import { NextRequest, NextResponse } from 'next/server';
import { analyzePageWithGemini, geminiKey } from '@/lib/pdfExtraction/geminiPage';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Tek bir sayfa görselini Gemini ile okur: { image: base64 JPEG } → { questions }
export async function POST(req: NextRequest) {
  if (!geminiKey()) {
    return NextResponse.json({ success: false, error: 'Sunucuda GEMINI_API_KEY tanımlı değil.' }, { status: 400 });
  }
  try {
    const body = await req.json();
    const image = typeof body?.image === 'string' ? body.image.replace(/^data:[^,]+,/, '') : '';
    if (!image) return NextResponse.json({ success: false, error: 'Sayfa görseli eksik.' }, { status: 400 });
    const questions = await analyzePageWithGemini(image, body?.mimeType || 'image/jpeg');
    return NextResponse.json({ success: true, questions });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[pdf-extract/ai-page]', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 502 });
  }
}
