'use client';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { resetSession } from '@/app/ogretmen/denemeler/actions';
import { parseAnswers, scoreSheet, fmtRemaining, fmtNet, examPhase, PHASE_LABEL, type KeyRow, type ExamTiming } from '@/lib/exams';

interface MatrixRow { session_id: string; student_id: string; started_at: string; deadline: string; submitted_at: string | null; last_seen_at: string; current_q: number | null; answers: string | null }
interface Props {
  examId: string; timing: ExamTiming; cfg: { question_count: number; option_count: number; penalty_divisor: number };
  keyRows: KeyRow[]; students: { id: string; full_name: string }[]; initial: MatrixRow[]; serverNow: number;
}

const ONLINE_MS = 45_000;

// Canlı izleme: cevap matrisi ve deneme durumu 4 sn'de bir veritabanından okunur (öğretmenin yetkisiyle)
export function LiveMonitor({ examId, timing: t0, cfg, keyRows, students, initial, serverNow }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState<MatrixRow[]>(initial);
  const [timing, setTiming] = useState<ExamTiming>(t0);
  const [now, setNow] = useState(() => Date.now());
  const [offset] = useState(() => serverNow - Date.now());
  const [err, setErr] = useState('');
  const [pending, start] = useTransition();
  const key = useMemo(() => new Map(keyRows.map(k => [k.question_no, k])), [keyRows]);

  useEffect(() => {
    const sb = supabaseBrowser();
    let stop = false;
    const tick = async () => {
      const [m, e] = await Promise.all([
        sb.rpc('exam_answer_matrix', { eid: examId }),
        sb.from('exams').select('status, mode, started_at, opens_at, closes_at, duration_min').eq('id', examId).maybeSingle(),
      ]);
      if (stop) return;
      if (m.error) setErr('Bağlantı sorunu: ' + m.error.message); else { setErr(''); setRows((m.data || []) as MatrixRow[]); }
      if (e.data) setTiming(e.data as ExamTiming);
    };
    const poll = setInterval(tick, 4000);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => { stop = true; clearInterval(poll); clearInterval(clock); };
  }, [examId]);

  const t = now + offset;
  const phase = examPhase(timing, t);
  const bySt = new Map(rows.map(r => [r.student_id, r]));
  const liveEnd = timing.mode === 'live' && timing.started_at ? Date.parse(timing.started_at) + timing.duration_min * 60000 : null;
  const data = students.map(s => {
    const r = bySt.get(s.id);
    const ans = parseAnswers(r?.answers, cfg.question_count);
    const sc = scoreSheet(ans, key, cfg);
    const answered = ans.filter(Boolean).length;
    const state = !r ? 'yok' : r.submitted_at ? 'teslim' : Date.parse(r.deadline) < t ? 'sure' : t - Date.parse(r.last_seen_at) < ONLINE_MS ? 'cozuyor' : 'koptu';
    return { s, r, sc, answered, state };
  });
  const count = (st: string) => data.filter(d => d.state === st).length;
  const perQ = Array.from({ length: cfg.question_count }, (_, i) => {
    const marks = data.filter(d => d.r).map(d => d.sc.marks[i]);
    const answered = data.filter(d => d.r && parseAnswers(d.r.answers, cfg.question_count)[i]).length;
    return { no: i + 1, answered, correct: marks.filter(m => m === 'D').length, n: marks.length };
  });

  const STATE: Record<string, [string, string]> = {
    yok: ['Başlamadı', 'bg-slate-300 dark:bg-slate-600'], cozuyor: ['Çözüyor', 'bg-emerald-500'], koptu: ['Bağlantı yok', 'bg-amber-500'],
    teslim: ['Teslim etti', 'bg-indigo-600'], sure: ['Süre doldu', 'bg-slate-500'],
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="card p-3"><p className="text-xs text-slate-500">Durum</p><p className="text-lg font-black">{PHASE_LABEL[phase]}</p></div>
        <div className="card p-3"><p className="text-xs text-slate-500">Kalan süre</p><p className="font-mono text-lg font-black">{liveEnd ? fmtRemaining(liveEnd - t) : timing.closes_at ? 'son teslim' : '—'}</p></div>
        <div className="card p-3"><p className="text-xs text-slate-500">Çözüyor</p><p className="text-lg font-black text-emerald-600">{count('cozuyor')}</p></div>
        <div className="card p-3"><p className="text-xs text-slate-500">Teslim etti</p><p className="text-lg font-black text-indigo-600">{count('teslim') + count('sure')}</p></div>
        <div className="card p-3"><p className="text-xs text-slate-500">Başlamadı / bağlantı yok</p><p className="text-lg font-black text-amber-600">{count('yok')} / {count('koptu')}</p></div>
      </div>
      {err && <p role="alert" className="text-sm text-red-600">{err}</p>}

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[680px] text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500 dark:bg-slate-800/50"><tr><th className="px-3 py-2">Öğrenci</th><th>Durum</th><th>Soru</th><th>İlerleme</th><th>D / Y / B</th><th>Net</th><th></th></tr></thead>
          <tbody>
            {data.map(({ s, r, sc, answered, state }) => (
              <tr key={s.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-3 py-2 font-semibold">{s.full_name}</td>
                <td><span className="inline-flex items-center gap-1.5 text-xs"><span className={'h-2.5 w-2.5 rounded-full ' + STATE[state][1]} />{STATE[state][0]}</span></td>
                <td className="text-xs">{r && !r.submitted_at && r.current_q ? `${r.current_q}. soruda` : ''}</td>
                <td className="w-40 pr-3"><div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-2 rounded-full bg-indigo-500" style={{ width: `${(answered / cfg.question_count) * 100}%` }} /></div>
                  <span className="text-[11px] text-slate-500">{answered}/{cfg.question_count}</span></td>
                <td className="text-xs">{r ? `${sc.correct} / ${sc.wrong} / ${sc.blank}` : ''}</td>
                <td className="font-bold">{r ? fmtNet(sc.net) : ''}</td>
                <td className="pr-3 text-right">{r && <button type="button" disabled={pending} className="text-xs text-slate-500 hover:text-red-600 hover:underline"
                  onClick={() => { if (window.confirm(`${s.full_name} adlı öğrencinin çözümü silinsin mi? Öğrenci denemeye yeniden başlayabilir.`)) start(async () => { const x = await resetSession(examId, r.session_id); setErr(x.error || ''); router.refresh(); }); }}>Sıfırla</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card space-y-2">
        <h2 className="font-bold">Soru bazında anlık durum</h2>
        <p className="text-xs text-slate-500">Her kutu bir soru: üst sayı cevaplayan, renk doğru oranı (yeşil iyi, kırmızı zor). Gri: cevap anahtarı yok ya da henüz cevaplayan yok.</p>
        <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-10 lg:grid-cols-20">
          {perQ.map(q => {
            const rate = q.answered ? q.correct / q.answered : null;
            const bg = rate == null || !key.get(q.no)?.correct ? 'bg-slate-100 dark:bg-slate-800' : rate >= 0.7 ? 'bg-emerald-500 text-white' : rate >= 0.4 ? 'bg-amber-400' : 'bg-red-500 text-white';
            return <div key={q.no} title={`${q.no}. soru: ${q.answered} cevap, ${q.correct} doğru`} className={'rounded-md p-1 text-center text-[11px] leading-tight ' + bg}><b className="block">{q.no}</b>{q.answered}</div>;
          })}
        </div>
      </div>
    </div>
  );
}
