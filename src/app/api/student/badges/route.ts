import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/database';
import { getSession } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });

    const studentId = session.studentId || session.userId;
    const db = await getDb();

    // 1. Kazanılan Rozetler
    const res = db.exec(`
      SELECT * FROM student_achievement_badges
      WHERE student_id = '${studentId}'
      ORDER BY earned_at DESC
    `);

    const badges: any[] = [];
    if (res.length > 0) {
      const cols = res[0].columns;
      for (const row of res[0].values) {
        const obj: any = {};
        cols.forEach((c, idx) => { obj[c] = row[idx]; });
        badges.push(obj);
      }
    }

    // 2. Kilidi Henüz Açılmamış Hedef Rozetler
    const allBadgeDefinitions = [
      { code: 'first_100', title: 'İlk Adım', desc: 'İlk 100 matematik sorusunu tamamla', icon: '🚀' },
      { code: 'consistent_worker', title: 'Düzenli Çalışan', desc: '7 gün üst üste günlük hedefini tamamla', icon: '🔥' },
      { code: 'problem_solver', title: 'Problem Çözücü', desc: 'LGS yeni nesil testinde %80 başarı sağla', icon: '🧩' },
      { code: 'math_explorer', title: 'Matematik Kaşifi', desc: '12 LGS konusunun tamamından en az 10 soru çöz', icon: '🧭' },
      { code: 'goal_achieved', title: 'Hedefine Ulaştı', desc: 'Denemede hedeflediğin net barajını aş', icon: '🎯' },
      { code: 'growth_mindset', title: 'Gelişim Gösteren', desc: 'Önceki denemeye göre +2.0 net artış yakala', icon: '📈' },
      { code: 'review_master', title: 'Tekrar Ustası', desc: 'Aralıklı tekrar sorularını geciktirmeden çöz', icon: '🔁' }
    ];

    const earnedCodes = new Set(badges.map(b => b.badge_code));
    const upcomingBadges = allBadgeDefinitions.filter(b => !earnedCodes.has(b.code));

    return NextResponse.json({
      earnedBadges: badges,
      upcomingBadges,
      totalEarnedCount: badges.length
    });
  } catch (error: any) {
    console.error('Error fetching badges:', error);
    return NextResponse.json({ error: error.message || 'Hata oluştu' }, { status: 500 });
  }
}
