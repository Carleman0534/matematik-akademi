import type { Metadata } from 'next';
import { supabaseServer } from '@/lib/supabase/server';
import { getTopics } from '@/lib/data';
import { buildTree, flattenForSelect, type TopicNode } from '@/lib/topics';
import { AddTopicForm, DeleteTopicButton } from './TopicForms';
import { SubTabBar } from '@/components/SubTabBar';

export const metadata: Metadata = { title: 'Konular' };

const QUESTION_AI_TABS = [
  { href: '/ogretmen/soru-havuzu', label: 'Soru Havuzu', icon: '🗄️' },
  { href: '/ogretmen/ai-soru-uret', label: 'Yapay Zekâ ile Soru Üret', icon: '✨', badge: 'AI' },
  { href: '/ogretmen/ai-uretim-gecmisi', label: 'AI Üretim Geçmişi', icon: '⚡' },
  { href: '/ogretmen/kalite-denetim', label: 'Soru Kalite Denetimi', icon: '🛡️' },
  { href: '/ogretmen/konular', label: 'Konular & Kazanımlar', icon: '🗂️' },
];

function Node({ n }: { n: TopicNode }) {
  return (
    <li>
      <div className="flex items-center gap-2 py-0.5 text-sm"><span className={n.depth === 0 ? 'font-bold' : ''}>{n.name}</span><DeleteTopicButton id={n.id} name={n.name} hasChildren={n.children.length > 0} /></div>
      {n.children.length > 0 && <ul className="ml-4 border-l border-slate-200 pl-3 dark:border-slate-800">{n.children.map(c => <Node key={c.id} n={c} />)}</ul>}
    </li>
  );
}

export default async function TopicsPage() {
  const sb = await supabaseServer();
  const tree = buildTree(await getTopics(sb));
  const grades = [...new Set(tree.map(t => t.grade_level))];
  return (
    <div className="space-y-6">
      <SubTabBar
        title="Soru Bankası & AI Merkezi"
        description="LGS soru havuzu, yapay zekâ soru üretimi, kalite denetimi ve konu kazanım eşleme"
        tabs={QUESTION_AI_TABS}
      />

      <h1 className="text-2xl font-black">Matematik konuları</h1>
      <section className="card"><h2 className="mb-3 font-bold">Konu ekle</h2><AddTopicForm options={flattenForSelect(tree)} /></section>
      {tree.length === 0 ? <p className="text-sm text-slate-500">Konu yok. Hazır müfredat için <code>supabase/migrations/0002_seed_matematik.sql</code> dosyasını çalıştırın.</p> : (
        <div className="grid gap-4 md:grid-cols-2">
          {grades.map(g => (
            <section key={String(g)} className="card"><h2 className="mb-2 font-bold">{g ? g + '. sınıf' : 'Sınıfsız'}</h2>
              <ul>{tree.filter(t => t.grade_level === g).map(n => <Node key={n.id} n={n} />)}</ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
