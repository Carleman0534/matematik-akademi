import type { Metadata } from 'next';
import { requireStudent } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { getSources, getTopics } from '@/lib/data';
import { topicOptions } from '@/lib/topicOptions';
import { AddQuestionsForm } from '@/components/questions/AddQuestionsForm';

export const metadata: Metadata = { title: 'Soru Ekle' };

export default async function AddPage() {
  const s = await requireStudent();
  const sb = await supabaseServer();
  const [topics, sources] = await Promise.all([getTopics(sb), getSources(sb)]);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black">Yanlış / boş soru ekle</h1>
      <AddQuestionsForm studentId={s.studentId} options={topicOptions(topics)} sources={sources} bankHref="/ogrenci/soru-bankam" isTeacher={false} />
    </div>
  );
}
