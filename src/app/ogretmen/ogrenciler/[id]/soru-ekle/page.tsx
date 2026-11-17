import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { supabaseServer } from '@/lib/supabase/server';
import { getSources, getStudent, getTopics } from '@/lib/data';
import { topicOptions } from '@/lib/topicOptions';
import { AddQuestionsForm } from '@/components/questions/AddQuestionsForm';

export const metadata: Metadata = { title: 'Soru Ekle' };

export default async function TeacherAddPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await supabaseServer();
  const [s, topics, sources] = await Promise.all([getStudent(sb, id), getTopics(sb), getSources(sb)]);
  if (!s) notFound();
  return (
    <div className="space-y-4">
      <Link href={'/ogretmen/ogrenciler/' + id} className="text-sm text-slate-500 hover:underline">← {s.full_name}</Link>
      <h1 className="text-2xl font-black">Soru ekle</h1>
      <AddQuestionsForm studentId={id} studentName={s.full_name} options={topicOptions(topics)} sources={sources} bankHref={'/ogretmen/ogrenciler/' + id} isTeacher />
    </div>
  );
}
