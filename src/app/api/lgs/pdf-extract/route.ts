import { NextRequest, NextResponse } from 'next/server';
import type { Database } from 'sql.js';
import { getDb, saveDb } from '@/lib/db/database';
import { getSession } from '@/lib/auth';
import { parseAnswerKey } from '@/lib/pdfExtraction/answerKey';
import { geminiKey } from '@/lib/pdfExtraction/geminiPage';
import { INITIAL_LGS_TOPICS } from '@/lib/ai/lgsCurriculum';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// PDF'ten soru çıkarma işinin sunucu tarafı.
// Sayfaları çizip soruları kırpma işi tarayıcıda yapılır (src/lib/pdfExtraction/clientExtractor.ts);
// bu uç nokta işi başlatır, her sayfanın kırpılmış soru görsellerini kaydeder ve işi bitirir.
//
//   GET                                   → { aiAvailable }
//   POST json  { action:'start', pdfId }  → eski çıkarımı siler, iş açar, cevap anahtarını döner
//   POST form  action=page                → bir sayfanın soru görsellerini + bilgilerini kaydeder
//   POST json  { action:'finish', ... }   → iş özetini yazar, PDF'in gerçek sayfa sayısını günceller

const TOPIC_IDS = new Set(INITIAL_LGS_TOPICS.map(t => t.id));
const safeId = (id: string) => id.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 80);
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

// Sunucusuz ortamda her istek farklı bir örneğe (ve onun ayrı veritabanı kopyasına) düşebilir.
// Bu yüzden her sayfa kaydı, ihtiyaç duyduğu PDF ve iş kayıtlarını yoksa kendisi açar.
function ensureDocAndJob(db: Database, pdfId: string, jobId: string, teacherId: string, title?: string, fileName?: string) {
  db.run(
    `INSERT OR IGNORE INTO pdf_documents (id, teacher_id, title, file_name, file_path) VALUES (?, ?, ?, ?, ?)`,
    [pdfId, teacherId, title || 'PDF', fileName || 'dokuman.pdf', `/api/pdf-documents/${pdfId}/file`]
  );
  db.run(
    `INSERT OR IGNORE INTO pdf_analysis_jobs (id, pdf_id, teacher_id, status) VALUES (?, ?, ?, 'processing')`,
    [jobId, pdfId, teacherId]
  );
}

interface PageQuestionMeta {
  seq: number;                 // belgedeki sıra (1'den başlar)
  questionNo: number | null;   // PDF'te görünen numara
  box: { x0: number; y0: number; x1: number; y1: number };
  pageW: number;
  pageH: number;
  text: string;
  options: Record<string, string> | null;
  answer: string | null;       // yapay zekânın önerdiği cevap
  topicId: string | null;
  difficulty: number | null;
  hasVisual: boolean;
  method: 'text' | 'visual' | 'whitespace' | 'ai';
  confidence: number;
}

export async function GET() {
  // Her PDF'in son çıkarma işinin özeti (uyarılar, durum)
  const db = await getDb();
  const res = db.exec(`
    SELECT j.pdf_id, j.status, j.page_count, j.detected_question_count, j.summary_json, j.error_message, j.completed_at
    FROM pdf_analysis_jobs j
    WHERE j.created_at = (SELECT MAX(created_at) FROM pdf_analysis_jobs WHERE pdf_id = j.pdf_id)
  `);
  const jobs: Record<string, unknown>[] = [];
  if (res.length) {
    const cols = res[0].columns;
    for (const row of res[0].values) {
      const o: Record<string, unknown> = {};
      cols.forEach((c, i) => { o[c] = row[i]; });
      try { o.summary = JSON.parse(String(o.summary_json || '{}')); } catch { o.summary = {}; }
      delete o.summary_json;
      jobs.push(o);
    }
  }
  return NextResponse.json({ success: true, aiAvailable: Boolean(geminiKey()), jobs });
}

export async function POST(req: NextRequest) {
  try {
    const ct = req.headers.get('content-type') || '';
    if (ct.includes('multipart/form-data')) return await savePage(await req.formData());
    const body = await req.json();
    if (body?.action === 'start') return await start(body);
    if (body?.action === 'finish') return await finish(body);
    return NextResponse.json({ success: false, error: 'Bilinmeyen işlem.' }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[pdf-extract]', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

async function start(body: { pdfId?: string; title?: string; fileName?: string; answerKey?: string }) {
  const pdfId = String(body.pdfId || '');
  if (!pdfId) return NextResponse.json({ success: false, error: 'PDF seçilmedi.' }, { status: 400 });
  const session = await getSession();
  const teacherId = session?.userId || 'teacher-admin';
  const db = await getDb();

  // PDF sunucuda kayıtlı değilse (yalnızca tarayıcıda saklanmışsa) en az bilgiyle kaydı aç
  const st = db.prepare('SELECT id, title, answer_key, question_count FROM pdf_documents WHERE id = ?');
  st.bind([pdfId]);
  let doc: Record<string, unknown> | null = st.step() ? st.getAsObject() : null;
  st.free();
  if (!doc) {
    db.run(
      `INSERT INTO pdf_documents (id, teacher_id, title, file_name, file_path, answer_key) VALUES (?, ?, ?, ?, ?, ?)`,
      [pdfId, teacherId, body.title || 'PDF', body.fileName || 'dokuman.pdf', `/api/pdf-documents/${pdfId}/file`, body.answerKey || '']
    );
    doc = { id: pdfId, title: body.title || 'PDF', answer_key: body.answerKey || '', question_count: null };
  }

  // Önceki çıkarımı temizle (görseller, soru kayıtları, işler)
  db.run('DELETE FROM pdf_question_images WHERE question_id IN (SELECT id FROM pdf_extracted_questions WHERE pdf_id = ?)', [pdfId]);
  db.run('DELETE FROM pdf_extracted_questions WHERE pdf_id = ?', [pdfId]);
  db.run('DELETE FROM pdf_analysis_jobs WHERE pdf_id = ?', [pdfId]);

  const jobId = `job_${safeId(pdfId)}_${Date.now().toString(36)}`;
  db.run(
    `INSERT INTO pdf_analysis_jobs (id, pdf_id, teacher_id, status) VALUES (?, ?, ?, 'processing')`,
    [jobId, pdfId, teacherId]
  );
  saveDb(db);

  const answerKeyRaw = String(doc.answer_key || body.answerKey || '');
  return NextResponse.json({
    success: true,
    jobId,
    title: doc.title,
    answerKey: parseAnswerKey(answerKeyRaw),
    expectedQuestionCount: doc.question_count ?? null,
    aiAvailable: Boolean(geminiKey()),
  });
}

async function savePage(form: FormData) {
  const jobId = String(form.get('jobId') || '');
  const pdfId = String(form.get('pdfId') || '');
  const pageNo = Number(form.get('pageNo') || 0);
  const metas: PageQuestionMeta[] = JSON.parse(String(form.get('meta') || '[]'));
  const answerKey: Record<string, string> = JSON.parse(String(form.get('answerKey') || '{}'));
  if (!jobId || !pdfId || !pageNo) return NextResponse.json({ success: false, error: 'Eksik bilgi.' }, { status: 400 });

  const session = await getSession();
  const db = await getDb();
  ensureDocAndJob(db, pdfId, jobId, session?.userId || 'teacher-admin', String(form.get('title') || ''), String(form.get('fileName') || ''));

  const stamp = Date.now().toString(36);
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO pdf_extracted_questions
    (id, job_id, pdf_id, question_no, page_no, question_text, options_json, correct_answer, primary_topic_id,
     question_type, difficulty, crop_box_json, image_url, confidence, approval_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
  `);
  const imgStmt = db.prepare('INSERT OR REPLACE INTO pdf_question_images (question_id, mime, data) VALUES (?, ?, ?)');

  let saved = 0;
  try {
    for (const m of metas) {
      const file = form.get(`img_${m.seq}`);
      if (!(file instanceof Blob)) continue;
      const mime = ALLOWED_MIME.has(file.type) ? file.type : 'image/jpeg';
      const bytes = new Uint8Array(await file.arrayBuffer());
      const questionId = `ext_${safeId(pdfId)}_${m.seq}`;

      const displayNo = m.questionNo ?? m.seq;
      const keyAnswer = answerKey[String(displayNo)] || null;
      const topic = m.topicId && TOPIC_IDS.has(m.topicId) ? m.topicId : null;
      const crop = { x: m.box.x0 / m.pageW, y: m.box.y0 / m.pageH, w: (m.box.x1 - m.box.x0) / m.pageW, h: (m.box.y1 - m.box.y0) / m.pageH, method: m.method, answerSource: keyAnswer ? 'key' : m.answer ? 'ai' : null };

      stmt.run([
        questionId,
        jobId,
        pdfId,
        displayNo,
        pageNo,
        m.text || '',
        JSON.stringify(m.options || { A: '', B: '', C: '', D: '' }),
        keyAnswer || m.answer || null,
        topic,
        m.hasVisual ? 'geometrik_gorsel' : 'yeni_nesil',
        m.difficulty && m.difficulty >= 1 && m.difficulty <= 5 ? Math.round(m.difficulty) : 3,
        JSON.stringify(crop),
        `/api/lgs/pdf-extract/image/${questionId}?v=${stamp}`,
        Math.max(0, Math.min(1, Number(m.confidence) || 0.5)),
      ]);
      // Görsel, soru satırından sonra yazılır (soru satırının yeniden yazılması görseli silmesin)
      imgStmt.run([questionId, mime, bytes]);
      saved++;
    }
  } finally {
    stmt.free();
    imgStmt.free();
  }
  saveDb(db);
  return NextResponse.json({ success: true, saved });
}

async function finish(body: { jobId?: string; pdfId?: string; pageCount?: number; warnings?: string[]; methodCounts?: Record<string, number>; error?: string }) {
  const jobId = String(body.jobId || '');
  const pdfId = String(body.pdfId || '');
  if (!jobId || !pdfId) return NextResponse.json({ success: false, error: 'Eksik bilgi.' }, { status: 400 });
  const session = await getSession();
  const db = await getDb();
  ensureDocAndJob(db, pdfId, jobId, session?.userId || 'teacher-admin');

  const cnt = db.exec('SELECT COUNT(*), AVG(confidence) FROM pdf_extracted_questions WHERE pdf_id = ?', [pdfId]);
  const count = Number(cnt[0]?.values[0]?.[0] || 0);
  const avgConf = Number(cnt[0]?.values[0]?.[1] || 0);
  const pageCount = Math.max(1, Number(body.pageCount) || 1);
  const status = body.error ? 'error' : 'awaiting_approval';

  db.run(
    `UPDATE pdf_analysis_jobs SET status = ?, page_count = ?, detected_question_count = ?, summary_json = ?, confidence_score = ?, error_message = ?, completed_at = datetime('now') WHERE id = ?`,
    [status, pageCount, count, JSON.stringify({ warnings: body.warnings || [], methodCounts: body.methodCounts || {} }), avgConf, body.error || null, jobId]
  );
  db.run('UPDATE pdf_documents SET page_count = ? WHERE id = ?', [pageCount, pdfId]);
  saveDb(db);
  return NextResponse.json({ success: true, count, pageCount, status });
}
