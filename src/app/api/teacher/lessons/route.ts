import { NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db/database';
import { requireTeacher } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const session = await requireTeacher();
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');

    const db = await getDb();

    // 1. Planlanan Dersler
    let schedQuery = `
      SELECT ts.*, u.name as student_name, t.name as topic_name
      FROM teacher_lesson_schedules ts
      JOIN students s ON ts.student_id = s.id
      JOIN users u ON s.user_id = u.id
      LEFT JOIN curriculum_topics t ON ts.topic_id = t.id
    `;
    if (studentId) {
      schedQuery += ` WHERE ts.student_id = '${studentId}'`;
    }
    schedQuery += ` ORDER BY ts.lesson_date ASC, ts.start_time ASC`;

    const schedRes = db.exec(schedQuery);
    const schedules: any[] = [];
    if (schedRes.length > 0) {
      const cols = schedRes[0].columns;
      for (const row of schedRes[0].values) {
        const obj: any = {};
        cols.forEach((c, idx) => { obj[c] = row[idx]; });
        schedules.push(obj);
      }
    }

    // 2. Tamamlanan Ders Geçmişi & Not Kayıtları
    let histQuery = `
      SELECT lh.*, u.name as student_name, t.name as topic_name
      FROM lesson_history_records lh
      JOIN students s ON lh.student_id = s.id
      JOIN users u ON s.user_id = u.id
      LEFT JOIN curriculum_topics t ON lh.topic_id = t.id
    `;
    if (studentId) {
      histQuery += ` WHERE lh.student_id = '${studentId}'`;
    }
    histQuery += ` ORDER BY lh.lesson_date DESC`;

    const histRes = db.exec(histQuery);
    const history: any[] = [];
    if (histRes.length > 0) {
      const cols = histRes[0].columns;
      for (const row of histRes[0].values) {
        const obj: any = {};
        cols.forEach((c, idx) => { obj[c] = row[idx]; });
        history.push(obj);
      }
    }

    return NextResponse.json({
      schedules,
      history
    });
  } catch (error: any) {
    console.error('Error fetching lessons:', error);
    return NextResponse.json({ error: error.message || 'Hata oluştu' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireTeacher();
    const body = await req.json();
    const { action } = body;

    const db = await getDb();

    if (action === 'schedule_lesson') {
      const { studentId, lessonDate, startTime, durationMinutes, topicId, plannedGoals } = body;
      const id = 'sched-' + Date.now();

      db.run(`
        INSERT INTO teacher_lesson_schedules (
          id, teacher_id, student_id, lesson_date, start_time, duration_minutes, status, topic_id, planned_goals
        ) VALUES (?, ?, ?, ?, ?, ?, 'scheduled', ?, ?)
      `, [
        id,
        session.userId,
        studentId,
        lessonDate,
        startTime || '16:00',
        durationMinutes || 60,
        topicId || null,
        plannedGoals || ''
      ]);

      await saveDb();
      return NextResponse.json({ success: true, id });
    }

    if (action === 'record_history') {
      const { scheduleId, studentId, lessonDate, topicId, subtopicsCovered, questionsSolvedCount, studentPerformanceRating, teacherPrivateNotes, teacherParentNotes, assignedHomework, nextLessonGoals } = body;
      const id = 'hist-' + Date.now();

      db.run(`
        INSERT INTO lesson_history_records (
          id, schedule_id, teacher_id, student_id, lesson_date, topic_id, subtopics_covered,
          questions_solved_count, student_performance_rating, teacher_private_notes, teacher_parent_notes,
          assigned_homework, next_lesson_goals
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id,
        scheduleId || null,
        session.userId,
        studentId,
        lessonDate || new Date().toISOString().split('T')[0],
        topicId || null,
        subtopicsCovered || '',
        questionsSolvedCount || 0,
        studentPerformanceRating || 4,
        teacherPrivateNotes || '',
        teacherParentNotes || '',
        assignedHomework || '',
        nextLessonGoals || ''
      ]);

      if (scheduleId) {
        db.run(`UPDATE teacher_lesson_schedules SET status = 'completed' WHERE id = ?`, [scheduleId]);
      }

      await saveDb();
      return NextResponse.json({ success: true, id });
    }

    return NextResponse.json({ error: 'Geçersiz işlem' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'İşlem başarısız' }, { status: 500 });
  }
}
