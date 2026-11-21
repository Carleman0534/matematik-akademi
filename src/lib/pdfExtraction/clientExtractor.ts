'use client';
// Tarayıcıda çalışan PDF → soru çıkarma motoru.
// Her sayfa pdf.js ile çizilir, soru bölgeleri bulunur (metin katmanı / boşluk / isteğe bağlı Gemini),
// her soru PNG olarak kırpılır ve sayfa sayfa sunucuya (/api/lgs/pdf-extract) gönderilir.

import {
  buildInkMask, contentBounds, detectColumns, findQuestionMarkers, regionsFromMarkers, segmentByWhitespace,
  trimHeaderFooter, findVisualMarkers, regionsFromStarts,
  tightenBox, textInBox, parseOptions, stripLeadingNumber, type Box, type TextItemPos, type QuestionRegion,
} from './segmentation.ts';
import { guessTopicId } from './topicGuess.ts';
import { getClientPdfBlob } from '@/lib/clientPdfStorage';

export type ExtractMethod = 'auto' | 'ai';

export interface ExtractProgress {
  message: string;
  page: number;
  totalPages: number;
  found: number;
}

export interface ExtractResult {
  pageCount: number;
  questionCount: number;
  warnings: string[];
  methodCounts: Record<string, number>;
}

const TARGET_WIDTH = 1700;

interface AiQuestion {
  no: number | null;
  box_2d: [number, number, number, number];
  text: string;
  options: Record<string, string> | null;
  answer: string | null;
  topic_id: string | null;
  difficulty: number | null;
  has_visual: boolean;
}

interface Found extends QuestionRegion {
  answer: string | null;
  topicId: string | null;
  difficulty: number | null;
  hasVisual: boolean;
  confidence: number;
}

// PDF'in baytlarını önce tarayıcıdaki kopyadan, yoksa sunucudan alır
export async function loadPdfBytes(pdfId: string): Promise<ArrayBuffer> {
  const local = await getClientPdfBlob(pdfId);
  if (local) return local.arrayBuffer();
  const res = await fetch(`/api/pdf-documents/${encodeURIComponent(pdfId)}/file`);
  if (!res.ok) throw new Error(`PDF dosyası alınamadı (${res.status}).`);
  if (res.headers.get('X-Pdf-Fallback') === '1') {
    throw new Error('Bu PDF\'in dosyası sunucuda bulunamadı. PDF Arşivi\'nden yeniden yükleyin.');
  }
  return res.arrayBuffer();
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) throw new Error(data?.error || `Sunucu hatası (${res.status})`);
  return data as T;
}

const toBlob = (canvas: HTMLCanvasElement, type: string, q?: number) =>
  new Promise<Blob>((res, rej) => canvas.toBlob(b => (b ? res(b) : rej(new Error('Görsel oluşturulamadı.'))), type, q));

function cropCanvas(src: HTMLCanvasElement, box: Box): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(box.x1 - box.x0));
  c.height = Math.max(1, Math.round(box.y1 - box.y0));
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(src, box.x0, box.y0, c.width, c.height, 0, 0, c.width, c.height);
  return c;
}

export async function extractQuestionsFromPdf(opts: {
  pdfId: string;
  title?: string;
  fileName?: string;
  answerKey?: string;
  method: ExtractMethod;
  onProgress?: (p: ExtractProgress) => void;
}): Promise<ExtractResult> {
  const progress = (message: string, page = 0, totalPages = 0, found = 0) => opts.onProgress?.({ message, page, totalPages, found });

  progress('PDF dosyası alınıyor…');
  const bytes = await loadPdfBytes(opts.pdfId);

  const job = await postJson<{ jobId: string; answerKey: Record<string, string>; expectedQuestionCount: number | null; aiAvailable: boolean }>(
    '/api/lgs/pdf-extract',
    { action: 'start', pdfId: opts.pdfId, title: opts.title, fileName: opts.fileName, answerKey: opts.answerKey }
  );
  const useAi = opts.method === 'ai' && job.aiAvailable;
  const warnings: string[] = [];
  const methodCounts: Record<string, number> = {};
  if (opts.method === 'ai' && !job.aiAvailable) warnings.push('Sunucuda GEMINI_API_KEY tanımlı olmadığı için otomatik (yapay zekâsız) yöntem kullanıldı.');

  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes) }).promise;
  const totalPages = doc.numPages;

  let seq = 0;
  let lastNo = 0;
  let total = 0;
  let pagesWithoutText = 0;

  try {
    for (let p = 1; p <= totalPages; p++) {
      progress(`Sayfa ${p}/${totalPages} işleniyor…`, p, totalPages, total);
      const page = await doc.getPage(p);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: Math.min(3, TARGET_WIDTH / base.width) });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('Tarayıcı sayfayı çizemedi.');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvas, canvasContext: ctx, viewport }).promise;
      const W = canvas.width, H = canvas.height;

      // Metin katmanı (taranmış PDF'lerde boş gelir)
      const items: TextItemPos[] = [];
      try {
        const tc = await page.getTextContent();
        for (const raw of tc.items as Array<{ str?: string; transform?: number[]; width?: number }>) {
          if (!raw.str || !raw.transform) continue;
          const t = pdfjs.Util.transform(viewport.transform, raw.transform);
          const h = Math.hypot(t[2], t[3]);
          items.push({ str: raw.str, x: t[4], y: t[5] - h, w: (raw.width || 0) * viewport.scale, h });
        }
      } catch { /* metin katmanı okunamadı */ }
      if (items.length === 0) pagesWithoutText++;

      const mask = buildInkMask(ctx.getImageData(0, 0, W, H).data, W, H);
      let found: Found[] = [];

      // 1) Gemini
      if (useAi) {
        try {
          const jpeg = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
          const ai = await postJson<{ questions: AiQuestion[] }>('/api/lgs/pdf-extract/ai-page', { image: jpeg });
          found = ai.questions.map(q => {
            const [ymin, xmin, ymax, xmax] = q.box_2d;
            const raw: Box = { x0: (xmin / 1000) * W, y0: (ymin / 1000) * H, x1: (xmax / 1000) * W, y1: (ymax / 1000) * H };
            const box = tightenBox(mask, { x0: Math.floor(raw.x0), y0: Math.floor(raw.y0), x1: Math.ceil(raw.x1), y1: Math.ceil(raw.y1) }) || raw;
            return {
              box, questionNo: q.no, text: q.text, options: q.options, method: 'ai' as const,
              answer: q.answer, topicId: q.topic_id || guessTopicId(q.text), difficulty: q.difficulty, hasVisual: q.has_visual,
              confidence: q.options ? 0.88 : 0.8,
            };
          });
        } catch (e) {
          warnings.push(`Sayfa ${p}: yapay zekâ okuyamadı (${e instanceof Error ? e.message : e}); otomatik yöntemle bölündü.`);
        }
      }

      // 2) Metin katmanı + boşluk
      if (found.length === 0) {
        const rawBounds = contentBounds(mask);
        if (rawBounds) {
          const bounds = trimHeaderFooter(mask, rawBounds);
          const columns = detectColumns(mask, bounds);
          const markers = findQuestionMarkers(items, columns, W, H, lastNo);
          const byMarker = regionsFromMarkers(markers, columns, H);
          const visualStarts: number[][] = [];
          columns.forEach((col, ci) => {
            const mine = byMarker.filter(r => r.box.x0 === col.x0);
            if (mine.length > 0 && markers.some(m => m.col === ci)) {
              for (const r of mine) {
                const text = textInBox(items, r.box);
                const { stem, options } = parseOptions(stripLeadingNumber(text, r.no));
                found.push({
                  box: r.box, questionNo: r.no, text: stem, options, method: 'text',
                  answer: null, topicId: guessTopicId(text), difficulty: null, hasVisual: false,
                  confidence: options ? 0.9 : 0.75,
                });
              }
            } else if ((visualStarts[ci] = findVisualMarkers(mask, col)).length > 0) {
              for (const r of regionsFromStarts(visualStarts[ci], col, H)) {
                const text = textInBox(items, r.box);
                const { stem, options } = parseOptions(text);
                found.push({
                  box: r.box, questionNo: null, text: stem, options, method: 'visual',
                  answer: null, topicId: guessTopicId(text), difficulty: null, hasVisual: false,
                  confidence: 0.7,
                });
              }
            } else {
              for (const b of segmentByWhitespace(mask, col)) {
                const text = textInBox(items, b);
                const { stem, options } = parseOptions(text);
                found.push({
                  box: b, questionNo: null, text: stem, options, method: 'whitespace',
                  answer: null, topicId: guessTopicId(text), difficulty: null, hasVisual: false,
                  confidence: 0.5,
                });
              }
            }
          });
        }
      }

      // Kutuları mürekkebe daralt, çok küçükleri at, numarası olmayanlara sıradaki numarayı ver
      const finalList: (Found & { seq: number; no: number })[] = [];
      for (const f of found) {
        const box = f.method === 'ai' ? f.box : tightenBox(mask, {
          x0: Math.max(0, Math.floor(f.box.x0)), y0: Math.max(0, Math.floor(f.box.y0)),
          x1: Math.min(W, Math.ceil(f.box.x1)), y1: Math.min(H, Math.ceil(f.box.y1)),
        });
        if (!box || box.y1 - box.y0 < H * 0.03 || box.x1 - box.x0 < W * 0.15) continue;
        const no = f.questionNo && f.questionNo > lastNo ? f.questionNo : lastNo + 1;
        lastNo = no;
        finalList.push({ ...f, box, seq: ++seq, no, hasVisual: f.hasVisual || (f.method !== 'ai' && f.text.length < 40) });
        methodCounts[f.method] = (methodCounts[f.method] || 0) + 1;
      }

      if (finalList.length === 0) {
        warnings.push(`Sayfa ${p}: soru bulunamadı.`);
      } else {
        if (finalList.some(f => f.method === 'whitespace')) {
          warnings.push(`Sayfa ${p}: soru numarası okunamadı, boşluklara göre bölündü — kırpmaları kontrol edin.`);
        }
        const form = new FormData();
        form.append('jobId', job.jobId);
        form.append('pdfId', opts.pdfId);
        form.append('pageNo', String(p));
        form.append('answerKey', JSON.stringify(job.answerKey || {}));
        form.append('meta', JSON.stringify(finalList.map(f => ({
          seq: f.seq, questionNo: f.no, box: f.box, pageW: W, pageH: H, text: f.text, options: f.options,
          answer: f.answer, topicId: f.topicId, difficulty: f.difficulty, hasVisual: f.hasVisual,
          method: f.method, confidence: f.confidence,
        }))));
        for (const f of finalList) {
          const c = cropCanvas(canvas, f.box);
          form.append(`img_${f.seq}`, await toBlob(c, 'image/png'), `q_${f.seq}.png`);
        }
        const res = await fetch('/api/lgs/pdf-extract', { method: 'POST', body: form });
        const d = await res.json().catch(() => ({}));
        if (!res.ok || d?.success === false) throw new Error(d?.error || `Sayfa ${p} kaydedilemedi (${res.status}).`);
        total += finalList.length;
      }

      page.cleanup();
      canvas.width = canvas.height = 0;
    }

    if (pagesWithoutText === totalPages && !useAi) {
      warnings.unshift('PDF\'te metin katmanı yok (taranmış belge): sorular görselden bölündü, soru metni ve şıklar okunamadı (görselde duruyorlar). Metin ve konu için yapay zekâ yöntemini kullanabilirsiniz.');
    }
    const keyCount = Object.keys(job.answerKey || {}).length;
    if (keyCount > 0 && keyCount !== total) warnings.push(`Cevap anahtarında ${keyCount} soru var, ${total} soru tespit edildi.`);
    else if (job.expectedQuestionCount && Number(job.expectedQuestionCount) !== total && keyCount === 0) {
      warnings.push(`PDF bilgisinde ${job.expectedQuestionCount} soru yazıyor, ${total} soru tespit edildi.`);
    }
    if (keyCount === 0) warnings.push('Cevap anahtarı girilmemiş: onaylamadan önce her sorunun doğru cevabını seçin.');

    await postJson('/api/lgs/pdf-extract', { action: 'finish', jobId: job.jobId, pdfId: opts.pdfId, pageCount: totalPages, warnings, methodCounts });
    progress('Tamamlandı', totalPages, totalPages, total);
    return { pageCount: totalPages, questionCount: total, warnings, methodCounts };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await postJson('/api/lgs/pdf-extract', { action: 'finish', jobId: job.jobId, pdfId: opts.pdfId, pageCount: totalPages, warnings, methodCounts, error: msg }).catch(() => {});
    throw err;
  } finally {
    await doc.loadingTask.destroy();
  }
}
