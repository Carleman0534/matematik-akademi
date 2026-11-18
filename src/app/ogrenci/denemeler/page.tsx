import Link from 'next/link';
import type { Metadata } from 'next';
import { requireStudent } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { EXAM_SELECT, type ExamRow } from '@/lib/examData';
import { examPhase, MODE_LABEL } from '@/lib/exams';
import { fmtDateTime } from '@/lib/labels';

export const metadata: Metadata = { title: 'Denemelerim' };
export const dynamic = 'force-dynamic';

const nowMs = () => Date.now();

export default async function MyExamsPage() {
  const s = await requireStudent();
  const sb = await supabaseServer();
  const [{ data }, { data: ss }] = await Promise.all([
    sb.from('exams').select(EXAM_SELECT).order('created_at', { ascending: false }), // RLS: yalnızca bana atanmış, yayımlanmış denemeler
    sb.from('exam_sessions').select('exam_id, submitted_at, deadline').eq('student_id', s.studentId),
  ]);
  const exams = (data || []) as ExamRow[];
  const now = nowMs();
  const sess = new Map(((ss || []) as { exam_id: string; submitted_at: string | null; deadline: string }[]).map(x => [x.exam_id, x]));
  const rows = exams.map(e => {
    const ph = examPhase(e, now);
    const x = sess.get(e.id);
    const done = !!x && (!!x.submitted_at || Date.parse(x.deadline) < now);
    const status = done ? 'Tamamlandı' : x && ph !== 'bitti' ? 'Devam ediyor' : ph === 'canli' ? '● Canlı – şimdi katıl' : ph === 'acik' ? 'Açık' : ph === 'bekliyor' ? 'Öğretmen başlatacak' : ph === 'acilacak' ? 'Henüz açılmadı' : 'Katılmadın';
    const group = done || ph === 'bitti' ? 'biten' : ph === 'canli' || ph === 'acik' || x ? 'simdi' : 'yaklasan';
    return { e, ph, status, group, done };
  });
  const section = (key: string, title: string, empty: string) => {
    const list = rows.filter(r => r.group === key);
    return (
      <section className="space-y-2">
        <h2 className="font-bold">{title}</h2>
        {list.length === 0 ? <p className="text-sm text-slate-500">{empty}</p> : (
          <div className="grid gap-2 md:grid-cols-2">
            {list.map(({ e, status, ph, done }) => (
              <Link key={e.id} href={`/ogrenci/denemeler/${e.id}`} className={'card flex items-center gap-3 p-4 transition hover:border-indigo-400 ' + (ph === 'canli' && !done ? 'border-red-400' : '')}>
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{e.title}</p>
                  <p className="text-xs text-slate-500">{MODE_LABEL[e.mode]} · {e.question_count} soru · {e.duration_min} dk{e.mode === 'assignment' && e.closes_at ? ` · son: ${fmtDateTime(e.closes_at)}` : ''}</p>
                </div>
                <span className={'shrink-0 text-xs font-bold ' + (ph === 'canli' && !done ? 'text-red-600' : done ? 'text-emerald-600' : 'text-indigo-600 dark:text-indigo-400')}>{status}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    );
  };
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black">Denemelerim</h1>
      {section('simdi', 'Şimdi çözülebilir', 'Şu an açık deneme yok.')}
      {section('yaklasan', 'Yaklaşan', 'Yaklaşan deneme yok.')}
      {section('biten', 'Biten denemeler', 'Henüz biten deneme yok.')}
    </div>
  );
}
