'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase/client';
import { checkImage, extOf, makeThumb } from '@/lib/images';
import { ensureSource } from '@/app/soru/actions';
import { DIFFICULTY_LABEL, ERROR_TYPES } from '@/lib/labels';
import { IMAGE_BUCKET } from '@/lib/env';
import { TopicSelect, type TopicOption } from './TopicSelect';

interface Draft {
  key: string; file: File | null; preview: string | null; text: string;
  status: 'wrong' | 'blank'; topicId: string; difficulty: string; questionNo: string;
  correct: string; given: string; errorType: string; note: string;
  state: 'ready' | 'saving' | 'saved' | 'error'; error?: string; savedId?: string;
}

const newKey = () => crypto.randomUUID();

// Soru ekleme: tek ya da toplu fotoğraf (kamera/galeri) ya da fotoğrafsız metin. Ortak bilgiler (kaynak, test, sayfa,
// konu, yanlış/boş) bir kez girilir; her soru kaydetmeden önce ayrı ayrı düzenlenebilir.
export function AddQuestionsForm({ studentId, studentName, options, sources, bankHref, isTeacher }: {
  studentId: string; studentName?: string; options: TopicOption[]; sources: { id: string; name: string }[]; bankHref: string; isTeacher: boolean;
}) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [sourceId, setSourceId] = useState('');
  const [newSource, setNewSource] = useState('');
  const [testNo, setTestNo] = useState('');
  const [pageNo, setPageNo] = useState('');
  const [topicId, setTopicId] = useState('');
  const [status, setStatus] = useState<'wrong' | 'blank'>('wrong');
  const [difficulty, setDifficulty] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);

  const base = (): Omit<Draft, 'key' | 'file' | 'preview'> => ({ text: '', status, topicId, difficulty, questionNo: '', correct: '', given: '', errorType: '', note: '', state: 'ready' });
  const addFiles = (files: FileList | null) => {
    if (!files || !files.length) return;
    const list = Array.from(files).map(f => {
      const err = checkImage(f);
      return { key: newKey(), file: f, preview: err ? null : URL.createObjectURL(f), ...base(), ...(err ? { state: 'error' as const, error: err } : {}) };
    });
    setDrafts(d => [...d, ...list]);
    setMsg('');
  };
  const addText = () => setDrafts(d => [...d, { key: newKey(), file: null, preview: null, ...base() }]);
  const upd = (key: string, patch: Partial<Draft>) => setDrafts(d => d.map(x => x.key === key ? { ...x, ...patch } : x));
  const remove = (key: string) => setDrafts(d => { const x = d.find(y => y.key === key); if (x?.preview) URL.revokeObjectURL(x.preview); return d.filter(y => y.key !== key); });
  // Ortak alan değişince henüz kaydedilmemiş taslaklara da uygula
  const setCommon = (patch: Partial<Draft>) => setDrafts(d => d.map(x => x.state === 'saved' ? x : { ...x, ...patch }));

  const pending = drafts.filter(d => d.state !== 'saved');
  const saveAll = async () => {
    const todo = drafts.filter(d => d.state === 'ready' || (d.state === 'error' && (d.file ? !checkImage(d.file) : true)));
    if (!todo.length) return;
    for (const d of todo) if (!d.file && !d.text.trim()) { upd(d.key, { state: 'error', error: 'Fotoğrafsız soruya soru metni yazın.' }); return; }
    setBusy(true); setMsg('');
    let src = sourceId;
    if (newSource.trim()) {
      const r = await ensureSource(newSource);
      if (r.error) { setMsg(r.error); setBusy(false); return; }
      src = r.id || '';
      setSourceId(src); setNewSource('');
    }
    const sb = supabaseBrowser();
    let ok = 0;
    for (const d of todo) {
      upd(d.key, { state: 'saving', error: undefined });
      try {
        const images: { path: string; thumb_path: string; width: number; height: number }[] = [];
        if (d.file) {
          const id = crypto.randomUUID();
          const path = `${studentId}/${id}.${extOf(d.file)}`, thumb = `${studentId}/${id}_k.jpg`;
          const t = await makeThumb(d.file);
          const up1 = await sb.storage.from(IMAGE_BUCKET).upload(path, d.file, { contentType: d.file.type, upsert: false });
          if (up1.error) throw new Error('Fotoğraf yüklenemedi: ' + up1.error.message);
          const up2 = await sb.storage.from(IMAGE_BUCKET).upload(thumb, t.blob, { contentType: 'image/jpeg', upsert: false });
          if (up2.error) throw new Error('Önizleme yüklenemedi: ' + up2.error.message);
          images.push({ path, thumb_path: thumb, width: t.width, height: t.height });
        }
        const { data, error } = await sb.rpc('create_question', { p: {
          student_id: studentId, topic_id: d.topicId, source_id: src, initial_status: d.status, difficulty: d.difficulty,
          page_no: pageNo, test_no: testNo, question_no: d.questionNo, question_text: d.text, correct_answer: d.correct,
          student_answer: d.given, error_type: d.errorType, student_note: isTeacher ? '' : d.note, teacher_note: isTeacher ? d.note : '', images,
        } });
        if (error) throw new Error('Soru kaydedilemedi: ' + error.message);
        upd(d.key, { state: 'saved', savedId: String(data) });
        ok++;
      } catch (e) {
        upd(d.key, { state: 'error', error: (e as Error).message || 'Kaydedilemedi.' });
      }
    }
    setBusy(false);
    setMsg(ok ? `${ok} soru soru bankasına eklendi.` : '');
  };
  const reset = () => { drafts.forEach(d => d.preview && URL.revokeObjectURL(d.preview)); setDrafts([]); setMsg(''); };

  return (
    <div className="space-y-5">
      <section className="card space-y-4">
        <h2 className="font-bold">1. Ortak bilgiler <span className="text-xs font-normal text-slate-500">(hepsi isteğe bağlı; sonra da tamamlanabilir)</span></h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2"><label className="label" htmlFor="kaynak">Kaynak kitap / deneme</label>
            <div className="flex gap-2">
              <select id="kaynak" value={sourceId} onChange={e => { setSourceId(e.target.value); setNewSource(''); }} className="input min-w-0"><option value="">Seçilmedi</option>{sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
              <input aria-label="Yeni kaynak adı" placeholder="ya da yeni kaynak yaz" value={newSource} onChange={e => { setNewSource(e.target.value); if (e.target.value) setSourceId(''); }} className="input min-w-0" />
            </div></div>
          <div><label className="label" htmlFor="test">Test / deneme no</label><input id="test" value={testNo} onChange={e => setTestNo(e.target.value)} className="input" /></div>
          <div><label className="label" htmlFor="sayfa">Sayfa</label><input id="sayfa" value={pageNo} onChange={e => setPageNo(e.target.value)} className="input" inputMode="numeric" /></div>
          <div className="sm:col-span-2"><label className="label" htmlFor="ortak-konu">Konu (tüm sorular için)</label><TopicSelect id="ortak-konu" options={options} value={topicId} onChange={v => { setTopicId(v); setCommon({ topicId: v }); }} /></div>
          <div><span className="label">Yanlış mı, boş mu?</span>
            <div className="flex gap-2">{(['wrong', 'blank'] as const).map(s => <button key={s} type="button" onClick={() => { setStatus(s); setCommon({ status: s }); }} className={'flex-1 rounded-lg border px-3 py-2 text-sm font-semibold ' + (status === s ? (s === 'wrong' ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-200' : 'border-slate-500 bg-slate-100 dark:bg-slate-800') : 'border-slate-300 dark:border-slate-700')}>{s === 'wrong' ? 'Yanlış' : 'Boş'}</button>)}</div></div>
          <div><label className="label" htmlFor="zorluk">Zorluk</label><select id="zorluk" value={difficulty} onChange={e => { setDifficulty(e.target.value); setCommon({ difficulty: e.target.value }); }} className="input"><option value="">Seçilmedi</option>{Object.entries(DIFFICULTY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="font-bold">2. Sorular {studentName && <span className="text-sm font-normal text-slate-500">· {studentName} için</span>}</h2>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-primary" onClick={() => camRef.current?.click()}>📷 Fotoğraf çek</button>
          <button type="button" className="btn-secondary" onClick={() => galRef.current?.click()}>🖼️ Galeriden seç (birden çok)</button>
          <button type="button" className="btn-secondary" onClick={addText}>✍️ Fotoğrafsız soru</button>
          <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
          <input ref={galRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
        </div>
        {drafts.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700">Bir denemedeki tüm yanlış ve boş sorularınızı tek seferde seçebilirsiniz; her biri ayrı soru olarak kaydedilir.</p>}

        <div className="space-y-3">
          {drafts.map((d, i) => (
            <div key={d.key} className={'grid gap-3 rounded-xl border p-3 sm:grid-cols-[180px_1fr] ' + (d.state === 'saved' ? 'border-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/30' : d.state === 'error' ? 'border-red-400' : 'border-slate-200 dark:border-slate-800')}>
              <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                {d.preview ? <img src={d.preview} alt={`${i + 1}. soru`} className="h-full w-full object-contain" /> : <span className="p-2 text-center text-xs text-slate-500">{d.file ? 'Önizleme yok' : 'Fotoğrafsız soru'}</span>}
              </div>
              {d.state === 'saved' ? (
                <div className="flex flex-col justify-center gap-1 text-sm"><b className="text-emerald-700 dark:text-emerald-300">✓ {i + 1}. soru kaydedildi</b>{d.savedId && <Link href={'/soru/' + d.savedId} className="text-indigo-600 hover:underline dark:text-indigo-400">Soruyu aç →</Link>}</div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="flex items-center gap-2 sm:col-span-2"><b className="text-sm">{i + 1}. soru</b>
                    <div className="ml-auto flex gap-1">{(['wrong', 'blank'] as const).map(s => <button key={s} type="button" onClick={() => upd(d.key, { status: s })} className={'rounded-md px-2.5 py-1 text-xs font-semibold ' + (d.status === s ? (s === 'wrong' ? 'bg-red-600 text-white' : 'bg-slate-600 text-white') : 'bg-slate-100 dark:bg-slate-800')}>{s === 'wrong' ? 'Yanlış' : 'Boş'}</button>)}
                      <button type="button" onClick={() => remove(d.key)} aria-label={`${i + 1}. soruyu çıkar`} className="rounded-md px-2 text-xs text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950">✕</button></div></div>
                  {!d.file && <textarea aria-label="Soru metni" placeholder="Soru metni *" value={d.text} onChange={e => upd(d.key, { text: e.target.value })} rows={3} className="input sm:col-span-2" />}
                  <div className="sm:col-span-2"><TopicSelect options={options} value={d.topicId} onChange={v => upd(d.key, { topicId: v })} /></div>
                  <input aria-label="Soru no" placeholder="Soru no" value={d.questionNo} onChange={e => upd(d.key, { questionNo: e.target.value })} className="input" />
                  <select aria-label="Hata türü" value={d.errorType} onChange={e => upd(d.key, { errorType: e.target.value })} className="input"><option value="">Hata türü (isteğe bağlı)</option>{ERROR_TYPES.map(t => <option key={t}>{t}</option>)}</select>
                  <input aria-label="Doğru cevap" placeholder="Doğru cevap (ör. C)" value={d.correct} onChange={e => upd(d.key, { correct: e.target.value })} className="input" />
                  <input aria-label="Verilen cevap" placeholder="Verdiğim cevap" value={d.given} onChange={e => upd(d.key, { given: e.target.value })} className="input" disabled={d.status === 'blank'} />
                  <textarea aria-label="Not" placeholder={isTeacher ? 'Öğretmen notu (öğrenci görür)' : 'Notum (neden yanlış yaptım?)'} value={d.note} onChange={e => upd(d.key, { note: e.target.value })} rows={2} className="input sm:col-span-2" />
                  {d.error && <p role="alert" className="text-sm text-red-600 sm:col-span-2 dark:text-red-400">{d.error}</p>}
                  {d.state === 'saving' && <p className="text-sm text-indigo-600 sm:col-span-2">Kaydediliyor…</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="sticky bottom-16 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur md:bottom-4 dark:border-slate-800 dark:bg-slate-900/95">
        <button type="button" className="btn-primary" onClick={saveAll} disabled={busy || !pending.length}>{busy ? 'Kaydediliyor…' : pending.length ? `${pending.length} soruyu kaydet` : 'Kaydedilecek soru yok'}</button>
        {msg && <p role="status" className="text-sm text-emerald-600 dark:text-emerald-400">✓ {msg}</p>}
        {drafts.length > 0 && !pending.length && <><Link href={bankHref} className="btn-secondary">Soru bankasına git</Link><button type="button" className="btn-secondary" onClick={reset}>Yeni sorular ekle</button></>}
      </div>
    </div>
  );
}
