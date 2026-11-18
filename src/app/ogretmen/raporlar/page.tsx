import Link from 'next/link';
import type { Metadata } from 'next';
import { requireTeacher } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { getClasses, getTopics } from '@/lib/data';
import { EXAM_SELECT, getKey, answerMatrix, sessionDone, type ExamRow } from '@/lib/examData';
import { parseAnswers, scoreSheet, examPhase, fmtNet, markOf } from '@/lib/exams';
import { pct, fmtDate } from '@/lib/labels';
import { PrintButton } from '@/components/exams/PrintButton';

export const metadata: Metadata = { title: 'Raporlar' };
export const dynamic = 'force-dynamic';

const EXAM_LIMIT = 8;
const nowMs = () => Date.now();
const cell = (r: number | null) => (r == null ? 'bg-slate-50 text-slate-300 dark:bg-slate-800/40 dark:text-slate-600'
  : r >= 0.75 ? 'bg-emerald-500 text-white' : r >= 0.5 ? 'bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100'
  : r >= 0.3 ? 'bg-amber-300 text-amber-950' : 'bg-red-500 text-white');

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const me = await requireTeacher();
  const sp = await searchParams;
  const sb = await supabaseServer();
  const [classes, topics, { data: exData }] = await Promise.all([
    getClasses(sb, me.userId), getTopics(sb),
    sb.from('exams').select(EXAM_SELECT).eq('teacher_id', me.userId).neq('status', 'draft').order('created_at', { ascending: false }).limit(30),
  ]);
  const classId = classes.some(c => c.id === sp.sinif) ? sp.sinif! : '';
  let stQ = sb.from('students').select('id, full_name').eq('teacher_id', me.userId).eq('is_active', true).order('full_name');
  if (classId) stQ = stQ.eq('class_id', classId);
  const { data: stData } = await stQ;
  const students = (stData || []) as { id: string; full_name: string }[];
  const sids = new Set(students.map(s => s.id));
  const now = nowMs();

  // Konu → ünite (en üst konu)
  const parent = new Map(topics.map(t => [t.id, t.parent_id]));
  const name = new Map(topics.map(t => [t.id, t.name]));
  const rootOf = (id: string | null) => { let cur = id; for (let i = 0; cur && parent.get(cur) && i < 20; i++) cur = parent.get(cur) || null; return cur; };

  // Son denemeler (sonucu olanlar), eskiden yeniye
  const exams = ((exData || []) as ExamRow[]).filter(e => examPhase(e, now) !== 'taslak').slice(0, EXAM_LIMIT).reverse();
  const perExam = await Promise.all(exams.map(async e => ({ e, key: await getKey(sb, e.id), matrix: await answerMatrix(sb, e.id) })));

  // Öğrenci × deneme neti; öğrenci × ünite doğru/toplam
  const nets = new Map<string, Map<string, number>>();
  const unit = new Map<string, Map<string, { c: number; t: number }>>();
  const unitIds = new Set<string>();
  for (const { e, key, matrix } of perExam) {
    for (const m of matrix) {
      if (!sids.has(m.student_id) || !sessionDone(m, now)) continue;
      const ans = parseAnswers(m.answers, e.question_count);
      const sc = scoreSheet(ans, key, e);
      if (!nets.has(m.student_id)) nets.set(m.student_id, new Map());
      nets.get(m.student_id)!.set(e.id, sc.net);
      for (const [q, k] of key) {
        if (!k.correct || q > e.question_count) continue;
        const u = rootOf(k.topic_id) || '';
        unitIds.add(u);
        if (!unit.has(m.student_id)) unit.set(m.student_id, new Map());
        const cur = unit.get(m.student_id)!.get(u) || { c: 0, t: 0 };
        cur.t++; if (markOf(ans[q - 1], k.correct) === 'D') cur.c++;
        unit.get(m.student_id)!.set(u, cur);
      }
    }
  }

  // Soru bankasında biriken (arşivlenmemiş) yanlış/boş sorular, ünite bazında
  const bank = new Map<string, Map<string, number>>();
  if (students.length) {
    const { data: qs } = await sb.from('questions').select('student_id, topic_id').in('student_id', [...sids]).is('archived_at', null).limit(5000);
    ((qs || []) as { student_id: string; topic_id: string | null }[]).forEach(q => {
      const u = rootOf(q.topic_id) || '';
      unitIds.add(u);
      if (!bank.has(q.student_id)) bank.set(q.student_id, new Map());
      bank.get(q.student_id)!.set(u, (bank.get(q.student_id)!.get(u) || 0) + 1);
    });
  }
  const units = [...unitIds].map(u => {
    let c = 0, t = 0, b = 0;
    unit.forEach(m => { const x = m.get(u); if (x) { c += x.c; t += x.t; } });
    bank.forEach(m => { b += m.get(u) || 0; });
    return { id: u, name: u ? name.get(u) || 'Konu' : 'Konusu girilmemiş', rate: t ? c / t : null, t, b };
  }).sort((a, b) => (a.rate ?? 2) - (b.rate ?? 2) || b.b - a.b);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1"><h1 className="text-2xl font-black">Raporlar</h1>
          <p className="text-sm text-slate-500">Son {EXAM_LIMIT} denemenin sonuçları ve öğrencilerin soru bankaları üzerinden hesaplanır.</p></div>
        <form className="flex items-end gap-2 print:hidden">
          <div><label className="label" htmlFor="sinif">Sınıf</label>
            <select id="sinif" name="sinif" defaultValue={classId} className="input"><option value="">Bütün öğrencilerim</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <button className="btn-secondary">Göster</button>
        </form>
        <span className="print:hidden"><PrintButton label="🖨️ Yazdır / PDF" /></span>
      </div>

      {students.length === 0 ? <p className="card text-sm text-slate-500">Bu kapsamda aktif öğrenci yok.</p> : (<>
        <section className="card space-y-3">
          <h2 className="font-bold">Deneme netleri</h2>
          {perExam.length === 0 ? <p className="text-sm text-slate-500">Henüz yayımlanmış deneme yok. <Link href="/ogretmen/denemeler/yeni" className="font-semibold text-indigo-600 dark:text-indigo-400">Deneme oluşturun.</Link></p> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead><tr className="text-left text-xs text-slate-500"><th className="py-2">Öğrenci</th>
                  {perExam.map(({ e }) => <th key={e.id} className="px-1 text-center"><Link href={`/ogretmen/denemeler/${e.id}/sonuclar`} className="block max-w-24 truncate hover:underline" title={e.title}>{e.title}</Link><span className="font-normal">{fmtDate(e.started_at || e.created_at)}</span></th>)}
                  <th className="px-1 text-center">Değişim</th></tr></thead>
                <tbody>
                  {students.map(s => {
                    const row = perExam.map(({ e }) => nets.get(s.id)?.get(e.id));
                    const got = row.filter((x): x is number => x != null);
                    const diff = got.length >= 2 ? got[got.length - 1] - got[got.length - 2] : null;
                    return (
                      <tr key={s.id} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="py-1.5 font-semibold"><Link href={`/ogretmen/ogrenciler/${s.id}`} className="hover:underline">{s.full_name}</Link></td>
                        {row.map((n, i) => <td key={i} className="px-1 text-center">{n == null ? <span className="text-slate-300 dark:text-slate-600">–</span> : <b>{fmtNet(n)}</b>}</td>)}
                        <td className={'px-1 text-center font-bold ' + (diff == null ? 'text-slate-300' : diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-red-600' : 'text-slate-500')}>{diff == null ? '–' : (diff > 0 ? '▲ +' : diff < 0 ? '▼ ' : '') + fmtNet(Math.round(diff * 100) / 100)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card space-y-3">
          <h2 className="font-bold">Eksiklik haritası</h2>
          <p className="text-xs text-slate-500">Satır öğrenci, sütun ünite. Renk: denemelerdeki doğru oranı (kırmızı &lt;%30, sarı &lt;%50, açık yeşil &lt;%75, yeşil ≥%75; gri: o ünitede soru çözmedi). Küçük sayı: soru bankasında biriken yanlış/boş soru.</p>
          {units.length === 0 ? <p className="text-sm text-slate-500">Henüz veri yok. Cevap anahtarında konu seçilen denemeler ve soru bankasındaki sorular burada görünür.</p> : (
            <div className="overflow-x-auto">
              <table className="text-xs">
                <thead><tr><th className="sticky left-0 bg-white py-2 pr-2 text-left dark:bg-slate-900">Öğrenci</th>
                  {units.map(u => <th key={u.id || 'yok'} className="h-28 w-12 align-bottom"><span className="mx-auto block w-4 whitespace-nowrap text-left font-semibold [writing-mode:vertical-rl] rotate-180" title={u.name}>{u.name}</span></th>)}</tr></thead>
                <tbody>
                  {students.map(s => (
                    <tr key={s.id}>
                      <td className="sticky left-0 bg-white py-0.5 pr-2 font-semibold whitespace-nowrap dark:bg-slate-900">{s.full_name}</td>
                      {units.map(u => {
                        const x = unit.get(s.id)?.get(u.id); const r = x && x.t ? x.c / x.t : null; const b = bank.get(s.id)?.get(u.id) || 0;
                        return <td key={u.id || 'yok'} className="p-0.5"><div className={'flex h-9 w-12 flex-col items-center justify-center rounded ' + cell(r)} title={`${s.full_name} · ${u.name}: ${x ? `${x.c}/${x.t} doğru` : 'denemede soru yok'}${b ? ` · bankada ${b} soru` : ''}`}>
                          <b>{r == null ? '·' : Math.round(r * 100)}</b>{b > 0 && <span className="text-[9px] opacity-80">{b} soru</span>}</div></td>;
                      })}
                    </tr>
                  ))}
                  <tr className="border-t-2 border-slate-200 dark:border-slate-700">
                    <td className="sticky left-0 bg-white py-1 pr-2 font-black dark:bg-slate-900">Genel</td>
                    {units.map(u => <td key={u.id || 'yok'} className="p-0.5"><div className={'flex h-9 w-12 items-center justify-center rounded font-black ' + cell(u.rate)}>{u.rate == null ? '·' : Math.round(u.rate * 100)}</div></td>)}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </section>

        {units.some(u => u.rate != null) && (
          <section className="card space-y-2">
            <h2 className="font-bold">Öncelikli çalışılacak üniteler</h2>
            <ol className="list-inside list-decimal space-y-1 text-sm">
              {units.filter(u => u.rate != null).slice(0, 5).map(u => <li key={u.id || 'yok'}><b>{u.name}</b> <span className="text-slate-500">· başarı {pct(u.rate)} ({u.t} cevap) · bankada {u.b} soru</span></li>)}
            </ol>
          </section>
        )}
      </>)}
    </div>
  );
}
