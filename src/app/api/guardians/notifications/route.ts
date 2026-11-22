import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db/database';

// Oturumdaki velinin gerçek bildirimleri
export async function GET() {
  const s = await getSession();
  if (!s || s.role !== 'parent') return NextResponse.json({ notifications: [] }, { status: s ? 403 : 401 });
  try {
    const db = await getDb();
    const st = db.prepare(`
      SELECT id, title, message, notification_type AS type, read_at, created_at
      FROM guardian_notifications
      WHERE guardian_user_id = ?
      ORDER BY created_at DESC
      LIMIT 100
    `);
    st.bind([s.userId]);
    const notifications: Record<string, unknown>[] = [];
    while (st.step()) notifications.push(st.getAsObject() as Record<string, unknown>);
    st.free();
    return NextResponse.json({ notifications });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: 'Bildirimler alınamadı: ' + msg, notifications: [] }, { status: 500 });
  }
}
