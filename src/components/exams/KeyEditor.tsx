'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveKey } from '@/app/ogretmen/denemeler/actions';
import { letters, parseKeyString, type Letter } from '@/lib/exams';
import type { TopicOption } from '@/components/questions/TopicSelect';

interface Row { correct: Letter | null; topic_id: string | null; page_no: number | null }

export function KeyEditor({ examId, questionCount, optionCount, pageCount, initial, topics }: {
  examId: string; questionCount: number; optionCount: number; pageCount: number;
  initial: { question_no: number; correct: Letter | null; topic_id: string | null; page_no: number | null }[]; topics: TopicOption[];
}) {
  const router = useRouter();
  const L = letters(optionCount);
  const [rows, setRows] = useState<Row[]>(() => Array.from({ length: questionCount }, (_, i) => {
    const k = initial.find(r => r.question_no === i + 1);
    return { correct: k?.correct ?? null, topic_id: k?.topic_id ?? null, page_no: k?.page_no ?? null };
  }));
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<{ error?: string; ok?: string }>({});
  const [saving, setSaving] = useState(false);
  const [grade, setGrade] = useState('');
  const [quick, setQuick] = useState('');
  const [range, setRange] = useState({ from: '1', to: String(questionCount), topic: '', page: '' });

  const shown = useMemo(() => topics.filter(o => !grade || String(o.rootGrade) === grade), [topics, grade]);
  const label = useMemo(() => new Map(topics.map(t => [t.id, t.label])), [topics]);
  const update = (i: number, patch: Partial<Row>) => { setRows(r => r.map((x, j) => (j === i ? { ...x, ...patch } : x))); setDirty(true); setMsg({}); };

  const applyQuick = () => {
    const parsed = parseKeyString(quick, questionCount);
    if (typeof parsed === 'string') { setMsg({ error: parsed }); return; }
    const typed = quick.replace(/[\s,;.]/g, '').length;
    if (parsed.some(l => l && !L.includes(l))) { setMsg({ error: 'Bu denemede E şıkkı yok.' }); return; }
    setRows(r => r.map((x, i) => (i < typed ? { ...x, correct: parsed[i] } : x)));
    setDirty(true); setMsg({ ok: `${typed} sorunun cevabı yazıldı. Kaydetmeyi unutmayın.` });
  };

  const applyRange = () => {
    const a = Math.max(1, parseInt(range.from, 10) || 1), b = Math.min(questionCount, parseInt(range.to, 10) || questionCount);
    if (a > b) { setMsg({ error: 'Aralık hatalı.' }); return; }
    if (!range.topic && !range.page) { setMsg({ error: 'Konu ya da sayfa seçin.' }); return; }
    setRows(r => r.map((x, i) => (i + 1 >= a && i + 1 <= b ? { ...x, ...(range.topic ? { topic_id: range.topic } : {}), ...(range.page ? { page_no: parseInt(range.page, 10) } : {}) } : x)));
    setDirty(true); setMsg({ ok: `${a}–${b}. sorulara uygulandı. Kaydetmeyi unutmayın.` });
  };

  const save = async () => {
    setSaving(true); setMsg({});
    const r = await saveKey(examId, rows.map((x, i) => ({ question_no: i + 1, ...x })));
    setSaving(false);
    setMsg(r);
    if (!r.error) { setDirty(false); router.refresh(); }
  };

  const filled = rows.filter(r => r.correct).length, withTopic = rows.filter(r => r.topic_id).length;
  const pageOpts = Array.from({ length: pageCount }, (_, i) => i + 1);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
          <p className="mb-1 text-sm font-semibold">Hızlı cevap girişi</p>
          <p className="mb-2 text-xs text-slate-500">Cevapları sırayla yazın: <span className="font-mono">ABCDA BCE…</span> (boşluk serbest, iptal için <span className="font-mono">-</span>)</p>
          <div className="flex gap-2"><input value={quick} onChange={e => setQuick(e.target.value)} className="input font-mono uppercase" placeholder="ABCDABCDAB…" aria-label="Hızlı cevap anahtarı" />
            <button type="button" className="btn-secondary shrink-0" onClick={applyQuick}>Uygula</button></div>
        </div>
        <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
          <p className="mb-2 text-sm font-semibold">Toplu konu / sayfa ata</p>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <input aria-label="Başlangıç sorusu" value={range.from} onChange={e => setRange({ ...range, from: e.target.value })} className="input w-16" inputMode="numeric" />–
            <input aria-label="Bitiş sorusu" value={range.to} onChange={e => setRange({ ...range, to: e.target.value })} className="input w-16" inputMode="numeric" />
            <span className="text-slate-500">. sorular</span>
            <select aria-label="Konu" value={range.topic} onChange={e => setRange({ ...range, topic: e.target.value })} className="input min-w-0 flex-1">
              <option value="">Konu (değiştirme)</option>{shown.map(o => <option key={o.id} value={o.id}>{' '.repeat(o.depth * 3)}{o.label}</option>)}
            </select>
            {pageCount > 0 && <select aria-label="Sayfa" value={range.page} onChange={e => setRange({ ...range, page: e.target.value })} className="input w-28">
              <option value="">Sayfa</option>{pageOpts.map(p => <option key={p} value={p}>{p}. sayfa</option>)}
            </select>}
            <button type="button" className="btn-secondary" onClick={applyRange}>Uygula</button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span>Cevabı girilen: <b>{filled}/{questionCount}</b> · Konusu seçilen: <b>{withTopic}/{questionCount}</b></span>
        <label className="ml-auto flex items-center gap-2 text-xs">Konu listesi:
          <select value={grade} onChange={e => setGrade(e.target.value)} className="input w-28 py-1"><option value="">Tüm sınıflar</option>{[9, 10, 11, 12].map(g => <option key={g} value={g}>{g}. sınıf</option>)}</select></label>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500 dark:bg-slate-800/50"><tr><th className="w-12 px-2 py-2">No</th><th className="px-2">Doğru cevap</th><th className="px-2">Konu</th>{pageCount > 0 && <th className="w-28 px-2">Sayfa</th>}</tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-2 py-1.5 font-bold">{i + 1}</td>
                <td className="px-2"><div className="flex gap-1" role="radiogroup" aria-label={`${i + 1}. soru cevabı`}>
                  {L.map(l => (
                    <button key={l} type="button" role="radio" aria-checked={r.correct === l} onClick={() => update(i, { correct: r.correct === l ? null : l })}
                      className={'h-8 w-8 rounded-full border text-xs font-bold ' + (r.correct === l ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 hover:border-emerald-500 dark:border-slate-600')}>{l}</button>
                  ))}
                </div></td>
                <td className="px-2"><select aria-label={`${i + 1}. soru konusu`} value={r.topic_id || ''} onChange={e => update(i, { topic_id: e.target.value || null })} className="input py-1">
                  <option value="">—</option>
                  {r.topic_id && !shown.some(o => o.id === r.topic_id) && <option value={r.topic_id}>{label.get(r.topic_id) || 'Seçili konu'}</option>}
                  {shown.map(o => <option key={o.id} value={o.id}>{' '.repeat(o.depth * 3)}{o.label}</option>)}
                </select></td>
                {pageCount > 0 && <td className="px-2"><select aria-label={`${i + 1}. soru sayfası`} value={r.page_no ?? ''} onChange={e => update(i, { page_no: e.target.value ? parseInt(e.target.value, 10) : null })} className="input py-1">
                  <option value="">—</option>{pageOpts.map(p => <option key={p} value={p}>{p}</option>)}
                </select></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">Cevabı boş bırakılan soru <b>iptal</b> sayılır (puanlamaya girmez). Konu seçmek, sonuçlarda konu analizini; sayfa seçmek, yanlışları soru bankasına aktarırken sayfanın görselini ekler.</p>

      <div className="sticky bottom-20 z-10 flex items-center gap-3 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur md:bottom-3 dark:border-slate-800 dark:bg-slate-900/95">
        <button type="button" className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Kaydediliyor…' : 'Cevap anahtarını kaydet'}</button>
        {dirty && !msg.error && <span className="text-xs text-amber-600">Kaydedilmemiş değişiklik var</span>}
        {msg.error && <span role="alert" className="text-sm text-red-600 dark:text-red-400">{msg.error}</span>}
        {msg.ok && !msg.error && <span role="status" className="text-sm text-emerald-600 dark:text-emerald-400">✓ {msg.ok}</span>}
      </div>
    </div>
  );
}
