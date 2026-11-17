import Link from 'next/link';
import type { Metadata } from 'next';
import { supabaseServer } from '@/lib/supabase/server';
import { bankSummaries } from '@/lib/data';
import { CreateStudentForm } from './StudentForms';
import { fmtDate } from '@/lib/labels';

export const metadata: Metadata = { title: 'Öğrencilerim' };

export default async function StudentsPage() {
  const sb = await supabaseServer();
  const [{ data }, sums] = await Promise.all([
    sb.from('students').select('id, full_name, grade_level, school_name, is_active, created_at, profile:profiles(username)').order('full_name'),
    bankSummaries(sb),
  ]);
  const students = (data || []) as unknown as { id: string; full_name: string; grade_level: number | null; school_name: string | null; is_active: boolean; created_at: string; profile: { username: string | null } | null }[];
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black">Öğrencilerim</h1>
      <details className="card" open={students.length === 0}>
        <summary className="cursor-pointer font-bold">＋ Yeni öğrenci ekle</summary>
        <div className="mt-4"><CreateStudentForm /></div>
      </details>
      {students.length === 0 ? <p className="text-sm text-slate-500">Henüz öğrenci yok.</p> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {students.map(s => { const x = sums.byStudent.get(s.id); return (
            <Link key={s.id} href={'/ogretmen/ogrenciler/' + s.id} className={'card space-y-2 transition hover:border-indigo-400 ' + (s.is_active ? '' : 'opacity-60')}>
              <div className="flex items-start gap-2">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-black text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">{s.full_name.charAt(0).toLocaleUpperCase('tr')}</span>
                <div className="min-w-0"><p className="truncate font-bold">{s.full_name}</p><p className="truncate text-xs text-slate-500">{[s.grade_level && (s.grade_level === 13 ? 'Mezun' : s.grade_level + '. sınıf'), s.school_name, s.profile?.username && '@' + s.profile.username].filter(Boolean).join(' · ')}</p></div>
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
