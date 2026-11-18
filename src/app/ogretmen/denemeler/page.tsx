import Link from 'next/link';
import type { Metadata } from 'next';
import { requireTeacher } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { EXAM_SELECT, type ExamRow } from '@/lib/examData';
import { examPhase, PHASE_LABEL, MODE_LABEL } from '@/lib/exams';
import { PHASE_STYLE } from '@/components/exams/phaseStyle';
import { fmtDateTime } from '@/lib/labels';

export const metadata: Metadata = { title: 'Denemeler' };


export default async function ExamsPage() {
  const me = await requireTeacher();
  const sb = await supabaseServer();
  let exams: ExamRow[] = [];
  const className = new Map<string, string>();
  const started = new Map<string, number>(), submitted = new Map<string, number>();

  try {
    const [{ data }, { data: cls }, { data: ss }] = await Promise.all([
      sb.from('exams').select(EXAM_SELECT).eq('teacher_id', me.userId).order('created_at', { ascending: false }),
      sb.from('classes').select('id, name').eq('teacher_id', me.userId),
      sb.from('exam_sessions').select('exam_id, submitted_at, exams!inner(teacher_id)').eq('exams.teacher_id', me.userId),
    ]);
    exams = (data || []) as ExamRow[];
    ((cls || []) as { id: string; name: string }[]).forEach(c => className.set(c.id, c.name));
    ((ss || []) as { exam_id: string; submitted_at: string | null }[]).forEach(s => {
      started.set(s.exam_id, (started.get(s.exam_id) || 0) + 1);
      if (s.submitted_at) submitted.set(s.exam_id, (submitted.get(s.exam_id) || 0) + 1);
    });
  } catch (err) {
    console.error('Exams load error:', err);
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-black">Denemeler</h1>
        <Link href="/ogretmen/denemeler/yeni" className="btn-primary ml-auto">＋ Yeni deneme</Link>
      </div>
      {exams.length === 0 ? (
        <div className="card space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <p className="font-semibold">Henüz deneme yok.</p>
          <p>1) Soru kitapçığını PDF ya da fotoğraf olarak yükleyin, 2) cevap anahtarını ve konuları girin, 3) canlı başlatın ya da süreli ödev olarak yayımlayın.
            Öğrenciler sayfaları görüp yalnızca optik formu işaretler; bitince kim hangi soruyu yanlış yaptı, hangi konularda eksik var hemen görürsünüz.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {exams.map(e => { const ph = examPhase(e); return (
            <Link key={e.id} href={`/ogretmen/denemeler/${e.id}${ph === 'canli' ? '/canli' : ph === 'bitti' ? '/sonuclar' : ''}`} className="card space-y-2 transition hover:border-indigo-400">
              <div className="flex items-start gap-2">
                <p className="min-w-0 flex-1 font-bold">{e.title}</p>
                <span className={'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ' + PHASE_STYLE[ph]}>{ph === 'canli' ? '● ' : ''}{PHASE_LABEL[ph]}</span>
              </div>
              <p className="text-xs text-slate-500">{MODE_LABEL[e.mode]} · {e.question_count} soru · {e.duration_min} dk · {e.class_id ? className.get(e.class_id) || 'Sınıf' : 'Bütün öğrencilerim'}</p>
              <p className="text-xs text-slate-500">
                {e.mode === 'assignment' && e.closes_at ? `Son teslim: ${fmtDateTime(e.closes_at)} · ` : ''}
                {e.started_at ? `Başladı: ${fmtDateTime(e.started_at)} · ` : ''}
                Çözen: {submitted.get(e.id) || 0}{started.get(e.id) && started.get(e.id) !== submitted.get(e.id) ? ` (+${(started.get(e.id) || 0) - (submitted.get(e.id) || 0)} devam ediyor)` : ''}
              </p>
            </Link>
          ); })}
        </div>
      )}
    </div>
  );
}
