import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { PDF_BUCKET } from '@/lib/env';

export const DOC_TYPES = {
  deneme: 'Deneme', soru_bankasi: 'Soru bankası', cevap_anahtari: 'Cevap anahtarı', cozum: 'Çözüm', calisma_foyu: 'Çalışma föyü', diger: 'Diğer',
} as const;
export type DocType = keyof typeof DOC_TYPES;

export interface PdfDoc {
  id: string; teacher_id: string; title: string; doc_type: DocType; grade_level: string | null; topic_id: string | null;
  publisher: string | null; description: string | null; path: string; file_name: string; size_bytes: number | null;
  page_count: number | null; is_archived: boolean; created_at: string; url: string | null;
  exam_no: string | null; published_on: string | null; option_count: number; analysis_status: string; analyzed_at: string | null; question_count: number | null;
}

// Öğretmenin PDF'leri ve süreli (1 saat) açma adresleri. Dosyalar gizli kovada; adres paylaşılsa bile süresi dolar.
export async function listPdfDocs(sb: SupabaseClient, teacherId: string, archived = false): Promise<PdfDoc[]> {
  const { data } = await sb.from('pdf_documents')
    .select('id, teacher_id, title, doc_type, grade_level, topic_id, publisher, description, path, file_name, size_bytes, page_count, is_archived, created_at, exam_no, published_on, option_count, analysis_status, analyzed_at, question_count')
    .eq('teacher_id', teacherId).eq('is_archived', archived).order('created_at', { ascending: false });
  const docs = (data || []) as Omit<PdfDoc, 'url'>[];
  const urls = new Map<string, string>();
  if (docs.length) {
    const { data: signed } = await sb.storage.from(PDF_BUCKET).createSignedUrls(docs.map(d => d.path), 3600);
    (signed || []).forEach(s => { if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl); });
  }
  return docs.map(d => ({ ...d, url: urls.get(d.path) || null }));
}

export async function getPdfDoc(sb: SupabaseClient, id: string): Promise<PdfDoc | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await sb.from('pdf_documents').select('*').eq('id', id).maybeSingle();
  if (!data) return null;
  const { data: s } = await sb.storage.from(PDF_BUCKET).createSignedUrl(data.path, 3600);
  return { ...(data as Omit<PdfDoc, 'url'>), url: s?.signedUrl || null };
}

export const fmtSize = (b: number | null) => (b == null ? '' : b > 1048576 ? (b / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');
