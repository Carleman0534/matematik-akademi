import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { requireStudent } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { POOL_BUCKET } from '@/lib/env';
import { fmtDate } from '@/lib/labels';
import { StudyRunner, type StudyItem } from '@/components/study/StudyRunner';

export const metadata: Metadata = { title: 'Çalışma' };
export const dynamic = 'force-dynamic';

export default async function StudyPlanPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStudent();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const sb = await supabaseServer();
  const { data: plan } = await sb.from('study_plans').select('id, title, note, solution_mode, due_on, status').eq('id', id).maybeSingle(); // RLS: yalnızca atanmış olanlar
  if (!plan) notFound();
  const { data: it, error } = await sb.rpc('study_plan_items', { pid: id });
  if (error) notFound();
  const rows = (it || []) as { qid: string; pos: number; img: string; opts: number; ans: string | null; res: string | null; cor: string | null; answered: string | null }[];
  const { data: signed } = rows.length ? await sb.storage.from(POOL_BUCKET).createSignedUrls([...new Set(rows.map(r => r.img))], 4 * 3600) : { data: [] };
  const url = new Map((signed || []).map(s => [s.path as string, s.signedUrl as string]));
  const items: StudyItem[] = rows.map(r => ({ qid: r.qid, pos: r.pos, url: url.get(r.img) || null, opts: r.opts, ans: r.ans, res: r.res, cor: r.cor, answered: !!r.answered }));
  return (
    <div className="space-y-3">
      <Link href="/ogrenci/calisma" className="text-sm text-slate-500 hover:underline">← Çalışmalarım</Link>
      <StudyRunner planId={plan.id} title={plan.title} note={plan.note} solutionMode={plan.solution_mode} initial={items} dueLabel={plan.due_on ? fmtDate(plan.due_on) : null} />
    </div>
  );
}
