'use server';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { PDF_BUCKET, POOL_BUCKET } from '@/lib/env';
import { DOC_TYPES } from '@/lib/pdfLibrary';
import { findDuplicates } from '@/lib/pool';

export interface PdfResult { error?: string; ok?: string; id?: string }
export interface PdfMeta {
  path: string; file_name: string; size_bytes: number; page_count: number | null; file_hash: string;
  title: string; doc_type: string; grade_level: string; publisher: string; description: string; topic_id: string;
  exam_no: string; published_on: string; option_count: number;
}

async function teacher() {
  const s = await getSession();
  return s && s.role === 'teacher' ? s : null;
}
const isUuid = (s: string) => /^[0-9a-f-]{36}$/i.test(s);
const done = () => { revalidatePath('/ogretmen/pdf-arsivi'); revalidatePath('/ogretmen/soru-havuzu', 'layout'); };

// Aynı dosya daha önce yüklendi mi? (SHA-256 özeti)
export async function findByHash(hash: string): Promise<{ id: string; title: string } | null> {
  const s = await teacher();
  if (!s || !/^[0-9a-f]{64}$/.test(hash)) return null;
  const sb = await supabaseServer();
  const { data } = await sb.from('pdf_documents').select('id, title').eq('teacher_id', s.userId).eq('file_hash', hash).maybeSingle();
  return data ?? null;
}

// Dosya tarayıcıdan doğrudan gizli kovaya yüklenir (depolama kuralı: yalnızca öğretmenin kendi klasörü); burada bilgisi kaydedilir
export async function addPdfDoc(m: PdfMeta): Promise<PdfResult> {
  const s = await teacher();
  if (!s) return { error: 'Yetkiniz yok.' };
  if (!m.path.startsWith(s.userId + '/') || !m.path.endsWith('.pdf')) return { error: 'Geçersiz dosya yolu.' };
  const title = String(m.title || '').trim().slice(0, 200);
  if (!title) return { error: 'Bir başlık yazın.' };
  const sb = await supabaseServer();
  const { data, error } = await sb.from('pdf_documents').insert({
    teacher_id: s.userId, path: m.path, file_name: String(m.file_name || 'belge.pdf').slice(0, 255),
    size_bytes: Number(m.size_bytes) || null, page_count: Number(m.page_count) || null, title,
    file_hash: /^[0-9a-f]{64}$/.test(m.file_hash) ? m.file_hash : null,
    doc_type: m.doc_type in DOC_TYPES ? m.doc_type : 'diger',
    grade_level: String(m.grade_level || '').trim().slice(0, 30) || null,
    publisher: String(m.publisher || '').trim().slice(0, 120) || null,
    description: String(m.description || '').trim().slice(0, 1000) || null,
    topic_id: isUuid(m.topic_id) ? m.topic_id : null,
    exam_no: String(m.exam_no || '').trim().slice(0, 40) || null,
    published_on: /^\d{4}-\d{2}-\d{2}$/.test(m.published_on) ? m.published_on : null,
    option_count: Number(m.option_count) === 5 ? 5 : 4,
  }).select('id').single();
  if (error) {
    await sb.storage.from(PDF_BUCKET).remove([m.path]);
    return { error: error.code === '23505' ? 'Bu dosya zaten arşivde (aynı içerik).' : 'Kaydedilemedi: ' + error.message };
  }
  done();
  return { ok: `"${title}" arşive eklendi.`, id: data.id };
}

export async function setPdfArchived(id: string, archived: boolean): Promise<PdfResult> {
  if (!(await teacher())) return { error: 'Yetkiniz yok.' };
  const sb = await supabaseServer();
  const { error } = await sb.from('pdf_documents').update({ is_archived: archived }).eq('id', id);
  if (error) return { error: error.message };
  done();
  return { ok: archived ? 'Arşivden kaldırıldı (Kaldırılanlar listesinde).' : 'Geri alındı.' };
}

export async function deletePdfDoc(id: string): Promise<PdfResult> {
  if (!(await teacher())) return { error: 'Yetkiniz yok.' };
  const sb = await supabaseServer();
  const { data } = await sb.from('pdf_documents').delete().eq('id', id).select('path').maybeSingle();
  if (!data) return { error: 'Belge bulunamadı.' };
  await sb.storage.from(PDF_BUCKET).remove([data.path]);
  done();
  return { ok: 'Kalıcı olarak silindi. Bu PDF\'ten havuza alınan sorular korunur.' };
}

// ---- Analiz işi ----
// Aynı PDF için aynı anda tek iş (veritabanında benzersiz kural). 15 dakikadan eski "işleniyor" iş yarıda kalmış sayılır.
export async function startAnalysis(pdfId: string): Promise<PdfResult> {
  const s = await teacher();
  if (!s) return { error: 'Yetkiniz yok.' };
  const sb = await supabaseServer();
  const { data: stale } = await sb.from('pdf_analysis_jobs').select('id, started_at').eq('pdf_id', pdfId).in('status', ['pending', 'processing']).maybeSingle();
  if (stale) {
    if (Date.now() - Date.parse(stale.started_at) < 15 * 60000) return { error: 'Bu PDF şu anda analiz ediliyor. Bitmesini bekleyin.' };
    await sb.from('pdf_analysis_jobs').update({ status: 'error', error: 'Yarıda kaldı (sayfa kapatıldı).', finished_at: new Date().toISOString() }).eq('id', stale.id);
  }
  const { data, error } = await sb.from('pdf_analysis_jobs').insert({ pdf_id: pdfId, teacher_id: s.userId, status: 'processing' }).select('id').single();
  if (error) return { error: error.code === '23505' ? 'Bu PDF şu anda analiz ediliyor.' : 'Analiz başlatılamadı: ' + error.message };
  await sb.from('pdf_documents').update({ analysis_status: 'processing' }).eq('id', pdfId);
  return { id: data.id };
}

export interface PoolInput {
  page_no: number; question_no: number; section: string; image_path: string; width: number; height: number;
  correct: string | null; option_count: number; detect_method: 'text' | 'gaps'; confidence: number; image_hash: string | null;
}

// Ayıklanan soruları havuza kaydeder; aynı PDF'te aynı (bölüm, soru no, sayfa) zaten varsa atlar (yeniden analiz güvenli)
export async function savePoolBatch(jobId: string, pdfId: string, sourceLabel: string, rows: PoolInput[]): Promise<{ error?: string; saved: number; skipped: string[] }> {
  const s = await teacher();
  if (!s) return { error: 'Yetkiniz yok.', saved: 0, skipped: [] };
  const sb = await supabaseServer();
  const { data: have } = await sb.from('pool_questions').select('section, question_no, page_no').eq('pdf_id', pdfId);
  const key = (r: { section: string | null; question_no: number | null; page_no: number | null }) => `${r.section || ''}|${r.question_no}|${r.page_no}`;
  const existing = new Set(((have || []) as { section: string; question_no: number; page_no: number }[]).map(key));
  const fresh = rows.filter(r => r.image_path.startsWith(s.userId + '/') && !existing.has(key(r)));
  const skipped = rows.filter(r => !fresh.includes(r)).map(r => r.image_path);
  if (!fresh.length) return { saved: 0, skipped };
  const { error } = await sb.from('pool_questions').insert(fresh.map(r => ({
    teacher_id: s.userId, pdf_id: pdfId, job_id: jobId, source_label: sourceLabel.slice(0, 200),
    page_no: r.page_no, question_no: r.question_no, section: (r.section || '').slice(0, 60), image_path: r.image_path,
    width: Math.round(r.width) || null, height: Math.round(r.height) || null,
    correct: r.correct && /^[A-E]$/.test(r.correct) ? r.correct : null, option_count: r.option_count === 5 ? 5 : 4,
    detect_method: r.detect_method, confidence: Math.max(0, Math.min(1, r.confidence)),
    image_hash: r.image_hash && /^[0-9a-f]{64}$/.test(r.image_hash) ? r.image_hash : null, status: 'draft',
  })));
  if (error) return { error: 'Sorular kaydedilemedi: ' + error.message, saved: 0, skipped };
  return { saved: fresh.length, skipped };
}

// Analizi bitirir: benzer soruları işaretler, PDF'i "öğretmen onayı bekliyor" durumuna alır
export async function finishAnalysis(jobId: string, pdfId: string, stats: { method: 'text' | 'gaps'; pages: number; detected: number; saved: number; skippedPages: number; answerKeys: number }, failure?: string): Promise<PdfResult> {
  const s = await teacher();
  if (!s) return { error: 'Yetkiniz yok.' };
  const sb = await supabaseServer();
  const now = new Date().toISOString();
  await sb.from('pdf_analysis_jobs').update({
    status: failure ? 'error' : 'done', error: failure?.slice(0, 1000) || null, method: stats.method, page_count: stats.pages,
    detected: stats.detected, saved: stats.saved, skipped_pages: stats.skippedPages, answer_keys: stats.answerKeys, finished_at: now,
  }).eq('id', jobId);
  if (!failure) {
    // Benzerlik: bu PDF'in parmak izi olan soruları, öğretmenin havuzundaki diğer sorularla karşılaştır
    const { data: mine } = await sb.from('pool_questions').select('id, image_hash, duplicate_of').eq('pdf_id', pdfId).not('image_hash', 'is', null).order('question_no');
    const { data: others } = await sb.from('pool_questions').select('id, image_hash').eq('teacher_id', s.userId).neq('pdf_id', pdfId).not('image_hash', 'is', null).neq('status', 'rejected').limit(20000);
    const dup = findDuplicates(((mine || []) as { id: string; image_hash: string }[]).map(m => ({ id: m.id, hash: m.image_hash })), ((others || []) as { id: string; image_hash: string }[]).map(o => ({ id: o.id, hash: o.image_hash })));
    for (const [id, of] of dup) await sb.from('pool_questions').update({ duplicate_of: of }).eq('id', id).is('duplicate_of', null);
    const { count } = await sb.from('pool_questions').select('id', { count: 'exact', head: true }).eq('pdf_id', pdfId).neq('status', 'rejected');
    await sb.from('pdf_documents').update({ analysis_status: 'review', analyzed_at: now, question_count: count ?? stats.saved }).eq('id', pdfId);
  } else {
    await sb.from('pdf_documents').update({ analysis_status: 'error' }).eq('id', pdfId);
  }
  done();
  return failure ? { error: failure } : { ok: `${stats.saved} yeni soru havuza eklendi (onay bekliyor).` };
}

// Analiz sırasında yüklenip kaydedilemeyen görselleri temizler
export async function removePoolImages(paths: string[]): Promise<void> {
  const s = await teacher();
  if (!s) return;
  const own = paths.filter(p => p.startsWith(s.userId + '/'));
  if (own.length) { const sb = await supabaseServer(); await sb.storage.from(POOL_BUCKET).remove(own); }
}
