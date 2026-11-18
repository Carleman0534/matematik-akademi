import Link from 'next/link';
import type { Metadata } from 'next';
import { supabaseServer } from '@/lib/supabase/server';
import { getTopics, getOutcomes, type Outcome } from '@/lib/data';
import { buildTree, flattenForSelect, type TopicNode } from '@/lib/topics';
import { gradeLabel } from '@/lib/labels';
import { AddTopicForm, TopicRow } from './TopicForms';

export const metadata: Metadata = { title: 'Konular ve müfredat' };

function Node({ n, siblings, index, outcomes, counts }: { n: TopicNode; siblings: number; index: number; outcomes: Map<string, Outcome[]>; counts: Map<string, number> }) {
  return (
    <li>
      <TopicRow id={n.id} name={n.name} depth={n.depth} active={n.is_active !== false} hasChildren={n.children.length > 0}
        first={index === 0} last={index === siblings - 1} questionCount={counts.get(n.id) || 0}
        outcomes={n.depth === 0 || outcomes.has(n.id) ? (outcomes.get(n.id) || []).map(o => ({ id: o.id, code: o.code, text: o.text, is_active: o.is_active })) : undefined} />
      {n.children.length > 0 && (
        <ul className="ml-4 border-l border-slate-200 pl-3 dark:border-slate-800">
          {n.children.map((c, i) => <Node key={c.id} n={c} siblings={n.children.length} index={i} outcomes={outcomes} counts={counts} />)}
        </ul>
      )}
    </li>
  );
}

export default async function TopicsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sb = await supabaseServer();
  const [topics, outcomes, { data: qs }] = await Promise.all([
    getTopics(sb), getOutcomes(sb), sb.from('questions').select('topic_id').not('topic_id', 'is', null).limit(10000),
  ]);
  const tree = buildTree(topics);
  const grades = [...new Set(tree.map(t => t.grade_level))];
  const sp = await searchParams;
  const sel = sp.sinif !== undefined && grades.some(g => String(g) === sp.sinif) ? (sp.sinif === 'null' ? null : Number(sp.sinif)) : (grades.includes(8) ? 8 : grades[0] ?? null);
  const roots = tree.filter(t => t.grade_level === sel);
  const byTopic = new Map<string, Outcome[]>();
  outcomes.forEach(o => byTopic.set(o.topic_id, [...(byTopic.get(o.topic_id) || []), o]));
  const counts = new Map<string, number>();
  ((qs || []) as { topic_id: string }[]).forEach(q => counts.set(q.topic_id, (counts.get(q.topic_id) || 0) + 1));
  const outcomeTotal = roots.reduce((a, r) => a + (byTopic.get(r.id)?.length || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">Konular ve müfredat</h1>
        <p className="mt-1 text-sm text-slate-500">Konu ağacı ve kazanımlar burada yönetilir; sorular, denemeler ve raporlar bu ağacı kullanır.
          Bir konuyu silmek yerine <b>pasifleştirirseniz</b> yeni seçimlerde görünmez ama eski soruların konusu korunur. Bir soru, ana konusuna ek olarak yardımcı konulara da bağlanabilir.</p>
      </div>

      <nav className="flex flex-wrap gap-2" aria-label="Sınıf düzeyi">
        {grades.map(g => (
          <Link key={String(g)} href={`/ogretmen/konular?sinif=${g}`} aria-current={g === sel ? 'page' : undefined}
            className={'rounded-full px-3 py-1 text-sm font-semibold ' + (g === sel ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300')}>{gradeLabel(g)}</Link>
        ))}
      </nav>

      <section className="card"><h2 className="mb-3 font-bold">Konu ekle</h2><AddTopicForm options={flattenForSelect(roots)} defaultGrade={sel} /></section>

      {roots.length === 0 ? <p className="text-sm text-slate-500">Bu düzeyde konu yok.</p> : (
        <section className="card space-y-2">
          <div className="flex flex-wrap items-baseline gap-2"><h2 className="font-bold">{gradeLabel(sel)}</h2>
            <span className="text-xs text-slate-500">{roots.length} ünite · {outcomeTotal} kazanım · ünitedeki &ldquo;kazanım&rdquo; düğmesiyle açın</span></div>
          <ul>{roots.map((n, i) => <Node key={n.id} n={n} siblings={roots.length} index={i} outcomes={byTopic} counts={counts} />)}</ul>
        </section>
      )}
    </div>
  );
}
