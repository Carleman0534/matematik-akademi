import { GRADES, gradeLabel } from '@/lib/labels';
import Link from 'next/link';
import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchBank, getSources, getTopics, BANK_LIMIT } from '@/lib/data';
import { parseFilters, filtersToQuery, activeFilterCount, type BankFilters } from '@/lib/filters';
import { STATUS_LABEL, STATUS_ORDER } from '@/lib/learning';
import { buildTree, flattenForSelect } from '@/lib/topics';
import { INITIAL_LABEL, DIFFICULTY_LABEL, STATUS_STYLE, fmtDate } from '@/lib/labels';

type Params = Record<string, string | string[] | undefined>;

// Kişisel soru bankası: filtreler (adres çubuğunda), özet ve soru kartları. Öğretmen ve öğrenci aynı bileşeni kullanır;
// kim neyi görebilir, veritabanı (RLS) belirler.
export async function QuestionBank({ sb, studentId, searchParams, basePath, addHref }: { sb: SupabaseClient; studentId: string; searchParams: Params; basePath: string; addHref: string }) {
  const f = parseFilters(searchParams);
  const [topics, sources] = await Promise.all([getTopics(sb), getSources(sb)]);
  const { items, truncated } = await fetchBank(sb, studentId, f, topics, sources);
  const topicOpts = flattenForSelect(buildTree(topics));
  const link = (patch: Partial<BankFilters>) => basePath + '?' + filtersToQuery({ ...f, ...patch });
  const chips: [string, Partial<BankFilters>, boolean][] = [
    ['Tümü', { durum: '', ogrenme: '', minYanlis: 0 }, !f.durum && !f.ogrenme && !f.minYanlis],
    ['Yanlışlar', { durum: 'wrong', ogrenme: '' }, f.durum === 'wrong' && !f.ogrenme],
    ['Boşlar', { durum: 'blank', ogrenme: '' }, f.durum === 'blank' && !f.ogrenme],
    ['Bugün tekrar', { ogrenme: 'due', durum: '' }, f.ogrenme === 'due'],
    ['Tekrar yanlış', { ogrenme: 'tekrar_yanlis', durum: '' }, f.ogrenme === 'tekrar_yanlis'],
    ['En az 2 kez yanlış', { minYanlis: 2, ogrenme: '', durum: '' }, f.minYanlis === 2],
    ['Öğrenilenler', { ogrenme: 'learned', durum: '' }, f.ogrenme === 'learned'],
  ];
  const nActive = activeFilterCount(f);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {chips.map(([label, patch, on]) => (
          <Link key={label} href={link(patch)} className={'rounded-full px-3 py-1.5 text-xs font-semibold ' + (on ? 'bg-indigo-600 text-white' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300')}>{label}</Link>
        ))}
        <Link href={addHref} className="btn-primary ml-auto">＋ Soru ekle</Link>
      </div>

      {/* Ayrıntılı filtre: JavaScript gerektirmeyen GET formu; sonuç adresi paylaşılabilir */}
      <details className="card p-4" open={nActive > 0}>
        <summary className="cursor-pointer text-sm font-semibold">🔎 Filtrele ve ara {nActive > 0 && <span className="ml-1 rounded-full bg-indigo-100 px-2 text-xs text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">{nActive} filtre</span>}</summary>
        <form method="get" action={basePath} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2"><label className="label" htmlFor="q">Ara (soru metni, notlar, test/soru no)</label><input id="q" name="q" defaultValue={f.q} className="input" /></div>
          <div><label className="label" htmlFor="sinif">Sınıf</label>
            <select id="sinif" name="sinif" defaultValue={f.sinif} className="input"><option value="">Tümü</option>{GRADES.map(g => <option key={g} value={g}>{gradeLabel(g)}</option>)}</select></div>
          <div><label className="label" htmlFor="konu">Ünite / konu</label>
            <select id="konu" name="konu" defaultValue={f.konu} className="input"><option value="">Tümü</option>
              {topicOpts.map(t => <option key={t.id} value={t.id}>{' '.repeat(t.depth * 3)}{t.depth === 0 && t.grade ? t.grade + '. sınıf · ' : ''}{t.label}</option>)}</select></div>
          <div><label className="label" htmlFor="durum">Eklenme nedeni</label>
            <select id="durum" name="durum" defaultValue={f.durum} className="input"><option value="">Yanlış + boş</option><option value="wrong">Yanlış</option><option value="blank">Boş</option></select></div>
          <div><label className="label" htmlFor="ogrenme">Öğrenme durumu</label>
            <select id="ogrenme" name="ogrenme" defaultValue={f.ogrenme} className="input"><option value="">Tümü</option><option value="due">Bugün tekrar edilmeli</option><option value="learned">Öğrenilenler (öğrenildi + kalıcı)</option>
              {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select></div>
          <div><label className="label" htmlFor="zorluk">Zorluk</label>
            <select id="zorluk" name="zorluk" defaultValue={f.zorluk} className="input"><option value="">Tümü</option>{Object.entries(DIFFICULTY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <div><label className="label" htmlFor="kaynak">Kaynak</label>
            <select id="kaynak" name="kaynak" defaultValue={f.kaynak} className="input"><option value="">Tümü</option>{sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          <div><label className="label" htmlFor="minYanlis">En az kaç kez yanlış/boş</label>
            <select id="minYanlis" name="minYanlis" defaultValue={f.minYanlis || ''} className="input"><option value="">Farketmez</option>{[2, 3, 4, 5].map(n => <option key={n} value={n}>{n}+</option>)}</select></div>
          <div><label className="label" htmlFor="baslangic">Eklenme: başlangıç</label><input id="baslangic" name="baslangic" type="date" defaultValue={f.baslangic} className="input" /></div>
          <div><label className="label" htmlFor="bitis">Eklenme: bitiş</label><input id="bitis" name="bitis" type="date" defaultValue={f.bitis} className="input" /></div>
          <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" name="arsiv" value="1" defaultChecked={f.arsiv} /> Arşivdekileri göster</label>
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
            <button className="btn-primary">Uygula</button>
            <Link href={basePath} className="btn-secondary">Temizle</Link>
          </div>
        </form>
      </details>

      <p className="text-sm text-slate-500">{items.length} soru{truncated ? ` (en yeni ${BANK_LIMIT} soru arasında; daraltmak için filtre kullanın)` : ''}</p>

      {items.length === 0 ? (
        <div className="card text-center text-sm text-slate-500">
          {nActive ? 'Bu filtrelere uyan soru yok.' : 'Soru bankası henüz boş. Yanlış ya da boş bıraktığınız ilk soruyu ekleyin.'}
          <div className="mt-3"><Link href={addHref} className="btn-primary">＋ Soru ekle</Link></div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(({ q, a, thumbUrl, topic, source }) => (
            <Link key={q.id} href={'/soru/' + q.id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-indigo-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
              <div className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-slate-100 dark:bg-slate-800">
                {thumbUrl ? <img src={thumbUrl} alt="Soru görseli" className="h-full w-full object-contain" loading="lazy" />
                  : <p className="line-clamp-6 p-4 text-sm text-slate-600 dark:text-slate-300">{q.question_text || 'Görsel yok'}</p>}
              </div>
              <div className="space-y-1.5 p-3">
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
                  <span className={'rounded px-1.5 py-0.5 ' + (q.initial_status === 'blank' ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300' : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300')}>{INITIAL_LABEL[q.initial_status]}</span>
                  <span className={'rounded px-1.5 py-0.5 ' + STATUS_STYLE[a.status]}>{STATUS_LABEL[a.status]}</span>
                  {q.difficulty && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600 dark:bg-slate-800 dark:text-slate-400">{DIFFICULTY_LABEL[q.difficulty]}</span>}
                  {a.due && <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">Tekrar zamanı</span>}
                </div>
                <p className="truncate text-sm font-semibold" title={topic}>{topic || 'Konu seçilmedi'}</p>
                <p className="truncate text-xs text-slate-500">{[source, q.test_no && 'Test ' + q.test_no, q.question_no && 'Soru ' + q.question_no].filter(Boolean).join(' · ') || '—'}</p>
                <p className="text-xs text-slate-500">{fmtDate(q.created_at)} · {a.wrongCount} yanlış · {a.blankCount} boş · {a.reviewCount} tekrar</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
