import Link from 'next/link';
import type { Metadata } from 'next';
import { supabaseServer } from '@/lib/supabase/server';
import { bankSummaries, signedUrlMap, getTopics, idleStudents } from '@/lib/data';
import { topicPath } from '@/lib/topics';
import { Stat } from '@/components/Stat';
import { INITIAL_LABEL, fmtDate, fmtDateTime, pct } from '@/lib/labels';

export const metadata: Metadata = { title: 'Genel Bakış' };

type Recent = { id: string; student_id: string; topic_id: string | null; initial_status: 'wrong' | 'blank'; created_at: string; question_images: { path: string; thumb_path: string | null; sort_order: number }[] };

export default async function TeacherDashboard() {
  const sb = await supabaseServer();
  const [{ data: studentsData }, sums, topics, { data: recentData }] = await Promise.all([
    sb.from('students').select('id, full_name, grade_level, is_active').order('full_name'),
    bankSummaries(sb),
    getTopics(sb),
    sb.from('questions').select('id, student_id, topic_id, initial_status, created_at, question_images(path, thumb_path, sort_order)').is('archived_at', null).order('created_at', { ascending: false }).limit(6),
  ]);
  const students = (studentsData || []) as { id: string; full_name: string; grade_level: number | null; is_active: boolean }[];
  const recent = (recentData || []) as Recent[];
  const active = students.filter(s => s.is_active);
  const names = new Map(students.map(s => [s.id, s.full_name]));
  const urls = await signedUrlMap(sb, recent.map(r => { const i = [...r.question_images].sort((a, b) => a.sort_order - b.sort_order)[0]; return i ? i.thumb_path || i.path : ''; }));
  const idle = idleStudents(active, sums.lastActivity, 7);
  const a = sums.all;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black">Genel Bakış</h1>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Aktif öğrenci" value={active.length} sub={`toplam ${students.length}`} />
        <Stat label="Toplam soru" value={a.total} sub={`${a.wrong} yanlış · ${a.blank} boş`} />
        <Stat label="Tekrar bekleyen" value={a.due} sub="bugün tekrar zamanı gelen" tone="text-indigo-600 dark:text-indigo-400" />
        <Stat label="Öğrenilen soru" value={a.learned} sub={`tekrar başarısı ${pct(a.reviewSuccess)}`} tone="text-emerald-600 dark:text-emerald-400" />
      </div>

      <section className="card space-y-3">
        <div className="flex items-center"><h2 className="font-bold">Öğrencilerim</h2><Link href="/ogretmen/ogrenciler" className="ml-auto text-sm font-semibold text-indigo-600 dark:text-indigo-400">Tümü / öğrenci ekle →</Link></div>
        {active.length === 0 ? <p className="text-sm text-slate-500">Henüz öğrenci yok. <Link className="font-semibold text-indigo-600" href="/ogretmen/ogrenciler">İlk öğrencinizi ekleyin.</Link></p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead><tr className="text-left text-xs text-slate-500"><th className="py-2">Öğrenci</th><th>Soru</th><th>Yanlış / Boş</th><th>Tekrar bekleyen</th><th>Öğrenilen</th><th>Son çalışma</th></tr></thead>
              <tbody>
                {active.map(s => { const x = sums.byStudent.get(s.id); return (
                  <tr key={s.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="py-2"><Link href={'/ogretmen/ogrenciler/' + s.id} className="font-semibold hover:underline">{s.full_name}</Link>{s.grade_level ? <span className="ml-1 text-xs text-slate-500">{s.grade_level}. sınıf</span> : null}</td>
                    <td>{x?.total ?? 0}</td><td>{x ? `${x.wrong} / ${x.blank}` : '0 / 0'}</td><td>{x?.due ?? 0}</td>
                    <td>{x ? `${x.learned} (${x.total ? Math.round(x.learned / x.total * 100) : 0}%)` : 0}</td>
                    <td className="text-slate-500">{fmtDate(sums.lastActivity.get(s.id))}</td>
                  </tr>
                ); })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card space-y-3">
          <h2 className="font-bold">Son eklenen sorular</h2>
          {recent.length === 0 ? <p className="text-sm text-slate-500">Henüz soru eklenmedi.</p> : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {recent.map(r => { const i = [...r.question_images].sort((p, q) => p.sort_order - q.sort_order)[0]; const u = i ? urls.get(i.thumb_path || i.path) : null; return (
                <Link key={r.id} href={'/soru/' + r.id} className="overflow-hidden rounded-xl border border-slate-200 text-xs hover:border-indigo-400 dark:border-slate-800">
                  <div className="flex aspect-[4/3] items-center justify-center bg-slate-100 dark:bg-slate-800">{u ? <img src={u} alt="" className="h-full w-full object-contain" /> : '—'}</div>
                  <p className="truncate px-2 pt-1 font-semibold">{names.get(r.student_id)}</p>
                  <p className="truncate px-2 pb-1.5 text-slate-500">{INITIAL_LABEL[r.initial_status]} · {topicPath(topics, r.topic_id) || 'Konu yok'} · {fmtDateTime(r.created_at)}</p>
                </Link>
              ); })}
            </div>
          )}
        </section>
        <section className="card space-y-2">
          <h2 className="font-bold">Son 7 günde çalışmayan öğrenciler</h2>
          {active.length === 0 ? <p className="text-sm text-slate-500">Henüz aktif öğrenci yok.</p>
            : idle.length === 0 ? <p className="text-sm text-emerald-600 dark:text-emerald-400">Bütün aktif öğrenciler son bir haftada çalışmış. 👏</p> : idle.map(s => (
            <p key={s.id} className="text-sm"><Link href={'/ogretmen/ogrenciler/' + s.id} className="font-semibold hover:underline">{s.full_name}</Link> <span className="text-slate-500">· son çalışma: {fmtDate(sums.lastActivity.get(s.id))}</span></p>
          ))}
        </section>
      </div>
    </div>
  );
}
