import { NextResponse } from 'next/server';
import { getDb, commitDb } from '@/lib/db/database';
import { getSession } from '@/lib/auth';
import { calculateNextSpacedRepetition, estimateForgettingRisk } from '@/lib/learning/diagnosticEngine';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const requested = searchParams.get('studentId');
    // Öğretmen istediği öğrenciyi seçebilir; öğrenci yalnızca kendi kaydını görür.
    let targetStudentId: string | null;
    if (session.role === 'teacher') {
      targetStudentId = requested || null;
    } else if (session.role === 'student') {
      if (requested && requested !== session.studentId) {
        return NextResponse.json({ error: 'Yalnızca kendi verilerinizi görebilirsiniz.' }, { status: 403 });
      }
      targetStudentId = session.studentId;
    } else {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
    }

    if (!targetStudentId) {
      return NextResponse.json({ error: 'Öğrenci ID belirtilmedi' }, { status: 400 });
    }

    const db = await getDb();

    // 1. Günü gelen veya geçmiş tekrar soruları
    const dueRes = db.exec(`
      SELECT sr.*, t.name as topic_name
      FROM spaced_repetition_items sr
      JOIN curriculum_topics t ON sr.topic_id = t.id
      WHERE sr.student_id = ?
      ORDER BY sr.next_review_at ASC
    `, [targetStudentId]);

    const items: any[] = [];
    if (dueRes.length > 0) {
      const cols = dueRes[0].columns;
      for (const row of dueRes[0].values) {
        const obj: any = {};
        cols.forEach((c, idx) => { obj[c] = row[idx]; });
        items.push({
          id: obj.id,
          topicId: obj.topic_id,
          topicName: obj.topic_name,
          sourceType: obj.source_type,
          sourceId: obj.source_id,
          questionText: obj.question_text,
          repetitionLevel: obj.repetition_level,
          easeFactor: obj.ease_factor,
          intervalDays: obj.interval_days,
          lastReviewedAt: obj.last_reviewed_at,
          nextReviewAt: obj.next_review_at,
          lastPerformance: obj.last_performance,
          forgettingRisk: obj.forgetting_risk,
          isMastered: obj.is_mastered === 1
        });
      }
    }

    // 2. Konu bazlı unutma riski tablosu (Section 4)
    const riskRes = db.exec(`
      SELECT t.id, t.name as topic_name, 
             MAX(sr.last_reviewed_at) as last_study,
             AVG(sr.repetition_level) as avg_level
      FROM curriculum_topics t
      LEFT JOIN spaced_repetition_items sr ON t.id = sr.topic_id AND sr.student_id = ?
      WHERE t.parent_id IS NULL AND t.is_active = 1
      GROUP BY t.id, t.name
      ORDER BY t.sort_order ASC
    `, [targetStudentId]);

    const forgettingRiskTable: any[] = [];
    if (riskRes.length > 0) {
      const cols = riskRes[0].columns;
      for (const row of riskRes[0].values) {
        const obj: any = {};
        cols.forEach((c, idx) => { obj[c] = row[idx]; });
        
        // Bu konuda hiç tekrar kaydı yoksa risk tahmin edilmez (uydurma "yüksek risk" gösterilmez)
        if (!obj.last_study) {
          forgettingRiskTable.push({
            topicId: obj.id,
            topicName: obj.topic_name,
            lastStudyText: 'Henüz çalışılmadı',
            daysAgo: null,
            forgettingRisk: 'veri_yok',
            recommendedAction: 'Tekrar verisi oluşunca risk hesaplanır',
          });
          continue;
        }
        const diffMs = Date.now() - new Date(obj.last_study).getTime();
        const daysAgo = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
        const lastStudyText = daysAgo === 0 ? 'Bugün' : `${daysAgo} gün önce`;

        const risk = estimateForgettingRisk(daysAgo, (obj.avg_level || 1) * 20);

        forgettingRiskTable.push({
          topicId: obj.id,
          topicName: obj.topic_name,
          lastStudyText,
          daysAgo,
          forgettingRisk: risk, // 'dusuk' | 'orta' | 'yuksek'
          recommendedAction: risk === 'yuksek' 
            ? 'Acil pekiştirme ve tekrar testi çözülmeli' 
            : risk === 'orta' 
            ? 'Haftalık programda 10 soruluk hatırlatma' 
            : 'Bilgi kalıcılığı iyi düzeyde'
        });
      }
    }

    return NextResponse.json({
      items,
      forgettingRiskTable
    });
  } catch (error: any) {
    console.error('Error in spaced-repetition GET:', error);
    return NextResponse.json({ error: error.message || 'Hata oluştu' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });

    const body = await req.json();
    const { itemId, performance } = body; // 'correct' | 'incorrect' | 'blank'

    const db = await getDb();
    const currentRes = db.exec('SELECT * FROM spaced_repetition_items WHERE id = ? LIMIT 1', [String(itemId ?? '')]);
    if (currentRes.length === 0 || currentRes[0].values.length === 0) {
      return NextResponse.json({ error: 'Kayıt bulunamadı' }, { status: 404 });
    }

    const cols = currentRes[0].columns;
    const current: any = {};
    cols.forEach((c, idx) => { current[c] = currentRes[0].values[0][idx]; });

    // Öğrenci yalnızca kendi tekrar kaydını güncelleyebilir; öğretmen hepsini.
    const ownsItem = session.role === 'student' && !!session.studentId && current.student_id === session.studentId;
    if (session.role !== 'teacher' && !ownsItem) {
      return NextResponse.json({ error: 'Bu kaydı güncelleme yetkiniz yok.' }, { status: 403 });
    }

    const next = calculateNextSpacedRepetition({
      currentLevel: current.repetition_level || 1,
      performance,
      lastIntervalDays: current.interval_days || 1
    });

    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + next.nextIntervalDays);
    const nextReviewStr = nextReviewDate.toISOString();

    db.run(`
      UPDATE spaced_repetition_items 
      SET repetition_level = ?,
          interval_days = ?,
          next_review_at = ?,
          last_reviewed_at = datetime('now'),
          last_performance = ?,
          forgetting_risk = ?,
          is_mastered = ?
      WHERE id = ?
    `, [
      next.nextLevel,
      next.nextIntervalDays,
      nextReviewStr,
      performance,
      next.forgettingRisk,
      next.nextLevel >= 5 ? 1 : 0,
      itemId
    ]);

    await commitDb();

    return NextResponse.json({
      success: true,
      nextLevel: next.nextLevel,
      nextIntervalDays: next.nextIntervalDays,
      forgettingRisk: next.forgettingRisk
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Güncelleme başarısız' }, { status: 500 });
  }
}
