import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { requireTeacher } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { POOL_BUCKET } from '@/lib/env';
import { getTopics } from '@/lib/data';
import { topicPath } from '@/lib/topics';
import { KIND_LABEL, DIFF_LABEL, type Kind } from '@/lib/studyEngine';
import { QUESTION_TYPES } from '@/lib/pool';
import { fmtDate, fmtDateTime } from '@/lib/labels';
import { PlanControls } from '@/components/study/PlanControls';

export const metadata: Metadata = { title: 'Çalışma planı' };
export const dynamic = 'force-dynamic';

const SOL = { after_answer: 'Her sorudan sonra', after_complete: 'Çalışma bitince', never: 'Hiç gösterilmez' } as const;

export default async function PlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireTeacher();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const sb = await supabaseServer();
  const { data: plan } = await sb.from('study_plans').select('id, title, kind, status, note, solution_mode, due_on, created_at, assigned_at, completed_at, student_id, students(full_name)').eq('id', id).maybeSingle();
  if (!plan) notFound();
  const { data: qs } = await sb.from('study_plan_questions').select('id, position, image_path, correct, answer, result, topic_id, difficulty, question_type, reason, answered_at, time_spent_sec, banked_at').eq('plan_id', id).order('position');
  type Q = { id: string; position: number; image_path: string; correct: string; answer: string | null; result: string | null; topic_id: string | null; difficulty: number | null; question_type: string | null; reason: string | null; answered_at: string | null; time_spent_sec: number | null; banked_at: string | null };
  const rows = (qs || []) as Q[];
  const topics = await getTopics(sb);
  const { data: signed } = rows.length ? await sb.storage.from(POOL_BUCKET).createSignedUrls([...new Set(rows.map(r => r.image_path))], 3600) : { data: [] };
  const url = new Map((signed || []).map(s => [s.path as string, s.signedUrl as string]));
  const answered = rows.filter(r => r.answered_at).length, correct = rows.filter(r => r.result === 'correct').length, wrong = rows.filter(r => r.result === 'incorrect').length, blank = rows.filter(r => r.result === 'blank').length;
  const name = ((Array.isArray(plan.students) ? plan.students[0] : plan.students) as { full_name: string } | null)?.full_name || 'Öğrenci';
  const avg = answered ? Math.round(rows.filter(r => r.time_spent_sec != null).reduce((a, r) => a + (r.time_spent_sec || 0), 0) / Math.max(1, rows.filter(r => r.time_spent_sec != null).length)) : 0;

  return (
    <div className="space-y-5">
      <Link href="/ogretmen/ogrenme-planlari" className="text-sm text-slate-500 hover:underline">← Öğrenme planları</Link>
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1"><h1 className="text-2xl font-black">{plan.title}</h1>
          <p className="text-sm text-slate-500"><Link href={`/ogretmen/ogrenci-analizleri/${plan.student_id}`} className="font-semibold hover:underline">{name}</Link> · {KIND_LABEL[plan.kind as Kind]} · {rows.length} soru · çözüm: {SOL[plan.solution_mode as keyof typeof SOL]}{plan.due_on ? ` · son ${fmtDate(plan.due_on)}` : ''}</p>
          {plan.note && <p className="mt-1 text-sm">Not: {plan.note}</p>}</div>
        <PlanControls id={id} status={plan.status} answered={answered} />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[['Çözülen', `${answered}/${rows.length}`, ''], ['Doğru', correct, 'text-emerald-600'], ['Yanlış', wrong, 'text-red-600'], ['Boş', blank, ''], ['Soru başı süre', avg ? avg + ' sn' : '—', '']].map(([l, v, t]) => <div key={l as string} className="card p-3"><p className="text-xs text-slate-500">{l}</p><p className={'text-xl font-black ' + t}>{v}</p></div>)}
      </div>
      {plan.status === 'completed' && <p className="text-sm text-slate-500">Tamamlandı: {fmtDateTime(plan.completed_at)}. Yanlış ve boş sorular öğrencinin soru bankasına eklendi; bu sonuçlar konu analizini güncelledi. <Link href={`/ogretmen/ogrenme-planlari/yeni?ogrenci=${plan.student_id}`} className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400">Yeni çalışma oluştur →</Link></p>}
      <div className="grid gap-3 lg:grid-cols-2">
        {rows.map(r => (
          <div key={r.id} className={'card flex gap-3 p-3 ' + (r.result === 'incorrect' ? 'border-red-300 dark:border-red-900' : r.result === 'correct' ? 'border-emerald-300 dark:border-emerald-900' : '')}>
            <a href={url.get(r.image_path)} target="_blank" rel="noopener noreferrer" className="h-32 w-28 shrink-0 overflow-hidden rounded border border-slate-200 bg-white dark:border-slate-700">{url.get(r.image_path) && <img src={url.get(r.image_path)} alt={`${r.position}. soru`} className="h-full w-full object-cover object-top" loading="lazy" />}</a>
            <div className="min-w-0 flex-1 space-y-0.5 text-xs">
              <p className="text-sm font-bold">{r.position}. {topicPath(topics, r.topic_id).split(' › ').slice(-2).join(' › ') || 'Konu yok'}</p>
              <p className="text-slate-500">{r.difficulty ? DIFF_LABEL[r.difficulty] : ''}{r.question_type ? ' · ' + (QUESTION_TYPES[r.question_type] || r.question_type) : ''}</p>
              <p>Doğru: <b>{r.correct}</b> · Öğrenci: <b className={r.result === 'correct' ? 'text-emerald-600' : r.result ? 'text-red-600' : ''}>{r.answered_at ? (r.answer || 'boş') : '—'}</b>{r.time_spent_sec ? ` · ${r.time_spent_sec} sn` : ''}{r.banked_at ? ' · bankaya eklendi' : ''}</p>
              {r.reason && <p className="text-slate-500" title="Neden bu soru?">💡 {r.reason}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
