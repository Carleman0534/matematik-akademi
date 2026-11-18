import Link from 'next/link';
import type { Metadata } from 'next';
import { requireTeacher } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { getTopics } from '@/lib/data';
import { topicOptions } from '@/lib/topicOptions';
import { topicPath } from '@/lib/topics';
import { gradeLabel } from '@/lib/labels';
import { listPool, POOL_LIMIT, type PoolFilters } from '@/lib/poolData';
import { DIFFICULTY_LEVELS, QUESTION_TYPES } from '@/lib/pool';
import { PoolGrid } from '@/components/pool/PoolGrid';

export const metadata: Metadata = { title: 'Soru Havuzu' };
export const dynamic = 'force-dynamic';

export default async function PoolPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const me = await requireTeacher();
  const sp = await searchParams;
  const f: PoolFilters = { pdf: sp.pdf, konu: sp.konu, zorluk: sp.zorluk, tur: sp.tur, gorsel: sp.gorsel, durum: sp.durum, benzer: sp.benzer, yayin: sp.yayin };
  const sb = await supabaseServer();
  const [topics, { data: pdfs }, { count: drafts }] = await Promise.all([
    getTopics(sb),
    sb.from('pdf_documents').select('id, title, publisher').eq('teacher_id', me.userId).neq('analysis_status', 'none').order('created_at', { ascending: false }),
    sb.from('pool_questions').select('id', { count: 'exact', head: true }).eq('teacher_id', me.userId).eq('status', 'draft'),
  ]);
  const docs = (pdfs || []) as { id: string; title: string; publisher: string | null }[];
  const publishers = [...new Set(docs.map(d => d.publisher).filter(Boolean))] as string[];
  const byPublisher = f.yayin ? docs.filter(d => d.publisher === f.yayin).map(d => d.id) : undefined;
  const { rows, truncated } = await listPool(sb, me.userId, f, topics, byPublisher);
  const opts = topicOptions(topics);
  const title = f.konu ? topicPath(topics, f.konu).split(' › ').pop() + ' çalışması' : 'Havuzdan deneme';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-black">Soru Havuzu</h1>
          <p className="text-sm text-slate-500">PDF&rsquo;lerden çıkarılıp onayladığınız sorular. Konu ve alt konuya, kaynağa, zorluğa ve türe göre süzün; seçtiklerinizden deneme oluşturun.</p>
        </div>
        <Link href="/ogretmen/soru-havuzu/analiz" className="btn-secondary">📊 Deneme konu analizi</Link>
        <Link href="/ogretmen/pdf-arsivi" className="btn-secondary">PDF Analiz Merkezi</Link>
      </div>
      {!!drafts && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">{drafts} soru inceleme bekliyor. <Link href="/ogretmen/soru-havuzu?durum=draft" className="font-semibold underline">Göster</Link> ya da PDF Analiz Merkezi&rsquo;nde &ldquo;İncele ve onayla&rdquo;.</p>}

      <form className="card grid gap-2 sm:grid-cols-2 lg:grid-cols-4" role="search">
        <div className="sm:col-span-2"><label className="label" htmlFor="konu">Konu / alt konu</label>
          <select id="konu" name="konu" defaultValue={f.konu || ''} className="input"><option value="">Bütün konular</option>
            {opts.map(o => <option key={o.id} value={o.id}>{o.depth === 0 ? `${gradeLabel(o.grade)} · ` : ' '.repeat(o.depth * 3)}{o.label}</option>)}</select></div>
        <div><label className="label" htmlFor="pdf">Kaynak PDF</label>
          <select id="pdf" name="pdf" defaultValue={f.pdf || ''} className="input"><option value="">Hepsi</option>{docs.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}</select></div>
        <div><label className="label" htmlFor="yayin">Yayınevi</label>
          <select id="yayin" name="yayin" defaultValue={f.yayin || ''} className="input"><option value="">Hepsi</option>{publishers.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
        <div><label className="label" htmlFor="zorluk">Zorluk</label>
          <select id="zorluk" name="zorluk" defaultValue={f.zorluk || ''} className="input"><option value="">Hepsi</option>{Object.entries(DIFFICULTY_LEVELS).map(([k, v]) => <option key={k} value={k}>{k} · {v}</option>)}</select></div>
        <div><label className="label" htmlFor="tur">Soru türü</label>
          <select id="tur" name="tur" defaultValue={f.tur || ''} className="input"><option value="">Hepsi</option>{Object.entries(QUESTION_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div><label className="label" htmlFor="durum">Durum</label>
          <select id="durum" name="durum" defaultValue={f.durum || 'approved'} className="input"><option value="approved">Onaylanan</option><option value="draft">İnceleme bekleyen</option><option value="all">Hepsi</option></select></div>
        <div className="flex flex-col justify-end gap-1 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" name="gorsel" value="1" defaultChecked={f.gorsel === '1'} />Yalnızca şekil/grafik içerenler</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="benzer" value="goster" defaultChecked={f.benzer === 'goster'} />Benzer (mükerrer) soruları da göster</label>
        </div>
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4"><button className="btn-primary">Süz</button><Link href="/ogretmen/soru-havuzu" className="btn-secondary">Temizle</Link>
          <span className="ml-auto self-center text-sm text-slate-500">{rows.length}{truncated ? '+' : ''} soru{truncated ? ` (ilk ${POOL_LIMIT})` : ''}</span></div>
      </form>

      {rows.length === 0 ? <p className="text-sm text-slate-500">Bu süzgece uyan soru yok.{docs.length === 0 ? ' Önce PDF Analiz Merkezi’nde bir PDF analiz edin.' : ''}</p> : (
        <PoolGrid defaultTitle={title} items={rows.map(r => ({
          id: r.id, url: r.url, approved: r.status === 'approved', dup: !!r.duplicate_of,
          title: `${r.section ? r.section + ' ' : ''}${r.question_no}. soru`,
          meta: [r.source_label, topicPath(topics, r.topic_id).split(' › ').slice(-2).join(' › ')].filter(Boolean).join(' · '),
          badges: [r.difficulty ? DIFFICULTY_LEVELS[r.difficulty] : '', r.question_type ? QUESTION_TYPES[r.question_type] : '', r.has_visual ? 'şekilli' : '', r.correct ? 'cevap ' + r.correct : 'cevap yok',
            ...r.pool_question_topics.map(t => '+ ' + (topicPath(topics, t.topic_id).split(' › ').pop() || ''))].filter(Boolean),
        }))} />
      )}
    </div>
  );
}
