'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';

export interface StudyItem { qid: string; pos: number; url: string | null; opts: number; ans: string | null; res: string | null; cor: string | null; answered: boolean }

const RES_LABEL: Record<string, string> = { correct: 'Doğru! 🎉', incorrect: 'Yanlış', blank: 'Boş bırakıldı' };

// Öğrenci çalışma ekranı: soru görseli + şıklar; cevap kaydedilir, sonuç (ve izin varsa doğru şık) gösterilir
export function StudyRunner({ title, note, solutionMode, initial, dueLabel }: { title: string; note: string | null; solutionMode: string; initial: StudyItem[]; dueLabel: string | null }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const firstOpen = initial.findIndex(i => !i.answered);
  const [cur, setCur] = useState(firstOpen >= 0 ? firstOpen : 0);
  const [pick, setPick] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [zoom, setZoom] = useState(false);
  const t0 = useRef(0);
  useEffect(() => { t0.current = performance.now(); }, []);   // soru gösterilme anı (tarayıcı zaman damgası)
  // Soru değişince seçim, hata ve süre sıfırlanır (olay işleyicisinde; efektte değil)
  const go = (n: number, ts: number) => { setCur(n); setPick(null); setErr(''); t0.current = ts; };

  const it = items[cur];
  const answered = items.filter(i => i.answered).length;
  const done = answered === items.length;
  const letters = ['A', 'B', 'C', 'D', 'E'].slice(0, it?.opts || 4);

  const send = async (letter: string | null, ts: number) => {
    setBusy(true); setErr('');
    const { data, error } = await supabaseBrowser().rpc('answer_study_question', { qid: it.qid, ans: letter ?? '', secs: Math.max(0, Math.round((ts - t0.current) / 1000)) });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    const r = (data as { res: string; cor: string | null }[])[0];
    setItems(prev => prev.map((x, i) => (i === cur ? { ...x, ans: letter, res: r.res, cor: r.cor, answered: true } : x)));
    if (items.filter(x => x.answered).length + 1 === items.length) router.refresh(); // plan tamamlandı: sunucudan güncel durum (çözümler "bitince" modunda açılır)
  };

  const wrong = items.filter(i => i.res === 'incorrect' || i.res === 'blank').length;
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div><h1 className="text-xl font-black">{title}</h1>{note && <p className="mt-1 rounded-lg bg-indigo-50 px-3 py-2 text-sm dark:bg-indigo-950/40">📌 {note}</p>}{dueLabel && <p className="text-xs text-slate-500">Son tarih: {dueLabel}</p>}</div>
      <div className="flex items-center gap-2"><div className="h-2 flex-1 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-2 rounded-full bg-indigo-500 transition-all" style={{ width: `${(answered / items.length) * 100}%` }} /></div><span className="text-xs font-semibold">{answered}/{items.length}</span></div>
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Sorular">
        {items.map((x, i) => (
          <button key={x.qid} type="button" onClick={e => go(i, e.timeStamp)} aria-label={`${x.pos}. soru`} aria-current={i === cur}
            className={'h-8 w-8 rounded-full text-xs font-bold ' + (i === cur ? 'ring-2 ring-indigo-500 ' : '') + (x.res === 'correct' ? 'bg-emerald-500 text-white' : x.res === 'incorrect' ? 'bg-red-500 text-white' : x.res === 'blank' ? 'bg-slate-400 text-white' : 'bg-slate-100 dark:bg-slate-800')}>{x.pos}</button>
        ))}
      </div>

      {done && (
        <div className="card space-y-1 text-center"><p className="text-3xl">🏁</p><p className="font-bold">Çalışmayı tamamladın!</p>
          <p className="text-sm text-slate-600 dark:text-slate-300">{items.filter(i => i.res === 'correct').length} doğru · {items.filter(i => i.res === 'incorrect').length} yanlış · {items.filter(i => i.res === 'blank').length} boş</p>
          {wrong > 0 && <p className="text-xs text-slate-500">Yanlış ve boş sorular <b>Soru Bankam</b>&rsquo;a eklendi; <Link href="/ogrenci/tekrar" className="font-semibold text-indigo-600 dark:text-indigo-400">Tekrar Et</Link>&rsquo;te karşına çıkacak.</p>}
          {solutionMode === 'after_complete' && <p className="text-xs text-slate-500">Doğru cevapları aşağıdaki soru numaralarına tıklayarak görebilirsin.</p>}
        </div>
      )}

      <div className="card space-y-3">
        <div className="flex items-center"><b>{it.pos}. soru</b>{it.answered && <span className={'ml-auto text-sm font-bold ' + (it.res === 'correct' ? 'text-emerald-600' : it.res === 'incorrect' ? 'text-red-600' : 'text-slate-500')}>{RES_LABEL[it.res || 'blank']}</span>}</div>
        <button type="button" onClick={() => setZoom(true)} className="block w-full overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700" aria-label="Soruyu büyüt">
          {it.url ? <img src={it.url} alt={`${it.pos}. soru`} className="mx-auto max-h-[70vh] w-auto" /> : <span className="block p-10 text-sm text-red-600">Görsel yüklenemedi; sayfayı yenile.</span>}
        </button>
        <div className="flex flex-wrap items-center justify-center gap-2" role="radiogroup" aria-label="Şıklar">
          {letters.map(l => {
            const mine = (it.answered ? it.ans : pick) === l, isCor = it.answered && it.cor === l;
            return (
              <button key={l} type="button" role="radio" aria-checked={mine} disabled={it.answered || busy} onClick={() => setPick(l)}
                className={'h-12 w-12 rounded-full border-2 text-lg font-black transition ' + (isCor ? 'border-emerald-600 bg-emerald-600 text-white' : mine ? (it.answered ? 'border-red-500 bg-red-500 text-white' : 'border-indigo-600 bg-indigo-600 text-white') : 'border-slate-300 hover:border-indigo-400 dark:border-slate-600')}>{l}</button>
            );
          })}
        </div>
        {it.answered && it.cor && it.res !== 'correct' && <p className="text-center text-sm">Doğru cevap: <b className="text-emerald-600">{it.cor}</b></p>}
        {it.answered && !it.cor && it.res !== 'correct' && solutionMode !== 'after_answer' && <p className="text-center text-xs text-slate-500">{solutionMode === 'never' ? 'Doğru cevap öğretmenin ayarıyla gösterilmiyor.' : 'Doğru cevap çalışma bitince açılacak.'}</p>}
        {err && <p role="alert" className="text-center text-sm text-red-600">{err}</p>}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {!it.answered ? <>
            <button type="button" className="btn-primary px-6" disabled={!pick || busy} onClick={e => send(pick, e.timeStamp)}>{busy ? 'Kaydediliyor…' : 'Cevapla'}</button>
            <button type="button" className="btn-secondary" disabled={busy} onClick={e => { const ts = e.timeStamp; if (window.confirm('Bu soruyu boş bırakmak istiyor musun? Sonra değiştiremezsin.')) send(null, ts); }}>Boş bırak</button>
          </> : cur < items.length - 1 ? <button type="button" className="btn-primary px-6" onClick={e => { const n = items.findIndex((x, i) => i > cur && !x.answered); go(n >= 0 ? n : cur + 1, e.timeStamp); }}>Sonraki soru →</button>
            : <Link href="/ogrenci/calisma" className="btn-primary px-6">Çalışmalarıma dön</Link>}
        </div>
        {!it.answered && <p className="text-center text-xs text-slate-400">Cevabını bir kez verebilirsin; verdikten sonra değiştirilemez.</p>}
      </div>
      {zoom && it.url && <div className="fixed inset-0 z-50 overflow-auto bg-black/80 p-4" onClick={() => setZoom(false)} role="dialog" aria-label="Soru"><img src={it.url} alt="" className="mx-auto max-w-4xl bg-white" /></div>}
    </div>
  );
}
