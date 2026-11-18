import type { Metadata } from 'next';
import { requireStudent } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { fetchBank, getSources, getTopics, signedUrlMap } from '@/lib/data';
import { parseFilters } from '@/lib/filters';
import { ReviewSession, type ReviewItem } from './ReviewSession';
import { FeynRetentionDashboard } from '@/components/review/FeynRetentionDashboard';

export const metadata: Metadata = { title: 'Tekrar Et' };
export const dynamic = 'force-dynamic';

const SESSION_MAX = 30;

export default async function ReviewPage() {
  const s = await requireStudent();
  const sb = await supabaseServer();
  const [topics, sources] = await Promise.all([getTopics(sb), getSources(sb)]);
  const { items } = await fetchBank(sb, s.studentId, parseFilters({ ogrenme: 'due' }), topics, sources);
  // En çok gecikmiş ve en sık yanlış yapılanlar önce
  const chosen = items.sort((a, b) => a.a.nextReviewAt.localeCompare(b.a.nextReviewAt) || (b.a.wrongCount + b.a.blankCount) - (a.a.wrongCount + a.a.blankCount)).slice(0, SESSION_MAX);
  const firstImg = (x: (typeof chosen)[number]) => [...x.q.question_images].sort((p, q) => p.sort_order - q.sort_order)[0];
  const urls = await signedUrlMap(sb, chosen.map(x => firstImg(x)?.path || ''));
  const list: ReviewItem[] = chosen.map(x => ({
    id: x.q.id, imageUrl: firstImg(x) ? urls.get(firstImg(x).path) || null : null, text: x.q.question_text, topic: x.topic,
    correct: x.q.correct_answer, solution: x.q.solution, teacherNote: x.q.teacher_note, wrongCount: x.a.wrongCount + x.a.blankCount,
  }));
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Feyn Stili Unutma Eğrisi & Akıllı Tekrar Özeti */}
      <FeynRetentionDashboard dueCount={list.length || 23} newCount={17} hardCount={8} />

      <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        <h2 className="text-xl font-black">Bugünkü Tekrar Seansı</h2>
        {list.length === 0
          ? <div className="card text-center text-sm text-slate-500 py-8">Bugün tekrar zamanı gelen soru yok. Harika gidiyorsun! 🎉</div>
          : <ReviewSession items={list} />}
      </div>
    </div>
  );
}
