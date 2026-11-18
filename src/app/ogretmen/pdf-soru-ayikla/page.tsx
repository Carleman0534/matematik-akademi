import type { Metadata } from 'next';
import { requireTeacher } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { getTopics, getSources } from '@/lib/data';
import { topicOptions } from '@/lib/topicOptions';
import { getPdfDocuments } from '@/lib/pdfDocs';
import PdfQuestionExtractor from '@/components/pdf/PdfQuestionExtractor';

export const metadata: Metadata = {
  title: 'Akıllı PDF Soru Ayıklayıcı | Matematik Akademi',
  description: 'Dışarıdan PDF ekleyerek soruları otomatik kırpma ve içe aktarma aracı.',
};

export default async function PdfSoruAyiklaPage({
  searchParams,
}: {
  searchParams?: Promise<{ studentId?: string; pdfId?: string }>;
}) {
  await requireTeacher();
  const sp = searchParams ? await searchParams : {};
  const studentId = sp.studentId || '';

  const sb = await supabaseServer();
  const [{ data: studentsData }, topics, sources, pdfDocs] = await Promise.all([
    sb.from('students').select('id, full_name, grade_level').order('full_name'),
    getTopics(sb),
    getSources(sb),
    getPdfDocuments({ isArchived: false }).catch(() => []),
  ]);

  const students = (studentsData || []) as {
    id: string;
    full_name: string;
    grade_level: number | null;
  }[];

  const formattedTopicOptions = topicOptions(topics);

  return (
    <div className="container mx-auto px-4 py-4 max-w-7xl">
      <PdfQuestionExtractor
        students={students}
        topicOptions={formattedTopicOptions}
        sources={sources}
        pdfDocs={pdfDocs}
        initialStudentId={studentId}
      />
    </div>
  );
}
