import Link from 'next/link';
import type { Metadata } from 'next';
import { supabaseServer } from '@/lib/supabase/server';
import { bankSummaries, getClasses } from '@/lib/data';
import { requireTeacher } from '@/lib/auth';
import { CreateStudentForm } from './StudentForms';
import { fmtDate } from '@/lib/labels';

export const metadata: Metadata = { title: 'Öğrencilerim' };

export default async function StudentsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const me = await requireTeacher();
  const all = me.isAdmin && (await searchParams).tumu === '1'; // yönetici bütün öğretmenlerin öğrencilerini görebilir
  const sb = await supabaseServer();
  const isValidUuid = (s?: string) => Boolean(s && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s));
  let query = sb.from('students').select('id, full_name, grade_level, school_name, is_active, created_at, profile:profiles!students_profile_id_fkey(username), teacher:profiles!students_teacher_id_fkey(full_name), cls:classes(name)').order('full_name');
  if (!all && isValidUuid(me.userId)) {
    query = query.or(`teacher_id.eq.${me.userId},teacher_id.is.null`);
  }
  const [{ data }, sums, classes] = await Promise.all([query, bankSummaries(sb), getClasses(sb, me.userId)]);
  let students = ((data || []) as unknown as { id: string; full_name: string; grade_level: number | null; school_name: string | null; is_active: boolean; created_at: string; profile: { username: string | null } | null; teacher: { full_name: string } | null; cls: { name: string } | null }[])
    .filter(s => !s.full_name?.toLowerCase().includes('deneme öğrenci') && !s.profile?.username?.toLowerCase().includes('deneme.ogrenci'));

  if (students.length === 0) {
    try {
      const { getDb } = await import('@/lib/db/database');
      const db = await getDb();
      const res = db.exec(`
        SELECT 
          st.id,
          COALESCE(u.name, 'Öğrenci') as full_name,
          COALESCE(st.grade, 8) as grade_level,
          st.school as school_name,
          (st.status = 'active') as is_active,
          st.created_at,
          CASE WHEN instr(u.email, '@') > 0 THEN substr(u.email, 1, instr(u.email, '@') - 1) ELSE '' END as username
        FROM students st
        JOIN users u ON u.id = st.user_id
        ORDER BY u.name ASC
      `);
      if (res && res.length > 0 && res[0].values.length > 0) {
        const cols = res[0].columns;
        students = res[0].values.map(row => {
          const obj: Record<string, unknown> = {};
          cols.forEach((c, idx) => { obj[c] = row[idx]; });
          return {
            id: String(obj.id),
            full_name: String(obj.full_name),
            grade_level: Number(obj.grade_level) || 8,
            school_name: obj.school_name ? String(obj.school_name) : null,
            is_active: Boolean(obj.is_active),
            created_at: String(obj.created_at || new Date().toISOString()),
            profile: { username: String(obj.username || '') },
            teacher: null,
            cls: null
          };
        });
      }
    } catch {
      // Supabase tabanlı liste kullanılır
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-black">Öğrencilerim</h1>
        {me.isAdmin && <Link href={all ? '/ogretmen/ogrenciler' : '/ogretmen/ogrenciler?tumu=1'} className="ml-auto text-sm font-semibold text-indigo-600 dark:text-indigo-400">{all ? 'Yalnızca benim öğrencilerim' : 'Bütün öğretmenlerin öğrencileri'}</Link>}
      </div>
      <details className="card" open={students.length === 0}>
        <summary className="cursor-pointer font-bold">＋ Yeni öğrenci ekle</summary>
        <p className="mt-2 text-sm text-slate-500">Öğrenciler <Link href="/ogretmen/siniflar" className="font-semibold text-indigo-600 dark:text-indigo-400">sınıf koduyla</Link> kendileri de kaydolabilir.</p>
        <div className="mt-4"><CreateStudentForm classes={classes} /></div>
      </details>
      {students.length === 0 ? <p className="text-sm text-slate-500">Henüz öğrenci yok.</p> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {students.map(s => { const x = sums.byStudent.get(s.id); return (
            <Link key={s.id} href={'/ogretmen/ogrenciler/' + s.id} className={'card space-y-2 transition hover:border-indigo-400 ' + (s.is_active ? '' : 'opacity-60')}>
              <div className="flex items-start gap-2">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-black text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">{s.full_name.charAt(0).toLocaleUpperCase('tr')}</span>
                <div className="min-w-0"><p className="truncate font-bold">{s.full_name}</p><p className="truncate text-xs text-slate-500">{[s.cls?.name, s.grade_level && (s.grade_level === 13 ? 'Mezun' : s.grade_level + '. sınıf'), s.school_name, s.profile?.username && '@' + s.profile.username, all && s.teacher?.full_name && 'Öğr: ' + s.teacher.full_name].filter(Boolean).join(' · ')}</p></div>
                {!s.is_active && <span className="ml-auto rounded bg-slate-200 px-1.5 text-[11px] font-semibold dark:bg-slate-800">Pasif</span>}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg bg-slate-50 py-1.5 dark:bg-slate-800"><b className="block text-base">{x?.total ?? 0}</b>soru</div>
                <div className="rounded-lg bg-indigo-50 py-1.5 dark:bg-indigo-950"><b className="block text-base text-indigo-700 dark:text-indigo-300">{x?.due ?? 0}</b>tekrar</div>
                <div className="rounded-lg bg-emerald-50 py-1.5 dark:bg-emerald-950"><b className="block text-base text-emerald-700 dark:text-emerald-300">{x?.learned ?? 0}</b>öğrenildi</div>
              </div>
              <p className="text-xs text-slate-500">Son çalışma: {fmtDate(sums.lastActivity.get(s.id))}</p>
            </Link>
          ); })}
        </div>
      )}
    </div>
  );
}
