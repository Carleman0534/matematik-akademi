import Link from 'next/link';
import type { Metadata } from 'next';
import { requireStudent } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { KIND_LABEL, type Kind } from '@/lib/studyEngine';
import { fmtDate } from '@/lib/labels';
import { dailyProgress } from '@/lib/adaptive';

export const metadata: Metadata = { title: 'Bana Özel Çalışmam' };
export const dynamic = 'force-dynamic';

export default async function MyStudyPage() {
  const s = await requireStudent();
  const sb = await supabaseServer();
  const { data } = await sb.from('study_plans').select('id, title, kind, status, due_on, assigned_at, completed_at, note').eq('student_id', s.studentId).order('assigned_at', { ascending: false }).limit(30);
  type P = { id: string; title: string; kind: Kind; status: 'assigned' | 'completed'; due_on: string | null; assigned_at: string | null; completed_at: string | null; note: string | null };
  const plans = (data || []) as P[];
  // İlerleme: soru tablosu öğrenciye kapalı olduğu için güvenli fonksiyonla alınır
  const progress = await Promise.all(plans.map(async p => {
    const { data: it } = await sb.rpc('study_plan_items', { pid: p.id });
    const rows = (it || []) as { answered: string | null; res: string | null }[];
    return { id: p.id, total: rows.length, done: rows.filter(r => r.answered).length, ok: rows.filter(r => r.res === 'correct').length };
  }));
  const prog = new Map(progress.map(x => [x.id, x]));
  const open = plans.filter(p => p.status === 'assigned'), closed = plans.filter(p => p.status === 'completed');
  // Günlük hedef ve seri (Türkiye saatiyle bugün çözülen çalışma soruları)
  const [{ data: me }, { data: evd }] = await Promise.all([sb.from('students').select('daily_goal').eq('id', s.studentId).maybeSingle(), sb.rpc('my_study_evidence')]);
  const goal = (me as { daily_goal: number } | null)?.daily_goal ?? 10;
  // eslint-disable-next-line react-hooks/purity -- sunucu bileşeni: istek anında bir kez hesaplanır
  const daily = dailyProgress(((evd || []) as { at_time: string }[]).map(e => e.at_time), Date.now());

  const card = (p: P) => { const g = prog.get(p.id)!; return (
    <Link key={p.id} href={`/ogrenci/calisma/${p.id}`} className="card space-y-2 transition hover:border-indigo-400">
      <div className="flex items-start gap-2"><div className="min-w-0 flex-1"><p className="font-bold">{p.title}</p><p className="text-xs text-slate-500">{KIND_LABEL[p.kind]}{p.due_on ? ` · son ${fmtDate(p.due_on)}` : ''}</p></div>
        <span className={'shrink-0 text-xs font-bold ' + (p.status === 'completed' ? 'text-emerald-600' : 'text-indigo-600 dark:text-indigo-400')}>{p.status === 'completed' ? '✓ Tamamlandı' : g.done ? 'Devam et →' : 'Başla →'}</span></div>
      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-2 rounded-full bg-indigo-500" style={{ width: `${g.total ? (g.done / g.total) * 100 : 0}%` }} /></div>
      <p className="text-xs text-slate-500">{g.done}/{g.total} soru{g.done ? ` · ${g.ok} doğru` : ''}</p>
    </Link>); };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start gap-3"><div className="min-w-0 flex-1"><h1 className="text-2xl font-black">Bana Özel Matematik Çalışmam</h1>
        <p className="text-sm text-slate-500">Öğretmenin senin konu eksiklerine göre hazırladığı çalışmalar.</p></div>
        <Link href="/ogrenci/konu-durumum" className="btn-secondary">📊 Konu durumum</Link></div>
      {goal > 0 && (
        <section className="card space-y-2" aria-label="Günlük hedef">
          <div className="flex flex-wrap items-center gap-3"><h2 className="font-bold">🎯 Bugünkü hedef</h2><span className="text-sm font-semibold">{Math.min(daily.today, goal)}/{goal} soru{daily.today >= goal ? ' ✓' : ''}</span>
            {daily.streak > 0 && <span className="ml-auto text-sm font-semibold text-amber-600 dark:text-amber-400">🔥 {daily.streak} gün üst üste</span>}</div>
          <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${Math.min(100, (daily.today / goal) * 100)}%` }} /></div>
          <p className="text-xs text-slate-500">{daily.today >= goal ? 'Bugünkü hedefini tamamladın, harika!' : open.length ? `Hedefe ${goal - daily.today} soru kaldı. Aşağıdaki çalışmalardan devam edebilirsin.` : 'Çalışma atandığında buradan ilerleyebilirsin; şimdilik Tekrar Et bölümünde soru bankanı çalışabilirsin.'}</p>
        </section>
      )}
      <section className="space-y-2"><h2 className="font-bold">Çözülecek çalışmalar</h2>
        {open.length === 0 ? <p className="text-sm text-slate-500">Şu an atanmış çalışma yok. Öğretmenin yeni bir çalışma atadığında burada görünür.</p> : <div className="grid gap-3 md:grid-cols-2">{open.map(card)}</div>}</section>
      {closed.length > 0 && <section className="space-y-2"><h2 className="font-bold">Tamamlananlar</h2><div className="grid gap-3 md:grid-cols-2">{closed.map(card)}</div></section>}
    </div>
  );
}
