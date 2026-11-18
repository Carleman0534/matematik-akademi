'use client';
// PDF analizi (tarayıcıda): soruları bul → kırp → parmak izi → havuz kovasına yükle → toplu kaydet.
// İş durumu veritabanında tutulur (pdf_analysis_jobs); aynı PDF aynı anda iki kez analiz edilemez.
import { supabaseBrowser } from '@/lib/supabase/client';
import { POOL_BUCKET } from '@/lib/env';
import { scanDocument, detectPageBoxes } from '@/lib/pdfQuestionScan';
import { dhashHex } from '@/lib/pool';
import { guessTopic, resolveTopicId, selectMathPages, type TopicRow } from '@/lib/topicGuess';
import { startAnalysis, savePoolBatch, finishAnalysis, removePoolImages, type PoolInput } from '@/app/ogretmen/pdf-arsivi/actions';

export interface AnalyzeTarget { id: string; title: string; url: string; option_count: number }

function cropToBlob(src: HTMLCanvasElement, b: { x: number; y: number; width: number; height: number }): Promise<{ blob: Blob; width: number; height: number; hash: string }> {
  const x = Math.max(0, Math.floor(b.x / 100 * src.width)), y = Math.max(0, Math.floor(b.y / 100 * src.height));
  const w = Math.max(10, Math.min(src.width - x, Math.floor(b.width / 100 * src.width))), h = Math.max(10, Math.min(src.height - y, Math.floor(b.height / 100 * src.height)));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
  ctx.drawImage(src, x, y, w, h, 0, 0, w, h);
  // 17x16 gri küçük kopya → parmak izi
  const t = document.createElement('canvas'); t.width = 17; t.height = 16;
  const tc = t.getContext('2d', { willReadFrequently: true })!;
  tc.drawImage(c, 0, 0, 17, 16);
  const px = tc.getImageData(0, 0, 17, 16).data;
  const gray = new Array(17 * 16);
  for (let i = 0; i < gray.length; i++) gray[i] = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2];
  return new Promise((res, rej) => c.toBlob(bl => bl ? res({ blob: bl, width: w, height: h, hash: dhashHex(gray) }) : rej(new Error('Görsel oluşturulamadı.')), 'image/jpeg', 0.88));
}

export async function analyzePdf(target: AnalyzeTarget, teacherId: string, onProgress: (msg: string) => void): Promise<{ error?: string; saved: number; detected: number; note?: string }> {
  const job = await startAnalysis(target.id);
  if (job.error || !job.id) return { error: job.error || 'Analiz başlatılamadı.', saved: 0, detected: 0 };
  const jobId = job.id;
  const stats = { method: 'text' as 'text' | 'gaps', pages: 0, detected: 0, saved: 0, skippedPages: 0, answerKeys: 0 };
  const uploaded: string[] = [];
  try {
    onProgress('PDF indiriliyor…');
    const res = await fetch(target.url);
    if (!res.ok) throw new Error('PDF indirilemedi (bağlantının süresi dolmuş olabilir, sayfayı yenileyin).');
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
    const doc = await pdfjs.getDocument({ data: new Uint8Array(await res.arrayBuffer()) }).promise;
    stats.pages = doc.numPages;
    const scan = await scanDocument(doc, (d, t) => onProgress(`Sayfalar okunuyor ${d}/${t}`));
    stats.method = scan.hasText ? 'text' : 'gaps';
    stats.answerKeys = scan.answerKey.size;
    const sb = supabaseBrowser();
    // Yalnızca matematik bölümü: LGS kitapçığında Türkçe, Fen vb. sayfalar atlanır
    const sel = selectMathPages(new Map([...scan.pages].map(([p, v]) => [p, v.section])));
    if (scan.hasText && sel.found.length && !sel.hasMath) {
      await finishAnalysis(jobId, target.id, stats);
      return { saved: 0, detected: 0, note: `Matematik bölümü bulunamadı (bulunan bölümler: ${sel.found.join(', ')}); hiçbir soru alınmadı.` };
    }
    const { data: topicRows } = await sb.from('topics').select('id, parent_id, name, grade_level');
    const topics = (topicRows || []) as TopicRow[];
    let guessed = 0, noTopic = 0;
    const otherSections = new Set<string>();
    let batch: PoolInput[] = [];
    let seq = 0;
    const flush = async () => {
      if (!batch.length) return;
      const r = await savePoolBatch(jobId, target.id, target.title, batch);
      if (r.error) throw new Error(r.error);
      stats.saved += r.saved;
      if (r.skipped.length) await removePoolImages(r.skipped); // zaten havuzda olan sorunun yeni görseli gereksiz
      batch = [];
    };
    for (let p = 1; p <= doc.numPages; p++) {
      if (scan.hasText && !scan.pages.get(p)?.count) { stats.skippedPages++; continue; }
      if (scan.hasText && !sel.keep.has(p)) { stats.skippedPages++; const sc = scan.pages.get(p)?.section; if (sc) otherSections.add(sc); continue; }
      onProgress(`Sayfa ${p}/${doc.numPages} · ${stats.detected} soru bulundu`);
      const page = await doc.getPage(p);
      const vp1 = page.getViewport({ scale: 1 });
      const vp = page.getViewport({ scale: 1400 / vp1.width });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(vp.width); canvas.height = Math.ceil(vp.height);
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvas, canvasContext: ctx, viewport: vp }).promise;
      const boxes = await detectPageBoxes(page, canvas, scan, p);
      if (!boxes.length) { stats.skippedPages++; page.cleanup(); continue; }
      for (const b of boxes) {
        const crop = await cropToBlob(canvas, b);
        const path = `${teacherId}/${crypto.randomUUID()}.jpg`;
        const up = await sb.storage.from(POOL_BUCKET).upload(path, crop.blob, { contentType: 'image/jpeg', upsert: false });
        if (up.error) throw new Error(`Görsel yüklenemedi: ${up.error.message}`);
        uploaded.push(path);
        stats.detected++;
        const topic_id = resolveTopicId(guessTopic(b.text || ''), topics);
        if (topic_id) guessed++; else noTopic++;
        batch.push({
          topic_id,
          page_no: p, question_no: b.n || ++seq, section: b.section || '', image_path: path, width: crop.width, height: crop.height,
          correct: b.correct, option_count: target.option_count, detect_method: stats.method,
          confidence: stats.method === 'text' ? 0.9 : 0.5, image_hash: crop.hash,
        });
        if (batch.length >= 20) await flush();
      }
      page.cleanup();
    }
    await flush();
    await doc.loadingTask.destroy();
    onProgress('Benzer sorular kontrol ediliyor…');
    const fin = await finishAnalysis(jobId, target.id, stats);
    const parts = [`${guessed} sorunun konusu otomatik seçildi`, `${noTopic} soru konusuz (elle seçilecek)`];
    if (otherSections.size) parts.push(`matematik dışı bölümler atlandı: ${[...otherSections].join(', ')}`);
    return { error: fin.error, saved: stats.saved, detected: stats.detected, note: parts.join(' · ') };
  } catch (e) {
    const msg = (e as Error).message || 'Bilinmeyen hata';
    await finishAnalysis(jobId, target.id, stats, msg);
    return { error: msg, saved: stats.saved, detected: stats.detected };
  }
}
