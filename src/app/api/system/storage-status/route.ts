import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getStorageStatus, migrateInlinePdfsToBlob } from '@/lib/db/database';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Depolama tanılaması (yalnızca öğretmen): veritabanı boyutu, Blob'a taşınmayı bekleyen PDF'ler, kaydedilmemiş değişiklikler
export async function GET() {
  const s = await getSession();
  if (!s || s.role !== 'teacher') return NextResponse.json({ error: 'Yetkiniz yok.' }, { status: 403 });
  return NextResponse.json(await getStorageStatus());
}

// Veritabanına gömülü eski PDF'lerden birkaçını Blob'a taşır (bir tur). Kalan varsa tekrar çağrılır.
// Tur isteğin içinde, süre sınırı tanımlı olarak çalışır; hata olursa doğrudan yanıtta görünür.
export async function POST(req: NextRequest) {
  const s = await getSession();
  if (!s || s.role !== 'teacher') return NextResponse.json({ error: 'Yetkiniz yok.' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const maxPdfs = Math.min(10, Math.max(1, Number(body?.maxPdfs) || 2));
  const t0 = Date.now();
  try {
    const r = await migrateInlinePdfsToBlob({ maxPdfs, budgetMs: 25000 });
    return NextResponse.json({ ok: true, ...r, ms: Date.now() - t0, status: await getStorageStatus() });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String((err as Error)?.message || err), ms: Date.now() - t0 }, { status: 500 });
  }
}
