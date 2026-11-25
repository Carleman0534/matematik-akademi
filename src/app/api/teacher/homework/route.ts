import { NextResponse } from 'next/server';
import { getDb, commitDb } from '@/lib/db/database';
import { getSession } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId') || (session.role === 'student' ? session.studentId : null);

    const db = await getDb();
    let query = `
      SELECT h.*, u.name as student_name, t.name as topic_name
      FROM student_homework_assignments h
      JOIN students s ON h.student_id = s.id
      JOIN users u ON s.user_id = u.id
      LEFT JOIN curriculum_topics t ON h.topic_id = t.id
    `;
    if (studentId) {
      query += ` WHERE h.student_id = '${studentId}'`;
    }
    query += ` ORDER BY h.due_date ASC`;

    const res = db.exec(query);
    const homeworks: any[] = [];
    if (res.length > 0) {
      const cols = res[0].columns;
      for (const row of res[0].values) {
        const obj: any = {};
        cols.forEach((c, idx) => { obj[c] = row[idx]; });
        homeworks.push(obj);
      }
    }

    return NextResponse.json({ homeworks });
  } catch (error: any) {
    console.error('Error in homework GET:', error);
    return NextResponse.json({ error: error.message || 'Hata oluştu' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'teacher') {
      return NextResponse.json({ error: 'Sadece öğretmenler ödev atayabilir' }, { status: 403 });
    }

    const body = await req.json();
    const { studentId, title, description, topicId, questionCount, difficultyLevel, dueDate, shareWithParent } = body;

    const db = await getDb();
    const id = 'hw-' + Date.now();

    db.run(`
      INSERT INTO student_homework_assignments (
        id, teacher_id, student_id, title, description, topic_id, question_count,
        difficulty_level, start_date, due_date, status, share_with_parent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_DATE, ?, 'assigned', ?)
    `, [
      id,
      session.userId,
      studentId,
      title,
      description || '',
      topicId || null,
      questionCount || 15,
      difficultyLevel || 3,
      dueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      shareWithParent ? 1 : 0
    ]);

    await commitDb();
    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Ödev oluşturulamadı' }, { status: 500 });
  }
}
