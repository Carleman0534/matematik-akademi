import Link from 'next/link';
import type { Metadata } from 'next';
import { requireTeacher } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { getClasses } from '@/lib/data';
import { ExamForm } from '@/components/exams/ExamForm';
import { getPdfDoc } from '@/lib/pdfLibrary';

export const metadata: Metadata = { title: 'Yeni deneme' };

export default async function NewExamPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const me = await requireTeacher();
  const sb = await supabaseServer();
  const { pdf: pdfId } = await searchParams;
  const [classes, doc] = await Promise.all([getClasses(sb, me.userId), pdfId ? getPdfDoc(sb, pdfId) : Promise.resolve(null)]);
  const pdf = doc ? { id: doc.id, title: doc.title, url: doc.url, file_name: doc.file_name } : undefined;
  return (
    <div className="space-y-6">
      <Link href="/ogretmen/denemeler" className="text-sm text-slate-500 hover:underline">← Denemeler</Link>
      <h1 className="text-2xl font-black">Yeni deneme</h1>
      <p className="text-sm text-slate-500">Hazır bir PDF&rsquo;in varsa <Link href="/ogretmen/pdf-arsivi" className="font-semibold text-indigo-600 dark:text-indigo-400">PDF Arşivi</Link>&rsquo;nden de deneme oluşturabilirsin.</p>
      <div className="card"><ExamForm classes={classes} pdf={pdf} /></div>
    </div>
  );
}
