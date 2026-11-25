import { NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db/database';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const db = await getDb();
    const res = db.exec(`SELECT * FROM exam_countdown_settings WHERE id = 'lgs-target' LIMIT 1`);

    let examTitle = '2027 LGS Matematik Sınavı';
    let targetDate = '2027-06-06';

    if (res.length > 0 && res[0].values.length > 0) {
      examTitle = String(res[0].values[0][1]);
      targetDate = String(res[0].values[0][2]);
    }

    const targetTime = new Date(targetDate).getTime();
    const now = Date.now();
    const diffMs = targetTime - now;
    const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    return NextResponse.json({
      examTitle,
      targetDate,
      daysRemaining,
      targetNet: 17.5,
      currentAvgNet: 14.25
    });
  } catch (error: any) {
    console.error('Error fetching countdown:', error);
    return NextResponse.json({ error: error.message || 'Hata oluştu' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'teacher') {
      return NextResponse.json({ error: 'Sadece öğretmen güncelleyebilir' }, { status: 403 });
    }

    const body = await req.json();
    const { examTitle, targetDate } = body;

    const db = await getDb();
    db.run(`
      INSERT OR REPLACE INTO exam_countdown_settings (id, exam_title, target_date, updated_by, updated_at)
      VALUES ('lgs-target', ?, ?, ?, datetime('now'))
    `, [examTitle || 'LGS Matematik', targetDate, session.userId]);

    await saveDb();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Güncelleme başarısız' }, { status: 500 });
  }
}
