'use client';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { previewPlans, createPlans, type StudentPreview } from '@/app/ogretmen/ogrenme-planlari/actions';
import { KIND_LABEL, DIFF_LABEL, type Kind } from '@/lib/studyEngine';
import { QUESTION_TYPES } from '@/lib/pool';

interface Props {
  students: { id: string; name: string; cls: string | null }[]; units: { id: string; name: string }[]; pdfs: { id: string; title: string }[];
  grade: number; initial: { students: string[]; units: string[]; kind: Kind; count: number; rec?: string };
}

const KIND_HINT: Record<Kind, string> = {
  ogrenme: 'Temel ve kolay sorulardan başlar.', pekistirme: 'Kolay–orta sorularla konuyu sağlamlaştırır.', yeni_nesil: 'Yeni nesil / yorum soruları öne çıkar.',
  zorlayici: 'Zor ve ileri düzey sorular.', karma: 'Öğrencinin düzeyine göre zorluk ayarlanır (önerilen).', eksik_tamamlama: 'En zayıf konulara odaklanır, düzeye göre ayarlanır.',
  mini_deneme: 'Üniteleri eşit dağıtır (LGS formatında karışık).',
};

export function PlanBuilder({ students, units, pdfs, grade, initial }: Props) {
  const router = useRouter();
  const [stSel, setStSel] = useState<Set<string>>(new Set(initial.students));
  const [unitSel, setUnitSel] = useState<Set<string>>(new Set(initial.units));
  const [pdfSel, setPdfSel] = useState<Set<string>>(new Set());
  const [kind, setKind] = useState<Kind>(initial.kind);
  const [count, setCount] = useState(String(initial.count));
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<'after_answer' | 'after_complete' | 'never'>('after_answer');
  const [due, setDue] = useState('');
  const [note, setNote] = useState('');
  const [q, setQ] = useState('');
  const [previews, setPreviews] = useState<StudentPreview[] | null>(null);
  const [msg, setMsg] = useState<{ error?: string; ok?: string }>({});
  const [zoom, setZoom] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const tog = (set: Set<string>, id: string, fn: (s: Set<string>) => void) => { const n = new Set(set); if (n.has(id)) n.delete(id); else n.add(id); fn(n); };
  const shown = useMemo(() => students.filter(s => s.name.toLocaleLowerCase('tr').includes(q.toLocaleLowerCase('tr'))), [students, q]);

  const preview = () => start(async () => {
    setMsg({}); setPreviews(null);
    const r = await previewPlans({ studentIds: [...stSel], kind, count: Number(count), unitIds: [...unitSel], pdfIds: [...pdfSel], grade });
    if (r.error) setMsg({ error: r.error }); else setPreviews(r.previews || []);
  });
  const remove = (sid: string, id: string) => setPreviews(prev => (prev || []).map(p => (p.studentId === sid ? { ...p, items: p.items.filter(i => i.id !== id) } : p)));
  const save = (assign: boolean) => start(async () => {
    const plans = (previews || []).filter(p => p.items.length).map(p => ({ studentId: p.studentId, title: title.trim() ? (previews!.length > 1 ? `${title.trim()} – ${p.name}` : title.trim()) : `${KIND_LABEL[kind]} – ${p.name}`, items: p.items.map(i => ({ id: i.id, reason: i.reason })) }));
    const r = await createPlans(plans, { kind, solution_mode: mode, due_on: due, note, assign }, initial.rec);
    if (r.error) { setMsg({ error: r.error }); return; }
    router.push('/ogretmen/ogrenme-planlari?yeni=' + (r.ids || []).length);
  });
  const total = (previews || []).reduce((a, p) => a + p.items.length, 0);

  return (
    <div className="space-y-5">
      <section className="card space-y-4">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2"><span className="label mb-0">1. Öğrenciler ({stSel.size})</span>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Ara…" className="input w-40 py-1 text-xs" aria-label="Öğrenci ara" />
            <button type="button" className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400" onClick={() => setStSel(new Set(shown.map(s => s.id)))}>Görünenleri seç</button>
            <button type="button" className="text-xs text-slate-500 hover:underline" onClick={() => setStSel(new Set())}>Temizle</button></div>
          <div className="grid max-h-48 gap-1 overflow-y-auto rounded-xl border border-slate-200 p-2 sm:grid-cols-2 lg:grid-cols-3 dark:border-slate-800">
            {shown.map(s => <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"><input type="checkbox" checked={stSel.has(s.id)} onChange={() => tog(stSel, s.id, setStSel)} />{s.name}{s.cls && <span className="text-xs text-slate-400">· {s.cls}</span>}</label>)}
            {shown.length === 0 && <p className="p-2 text-xs text-slate-500">Öğrenci yok.</p>}
          </div>
          <p className="mt-1 text-xs text-slate-500">Birden fazla öğrenci seçerseniz her biri için <b>ayrı, kendi düzeyine göre</b> bir liste hazırlanır.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2"><label className="label" htmlFor="kind">2. Çalışma türü</label>
            <select id="kind" value={kind} onChange={e => setKind(e.target.value as Kind)} className="input">{Object.entries(KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            <p className="mt-1 text-xs text-slate-500">{KIND_HINT[kind]}</p></div>
          <div><label className="label" htmlFor="count">Soru sayısı</label><input id="count" className="input" inputMode="numeric" value={count} onChange={e => setCount(e.target.value)} /></div>
        </div>

        <div>
          <span className="label">3. Konular <span className="font-normal">(boş bırakırsanız sistem öğrencinin en zayıf konularını seçer)</span></span>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">{units.map(u => <label key={u.id} className="flex items-center gap-1.5"><input type="checkbox" checked={unitSel.has(u.id)} onChange={() => tog(unitSel, u.id, setUnitSel)} />{u.name}</label>)}</div>
        </div>
        {pdfs.length > 0 && (
          <details><summary className="cursor-pointer text-sm font-semibold">Yalnızca belirli kaynaklardan ({pdfSel.size || 'hepsi'})</summary>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">{pdfs.map(p => <label key={p.id} className="flex items-center gap-1.5"><input type="checkbox" checked={pdfSel.has(p.id)} onChange={() => tog(pdfSel, p.id, setPdfSel)} />{p.title}</label>)}</div></details>
        )}

        <div className="grid gap-3 sm:grid-cols-4">
          <div className="sm:col-span-2"><label className="label" htmlFor="title">Başlık <span className="font-normal">(isteğe bağlı)</span></label><input id="title" className="input" maxLength={120} value={title} onChange={e => setTitle(e.target.value)} placeholder={KIND_LABEL[kind]} /></div>
          <div><label className="label" htmlFor="mode">Çözüm gösterimi</label><select id="mode" className="input" value={mode} onChange={e => setMode(e.target.value as typeof mode)}><option value="after_answer">Her sorudan sonra</option><option value="after_complete">Çalışma bitince</option><option value="never">Hiç gösterme</option></select></div>
          <div><label className="label" htmlFor="due">Son tarih</label><input id="due" type="date" className="input" value={due} onChange={e => setDue(e.target.value)} /></div>
          <div className="sm:col-span-4"><label className="label" htmlFor="note">Öğrenciye not</label><input id="note" className="input" maxLength={1000} value={note} onChange={e => setNote(e.target.value)} placeholder="ör. Önce çözümleri incelemeden dene." /></div>
        </div>
        <div className="flex flex-wrap items-center gap-3"><button type="button" className="btn-primary" disabled={pending || !stSel.size} onClick={preview}>{pending && !previews ? 'Hazırlanıyor…' : 'Soruları seç ve önizle'}</button>
          {msg.error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{msg.error}</p>}</div>
      </section>

      {previews && (
        <section className="space-y-3">
          <div className="sticky top-14 z-10 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white/95 p-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
            <b>{previews.length} öğrenci · {total} soru</b><span className="text-xs text-slate-500">Beğenmediğiniz soruyu ✕ ile çıkarın.</span>
            <button type="button" className="btn-secondary ml-auto" disabled={pending || !total} onClick={() => save(false)}>Taslak kaydet</button>
            <button type="button" className="btn-primary" disabled={pending || !total} onClick={() => save(true)}>{pending ? 'Kaydediliyor…' : 'Kaydet ve öğrencilere ata'}</button>
          </div>
          {previews.map(p => (
            <div key={p.studentId} className="card space-y-2">
              <div className="flex flex-wrap items-baseline gap-2"><h2 className="font-bold">{p.name}</h2><span className="text-xs text-slate-500">{p.items.length} soru</span></div>
              <p className="text-xs text-slate-500">{p.summary}</p>
              {p.notes.map(n => <p key={n} className="text-xs text-amber-700 dark:text-amber-300">⚠ {n}</p>)}
              {p.items.length === 0 ? <p className="text-sm text-slate-500">Bu öğrenci için uygun soru bulunamadı.</p> : (
                <ol className="grid gap-2 md:grid-cols-2">
                  {p.items.map((it, i) => (
                    <li key={it.id} className="flex gap-2 rounded-xl border border-slate-200 p-2 dark:border-slate-800">
                      <button type="button" onClick={() => setZoom(it.url)} className="h-24 w-24 shrink-0 overflow-hidden rounded border border-slate-200 bg-white dark:border-slate-700" aria-label="Büyüt">{it.url && <img src={it.url} alt="" className="h-full w-full object-cover object-top" loading="lazy" />}</button>
                      <div className="min-w-0 flex-1 text-xs">
                        <p className="font-bold">{i + 1}. {it.topicName}</p>
                        <p className="text-slate-500">{it.difficulty ? DIFF_LABEL[it.difficulty] : 'zorluk ?'}{it.type ? ' · ' + (QUESTION_TYPES[it.type] || it.type) : ''}</p>
                        <p className="mt-0.5 text-slate-500" title="Neden bu soru?">💡 {it.reason}</p>
                      </div>
                      <button type="button" className="self-start text-slate-400 hover:text-red-600" aria-label="Soruyu çıkar" onClick={() => remove(p.studentId, it.id)}>✕</button>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          ))}
          {msg.error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{msg.error}</p>}
        </section>
      )}
      {zoom && <div className="fixed inset-0 z-50 overflow-auto bg-black/80 p-4" onClick={() => setZoom(null)} role="dialog" aria-label="Soru"><img src={zoom} alt="" className="mx-auto max-w-4xl bg-white" /></div>}
    </div>
  );
}
