// PDF sayfa görselini soru bölgelerine ayıran saf (tarayıcı/DOM bağımsız) fonksiyonlar.
// İki yöntem:
//  1) Metin katmanı: PDF'in içindeki yazılardan soru numaralarını ("5." / "5)" / sol kenardaki "5") bulur,
//     her numaradan bir sonrakine kadar olan alanı soru sayar ve soru metnini/şıkları da okur.
//  2) Boşluk: metin katmanı yoksa (taranmış PDF) satır satır mürekkep yoğunluğuna bakar, büyük beyaz
//     boşluklardan böler.
// Koordinatlar sayfa görselinin pikselleridir (sol üst köşe 0,0).

export interface Box { x0: number; y0: number; x1: number; y1: number }

export interface TextItemPos {
  str: string;
  x: number;   // sol
  y: number;   // üst
  w: number;
  h: number;
}

export interface QuestionRegion {
  box: Box;
  questionNo: number | null;
  text: string;
  options: Record<string, string> | null;
  method: 'text' | 'visual' | 'whitespace' | 'ai';
}

export interface InkMask {
  data: Uint8Array; // 1 = koyu piksel
  width: number;
  height: number;
}

const INK_THRESHOLD = 200;   // 0-255 parlaklık; altı "mürekkep"

// RGBA piksel verisinden koyu piksel maskesi
export function buildInkMask(rgba: Uint8ClampedArray | Uint8Array, width: number, height: number): InkMask {
  const data = new Uint8Array(width * height);
  for (let i = 0, p = 0; i < data.length; i++, p += 4) {
    const lum = (rgba[p] * 299 + rgba[p + 1] * 587 + rgba[p + 2] * 114) / 1000;
    data[i] = lum < INK_THRESHOLD ? 1 : 0;
  }
  const mask = { data, width, height };
  removeRuleLines(mask);
  return mask;
}

// Sayfa çerçevesi, sütun ayırıcı ve soru arası yatay çizgileri maskeden siler (boşluk sayılsınlar)
export function removeRuleLines(mask: InkMask): void {
  const { data, width: w, height: h } = mask;
  const rowCounts = new Int32Array(h), colCounts = new Int32Array(w);
  for (let y = 0; y < h; y++) {
    const off = y * w;
    for (let x = 0; x < w; x++) if (data[off + x]) { rowCounts[y]++; colCounts[x]++; }
  }
  for (let y = 0; y < h; y++) if (rowCounts[y] > w * 0.6) data.fill(0, y * w, (y + 1) * w);
  for (let x = 0; x < w; x++) if (colCounts[x] > h * 0.6) for (let y = 0; y < h; y++) data[y * w + x] = 0;

  // Kenar boşluklarındaki süs şeritleri (ör. köşedeki kalın renkli çubuk): sol/sağ %6'lık şeritte uzun dikey
  // parçalar ve üst/alt %6'lık şeritte uzun yatay parçalar silinir. Sayfa içindeki şekillere dokunulmaz.
  const mx = Math.round(w * 0.06), my = Math.round(h * 0.06);
  const minV = h * 0.03, minH = w * 0.05;
  const clearV = (x: number) => {
    let s = -1;
    for (let y = 0; y <= h; y++) {
      const on = y < h && data[y * w + x] === 1;
      if (on && s < 0) s = y;
      if (!on && s >= 0) { if (y - s >= minV) for (let k = s; k < y; k++) data[k * w + x] = 0; s = -1; }
    }
  };
  const clearH = (y: number) => {
    let s = -1;
    const off = y * w;
    for (let x = 0; x <= w; x++) {
      const on = x < w && data[off + x] === 1;
      if (on && s < 0) s = x;
      if (!on && s >= 0) { if (x - s >= minH) data.fill(0, off + s, off + x); s = -1; }
    }
  };
  for (let x = 0; x < mx; x++) { clearV(x); clearV(w - 1 - x); }
  for (let y = 0; y < my; y++) { clearH(y); clearH(h - 1 - y); }

  // En dış kenar şeridi (süs uçları, kesim izleri) içerik sayılmaz
  const ex = Math.round(w * 0.035), ey = Math.round(h * 0.02);
  for (let y = 0; y < h; y++) {
    const off = y * w;
    if (y < ey || y >= h - ey) { data.fill(0, off, off + w); continue; }
    data.fill(0, off, off + ex);
    data.fill(0, off + w - ex, off + w);
  }
}

function rowInk(mask: InkMask, box: Box): Int32Array {
  const out = new Int32Array(box.y1 - box.y0);
  for (let y = box.y0; y < box.y1; y++) {
    let c = 0;
    const off = y * mask.width;
    for (let x = box.x0; x < box.x1; x++) c += mask.data[off + x];
    out[y - box.y0] = c;
  }
  return out;
}

function colInk(mask: InkMask, box: Box): Int32Array {
  const out = new Int32Array(box.x1 - box.x0);
  for (let y = box.y0; y < box.y1; y++) {
    const off = y * mask.width;
    for (let x = box.x0; x < box.x1; x++) out[x - box.x0] += mask.data[off + x];
  }
  return out;
}

// Mürekkep içeren satır/sütun mu? (Çerçeve ve ayırıcı çizgiler removeRuleLines ile önceden silinir;
// burada oran sınırı konmaz, çünkü iki yana yaslı metin satırları sütunu tamamen doldurabilir.)
const isInk = (count: number) => count >= 2;

// Sayfadaki içerik sınırları (çerçeve çizgileri ve boş kenarlar hariç)
export function contentBounds(mask: InkMask): Box | null {
  const full: Box = { x0: 0, y0: 0, x1: mask.width, y1: mask.height };
  const rows = rowInk(mask, full);
  const cols = colInk(mask, full);
  let y0 = -1, y1 = -1, x0 = -1, x1 = -1;
  for (let i = 0; i < rows.length; i++) if (isInk(rows[i])) { if (y0 < 0) y0 = i; y1 = i + 1; }
  for (let i = 0; i < cols.length; i++) if (isInk(cols[i])) { if (x0 < 0) x0 = i; x1 = i + 1; }
  if (y0 < 0 || x0 < 0) return null;
  return { x0, y0, x1, y1 };
}

// İki sütunlu sayfa mı? Ortadaki dikey boşluğu ya da ayırıcı çizgiyi arar.
export function detectColumns(mask: InkMask, bounds: Box): Box[] {
  const w = bounds.x1 - bounds.x0;
  const h = bounds.y1 - bounds.y0;
  if (w < 200 || h < 200) return [bounds];
  const cols = colInk(mask, bounds);
  const from = Math.floor(w * 0.35), to = Math.ceil(w * 0.65);
  const minGap = Math.max(6, Math.round(mask.width * 0.012));
  let best: { s: number; e: number } | null = null;
  let start = -1;
  for (let i = from; i <= to; i++) {
    const blank = i < to && !isInk(cols[i]);
    if (blank) { if (start < 0) start = i; }
    else if (start >= 0) {
      if (i - start >= minGap && (!best || i - start > best.e - best.s)) best = { s: start, e: i };
      start = -1;
    }
  }
  if (!best) return [bounds];
  // Her iki tarafta da anlamlı içerik olmalı
  let left = 0, right = 0;
  for (let i = 0; i < best.s; i++) if (isInk(cols[i])) left++;
  for (let i = best.e; i < w; i++) if (isInk(cols[i])) right++;
  if (left < w * 0.12 || right < w * 0.12) return [bounds];
  const mid = bounds.x0 + Math.round((best.s + best.e) / 2);
  return [
    { x0: bounds.x0, y0: bounds.y0, x1: mid, y1: bounds.y1 },
    { x0: mid, y0: bounds.y0, x1: bounds.x1, y1: bounds.y1 },
  ];
}

// Bir alanı içindeki mürekkebin sınırlarına daraltır (kenar payı bırakarak)
export function tightenBox(mask: InkMask, box: Box, pad = 10): Box | null {
  const rows = rowInk(mask, box);
  const cols = colInk(mask, box);
  let y0 = -1, y1 = -1, x0 = -1, x1 = -1;
  for (let i = 0; i < rows.length; i++) if (isInk(rows[i])) { if (y0 < 0) y0 = i; y1 = i + 1; }
  for (let i = 0; i < cols.length; i++) if (isInk(cols[i])) { if (x0 < 0) x0 = i; x1 = i + 1; }
  if (y0 < 0 || x0 < 0) return null;
  return {
    x0: Math.max(0, box.x0 + x0 - pad),
    y0: Math.max(0, box.y0 + y0 - pad),
    x1: Math.min(mask.width, box.x0 + x1 + pad),
    y1: Math.min(mask.height, box.y0 + y1 + pad),
  };
}

interface Run { s: number; e: number }

// Satır bloklarını bulur (en az `minGap` piksel boş satırla ayrılan mürekkepli şeritler)
function inkRuns(rows: Int32Array, minGap: number): Run[] {
  const out: Run[] = [];
  let s = -1, last = -1;
  for (let i = 0; i < rows.length; i++) {
    if (!isInk(rows[i])) continue;
    if (s < 0) s = i;
    else if (i - last - 1 >= minGap) { out.push({ s, e: last + 1 }); s = i; }
    last = i;
  }
  if (s >= 0) out.push({ s, e: last + 1 });
  return out;
}

// Sayfanın üstündeki başlık şeridini ve altındaki sayfa numarası / süs şeridini içerik sınırından çıkarır
export function trimHeaderFooter(mask: InkMask, bounds: Box): Box {
  const H = mask.height;
  const blocks = inkRuns(rowInk(mask, bounds), Math.max(4, Math.round(H * 0.006))).map(r => ({ s: bounds.y0 + r.s, e: bounds.y0 + r.e }));
  const out = { ...bounds };
  // Başlık/sayfa numarası metin gibi sola hizalı değildir (ortalanmış ya da sağdadır)
  const extent = (s: number, e: number) => {
    const cols = colInk(mask, { x0: bounds.x0, x1: bounds.x1, y0: s, y1: e });
    let a = 0, b = cols.length - 1;
    while (a < cols.length && !isInk(cols[a])) a++;
    while (b > a && !isInk(cols[b])) b--;
    return { lx: a, center: bounds.x0 + (a + b) / 2 };
  };
  const notLeftAligned = (s: number, e: number) => extent(s, e).lx > mask.width * 0.15;
  // Sayfanın en altındaki, sayfa ortasına hizalı ince şerit (ör. ortasında sayfa numarası olan çizgi)
  const centeredStrip = (s: number, e: number) => Math.abs(extent(s, e).center - mask.width / 2) < mask.width * 0.1;
  if (blocks.length > 1) {
    const f = blocks[0];
    if (f.e < H * 0.1 && f.e - f.s < H * 0.05 && notLeftAligned(f.s, f.e)) out.y0 = blocks[1].s;
    const l = blocks[blocks.length - 1];
    const isFooter = (l.s > H * 0.85 && l.e - l.s < H * 0.07 && notLeftAligned(l.s, l.e))
      || (l.s > H * 0.905 && l.e - l.s < H * 0.04 && centeredStrip(l.s, l.e));
    if (isFooter) {
      const prev = blocks[blocks.length - 2];
      if (prev.e > out.y0) out.y1 = prev.e;
    }
  }
  return out;
}

// ---------- Görsel numara hizası (taranmış PDF) ----------
// LGS kitapçıklarında soru numarası en solda, metin ise biraz içeriden başlar ("asılı numara").
// Bir satırın en solunda dar bir mürekkep parçası (ör. "12."), ardından boşluk ve içeriden başlayan metin
// varsa o satır yeni bir sorunun başlangıcıdır. Sorunun Y koordinatlarını döner.
export function findVisualMarkers(mask: InkMask, col: Box): number[] {
  const W = mask.width, H = mask.height;
  const lines = inkRuns(rowInk(mask, col), 2).filter(l => l.e - l.s >= H * 0.006);
  const smallGap = Math.max(3, Math.round(W * 0.006));
  const sliceH = Math.round(H * 0.015);
  const info = lines.map(l => {
    // Numara satırı yanındaki bir şekle yapışık olabilir: yalnızca bloğun ilk satır yüksekliğine bak
    const prof = colInk(mask, { x0: col.x0, x1: col.x1, y0: col.y0 + l.s, y1: col.y0 + Math.min(l.e, l.s + sliceH) });
    let a = -1;
    for (let i = 0; i < prof.length; i++) if (prof[i] > 0) { a = i; break; }
    if (a < 0) return null;
    let b = a, gap = 0;
    for (let i = a; i < prof.length; i++) {
      if (prof[i] > 0) { b = i + 1; gap = 0; } else if (++gap > smallGap) break;
    }
    let c = -1;
    for (let i = b; i < prof.length; i++) if (prof[i] > 0) { c = i; break; }
    return { y: col.y0 + l.s, lx: col.x0 + a, firstEnd: col.x0 + b, next: c < 0 ? -1 : col.x0 + c, textLike: l.e - l.s <= H * 0.045 };
  }).filter((x): x is { y: number; lx: number; firstEnd: number; next: number; textLike: boolean } => x !== null);
  const textLines = info.filter(i => i.textLike);
  if (textLines.length < 3) return [];

  const L = Math.min(...info.map(i => i.lx));
  const indent = W * 0.015;
  // Metin satırlarının çoğu içeriden başlamıyorsa bu düzen yok demektir
  if (textLines.filter(i => i.lx > L + indent).length < textLines.length * 0.5) return [];

  return info
    .filter(i => i.lx <= L + W * 0.008
      && i.firstEnd - i.lx <= W * 0.04
      && i.next > 0
      && i.next >= L + indent
      && i.next - i.firstEnd >= W * 0.006)
    .map(i => i.y);
}

// Soru başlangıç Y'lerinden sütun içi bölgeler
// (starts artan sırada olmalı; dönen `index` hangi başlangıca ait olduğunu söyler)
export function regionsFromStarts(starts: number[], col: Box, pageH: number): { box: Box; index: number }[] {
  const out: { box: Box; index: number }[] = [];
  const pad = Math.round(pageH * 0.006);
  starts.forEach((y, i) => {
    let y0 = Math.max(col.y0, y - pad);
    // Sütunun başında ilk numaradan önce büyük bir içerik varsa (ortak öncül) ilk soruya kat
    if (i === 0 && y - col.y0 > pageH * 0.08) y0 = col.y0;
    const y1 = i + 1 < starts.length ? starts[i + 1] - pad : col.y1;
    if (y1 - y0 > pageH * 0.02) out.push({ box: { x0: col.x0, y0, x1: col.x1, y1 }, index: i });
  });
  return out;
}

// ---------- Boşluk yöntemi ----------

// Sütunu mürekkepli bloklara ayırır, ardından büyük boşluklardan soru bölgeleri oluşturur
export function segmentByWhitespace(mask: InkMask, column: Box): Box[] {
  const rows = rowInk(mask, column);
  const minGap = Math.max(4, Math.round(mask.height * 0.006));
  const blocks: Run[] = [];
  let start = -1, lastInk = -1;
  for (let i = 0; i < rows.length; i++) {
    if (isInk(rows[i])) {
      if (start < 0) start = i;
      else if (i - lastInk - 1 >= minGap) { blocks.push({ s: start, e: lastInk + 1 }); start = i; }
      lastInk = i;
    }
  }
  if (start >= 0) blocks.push({ s: start, e: lastInk + 1 });

  // Sayfanın en üst/alt şeridindeki küçük bloklar başlık / sayfa numarasıdır
  const minH = mask.height * 0.045;
  while (blocks.length > 1 && column.y0 + blocks[0].e < mask.height * 0.05 && blocks[0].e - blocks[0].s < minH) blocks.shift();
  while (blocks.length > 1) {
    const last = blocks[blocks.length - 1];
    if (column.y0 + last.s > mask.height * 0.94 && last.e - last.s < minH) blocks.pop(); else break;
  }
  if (blocks.length === 0) return [];

  const gaps = blocks.slice(1).map((b, i) => b.s - blocks[i].e);
  const sorted = [...gaps].sort((a, b) => a - b);
  const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
  const maxGap = sorted.length ? sorted[sorted.length - 1] : 0;
  const threshold = Math.max(mask.height * 0.035, median * 2.2, maxGap * 0.55);

  const groups: Run[] = [{ ...blocks[0] }];
  for (let i = 1; i < blocks.length; i++) {
    if (gaps[i - 1] >= threshold) groups.push({ ...blocks[i] });
    else groups[groups.length - 1].e = blocks[i].e;
  }

  // Çok küçük gruplar: sayfanın en üstü/altındaysa başlık/sayfa numarası (atılır), değilse komşuya eklenir
  const result: Run[] = [];
  groups.forEach((g, i) => {
    const h = g.e - g.s;
    if (h >= minH) { result.push({ ...g }); return; }
    const isEdge = i === 0 || i === groups.length - 1;
    if (isEdge && groups.length > 1) return;
    if (result.length) result[result.length - 1].e = g.e;
    else if (groups[i + 1]) groups[i + 1].s = g.s;
    else result.push({ ...g });
  });

  return result.map(r => ({ x0: column.x0, y0: column.y0 + r.s, x1: column.x1, y1: column.y0 + r.e }));
}

// ---------- Metin katmanı yöntemi ----------

export interface Marker { no: number; x: number; y: number; col: number }

const NUM_ONLY = /^\s*(\d{1,3})\s*[.)]?\s*$/;
const NUM_WITH_TEXT = /^\s*(\d{1,3})\s*[.)]\s+\S/;

function itemsInColumn(items: TextItemPos[], col: Box) {
  return items.filter(it => {
    const cx = it.x + Math.min(it.w, 20) / 2;
    const cy = it.y + it.h / 2;
    return cx >= col.x0 && cx < col.x1 && cy >= col.y0 && cy < col.y1;
  });
}

// Soru numarası adaylarını bulur ve artan bir diziye indirger
export function findQuestionMarkers(items: TextItemPos[], columns: Box[], pageW: number, pageH: number, lastNo = 0): Marker[] {
  const heights = items.filter(i => i.str.trim()).map(i => i.h).sort((a, b) => a - b);
  const medianH = heights.length ? heights[Math.floor(heights.length / 2)] : 10;
  const cands: Marker[] = [];

  columns.forEach((col, ci) => {
    const inCol = itemsInColumn(items, col);
    const leftEdge = Math.min(...inCol.filter(i => i.str.trim()).map(i => i.x), col.x1);
    for (const it of inCol) {
      const s = it.str;
      const m = s.match(NUM_ONLY) || s.match(NUM_WITH_TEXT);
      if (!m) continue;
      if (it.y < pageH * 0.03 || it.y > pageH * 0.94) continue; // başlık/sayfa numarası bölgesi
      if (it.x - leftEdge > pageW * 0.05) continue;              // satır başında değil
      if (it.h < medianH * 0.8) continue;                         // dipnot/üs gibi küçük yazı
      // Aynı satırda solunda başka yazı olmamalı
      const hasLeft = inCol.some(o => o !== it && o.str.trim() && Math.abs(o.y - it.y) < medianH * 0.6 && o.x + o.w <= it.x + 1 && it.x - o.x < pageW * 0.3);
      if (hasLeft) continue;
      const pureNumber = NUM_ONLY.test(s) && !/[.)]/.test(s);
      if (pureNumber) {
        // Noktasız tek sayı: hemen sağında aynı satırda yazı ya da bir alt satırda içerik olmalı
        const follows = inCol.some(o => o !== it && o.str.trim() && Math.abs(o.y - it.y) < medianH && o.x > it.x + it.w - 1);
        if (!follows) continue;
      }
      cands.push({ no: Number(m[1]), x: it.x, y: it.y, col: ci });
    }
  });

  // Okuma sırası: sütun, sonra yukarıdan aşağı
  cands.sort((a, b) => a.col - b.col || a.y - b.y);
  // Aynı noktadaki tekrarları ele
  const uniq = cands.filter((c, i) => i === 0 || !(c.col === cands[i - 1].col && Math.abs(c.y - cands[i - 1].y) < 2 && c.no === cands[i - 1].no));

  // En uzun artan dizi (adımlar 1–3 arası), önceki sayfanın son numarasından büyük
  const n = uniq.length;
  if (n === 0) return [];
  const len = new Array(n).fill(0), prev = new Array(n).fill(-1);
  for (let i = 0; i < n; i++) {
    if (uniq[i].no <= lastNo) continue;
    len[i] = 1;
    for (let j = 0; j < i; j++) {
      if (len[j] > 0) {
        const step = uniq[i].no - uniq[j].no;
        if (step >= 1 && step <= 3 && len[j] + 1 > len[i]) { len[i] = len[j] + 1; prev[i] = j; }
      }
    }
  }
  let bestI = -1;
  for (let i = 0; i < n; i++) {
    if (len[i] === 0) continue;
    if (bestI < 0 || len[i] > len[bestI] || (len[i] === len[bestI] && uniq[i].no - len[i] < uniq[bestI].no - len[bestI])) bestI = i;
  }
  const chain: Marker[] = [];
  for (let i = bestI; i >= 0; i = prev[i]) chain.unshift(uniq[i]);
  return chain;
}

// Bir alandaki yazıları satırlara dizip düz metin yapar
export function textInBox(items: TextItemPos[], box: Box): string {
  const inside = items.filter(it => {
    const cx = it.x + it.w / 2, cy = it.y + it.h / 2;
    return it.str.trim() !== '' && cx >= box.x0 && cx <= box.x1 && cy >= box.y0 && cy <= box.y1;
  }).sort((a, b) => a.y - b.y || a.x - b.x);
  const lines: TextItemPos[][] = [];
  for (const it of inside) {
    const line = lines[lines.length - 1];
    if (line && Math.abs(line[0].y - it.y) < Math.max(4, it.h * 0.5)) line.push(it);
    else lines.push([it]);
  }
  return lines
    .map(l => l.sort((a, b) => a.x - b.x).reduce((acc, it, i) => {
      if (i === 0) return it.str;
      const prevIt = l[i - 1];
      const gap = it.x - (prevIt.x + prevIt.w);
      return acc + (gap > it.h * 0.15 ? ' ' : '') + it.str;
    }, ''))
    .map(s => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

// Metnin sonundaki A) B) C) D) şıklarını ayırır
export function parseOptions(text: string): { stem: string; options: Record<string, string> | null } {
  const letters = ['A', 'B', 'C', 'D'];
  const positions: { letter: string; start: number; end: number }[] = [];
  let from = 0;
  for (const L of letters) {
    const re = new RegExp(`(^|[\\s(])${L}\\s*[).]\\s*`, 'g');
    re.lastIndex = from;
    const m = re.exec(text);
    if (!m) return { stem: text.trim(), options: null };
    const start = m.index + m[1].length;
    positions.push({ letter: L, start, end: m.index + m[0].length });
    from = m.index + m[0].length;
  }
  const options: Record<string, string> = {};
  positions.forEach((p, i) => {
    const stop = i + 1 < positions.length ? positions[i + 1].start : text.length;
    options[p.letter] = text.slice(p.end, stop).replace(/\s+/g, ' ').trim();
  });
  return { stem: text.slice(0, positions[0].start).trim(), options };
}

// Soru numarasını metnin başından siler ("12. ", "12) ", "12 ")
export function stripLeadingNumber(text: string, no: number | null): string {
  if (no == null) return text;
  return text.replace(new RegExp(`^\\s*${no}\\s*[.)]?\\s*`), '');
}

// Metin katmanındaki numaralardan soru bölgeleri
export function regionsFromMarkers(markers: Marker[], columns: Box[], pageH: number): { box: Box; no: number }[] {
  const out: { box: Box; no: number }[] = [];
  columns.forEach((col, ci) => {
    const ms = markers.filter(m => m.col === ci).sort((a, b) => a.y - b.y);
    for (const r of regionsFromStarts(ms.map(m => m.y), col, pageH)) out.push({ box: r.box, no: ms[r.index].no });
  });
  return out;
}
