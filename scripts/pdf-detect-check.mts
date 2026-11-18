// Geliştirici aracı: bir PDF'te otomatik soru bulmanın sonucunu sayfa sayfa yazdırır.
//   node scripts/pdf-detect-check.mts <dosya.pdf>
import fs from 'node:fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { findQuestionMarkers, detectSection, findFooterTop, layoutBoxes, parseAnswerKey, type TItem } from '../src/lib/questionDetect.ts';

const file = process.argv[2];
if (!file) { console.error('PDF yolu verin'); process.exit(2); }
const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(file)), useSystemFonts: false }).promise;
for (let p = 1; p <= doc.numPages; p++) {
  const page = await doc.getPage(p);
  const vp = page.getViewport({ scale: 1 });
  const tc = await page.getTextContent();
  const items: TItem[] = [];
  for (const it of tc.items as { str: string; transform: number[]; width: number }[]) {
    if (!it.str || !it.str.trim()) continue;
    const t = pdfjs.Util.transform(vp.transform, it.transform);
    const h = Math.hypot(t[2], t[3]);
    items.push({ str: it.str, x: t[4], y: t[5] - h, w: it.width, h });
  }
  const key = parseAnswerKey(items);
  const markers = findQuestionMarkers(items, vp.width, vp.height);
  const boxes = layoutBoxes(markers, vp.width, vp.height, findFooterTop(items, vp.width, vp.height));
  const sec = detectSection(items, vp.height);
  console.log(`s${p} ${sec ?? '-'} | ${boxes.map(b => `${b.n}[c${b.col} y${Math.round(b.y / vp.height * 100)}-${Math.round((b.y + b.h) / vp.height * 100)}% x${Math.round(b.x / vp.width * 100)}-${Math.round((b.x + b.w) / vp.width * 100)}%]`).join(' ')}${key.size ? ' | anahtar: ' + [...key].map(([k, v]) => k.replace('Matematik', 'M').replace('Fen Bilimleri', 'F') + v).join(' ') : ''}`);
}
