'use server';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { EXAM_PAGE_BUCKET } from '@/lib/env';
import type { Letter } from '@/lib/exams';

export interface ExamResult { error?: string; ok?: string; id?: string; count?: number }

export interface ExamInput {
  title: string; instructions: string; mode: 'live' | 'assignment'; class_id: string;
  question_count: number; option_count: number; duration_min: number; penalty_divisor: number;
  opens_at: string; closes_at: string; results_mode: 'after_close' | 'after_submit' | 'never';
}

async function teacher() {
  const s = await getSession();
  return s && s.role === 'teacher' ? s : null;
}
const isUuid = (s: string) => /^[0-9a-f-]{36}$/i.test(s);
const iso = (s: string): string | null => { if (!s) return null; const t = Date.parse(s); return Number.isFinite(t) ? new Date(t).toISOString() : null; };
const done = (id?: string) => { revalidatePath('/ogretmen/denemeler'); if (id) revalidatePath('/ogretmen/denemeler/' + id, 'layout'); revalidatePath('/ogrenci', 'layout'); };

function clean(x: ExamInput): { row?: Record<string, unknown>; error?: string } {
  const title = String(x.title || '').trim().slice(0, 160);
  if (!title) return { error: 'Denemeye bir ad verin.' };
  const qc = Math.round(Number(x.question_count)), dur = Math.round(Number(x.duration_min));
  if (!(qc >= 1 && qc <= 200)) return { error: 'Soru sayısı 1 ile 200 arasında olmalı.' };
  if (!(dur >= 1 && dur <= 600)) return { error: 'Süre 1 ile 600 dakika arasında olmalı.' };
  if (!['live', 'assignment'].includes(x.mode)) return { error: 'Deneme türünü seçin.' };
  const opens = x.mode === 'assignment' ? iso(x.opens_at) : null, closes = x.mode === 'assignment' ? iso(x.closes_at) : null;
  if (x.mode === 'assignment' && !closes) return { error: 'Süreli ödev için son teslim tarihini girin.' };
  if (opens && closes && Date.parse(closes) <= Date.parse(opens)) return { error: 'Son teslim, başlangıçtan sonra olmalı.' };
  return { row: {
    title, instructions: String(x.instructions || '').trim().slice(0, 2000) || null, mode: x.mode,
    class_id: isUuid(x.class_id) ? x.class_id : null, question_count: qc,
    option_count: Number(x.option_count) === 4 ? 4 : 5, duration_min: dur,
    penalty_divisor: [0, 3, 4].includes(Number(x.penalty_divisor)) ? Number(x.penalty_divisor) : 4,
    opens_at: opens, closes_at: closes,
    results_mode: ['after_close', 'after_submit', 'never'].includes(x.results_mode) ? x.results_mode : 'after_close',
  } };
}

export async function createExam(x: ExamInput): Promise<ExamResult> {
  const s = await teacher();
  if (!s) return { error: 'Yetkiniz yok.' };
  const c = clean(x);
  if (c.error) return { error: c.error };
  const sb = await supabaseServer();
  const { data, error } = await sb.from('exams').insert({ ...c.row, teacher_id: s.userId }).select('id').single();
  if (error) return { error: 'Deneme oluşturulamadı: ' + error.message };
  done();
  return { id: data.id };
}

export async function updateExam(id: string, x: ExamInput): Promise<ExamResult> {
  if (!(await teacher())) return { error: 'Yetkiniz yok.' };
  const c = clean(x);
  if (c.error) return { error: c.error };
  const sb = await supabaseServer();
  const { count } = await sb.from('exam_sessions').select('id', { count: 'exact', head: true }).eq('exam_id', id);
  const { data: cur } = await sb.from('exams').select('mode, question_count, option_count').eq('id', id).maybeSingle();
  if (!cur) return { error: 'Deneme bulunamadı.' };
  if (count && (cur.mode !== c.row!.mode || cur.question_count !== c.row!.question_count || cur.option_count !== c.row!.option_count))
    return { error: 'Öğrenciler çözmeye başladı; tür, soru sayısı ve şık sayısı artık değiştirilemez.' };
  const { error } = await sb.from('exams').update(c.row!).eq('id', id);
  if (error) return { error: error.message };
  await sb.from('exam_key').delete().eq('exam_id', id).gt('question_no', c.row!.question_count as number);
  done(id);
  return { ok: 'Ayarlar kaydedildi.' };
}

export async function addPages(id: string, pages: { path: string; width: number; height: number }[]): Promise<ExamResult> {
  if (!(await teacher())) return { error: 'Yetkiniz yok.' };
  if (!pages.length) return { ok: '' };
  const sb = await supabaseServer();
  const { data: last } = await sb.from('exam_pages').select('sort_order').eq('exam_id', id).order('sort_order', { ascending: false }).limit(1).maybeSingle();
  const start = (last?.sort_order ?? -1) + 1;
  const { error } = await sb.from('exam_pages').insert(pages.filter(p => p.path.startsWith(id + '/')).map((p, i) => ({ exam_id: id, path: p.path, width: p.width, height: p.height, sort_order: start + i })));
  if (error) return { error: 'Sayfalar kaydedilemedi: ' + error.message };
  done(id);
  return { ok: `${pages.length} sayfa eklendi.` };
}

export async function deletePage(examId: string, pageId: string): Promise<ExamResult> {
  if (!(await teacher())) return { error: 'Yetkiniz yok.' };
  const sb = await supabaseServer();
  const { data: p } = await sb.from('exam_pages').delete().eq('id', pageId).eq('exam_id', examId).select('path').maybeSingle();
  if (!p) return { error: 'Sayfa bulunamadı.' };
  await sb.storage.from(EXAM_PAGE_BUCKET).remove([p.path]);
  done(examId);
  return { ok: 'Sayfa silindi.' };
}

export async function movePage(examId: string, pageId: string, dir: -1 | 1): Promise<ExamResult> {
  if (!(await teacher())) return { error: 'Yetkiniz yok.' };
  const sb = await supabaseServer();
  const { data } = await sb.from('exam_pages').select('id, sort_order').eq('exam_id', examId).order('sort_order');
  const list = (data || []) as { id: string; sort_order: number }[];
  const i = list.findIndex(p => p.id === pageId), j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return {};
  [list[i], list[j]] = [list[j], list[i]];
  for (let k = 0; k < list.length; k++) if (list[k].sort_order !== k) await sb.from('exam_pages').update({ sort_order: k }).eq('id', list[k].id);
  done(examId);
  return {};
}

export async function saveKey(examId: string, rows: { question_no: number; correct: Letter | null; topic_id: string | null; page_no: number | null }[]): Promise<ExamResult> {
  if (!(await teacher())) return { error: 'Yetkiniz yok.' };
  const sb = await supabaseServer();
  const { data: e } = await sb.from('exams').select('question_count, option_count').eq('id', examId).maybeSingle();
  if (!e) return { error: 'Deneme bulunamadı.' };
  const allowed = e.option_count === 4 ? 'ABCD' : 'ABCDE';
  const clean = rows.filter(r => r.question_no >= 1 && r.question_no <= e.question_count).map(r => ({
    exam_id: examId, question_no: r.question_no,
    correct: r.correct && allowed.includes(r.correct) ? r.correct : null,
    topic_id: r.topic_id && isUuid(r.topic_id) ? r.topic_id : null,
    page_no: r.page_no && r.page_no >= 1 && r.page_no <= 500 ? Math.round(r.page_no) : null,
  }));
  const { error } = await sb.from('exam_key').upsert(clean, { onConflict: 'exam_id,question_no' });
  if (error) return { error: 'Cevap anahtarı kaydedilemedi: ' + error.message };
  done(examId);
  const missing = e.question_count - clean.filter(r => r.correct).length;
  return { ok: missing ? `Kaydedildi. ${missing} sorunun cevabı boş (iptal sayılır).` : 'Cevap anahtarı kaydedildi.' };
}

export async function setStatus(id: string, status: 'draft' | 'published' | 'closed'): Promise<ExamResult> {
  if (!(await teacher())) return { error: 'Yetkiniz yok.' };
  const sb = await supabaseServer();
  if (status === 'published') {
    const [{ count: pages }, { data: e }, { count: keys }] = await Promise.all([
      sb.from('exam_pages').select('id', { count: 'exact', head: true }).eq('exam_id', id),
      sb.from('exams').select('question_count, mode, closes_at, status').eq('id', id).maybeSingle(),
      sb.from('exam_key').select('question_no', { count: 'exact', head: true }).eq('exam_id', id).not('correct', 'is', null),
    ]);
    if (!e) return { error: 'Deneme bulunamadı.' };
    if (!pages) return { error: 'Önce soru sayfalarını (PDF ya da fotoğraf) yükleyin.' };
    if (!keys) return { error: 'Önce cevap anahtarını girin.' };
    if (e.mode === 'assignment' && e.closes_at && Date.parse(e.closes_at) < Date.now()) return { error: 'Son teslim tarihi geçmiş; ayarlardan yeni bir tarih girin.' };
  }
  if (status === 'draft') {
    const { count } = await sb.from('exam_sessions').select('id', { count: 'exact', head: true }).eq('exam_id', id);
    if (count) return { error: 'Öğrenciler çözmeye başladı; deneme taslağa alınamaz. Bitirebilirsiniz.' };
  }
  const { error } = await sb.from('exams').update({ status, ...(status === 'draft' ? { started_at: null } : {}) }).eq('id', id);
  if (error) return { error: error.message };
  done(id);
  return { ok: status === 'published' ? 'Deneme yayımlandı; öğrenciler görebilir.' : status === 'closed' ? 'Deneme bitirildi.' : 'Taslağa alındı.' };
}

export async function startLive(id: string): Promise<ExamResult> {
  if (!(await teacher())) return { error: 'Yetkiniz yok.' };
  const pre = await setStatus(id, 'published');
  if (pre.error) return pre;
  const sb = await supabaseServer();
  const { error } = await sb.rpc('start_live_exam', { eid: id });
  if (error) return { error: error.message };
  done(id);
  return { ok: 'Deneme başladı! Öğrenciler şimdi çözebilir.' };
}

export async function deleteExam(id: string): Promise<ExamResult> {
  if (!(await teacher())) return { error: 'Yetkiniz yok.' };
  const sb = await supabaseServer();
  const { data: pages } = await sb.from('exam_pages').select('path').eq('exam_id', id);
  const { count: transferred } = await sb.from('exam_sessions').select('id', { count: 'exact', head: true }).eq('exam_id', id).not('transferred_at', 'is', null);
  // Soru bankasına aktarılan sorular bu denemenin sayfa görsellerini kullanır; silinirse görseller kaybolur
  if (transferred) return { error: 'Bu denemenin yanlışları soru bankasına aktarıldı; silinirse o soruların görselleri kaybolur. Denemeyi silmek yerine bitirilmiş olarak bırakın.' };
  const { error } = await sb.from('exams').delete().eq('id', id);
  if (error) return { error: error.message };
  if (pages?.length) await sb.storage.from(EXAM_PAGE_BUCKET).remove(pages.map(p => p.path));
  done();
  return { ok: 'Deneme silindi.' };
}

// Öğrencinin çözümünü siler (yeniden çözebilsin diye)
export async function resetSession(examId: string, sessionId: string): Promise<ExamResult> {
  if (!(await teacher())) return { error: 'Yetkiniz yok.' };
  const sb = await supabaseServer();
  const { error } = await sb.from('exam_sessions').delete().eq('id', sessionId).eq('exam_id', examId);
  if (error) return { error: error.message };
  done(examId);
  return { ok: 'Öğrencinin çözümü silindi; yeniden başlayabilir.' };
}

export async function transferWrongs(examId: string, studentIds?: string[]): Promise<ExamResult> {
  if (!(await teacher())) return { error: 'Yetkiniz yok.' };
  const sb = await supabaseServer();
  const { data, error } = await sb.rpc('transfer_exam_wrongs', { eid: examId, sids: studentIds?.length ? studentIds : null });
  if (error) return { error: 'Aktarılamadı: ' + error.message };
  done(examId);
  revalidatePath('/ogretmen', 'layout');
  return { ok: data ? `${data} yanlış/boş soru öğrencilerin soru bankasına eklendi.` : 'Aktarılacak yeni yanlış ya da boş soru yok.', count: Number(data) || 0 };
}
