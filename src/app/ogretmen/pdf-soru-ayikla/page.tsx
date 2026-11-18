import type { Metadata } from 'next';
import { requireTeacher } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { getTopics, getSources } from '@/lib/data';
import { topicOptions } from '@/lib/topicOptions';
import { listPdfDocs } from '@/lib/pdfLibrary';
import PdfQuestionExtractor from '@/components/pdf/PdfQuestionExtractor';

export const metadata: Metadata = { title: 'PDF Soru Ayıkla' };

export default async function PdfSoruAyiklaPage({ searchParams }: { searchParams: Promise<{ studentId?: string; pdfId?: string }> }) {
  const me = await requireTeacher();
  const sp = await searchParams;
  const sb = await supabaseServer();
  const [{ data: studentsData }, topics, sources, docs] = await Promise.all([
    sb.from('students').select('id, full_name, grade_level').eq('teacher_id', me.userId).eq('is_active', true).order('full_name'),
    getTopics(sb), getSources(sb), listPdfDocs(sb, me.userId),
  ]);
  const students = (studentsData || []) as { id: string; full_name: string; grade_level: number | null }[];
  // Arşivdeki PDF'ler süreli adresleriyle; ?pdfId= ile gelinen belge listenin başında
  const pdfDocs = docs.filter(d => d.url).map(d => ({ id: d.id, title: d.title, file_path: d.url as string, file_name: d.file_name, grade_level: d.grade_level || undefined, publisher: d.publisher || undefined }))
    .sort((a, b) => (a.id === sp.pdfId ? -1 : b.id === sp.pdfId ? 1 : 0));
  return (
    <PdfQuestionExtractor students={students} topicOptions={topicOptions(topics)} sources={sources} pdfDocs={pdfDocs}
      initialStudentId={students.some(s => s.id === sp.studentId) ? sp.studentId : ''} />
  );
}
