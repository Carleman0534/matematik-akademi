import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/database';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'teacher') {
    return NextResponse.json({ error: 'Bu listeyi yalnızca öğretmen görebilir.' }, { status: 403 });
  }
  try {
    const students: Record<string, unknown>[] = [];
    const seenIds = new Set<string>();

    // 1. Önce Supabase'den öğrencileri çek (canlı sistemde kayıtlı olan tüm öğrenciler)
    try {
      const { supabaseAdmin } = await import('@/lib/supabase/admin');
      const admin = supabaseAdmin();
      const { data: sbStudents } = await admin
        .from('students')
        .select('id, full_name, grade_level, school_name, is_active, cls:classes(name), profile:profiles!students_profile_id_fkey(username)')
        .order('created_at', { ascending: false });

      if (sbStudents && sbStudents.length > 0) {
        sbStudents.forEach((st: any) => {
          seenIds.add(st.id);
          students.push({
            id: st.id,
            full_name: st.full_name || 'Öğrenci',
            grade_level: st.grade_level || 8,
            school_name: st.school_name || '',
            status: st.is_active ? 'active' : 'passive',
            class_name: st.cls?.name || '',
            username: st.profile?.username || ''
          });
        });
      }
    } catch (sbErr) {
      console.warn('Supabase students query skipped/fallback:', sbErr);
    }

    // 2. SQLite veritabanındaki öğrencileri ekle
    try {
      const db = await getDb();
      const stmt = db.prepare(`
        SELECT 
          st.id,
          COALESCE(u.name, 'Öğrenci') as full_name,
          COALESCE(st.grade, 8) as grade_level,
          st.school as school_name,
          st.status,
          COALESCE(st.notes, '') as notes,
          '' as class_name
        FROM students st
        JOIN users u ON u.id = st.user_id
        ORDER BY u.name ASC
      `);
      while (stmt.step()) {
        const row = stmt.getAsObject() as Record<string, unknown>;
        const id = String(row.id);
        const name = String(row.full_name || '').toLowerCase();
        const exists = seenIds.has(id) || students.some(s => String(s.full_name).toLowerCase() === name);
        if (!exists) {
          seenIds.add(id);
          students.push(row);
        }
      }
      stmt.free();
    } catch (dbErr) {
      console.warn('SQLite students query fallback:', dbErr);
    }

    const finalStudents = students.filter(s => 
      !String(s.full_name || '').toLowerCase().includes('deneme öğrenci') && 
      !String((s as any).username || '').toLowerCase().includes('deneme.ogrenci')
    );

    return NextResponse.json({ success: true, students: finalStudents });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Error fetching students:', msg);
    return NextResponse.json({ error: 'Öğrenciler alınamadı: ' + msg }, { status: 500 });
  }
}
