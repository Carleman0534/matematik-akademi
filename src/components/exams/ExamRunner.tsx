'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { letters, fmtRemaining, type Letter } from '@/lib/exams';

interface Props {
  examId: string; sessionId: string; title: string; questionCount: number; optionCount: number;
  deadline: string; serverNow: number; pages: { id: string; url: string | null }[]; initialAnswers: (Letter | null)[]; initialQ: number;
}

// Sınav bitti ya da kapandı demek olan sunucu hataları (yeniden denemek anlamsız)
const FINAL = /teslim|Süre doldu|bitirildi|Oturum bulunamadı/i;

export function ExamRunner({ examId, sessionId, title, questionCount, optionCount, deadline, serverNow, pages, initialAnswers, initialQ }: Props) {
  const router = useRouter();
  const L = letters(optionCount);
  const [answers, setAnswers] = useState<(Letter | null)[]>(initialAnswers);
  const [cur, setCur] = useState(Math.min(Math.max(1, initialQ), questionCount));
  const [unsaved, setUnsaved] = useState<Record<number, Letter | null>>({});
  const [now, setNow] = useState(() => Date.now());
  const [offset] = useState(() => serverNow - Date.now());
  const [zoom, setZoom] = useState(100);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [note, setNote] = useState('');
  const curRef = useRef(cur);
  const unsavedRef = useRef(unsaved);
  const finishingRef = useRef(false);
  useEffect(() => { curRef.current = cur; unsavedRef.current = unsaved; });

  const end = Date.parse(deadline);
  const left = end - (now + offset);
  const answered = answers.filter(Boolean).length;
  const pendingCount = Object.keys(unsaved).length;

  const leave = useCallback(() => router.replace('/ogrenci/denemeler/' + examId), [router, examId]);

  const send = useCallback(async (q: number, a: Letter | null) => {
    const { error } = await supabaseBrowser().rpc('save_answer', { p_session: sessionId, p_q: q, p_answer: a });
    if (!error) {
      setUnsaved(u => { if (u[q] !== a) return u; const n = { ...u }; delete n[q]; return n; });
      return true;
    }
    if (FINAL.test(error.message)) { setNote(error.message); finishingRef.current = true; setFinishing(true); setTimeout(leave, 1500); }
    return false;
  }, [sessionId, leave]);

  const choose = (q: number, a: Letter) => {
    if (finishingRef.current) return;
    const v = answers[q - 1] === a ? null : a; // aynı şıkka yeniden basmak işareti kaldırır
    setAnswers(prev => prev.map((x, i) => (i === q - 1 ? v : x)));
    setUnsaved(u => ({ ...u, [q]: v }));
    setCur(q);
    void send(q, v);
  };

  const submit = useCallback(async (auto: boolean) => {
    if (finishingRef.current) return;
    finishingRef.current = true; setFinishing(true);
    setNote(auto ? 'Süre doldu, deneme teslim ediliyor…' : 'Teslim ediliyor…');
    for (const [q, a] of Object.entries(unsavedRef.current)) await send(Number(q), a);
    await supabaseBrowser().rpc('submit_exam', { p_session: sessionId });
    leave();
  }, [send, sessionId, leave]);

  // Saat, otomatik teslim, kaydedilemeyenleri yeniden deneme, bağlantı sinyali
  useEffect(() => {
    const clock = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (end - (t + offset) <= 0) void submit(true);
    }, 1000);
    const retry = setInterval(() => { for (const [q, a] of Object.entries(unsavedRef.current)) void send(Number(q), a); }, 5000);
    const beat = setInterval(async () => {
      const sb = supabaseBrowser();
      const [{ data }, { data: e }] = await Promise.all([
        sb.rpc('exam_heartbeat', { p_session: sessionId, p_q: curRef.current }),
        sb.from('exams').select('status').eq('id', examId).maybeSingle(),
      ]);
      if (e?.status === 'closed' || data === null) { setNote('Deneme öğretmen tarafından bitirildi.'); finishingRef.current = true; setFinishing(true); setTimeout(leave, 1500); }
    }, 20000);
    const warn = (ev: BeforeUnloadEvent) => { if (Object.keys(unsavedRef.current).length) { ev.preventDefault(); } };
    window.addEventListener('beforeunload', warn);
    return () => { clearInterval(clock); clearInterval(retry); clearInterval(beat); window.removeEventListener('beforeunload', warn); };
  }, [end, offset, submit, send, sessionId, examId, leave]);

  const askSubmit = () => {
    const blank = questionCount - answered;
    if (window.confirm(blank ? `${blank} soru boş. Yine de teslim etmek istiyor musun? Teslim ettikten sonra değiştiremezsin.` : 'Denemeyi teslim etmek istiyor musun? Teslim ettikten sonra değiştiremezsin.')) void submit(false);
  };

  const bubbles = (q: number, size = 'h-8 w-8') => (
    <div className="flex gap-1" role="radiogroup" aria-label={`${q}. soru`}>
      {L.map(l => (
        <button key={l} type="button" role="radio" aria-checked={answers[q - 1] === l} disabled={finishing} onClick={() => choose(q, l)}
          className={size + ' rounded-full border text-xs font-bold transition ' + (answers[q - 1] === l ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white hover:border-indigo-400 dark:border-slate-600 dark:bg-slate-900')}>{l}</button>
      ))}
    </div>
  );

  const sheet = () => (
    <div className="space-y-1">
      {Array.from({ length: questionCount }, (_, i) => i + 1).map(q => (
        <div key={q} className={'flex items-center gap-2 rounded-lg px-1 py-0.5 ' + (q === cur ? 'bg-indigo-50 dark:bg-indigo-950/50' : '')}>
          <button type="button" onClick={() => setCur(q)} className="w-7 text-right text-xs font-bold">{q}</button>
          {bubbles(q, 'h-7 w-7')}
          {q in unsaved && <span className="text-[10px] text-amber-600" title="Kaydediliyor">●</span>}
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/95 px-3 py-2 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
        <p className="min-w-0 flex-1 truncate text-sm font-bold">{title}</p>
        <span className={'font-mono text-lg font-black ' + (left < 5 * 60000 ? 'text-red-600' : '')} aria-label="Kalan süre">{fmtRemaining(left)}</span>
        <span className="hidden text-xs text-slate-500 sm:inline">{answered}/{questionCount}</span>
        <span className={'text-[11px] ' + (pendingCount ? 'text-amber-600' : 'text-emerald-600')}>{pendingCount ? `${pendingCount} kaydediliyor…` : '✓ kaydedildi'}</span>
        <button type="button" className="btn-primary px-3 py-1.5" disabled={finishing} onClick={askSubmit}>Bitir</button>
      </header>
      {note && <p role="status" className="bg-amber-100 px-3 py-2 text-center text-sm font-semibold text-amber-900 dark:bg-amber-950 dark:text-amber-200">{note}</p>}

      <div className="flex flex-1 gap-4 p-3 lg:p-4">
        <main className="min-w-0 flex-1 space-y-3 pb-28 lg:pb-4">
          <div className="flex items-center justify-end gap-2 text-xs">
            <span className="text-slate-500">Yakınlaştır</span>
            <button type="button" className="btn-secondary px-2 py-1" onClick={() => setZoom(z => Math.max(60, z - 20))} aria-label="Küçült">−</button>
            <span className="w-10 text-center">{zoom}%</span>
            <button type="button" className="btn-secondary px-2 py-1" onClick={() => setZoom(z => Math.min(250, z + 20))} aria-label="Büyüt">+</button>
          </div>
          <div className="overflow-x-auto">
            <div className="mx-auto space-y-3" style={{ width: `${zoom}%`, maxWidth: zoom <= 100 ? '900px' : 'none' }}>
              {pages.length === 0 && <p className="card text-center text-sm text-slate-500">Bu denemede sayfa yok; soruları öğretmeninin verdiği kâğıttan çöz, cevaplarını optikte işaretle.</p>}
              {pages.map((p, i) => p.url
                ? <img key={p.id} src={p.url} alt={`${i + 1}. sayfa`} className="w-full rounded-lg bg-white shadow" />
                : <p key={p.id} className="card text-sm text-red-600">{i + 1}. sayfa yüklenemedi; sayfayı yenile.</p>)}
            </div>
          </div>
        </main>
        <aside className="sticky top-16 hidden max-h-[calc(100vh-5rem)] w-72 shrink-0 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 lg:block dark:border-slate-800 dark:bg-slate-900">
          <p className="mb-2 text-sm font-bold">Optik form</p>
          {sheet()}
        </aside>
      </div>

      {/* Telefon: alt çubukta o anki soru, tam optik açılır panelde */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white px-3 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 lg:hidden dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-2">
          <button type="button" className="btn-secondary px-2.5 py-1.5" disabled={cur <= 1} onClick={() => setCur(c => c - 1)} aria-label="Önceki soru">‹</button>
          <span className="w-10 text-center text-sm font-black">{cur}.</span>
          {bubbles(cur, 'h-10 w-10')}
          <button type="button" className="btn-secondary px-2.5 py-1.5" disabled={cur >= questionCount} onClick={() => setCur(c => c + 1)} aria-label="Sonraki soru">›</button>
        </div>
        <button type="button" className="mt-1.5 w-full text-center text-xs font-semibold text-indigo-600 dark:text-indigo-400" onClick={() => setSheetOpen(true)}>Tüm optik ({answered}/{questionCount}) ▲</button>
      </div>
      {sheetOpen && (
        <div className="fixed inset-0 z-40 flex flex-col bg-black/40 lg:hidden" onClick={() => setSheetOpen(false)} role="dialog" aria-label="Optik form">
          <div className="mt-auto max-h-[80vh] overflow-y-auto rounded-t-2xl bg-white p-4 dark:bg-slate-900" onClick={e => e.stopPropagation()}>
            <div className="mb-2 flex items-center"><p className="font-bold">Optik form</p><button type="button" className="ml-auto text-sm text-slate-500" onClick={() => setSheetOpen(false)}>Kapat ✕</button></div>
            {sheet()}
          </div>
        </div>
      )}
    </div>
  );
}
