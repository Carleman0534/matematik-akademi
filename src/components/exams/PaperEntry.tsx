'use client';
import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { recordPaperAnswers } from '@/app/ogretmen/denemeler/actions';
import { letters, type Letter } from '@/lib/exams';

interface Row { id: string; full_name: string; answers: string | null; source: 'online' | 'paper' | null }

// Kâğıt optik girişi: öğrenciyi seç, cevapları sırayla yaz (ABCD-…) ya da yuvarlaklara tıkla, kaydet → sıradaki öğrenci
export function PaperEntry({ examId, questionCount, optionCount, rows }: { examId: string; questionCount: number; optionCount: number; rows: Row[] }) {
  const router = useRouter();
  const L = letters(optionCount);
  const firstEmpty = rows.find(r => !r.answers)?.id || rows[0]?.id || '';
  const [sid, setSid] = useState(firstEmpty);
  const [ans, setAns] = useState<(Letter | null)[]>(() => toArr(rows.find(r => r.id === firstEmpty)?.answers, questionCount));
  const [text, setText] = useState('');
  const [msg, setMsg] = useState<{ error?: string; ok?: string }>({});
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const current = rows.find(r => r.id === sid);
  const filled = useMemo(() => ans.filter(Boolean).length, [ans]);

  function toArr(s: string | null | undefined, n: number): (Letter | null)[] {
    return Array.from({ length: n }, (_, i) => { const c = (s || '')[i]; return c && /[A-E]/.test(c) ? (c as Letter) : null; });
  }
  const pick = (id: string) => { setSid(id); setAns(toArr(rows.find(r => r.id === id)?.answers, questionCount)); setText(''); setMsg({}); setTimeout(() => inputRef.current?.focus(), 0); };
  const applyText = (v: string) => {
    setText(v);
    const chars = v.toLocaleUpperCase('tr').replace(/[\s,;.]/g, '').split('');
    setAns(prev => prev.map((x, i) => (i < chars.length ? (L.includes(chars[i] as Letter) ? (chars[i] as Letter) : null) : x)));
  };
  const save = async () => {
    if (!sid) return;
    setSaving(true); setMsg({});
    const r = await recordPaperAnswers(examId, sid, ans.map(a => a || '-').join(''));
    setSaving(false);
    if (r.error) { setMsg(r); return; }
    setMsg({ ok: `${current?.full_name}: ${filled} cevap kaydedildi.` });
    router.refresh();
    const idx = rows.findIndex(r => r.id === sid);
    const next = rows.slice(idx + 1).find(r => !r.answers) || rows[idx + 1];
    if (next) pick(next.id);
  };

  if (!rows.length) return <p className="text-sm text-slate-500">Bu denemeye atanmış öğrenci yok.</p>;
  return (
    <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
      <ul className="max-h-[70vh] space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2 text-sm dark:border-slate-800">
        {rows.map(r => (
          <li key={r.id}><button type="button" onClick={() => pick(r.id)} className={'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left ' + (r.id === sid ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800')}>
            <span className="min-w-0 flex-1 truncate">{r.full_name}</span>
            <span className="text-[11px] opacity-80">{r.source === 'online' ? 'online' : r.answers ? '✓ girildi' : ''}</span>
          </button></li>
        ))}
      </ul>
      <div className="space-y-3">
        <p className="font-bold">{current?.full_name}{current?.source === 'online' && <span className="ml-2 text-xs font-normal text-amber-600">Bu öğrenci online çözdü; kaydederseniz cevapları kâğıttakiyle değiştirilir.</span>}</p>
        <div>
          <label className="label" htmlFor="hizli">Hızlı giriş: cevapları sırayla yazın (boş için <span className="font-mono">-</span>)</label>
          <input ref={inputRef} id="hizli" value={text} onChange={e => applyText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); save(); } }}
            className="input font-mono uppercase tracking-widest" placeholder="ABCD-EABC…" autoComplete="off" autoCapitalize="characters" />
          <p className="mt-1 text-xs text-slate-500">Enter = kaydet ve sıradaki öğrenciye geç. {filled}/{questionCount} işaretli.</p>
        </div>
        <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2 xl:grid-cols-3">
          {ans.map((a, i) => (
            <div key={i} className="flex items-center gap-1">
              <span className="w-7 text-right text-xs font-bold">{i + 1}</span>
              {L.map(l => (
                <button key={l} type="button" aria-label={`${i + 1}. soru ${l}`} aria-pressed={a === l}
                  onClick={() => setAns(prev => prev.map((x, j) => (j === i ? (x === l ? null : l) : x)))}
                  className={'h-7 w-7 rounded-full border text-[11px] font-bold ' + (a === l ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 dark:border-slate-600')}>{l}</button>
              ))}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn-primary" disabled={saving || !sid} onClick={save}>{saving ? 'Kaydediliyor…' : 'Kaydet ve sıradaki'}</button>
          <button type="button" className="btn-secondary" onClick={() => { setAns(Array(questionCount).fill(null)); setText(''); }}>Temizle</button>
          {msg.error && <span role="alert" className="text-sm text-red-600 dark:text-red-400">{msg.error}</span>}
          {msg.ok && <span role="status" className="text-sm text-emerald-600 dark:text-emerald-400">✓ {msg.ok}</span>}
        </div>
      </div>
    </div>
  );
}
