import Link from 'next/link';
import type { Metadata } from 'next';
import { requireTeacher } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { getClasses } from '@/lib/data';
import { ExamForm } from '@/components/exams/ExamForm';

export const metadata: Metadata = { title: 'Yeni deneme' };

export default async function NewExamPage() {
  const me = await requireTeacher();
  let classes: any[] = [];
  try {
    classes = await getClasses(await supabaseServer(), me.userId);
  } catch (err) {
    console.error('getClasses error:', err);
    classes = [];
  }
  return (
    <div className="space-y-6">
      <Link href="/ogretmen/denemeler" className="text-sm text-slate-500 hover:underline">← Denemeler</Link>
      <h1 className="text-2xl font-black">Yeni deneme</h1>
      <div className="card"><ExamForm classes={classes} /></div>
    </div>
  );
}
