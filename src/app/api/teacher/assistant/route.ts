import { NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db/database';
import { requireTeacher } from '@/lib/auth';
import { analyzeTeacherQuery } from '@/lib/teacher/assistantEngine';

export async function POST(req: Request) {
  try {
    const session = await requireTeacher();
    const body = await req.json();
    const { query } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Soru metni belirtilmedi' }, { status: 400 });
    }

    const db = await getDb();
    const insight = analyzeTeacherQuery(db, query, session.userId);

    return NextResponse.json({
      success: true,
      insight
    });
  } catch (error: any) {
    console.error('Error in assistant POST:', error);
    return NextResponse.json({ error: error.message || 'Asistan yanıt üretemedi' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await requireTeacher();
    const body = await req.json();
    const { actionType, title, studentId, topicId, payload } = body;

    const db = await getDb();

    if (actionType === 'create_study_plan') {
      const planId = 'plan-' + Date.now();
      db.run(`
        INSERT INTO personalized_study_plans (
          id, teacher_id, student_id, title, description, topic_ids_json, total_questions, estimated_duration_min, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
      `, [
        planId,
        session.userId,
        studentId,
        title || 'Yapay Zekâ Destekli Çalışma Seti',
        payload?.focus || 'Eksik kazanım pekiştirme',
        JSON.stringify([topicId || 'top_carpanlar_katlar']),
        payload?.questionCount || 15,
        payload?.durationMin || 35
      ]);

      await saveDb();
      return NextResponse.json({ success: true, message: 'Çalışma planı onaylandı ve öğrenciye atandı!', planId });
    }

    if (actionType === 'send_parent_note') {
      const msgId = 'msg-' + Date.now();
      // Öğrencinin kayıtlı aktif velisi
      const gRes = db.exec(`SELECT guardian_user_id FROM student_guardians sg JOIN users u ON u.id = sg.guardian_user_id WHERE sg.student_id = ? AND sg.status = 'active' LIMIT 1`, [studentId]);
      const guardianUserId = gRes.length > 0 && gRes[0].values.length > 0 ? String(gRes[0].values[0][0]) : null;
      if (!guardianUserId) {
        return NextResponse.json({ error: 'Bu öğrenciye bağlı bir veli hesabı yok.' }, { status: 400 });
      }
      db.run(`
        INSERT INTO guardian_messages (
          id, student_id, guardian_user_id, teacher_user_id, message, is_from_teacher
        ) VALUES (?, ?, ?, ?, ?, 1)
      `, [
        msgId,
        studentId,
        guardianUserId,
        session.userId,
        payload?.note || title
      ]);

      await saveDb();
      return NextResponse.json({ success: true, message: 'Veliye rehberlik notu başarıyla iletildi!' });
    }

    if (actionType === 'schedule_lesson') {
      const schedId = 'sched-' + Date.now();
      const todayStr = new Date().toISOString().split('T')[0];
      db.run(`
        INSERT INTO teacher_lesson_schedules (
          id, teacher_id, student_id, lesson_date, start_time, duration_minutes, status, planned_goals
        ) VALUES (?, ?, ?, ?, '16:00', ?, 'scheduled', ?)
      `, [
        schedId,
        session.userId,
        studentId,
        todayStr,
        payload?.durationMin || 60,
        title
      ]);

      await saveDb();
      return NextResponse.json({ success: true, message: 'Ders başarıyla takvime eklendi!' });
    }

    return NextResponse.json({ error: 'Bilinmeyen işlem türü' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Onay işlemi tamamlanamadı' }, { status: 500 });
  }
}
