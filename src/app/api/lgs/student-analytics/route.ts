import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db/database';
import { INITIAL_LGS_TOPICS } from '@/lib/ai/lgsCurriculum';

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId') || '50fa22f6-1021-4dde-8278-2339fa65030d'; // Varsayılan Elif

    // 1. Öğrenci bilgisi
    const sRes = db.exec(`
      SELECT s.id, s.grade, s.school, u.name, u.email 
      FROM students s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = '${studentId}'
    `);
    const student = sRes.length > 0 ? {
      id: sRes[0].values[0][0],
      grade: sRes[0].values[0][1],
      school: sRes[0].values[0][2],
      name: sRes[0].values[0][3],
      email: sRes[0].values[0][4]
    } : { id: studentId, name: 'Öğrenci', grade: 8 };

    // 2. Konu başarı profili
    const pRes = db.exec(`
      SELECT p.*, t.name as topic_name, t.code as topic_code
      FROM student_topic_performance p
      JOIN curriculum_topics t ON p.topic_id = t.id
      WHERE p.student_id = '${studentId}'
      ORDER BY t.sort_order ASC
    `);
    const topicPerformance: any[] = [];
    if (pRes.length > 0) {
      const cols = pRes[0].columns;
      for (const row of pRes[0].values) {
        const obj: any = {};
        cols.forEach((c, idx) => { obj[c] = row[idx]; });
        topicPerformance.push(obj);
      }
    }

    // Eğer performans tablosunda bazı konular henüz yoksa varsayılan listeyle birleştir
    const finalTopics = INITIAL_LGS_TOPICS.map(t => {
      const existing = topicPerformance.find(p => p.topic_id === t.id);
      if (existing) return existing;
      return {
        topic_id: t.id,
        topic_name: t.name,
        topic_code: t.code,
        mastery_score: 0,
        status: 'needs_data',
        confidence_level: 0,
        solved_count: 0,
        correct_count: 0,
        wrong_count: 0,
        blank_count: 0,
        avg_duration_seconds: 0,
        trend: 'stable'
      };
    });

    // 3. Yapay zekâ öğrenme önerileri
    const recRes = db.exec(`
      SELECT r.*, t.name as topic_name
      FROM learning_recommendations r
      JOIN curriculum_topics t ON r.topic_id = t.id
      WHERE r.student_id = '${studentId}'
      ORDER BY r.created_at DESC
    `);
    const recommendations: any[] = [];
    if (recRes.length > 0) {
      const cols = recRes[0].columns;
      for (const row of recRes[0].values) {
        const obj: any = {};
        cols.forEach((c, idx) => { obj[c] = row[idx]; });
        obj.recommended_counts = typeof obj.recommended_counts_json === 'string'
          ? JSON.parse(obj.recommended_counts_json || '{}')
          : obj.recommended_counts_json;
        recommendations.push(obj);
      }
    }

    // 4. Genel özet istatistikleri
    const totalSolved = topicPerformance.reduce((acc, p) => acc + (p.solved_count || 0), 0);
    const totalCorrect = topicPerformance.reduce((acc, p) => acc + (p.correct_count || 0), 0);
    const totalWrong = topicPerformance.reduce((acc, p) => acc + (p.wrong_count || 0), 0);
    const totalBlank = topicPerformance.reduce((acc, p) => acc + (p.blank_count || 0), 0);
    const avgMastery = topicPerformance.length > 0
      ? Math.round(topicPerformance.reduce((acc, p) => acc + (p.mastery_score || 0), 0) / topicPerformance.length)
      : 55;

    return NextResponse.json({
      success: true,
      student,
      summary: {
        totalSolved,
        totalCorrect,
        totalWrong,
        totalBlank,
        avgMastery,
        criticalWeakCount: topicPerformance.filter(p => p.status === 'critical_weak').length,
        masteredCount: topicPerformance.filter(p => p.status === 'mastered').length
      },
      topicPerformance: finalTopics,
      recommendations
    });
  } catch (error: any) {
    console.error('Error fetching student analytics:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { recommendationId, action } = body;

    if (!recommendationId) {
      return NextResponse.json({ success: false, error: 'Öneri kimliği belirtilmedi' }, { status: 400 });
    }

    const db = await getDb();
    if (action === 'approve') {
      db.run('UPDATE learning_recommendations SET is_approved_by_teacher = 1, status = "assigned" WHERE id = ?', [recommendationId]);
    } else if (action === 'dismiss') {
      db.run('UPDATE learning_recommendations SET status = "dismissed" WHERE id = ?', [recommendationId]);
    }
    saveDb(db);

    return NextResponse.json({ success: true, message: 'Öneri durumu güncellendi' });
  } catch (error: any) {
    console.error('Error updating recommendation:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
