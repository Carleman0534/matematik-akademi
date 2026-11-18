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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <Link href={'/ogretmen/ogrenciler/' + id} className="text-sm text-slate-500 hover:underline">← {s.full_name}</Link>
          <h1 className="text-2xl font-black">Soru ekle</h1>
        </div>
        <Link
          href={`/ogretmen/pdf-soru-ayikla?studentId=${id}`}
          className="btn btn-primary text-xs py-2 px-3 flex items-center gap-1.5 shadow bg-gradient-to-r from-indigo-600 to-purple-600 border-0 self-start sm:self-auto"
        >
          <span>✂️ PDF'den Otomatik Soru Ayıkla ({s.full_name} için)</span>
        </Link>
      </div>
      <AddQuestionsForm studentId={id} studentName={s.full_name} options={topicOptions(topics)} sources={sources} bankHref={'/ogretmen/ogrenciler/' + id} isTeacher />
    </div>
  );
}
