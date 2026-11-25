import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getStorageStatus } from '@/lib/db/database';

export const dynamic = 'force-dynamic';

// Depolama tanılaması (yalnızca öğretmen): veritabanı boyutu, Blob'a taşınmayı bekleyen PDF'ler, kaydedilmemiş değişiklikler
export async function GET() {
  const s = await getSession();
  if (!s || s.role !== 'teacher') return NextResponse.json({ error: 'Yetkiniz yok.' }, { status: 403 });
  return NextResponse.json(await getStorageStatus());
}
