import type { Metadata } from 'next';
import { requireStudent } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { QuestionBank } from '@/components/questions/QuestionBank';

export const metadata: Metadata = { title: 'Soru Bankam' };

export default async function MyBank({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const s = await requireStudent();
  const sb = await supabaseServer();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black">Soru Bankam</h1>
      <QuestionBank sb={sb} studentId={s.studentId} searchParams={await searchParams} basePath="/ogrenci/soru-bankam" addHref="/ogrenci/soru-ekle" />
    </div>
  );
}
