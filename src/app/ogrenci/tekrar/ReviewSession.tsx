'use client';
import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { addAttempt } from '@/app/soru/actions';

export interface ReviewItem { id: string; imageUrl: string | null; text: string | null; topic: string; correct: string | null; solution: string | null; teacherNote: string | null; wrongCount: number }

// Günlük tekrar: tekrar zamanı gelen sorular tek tek; öğrenci çözer ve sonucu işaretler (geçmişe yeni kayıt)
export function ReviewSession({ items }: { items: ReviewItem[] }) {
  const [i, setI] = useState(0);
  const [show, setShow] = useState(false);
  const [res, setRes] = useState<Record<string, string>>({});
  const [err, setErr] = useState('');
  const [pending, start] = useTransition();
  const t0 = useRef(0);
  useEffect(() => { t0.current = Date.now(); }, []);
  const q = items[i];
  const mark = (r: 'correct' | 'incorrect' | 'blank') => start(async () => {
    const out = await addAttempt(q.id, r, (Date.now() - t0.current) / 1000);
    if (out.error) { setErr(out.error); return; }
    setErr(''); setRes(x => ({ ...x, [q.id]: r })); setShow(false); setI(n => n + 1);
    t0.current = Date.now();
  });

  if (!q) {
    const vals = Object.values(res);
    return (
      <div className="card space-y-3 text-center">
        <p className="text-4xl">🎉</p>
        <h2 className="text-xl font-black">Tekrar bitti</h2>
        <p className="text-sm text-slate-500">{vals.filter(v => v === 'correct').length} doğru · {vals.filter(v => v === 'incorrect').length} yanlış · {vals.filter(v => v === 'blank').length} boş</p>
        <p className="text-xs text-slate-500">Yanlış ve boş olanlar yarın yeniden karşına çıkacak; doğru olanların aralığı uzar.</p>
        <Link href="/ogrenci" className="btn-primary">Ana sayfaya dön</Link>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center text-sm text-slate-500"><span>{i + 1} / {items.length}</span><span className="ml-auto truncate">{q.topic || 'Konu seçilmedi'} · {q.wrongCount} kez yanlış/boş</span></div>
      <div className="h-1.5 overflow-hidden rounded bg-slate-200 dark:bg-slate-800"><div className="h-full bg-indigo-600" style={{ width: (i / items.length * 100) + '%' }} /></div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        {q.imageUrl ? <img src={q.imageUrl} alt="Soru" className="mx-auto max-h-[65vh] w-auto" /> : <p className="whitespace-pre-wrap p-5">{q.text}</p>}
      </div>
      {show ? (
        <div className="card space-y-1 text-sm">
          <p><b>Doğru cevap:</b> {q.correct || 'girilmemiş'}</p>
          {q.solution && <p className="whitespace-pre-wrap"><b>Çözüm:</b> {q.solution}</p>}
          {q.teacherNote && <p><b>Öğretmen:</b> {q.teacherNote}</p>}
        </div>
      ) : <button type="button" className="btn-secondary w-full" onClick={() => setShow(true)}>Cevabı / çözümü göster</button>}
      <p className="text-center text-sm font-semibold">Soruyu çözdükten sonra sonucunu işaretle:</p>
      <div className="grid grid-cols-3 gap-2">
        <button type="button" disabled={pending} onClick={() => mark('correct')} className="btn bg-emerald-600 py-3 text-white hover:bg-emerald-500">✓ Doğru</button>
        <button type="button" disabled={pending} onClick={() => mark('incorrect')} className="btn bg-red-600 py-3 text-white hover:bg-red-500">✗ Yanlış</button>
        <button type="button" disabled={pending} onClick={() => mark('blank')} className="btn bg-slate-600 py-3 text-white hover:bg-slate-500">○ Boş</button>
      </div>
      {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
      <Link href={'/soru/' + q.id} className="block text-center text-xs text-slate-500 hover:underline">Soru ayrıntıları ve geçmişi</Link>
    </div>
  );
}
