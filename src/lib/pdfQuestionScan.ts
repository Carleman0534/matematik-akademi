'use client';
// Tarayıcıda PDF'ten soru bulma: pdf.js metin katmanı + çizilmiş sayfanın pikselleri (kurallar: questionDetect.ts)
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import {
  findQuestionMarkers, detectSection, findFooterTop, layoutBoxes, lastInkRow, segmentByGaps, parseAnswerKey,
  type TItem, type Letter,
} from './questionDetect.ts';

export interface FoundBox { n: number; section: string | null; correct: Letter | null; x: number; y: number; width: number; height: number } // yüzde
export interface DocScan {
  hasText: boolean;                        // en az bir sayfada soru numarası bulundu
  answerKey: Map<string, Letter>;
  pages: Map<number, { section: string | null; count: number }>;
  firstQuestionPage: number;
  sections: { name: string; count: number }[];
}

async function pageItems(page: PDFPageProxy): Promise<{ items: TItem[]; W: number; H: number }> {
  const pdfjs = await import('pdfjs-dist');
  const vp = page.getViewport({ scale: 1 });
  const tc = await page.getTextContent();
  const items: TItem[] = [];
  for (const raw of tc.items) {
    const it = raw as { str?: string; transform?: number[]; width?: number };
    if (!it.str || !it.str.trim() || !it.transform) continue;
    const t = pdfjs.Util.transform(vp.transform, it.transform);
    const h = Math.hypot(t[2], t[3]);
    items.push({ str: it.str, x: t[4], y: t[5] - h, w: it.width || 0, h });
  }
  return { items, W: vp.width, H: vp.height };
}

// Bütün sayfaların metnini bir kez okur: hangi sayfada soru var, bölümler, cevap anahtarı
export async function scanDocument(doc: PDFDocumentProxy, onProgress?: (p: number, total: number) => void): Promise<DocScan> {
  const answerKey = new Map<string, Letter>();
  const pages = new Map<number, { section: string | null; count: number }>();
  const secCount = new Map<string, number>();
  let lastSection: string | null = null;
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const { items, W, H } = await pageItems(page);
    parseAnswerKey(items).forEach((v, k) => { if (!answerKey.has(k)) answerKey.set(k, v); });
    const markers = findQuestionMarkers(items, W, H);
    const section: string | null = markers.length ? (detectSection(items, H) ?? lastSection) : null;
    if (markers.length) { lastSection = section; if (section) secCount.set(section, (secCount.get(section) || 0) + markers.length); }
    pages.set(p, { section, count: markers.length });
    page.cleanup();
    onProgress?.(p, doc.numPages);
  }
  const withQ = [...pages].filter(([, v]) => v.count > 0).map(([p]) => p);
  return { hasText: withQ.length > 0, answerKey, pages, firstQuestionPage: withQ[0] || 1, sections: [...secCount].map(([name, count]) => ({ name, count })) };
}

// Koyu piksel = yazı / şekil çizgisi (açık pembe filigran, açık renkli zeminler sayılmaz)
function rowInk(ctx: CanvasRenderingContext2D, x0: number, x1: number, y0: number, y1: number): Uint16Array {
  const w = Math.max(1, Math.floor(x1 - x0)), h = Math.max(1, Math.floor(y1 - y0));
  const data = ctx.getImageData(Math.floor(x0), Math.floor(y0), w, h).data;
  const rows = new Uint16Array(h);
  for (let y = 0; y < h; y++) {
    let c = 0;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2] < 150) c++;
    }
    rows[y] = c;
  }
  return rows;
}

// Bir sayfadaki soru kutuları. Sayfa önce `canvas`a çizilmiş olmalı (sayfa genişliğiyle orantılı herhangi bir ölçekte).
export async function detectPageBoxes(page: PDFPageProxy, canvas: HTMLCanvasElement, scan: DocScan, pageNo: number): Promise<FoundBox[]> {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];
  const { items, W, H } = await pageItems(page);
  const k = canvas.width / W;
  const pct = (b: { x: number; y: number; w: number; h: number }) => ({ x: (b.x / canvas.width) * 100, y: (b.y / canvas.height) * 100, width: (b.w / canvas.width) * 100, height: (b.h / canvas.height) * 100 });

  if (scan.hasText) {
    const markers = findQuestionMarkers(items, W, H);
    if (!markers.length) return []; // kapak, boş sayfa, açıklama sayfası: atla
    const section = scan.pages.get(pageNo)?.section ?? detectSection(items, H);
    const boxes = layoutBoxes(markers, W, H, findFooterTop(items, W, H));
    const out: FoundBox[] = [];
    for (const b of boxes) {
      const px = { x: b.x * k, y: b.y * k, w: b.w * k, h: b.h * k };
      // Alt boşluğu kırp: sütun kenarındaki ayırıcı çizgiye takılmamak için kenarlardan içeride say
      const inset = canvas.width * 0.012;
      const rows = rowInk(ctx, px.x + inset, px.x + px.w - inset, px.y, px.y + px.h);
      const last = lastInkRow(rows, Math.max(2, Math.round(px.w * 0.003)));
      if (last < 0) continue; // tamamen boş
      const pad = canvas.height * 0.012;
      px.h = Math.min(px.h, last + pad);
      out.push({ n: b.n, section, correct: scan.answerKey.get(`${section || ''}|${b.n}`) ?? null, ...pct(px) });
    }
    return out;
  }

  // Metin katmanı yok (taranmış): üst/alt bilgi dışını, sütunlara ve aralarındaki boşluklara göre böl
  const cw = canvas.width, ch = canvas.height;
  const y0 = ch * 0.06, y1 = ch * 0.93;
  const midRows = rowInk(ctx, cw * 0.48, cw * 0.52, y0, y1);
  const busyMid = Array.from(midRows).filter(c => c > 1).length / midRows.length;
  const cols = busyMid < 0.08 ? [[cw * 0.04, cw * 0.48], [cw * 0.52, cw * 0.96]] : [[cw * 0.04, cw * 0.96]];
  const out: FoundBox[] = [];
  for (const [cx0, cx1] of cols) {
    const rows = rowInk(ctx, cx0, cx1, y0, y1);
    const blocks = segmentByGaps(rows, Math.max(2, Math.round((cx1 - cx0) * 0.003)), Math.round(ch * 0.03), Math.round(ch * 0.04));
    for (const [s, e] of blocks) {
      const pad = ch * 0.008;
      out.push({ n: 0, section: null, correct: null, ...pct({ x: cx0, y: y0 + s - pad, w: cx1 - cx0, h: e - s + 2 * pad }) });
    }
  }
  return out;
}
