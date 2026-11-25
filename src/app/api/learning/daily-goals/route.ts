import { NextResponse } from 'next/server';
import { getDb, commitDb } from '@/lib/db/database';
import { getSession } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const targetStudentId = searchParams.get('studentId') || session.studentId;

    if (!targetStudentId) {
      return NextResponse.json({ error: 'Öğrenci ID belirtilmedi' }, { status: 400 });
    }

    const db = await getDb();
    const todayStr = new Date().toISOString().split('T')[0];

    let res = db.exec(`
      SELECT * FROM daily_student_goals
      WHERE student_id = '${targetStudentId}' AND goal_date = '${todayStr}'
      LIMIT 1
    `);

    // Eğer bugün için henüz plan yoksa son aktif planı veya varsayılan dengeli planı getir
    if (res.length === 0 || res[0].values.length === 0) {
      res = db.exec(`
        SELECT * FROM daily_student_goals
        WHERE student_id = '${targetStudentId}'
        ORDER BY goal_date DESC
        LIMIT 1
      `);
    }

    if (res.length === 0 || res[0].values.length === 0) {
      return NextResponse.json({
        hasGoal: false,
        message: 'Bugün için planlanan çalışma henüz atanmamış.'
      });
    }

    const cols = res[0].columns;
    const row = res[0].values[0];
    const obj: any = {};
    cols.forEach((c, idx) => { obj[c] = row[idx]; });

    const items = typeof obj.items_json === 'string' ? JSON.parse(obj.items_json || '[]') : obj.items_json;

    return NextResponse.json({
      hasGoal: true,
      goal: {
        id: obj.id,
        studentId: obj.student_id,
        goalDate: obj.goal_date,
        title: obj.title,
        items,
        totalMinutes: obj.total_minutes,
        totalQuestions: obj.total_questions,
        completedMinutes: obj.completed_minutes,
        completedQuestions: obj.completed_questions,
        isFullyCompleted: obj.is_fully_completed === 1,
        rolledOverToNextDay: obj.rolled_over_to_next_day === 1
      }
    });
  } catch (error: any) {
    console.error('Error in daily-goals GET:', error);
    return NextResponse.json({ error: error.message || 'Hata oluştu' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });

    const body = await req.json();
    const { goalId, itemId, action } = body;

    const db = await getDb();
    const res = db.exec(`SELECT * FROM daily_student_goals WHERE id = '${goalId}' LIMIT 1`);
    if (res.length === 0 || res[0].values.length === 0) {
      return NextResponse.json({ error: 'Plan bulunamadı' }, { status: 404 });
    }

    const cols = res[0].columns;
    const current: any = {};
    cols.forEach((c, idx) => { current[c] = res[0].values[0][idx]; });

    let items: any[] = typeof current.items_json === 'string' ? JSON.parse(current.items_json || '[]') : current.items_json;

    if (action === 'toggle_item') {
      items = items.map(item => {
        if (item.id === itemId) {
          return { ...item, completed: !item.completed };
        }
        return item;
      });

      const completedCount = items.filter(i => i.completed).length;
      const completedMinutes = items.filter(i => i.completed).reduce((acc, i) => acc + (i.durationMin || 0), 0);
      const completedQuestions = items.filter(i => i.completed).reduce((acc, i) => acc + (i.questionCount || 0), 0);
      const isFullyCompleted = completedCount === items.length ? 1 : 0;

      db.run(`
        UPDATE daily_student_goals 
        SET items_json = ?,
            completed_minutes = ?,
            completed_questions = ?,
            is_fully_completed = ?
        WHERE id = ?
      `, [JSON.stringify(items), completedMinutes, completedQuestions, isFullyCompleted, goalId]);

      await commitDb();
      return NextResponse.json({ success: true, isFullyCompleted: isFullyCompleted === 1 });
    }

    if (action === 'rollover_to_tomorrow') {
      // Tamamlanmayan maddeleri cezalandırıcı olmadan yarına aktar
      const incompleteItems = items.filter(i => !i.completed);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      db.run(`UPDATE daily_student_goals SET rolled_over_to_next_day = 1 WHERE id = ?`, [goalId]);

      const newGoalId = 'goal-' + Date.now();
      db.run(`
        INSERT INTO daily_student_goals (
          id, student_id, goal_date, title, items_json, total_minutes, total_questions, completed_minutes, completed_questions, is_fully_completed
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0)
      `, [
        newGoalId,
        current.student_id,
        tomorrowStr,
        'Yarına Devreden & Günlük Matematik Planı',
        JSON.stringify(incompleteItems),
        incompleteItems.reduce((acc, i) => acc + (i.durationMin || 0), 0),
        incompleteItems.reduce((acc, i) => acc + (i.questionCount || 0), 0)
      ]);

      await commitDb();
      return NextResponse.json({ success: true, message: 'Kalan çalışmalar yarına aktarıldı.' });
    }

    return NextResponse.json({ error: 'Geçersiz işlem' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Güncelleme hatası' }, { status: 500 });
  }
}
