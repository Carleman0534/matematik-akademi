import Link from 'next/link';
import type { Metadata } from 'next';
import { requireTeacher } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { KIND_LABEL, type Kind } from '@/lib/studyEngine';
import { fmtDate } from '@/lib/labels';

export const metadata: Metadata = { title: 'Öğrenme Planları' };
export const dynamic = 'force-dynamic';

const STATUS: Record<string, [string, string]> = {
  draft: ['Taslak', 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'], assigned: ['Atandı', 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200'],
  completed: ['Tamamlandı', 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'], archived: ['Arşiv', 'bg-slate-100 text-slate-500 dark:bg-slate-800'],
};

export default async function PlansPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const me = await requireTeacher();
  const sp = await searchParams;
  const show = sp.durum && sp.durum in STATUS ? sp.durum : '';
  const sb = await supabaseServer();
  let q = sb.from('study_plans').select('id, title, kind, status, due_on, created_at, student_id, students(full_name), study_plan_questions(result, answered_at)').eq('teacher_id', me.userId).order('created_at', { ascending: false }).limit(200);
  q = show ? q.eq('status', show) : q.neq('status', 'archived');
  const { data } = await q;
  type Row = { id: string; title: string; kind: Kind; status: string; due_on: string | null; created_at: string; student_id: string; students: { full_name: string } | { full_name: string }[] | null; study_plan_questions: { result: string | null; answered_at: string | null }[] };
  const plans = (data || []) as unknown as Row[];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1"><h1 className="text-2xl font-black">Öğrenme Planları</h1>
          <p className="text-sm text-slate-500">Öğrencilere atadığınız kişiselleştirilmiş çalışma setleri ve sonuçları.</p></div>
        <Link href="/ogretmen/ogrenci-analizleri" className="btn-secondary">🔬 Öğrenci analizleri</Link>
        <Link href="/ogretmen/ogrenme-planlari/yeni" className="btn-primary">＋ Yeni çalışma</Link>
      </div>
      {sp.yeni && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">✓ {sp.yeni} çalışma kaydedildi.</p>}
      <nav className="flex flex-wrap gap-2 text-sm" aria-label="Durum">
        {[['', 'Aktif olanlar'], ['draft', 'Taslak'], ['assigned', 'Atanan'], ['completed', 'Tamamlanan'], ['archived', 'Arşiv']].map(([k, l]) => (
          <Link key={k} href={k ? `/ogretmen/ogrenme-planlari?durum=${k}` : '/ogretmen/ogrenme-planlari'} className={'rounded-full px-3 py-1 font-semibold ' + (show === k ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800')}>{l}</Link>
        ))}
      </nav>
      {plans.length === 0 ? <p className="text-sm text-slate-500">Bu görünümde plan yok.</p> : (
        <div className="grid gap-3 md:grid-cols-2">
          {plans.map(p => {
            const qs = p.study_plan_questions, answered = qs.filter(x => x.answered_at).length, correct = qs.filter(x => x.result === 'correct').length;
            const name = (Array.isArray(p.students) ? p.students[0] : p.students)?.full_name || 'Öğrenci';
            return (
              <Link key={p.id} href={`/ogretmen/ogrenme-planlari/${p.id}`} className="card space-y-2 transition hover:border-indigo-400">
                <div className="flex items-start gap-2"><div className="min-w-0 flex-1"><p className="font-bold">{p.title}</p><p className="text-xs text-slate-500">{name} · {KIND_LABEL[p.kind]} · {fmtDate(p.created_at)}{p.due_on ? ` · son ${fmtDate(p.due_on)}` : ''}</p></div>
                  <span className={'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ' + STATUS[p.status][1]}>{STATUS[p.status][0]}</span></div>
                <div><div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-2 rounded-full bg-indigo-500" style={{ width: `${qs.length ? (answered / qs.length) * 100 : 0}%` }} /></div>
                  <p className="mt-1 text-xs text-slate-500">{answered}/{qs.length} soru çözüldü{answered ? ` · ${correct} doğru (%${Math.round((correct / answered) * 100)})` : ''}</p></div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
