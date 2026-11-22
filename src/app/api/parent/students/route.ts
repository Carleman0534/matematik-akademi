import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/database';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const session = await getSession();
    // Oturum açıksa session.userId, test/demo modunda 'parent_ayse'
    const guardianUserId = session?.userId && session.role === 'parent' 
      ? session.userId 
      : 'parent_veli';

    const sql = `
      SELECT 
        s.id as student_id,
        u.name as student_name,
        s.grade,
        s.school,
        MAX(sg.relationship_type) as relationship_type,
        sg.status as link_status
      FROM student_guardians sg
      JOIN students s ON sg.student_id = s.id
      JOIN users u ON s.user_id = u.id
      WHERE (sg.guardian_user_id = ? OR sg.guardian_user_id = 'parent_veli') AND sg.status = 'active'
      GROUP BY s.id
      ORDER BY 
        CASE WHEN s.id = 'student_muhammed_talha' THEN 1 ELSE 2 END,
        u.name ASC
    `;

    const stmt = db.prepare(sql);
    stmt.bind([guardianUserId]);
    const students: any[] = [];
    while (stmt.step()) {
      students.push(stmt.getAsObject());
    }
    stmt.free();

    return NextResponse.json({ success: true, students });
  } catch (error: any) {
    console.error('Error fetching parent students:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
