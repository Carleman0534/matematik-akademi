'use server';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { PDF_BUCKET } from '@/lib/env';
import { DOC_TYPES } from '@/lib/pdfLibrary';

export interface PdfResult { error?: string; ok?: string }
export interface PdfMeta {
  path: string; file_name: string; size_bytes: number; page_count: number | null;
  title: string; doc_type: string; grade_level: string; publisher: string; description: string; topic_id: string;
}

async function teacher() {
  const s = await getSession();
  return s && s.role === 'teacher' ? s : null;
}
const isUuid = (s: string) => /^[0-9a-f-]{36}$/i.test(s);

// Dosya tarayıcıdan doğrudan gizli kovaya yüklenir (depolama kuralı: yalnızca öğretmenin kendi klasörü); burada bilgisi kaydedilir
export async function addPdfDoc(m: PdfMeta): Promise<PdfResult> {
  const s = await teacher();
  if (!s) return { error: 'Yetkiniz yok.' };
  if (!m.path.startsWith(s.userId + '/') || !m.path.endsWith('.pdf')) return { error: 'Geçersiz dosya yolu.' };
  const title = String(m.title || '').trim().slice(0, 200);
  if (!title) return { error: 'Bir başlık yazın.' };
  const sb = await supabaseServer();
  const { error } = await sb.from('pdf_documents').insert({
    teacher_id: s.userId, path: m.path, file_name: String(m.file_name || 'belge.pdf').slice(0, 255),
    size_bytes: Number(m.size_bytes) || null, page_count: Number(m.page_count) || null, title,
    doc_type: m.doc_type in DOC_TYPES ? m.doc_type : 'diger',
    grade_level: String(m.grade_level || '').trim().slice(0, 30) || null,
    publisher: String(m.publisher || '').trim().slice(0, 120) || null,
    description: String(m.description || '').trim().slice(0, 1000) || null,
    topic_id: isUuid(m.topic_id) ? m.topic_id : null,
  });
  if (error) {
    await sb.storage.from(PDF_BUCKET).remove([m.path]);
    return { error: 'Kaydedilemedi: ' + error.message };
  }
  revalidatePath('/ogretmen/pdf-arsivi');
  return { ok: `"${title}" arşive eklendi.` };
}

export async function setPdfArchived(id: string, archived: boolean): Promise<PdfResult> {
  if (!(await teacher())) return { error: 'Yetkiniz yok.' };
  const sb = await supabaseServer();
  const { error } = await sb.from('pdf_documents').update({ is_archived: archived }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/ogretmen/pdf-arsivi');
  return { ok: archived ? 'Arşivden kaldırıldı (Kaldırılanlar listesinde).' : 'Geri alındı.' };
}

export async function deletePdfDoc(id: string): Promise<PdfResult> {
  if (!(await teacher())) return { error: 'Yetkiniz yok.' };
  const sb = await supabaseServer();
  const { data } = await sb.from('pdf_documents').delete().eq('id', id).select('path').maybeSingle();
  if (!data) return { error: 'Belge bulunamadı.' };
  await sb.storage.from(PDF_BUCKET).remove([data.path]);
  revalidatePath('/ogretmen/pdf-arsivi');
  return { ok: 'Kalıcı olarak silindi.' };
}
