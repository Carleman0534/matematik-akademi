import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db/database';

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');
    const guardianUserId = searchParams.get('guardianUserId');

    let sql = `
      SELECT gm.*, u.name as sender_name
      FROM guardian_messages gm
      JOIN users u ON gm.teacher_user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (studentId) {
      sql += ' AND gm.student_id = ?';
      params.push(studentId);
    }
    if (guardianUserId) {
      sql += ' AND gm.guardian_user_id = ?';
      params.push(guardianUserId);
    }
    sql += ' ORDER BY gm.created_at DESC';

    const stmt = db.prepare(sql);
    stmt.bind(params);
    const messages: any[] = [];
    while (stmt.step()) {
      messages.push(stmt.getAsObject());
    }
    stmt.free();

    return NextResponse.json({ success: true, messages });
  } catch (error: any) {
    console.error('Error fetching guardian messages:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      studentId,
      guardianUserId,
      message,
      title = 'Öğretmeninizden Yeni Değerlendirme Notu'
    } = body;

    if (!studentId || !guardianUserId || !message) {
      return NextResponse.json({ success: false, error: 'Öğrenci, veli ve mesaj metni zorunludur' }, { status: 400 });
    }

    const db = await getDb();
    const msgId = 'gm_' + Math.random().toString(36).substring(2, 9);
    const notifId = 'gn_' + Math.random().toString(36).substring(2, 9);

    // 1. guardian_messages
    db.run(`
      INSERT INTO guardian_messages (id, student_id, guardian_user_id, teacher_user_id, message, is_from_teacher, created_at)
      VALUES (?, ?, ?, '170c1e8f-52b4-440e-b605-ec974fa1d56b', ?, 1, datetime('now'))
    `, [msgId, studentId, guardianUserId, message.trim()]);

    // 2. guardian_notifications
    db.run(`
      INSERT INTO guardian_notifications (id, guardian_user_id, student_id, title, message, notification_type, created_at)
      VALUES (?, ?, ?, ?, ?, 'teacher_note', datetime('now'))
    `, [notifId, guardianUserId, studentId, title, message.trim().substring(0, 120) + '...']);

    saveDb(db);

    return NextResponse.json({ success: true, message: 'Özel değerlendirme notu veliye iletildi' });
  } catch (error: any) {
    console.error('Error sending message to guardian:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
