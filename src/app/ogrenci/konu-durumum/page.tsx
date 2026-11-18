import Link from 'next/link';
import type { Metadata } from 'next';
import { requireStudent } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { getTopics } from '@/lib/data';
import { studentProfile } from '@/lib/studyData';
import { PerfTable } from '@/components/study/PerfTable';

export const metadata: Metadata = { title: 'Konu Durumum' };
export const dynamic = 'force-dynamic';

export default async function MyTopicsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const s = await requireStudent();
  const grade = Number((await searchParams).sinif) || 8;
  const sb = await supabaseServer();
  const topics = await getTopics(sb);
  const p = await studentProfile(sb, s.studentId, 'student', topics, grade);
  const weak = p.perf.filter(u => u.perf.level === 'oncelikli' || u.perf.level === 'gelistirilmeli').sort((a, b) => (a.perf.rate ?? 1) - (b.perf.rate ?? 1));
  const strong = p.perf.filter(u => u.perf.level === 'guclu');
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div><Link href="/ogrenci/calisma" className="text-sm text-slate-500 hover:underline">← Çalışmalarım</Link>
        <h1 className="text-2xl font-black">Konu Durumum</h1>
        <p className="text-sm text-slate-500">Çözdüğün denemeler, soru bankan ve çalışmalarından hesaplanır. Çok az soru çözdüğün konularda &ldquo;yeterli veri yok&rdquo; yazar; bu kötü değil, henüz ölçülmedi demek.</p></div>
      {p.total === 0 ? <p className="card text-sm text-slate-500">Henüz değerlendirilecek veri yok. Bir deneme çözdüğünde ya da öğretmenin bir çalışma atadığında burada görünecek.</p> : (<>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="card"><p className="text-xs font-semibold text-slate-500">Öncelikli çalışılacak</p>{weak.length ? <ul className="mt-1 space-y-0.5 text-sm">{weak.slice(0, 4).map(u => <li key={u.unitId} className="font-semibold">{u.name} <span className="text-xs font-normal text-slate-500">%{Math.round((u.perf.rate ?? 0) * 100)}</span></li>)}</ul> : <p className="mt-1 text-sm text-slate-500">Şu an belirgin bir eksik görünmüyor.</p>}</div>
          <div className="card"><p className="text-xs font-semibold text-slate-500">Güçlü konuların</p>{strong.length ? <ul className="mt-1 space-y-0.5 text-sm">{strong.map(u => <li key={u.unitId} className="font-semibold text-emerald-700 dark:text-emerald-400">{u.name}</li>)}</ul> : <p className="mt-1 text-sm text-slate-500">Henüz güçlü sayılan konu yok; çalıştıkça burada görünecek.</p>}</div>
        </div>
        <section className="card space-y-2"><h2 className="font-bold">Bütün konular</h2><PerfTable perf={p.perf} />
          <p className="text-xs text-slate-500">{p.total} soru değerlendirildi · {p.sources.exam} deneme · {p.sources.bank} soru bankası · {p.sources.study} çalışma</p></section>
      </>)}
    </div>
  );
}
