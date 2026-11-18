import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { requireTeacher } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { getExam, eligibleStudents } from '@/lib/examData';
import { letters } from '@/lib/exams';
import { PrintButton } from '@/components/exams/PrintButton';

export const metadata: Metadata = { title: 'Optik form' };

const PER_COL = 20;

function Sheet({ title, n, opts, student }: { title: string; n: number; opts: string[]; student?: string }) {
  const cols = Array.from({ length: Math.ceil(n / PER_COL) }, (_, c) => Array.from({ length: Math.min(PER_COL, n - c * PER_COL) }, (_, i) => c * PER_COL + i + 1));
  return (
    <section className="optik-sayfa mx-auto max-w-3xl bg-white p-6 text-black print:p-0" style={{ breakAfter: 'page' }}>
      <div className="mb-4 flex items-end justify-between gap-4 border-b-2 border-black pb-2">
        <div><p className="text-xs font-bold uppercase tracking-wide">Matematik Akademi · Cevap Kâğıdı</p><p className="text-lg font-black">{title}</p></div>
        <div className="text-right text-sm"><p>Ad Soyad: <b className="inline-block min-w-48 border-b border-black text-left">{student || ''}</b></p><p className="mt-1">Tarih: <span className="inline-block min-w-32 border-b border-black" /></p></div>
      </div>
      <p className="mb-3 text-[11px]">Her soru için yalnızca bir şıkkın yuvarlağını tamamen doldurun. Boş bırakılan soru boş sayılır.</p>
      <div className="flex flex-wrap gap-x-8 gap-y-4">
        {cols.map((col, ci) => (
          <table key={ci} className="border-collapse text-sm">
            <tbody>
              {col.map(q => (
                <tr key={q}>
                  <td className="w-7 pr-1 text-right font-bold">{q}</td>
                  {opts.map(o => <td key={o} className="px-[3px] py-[2px]"><span className="flex h-5 w-5 items-center justify-center rounded-full border border-black text-[10px]">{o}</span></td>)}
                </tr>
              ))}
            </tbody>
          </table>
        ))}
      </div>
    </section>
  );
}

export default async function PrintSheetPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  await requireTeacher();
  const { id } = await params;
  const named = (await searchParams).adli === '1';
  const sb = await supabaseServer();
  const exam = await getExam(sb, id);
  if (!exam) notFound();
  const students = named ? await eligibleStudents(sb, exam) : [];
  const opts = letters(exam.option_count);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <Link href={`/ogretmen/denemeler/${id}`} className="text-sm text-slate-500 hover:underline">← {exam.title}</Link>
        <Link href={named ? `/ogretmen/denemeler/${id}/optik-yazdir` : `/ogretmen/denemeler/${id}/optik-yazdir?adli=1`} className="ml-auto text-sm font-semibold text-indigo-600 dark:text-indigo-400">
          {named ? 'Tek boş form' : `Her öğrenciye adıyla (${'bir sayfa'})`}</Link>
        <Link href={`/ogretmen/denemeler/${id}/optik-giris`} className="btn-secondary">⌨️ Cevapları gir</Link>
        <PrintButton />
      </div>
      {named && students.length === 0 && <p className="text-sm text-slate-500 print:hidden">Bu denemeye atanmış öğrenci yok.</p>}
      {named ? students.map(s => <Sheet key={s.id} title={exam.title} n={exam.question_count} opts={opts} student={s.full_name} />)
        : <Sheet title={exam.title} n={exam.question_count} opts={opts} />}
    </div>
  );
}
