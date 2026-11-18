// PDF'teki soruları otomatik bulma (LGS / TYT kitapçıkları ve deneme PDF'leri).
// 1) Metin katmanı varsa: soru numaraları ("1.", "2." …) gövde metninden büyük/kalın yazıldığı için ayırt edilir;
//    kapaktaki ve arka sayfadaki numaralı uyarı listeleri gövdeyle aynı boyutta olduğundan elenir.
// 2) Her sorunun kutusu: numarasından aynı sütundaki bir sonraki numaraya (ya da sayfa altına) kadar; alt taraftaki
//    boşluk, koyu piksel (yazı/şekil) bulunan son satıra göre kırpılır. Açık renkli filigran yazı sayılmaz.
// 3) Metin katmanı yoksa (taranmış PDF): sütunlar ve sorular aradaki boşluklara göre bölünür.
// 4) Kitapçığın sonundaki cevap anahtarı okunur, bölüm (Matematik, Fen …) + soru numarasıyla eşleştirilir.
// Bu dosyadaki fonksiyonlar saf (tarayıcı/pdf.js gerektirmez) → logic.test.ts

export interface TItem { str: string; x: number; y: number; w: number; h: number } // y = üst kenar, birim: sayfa noktası
export interface Marker { n: number; x: number; y: number; h: number }
export interface Box { n: number; x: number; y: number; w: number; h: number; col: number }
export type Letter = 'A' | 'B' | 'C' | 'D' | 'E';

const MARKER_RE = /^(\d{1,3})[.)]$/;
const LEAD_RE = /^(\d{1,3})\.\s+\S/;

const median = (xs: number[]) => { if (!xs.length) return 0; const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const norm = (s: string) => s.toLocaleUpperCase('tr').replace(/\s+/g, ' ').trim();

export const isAnswerKeyPage = (items: TItem[]) => items.some(i => /CEVAP ANAHTAR/.test(norm(i.str)));

// Gövde metninin tipik yüksekliği (en az 3 harfli parçalar)
export const bodyHeight = (items: TItem[]) => median(items.filter(i => /\p{L}{3,}/u.test(i.str)).map(i => i.h));

export function findQuestionMarkers(items: TItem[], pageW: number, pageH: number): Marker[] {
  if (isAnswerKeyPage(items)) return [];
  const body = bodyHeight(items);
  if (!body) return [];
  const out: Marker[] = [];
  for (const it of items) {
    const s = it.str.trim();
    let m = MARKER_RE.exec(s);
    let hasText = false;
    if (!m) { m = LEAD_RE.exec(s); hasText = !!m; }
    if (!m) continue;
    const n = parseInt(m[1], 10);
    if (n < 1 || n > 200) continue;
    if (it.h < body * 1.12) continue;                  // soru numarası gövdeden büyük
    if (it.y < pageH * 0.06 || it.y > pageH * 0.94) continue; // üst/alt bilgi alanı
    // Sağında aynı satırda soru metni olmalı (tek başına sayı değil)
    const cy = it.y + it.h / 2;
    const textRight = hasText || items.some(o => o !== it && o.x > it.x + it.w * 0.5 && o.x < it.x + pageW * 0.4
      && Math.abs(o.y + o.h / 2 - cy) < it.h * 0.9 && /\p{L}/u.test(o.str));
    if (!textRight) continue;
    out.push({ n, x: it.x, y: it.y, h: it.h });
  }
  // Aynı numara iki kez (ör. iki parçalı yazı) → ilkini tut
  const seen = new Set<string>();
  return out.filter(m => { const k = m.n + ':' + Math.round(m.x / 20); if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => (a.x < pageW * 0.42 ? 0 : 1) - (b.x < pageW * 0.42 ? 0 : 1) || a.y - b.y);
}

const SECTIONS: [RegExp, string][] = [
  [/MATEMAT/, 'Matematik'], [/FEN B[İI]L[İI]M/, 'Fen Bilimleri'], [/TÜRKÇE/, 'Türkçe'],
  [/İNKILAP|INKILAP|SOSYAL/, 'İnkılap Tarihi'], [/DİN KÜLTÜR|DIN KULTUR/, 'Din Kültürü'], [/İNGİLİZCE|INGILIZCE|YABANCI DİL/, 'Yabancı Dil'],
  [/FİZİK|FIZIK/, 'Fizik'], [/KİMYA|KIMYA/, 'Kimya'], [/BİYOLOJİ|BIYOLOJI/, 'Biyoloji'], [/GEOMETR/, 'Geometri'],
];

// Sayfanın üst kısmındaki ders başlığı
export function detectSection(items: TItem[], pageH: number): string | null {
  for (const it of items.filter(i => i.y < pageH * 0.2).sort((a, b) => a.y - b.y)) {
    const s = norm(it.str);
    for (const [re, name] of SECTIONS) if (re.test(s)) return name;
  }
  return null;
}

// Alt bilgi: "Diğer sayfaya geçiniz", "TEST BİTTİ", ortalanmış sayfa numarası → sorular bunun üstünde biter
export function findFooterTop(items: TItem[], pageW: number, pageH: number): number {
  let top = pageH * 0.93;
  for (const it of items) {
    if (it.y < pageH * 0.7) continue;
    const s = norm(it.str);
    const footerText = /D[İI]ĞER SAYFAYA|TEST[İI]? B[İI]TT[İI]|TEST[İI]NE GEÇ|CEVAPLARINIZI KONTROL|SINAV B[İI]TT[İI]/.test(s);
    const pageNo = /^\d{1,3}$/.test(s) && it.y > pageH * 0.85 && Math.abs(it.x + it.w / 2 - pageW / 2) < pageW * 0.08;
    if (footerText || pageNo) top = Math.min(top, it.y);
  }
  return top;
}

// Soru kutuları: sütunlar ve numaralar arasındaki dikey aralıklar (sayfa noktası cinsinden)
export function layoutBoxes(markers: Marker[], pageW: number, pageH: number, footerTop: number): Box[] {
  if (!markers.length) return [];
  const mid = pageW / 2;
  const left = markers.filter(m => m.x < pageW * 0.42), right = markers.filter(m => m.x >= pageW * 0.42);
  const twoCol = right.length > 0 && (left.length > 0 || right.every(m => m.x > pageW * 0.45));
  const margin = Math.max(pageW * 0.03, Math.min(...markers.map(m => m.x)) - pageW * 0.012);
  const cols: { list: Marker[]; x0: number; x1: number }[] = twoCol
    ? [{ list: left, x0: margin, x1: mid - pageW * 0.025 }, { list: right, x0: Math.min(...(right.length ? right.map(m => m.x) : [mid])) - pageW * 0.012, x1: pageW - margin }]
    : [{ list: markers, x0: margin, x1: pageW - margin }];
  const out: Box[] = [];
  cols.forEach((c, ci) => {
    const list = [...c.list].sort((a, b) => a.y - b.y);
    list.forEach((m, i) => {
      const top = Math.max(0, m.y - m.h * 0.6);
      const next = list[i + 1];
      const bottom = next ? next.y - next.h * 0.8 : footerTop - pageH * 0.005;
      if (bottom - top < m.h * 2) return;
      out.push({ n: m.n, x: c.x0, y: top, w: c.x1 - c.x0, h: bottom - top, col: ci });
    });
  });
  return out;
}

// Satır başına koyu piksel sayıları → içeriğin bittiği son satır (alt boşluğu kırpmak için)
export function lastInkRow(rowCounts: ArrayLike<number>, minCount: number): number {
  for (let i = rowCounts.length - 1; i >= 0; i--) if (rowCounts[i] >= minCount) return i;
  return -1;
}

// Taranmış sayfa: boş satırlarla ayrılmış içerik blokları [başlangıç, bitiş) – küçük parçalar birleştirilir
export function segmentByGaps(rowCounts: ArrayLike<number>, minCount: number, minGap: number, minBlock: number): [number, number][] {
  const blocks: [number, number][] = [];
  let start = -1, lastInk = -1;
  for (let i = 0; i <= rowCounts.length; i++) {
    const ink = i < rowCounts.length && rowCounts[i] >= minCount;
    if (ink) { if (start < 0) start = i; lastInk = i; }
    else if (start >= 0 && i - lastInk >= minGap) { blocks.push([start, lastInk + 1]); start = -1; }
  }
  if (start >= 0) blocks.push([start, lastInk + 1]);
  // Çok kısa blokları (sayfa no, tek satır başlık) bir sonrakiyle birleştir
  const merged: [number, number][] = [];
  for (const b of blocks) {
    const prev = merged[merged.length - 1];
    if (prev && prev[1] - prev[0] < minBlock) prev[1] = b[1];
    else merged.push([...b] as [number, number]);
  }
  return merged.filter(b => b[1] - b[0] >= minBlock);
}

// Cevap anahtarı sayfası: "1. D" satırları; sütun başlığına (MATEMATİK / FEN BİLİMLERİ) göre bölümlenir
export function parseAnswerKey(items: TItem[]): Map<string, Letter> {
  const out = new Map<string, Letter>();
  if (!isAnswerKeyPage(items)) return out;
  const headers: { name: string; x: number; y: number }[] = [];
  for (const it of items) { const s = norm(it.str); for (const [re, name] of SECTIONS) if (re.test(s) && s.length < 30) headers.push({ name, x: it.x + it.w / 2, y: it.y }); }
  for (const it of items) {
    const m = /^(\d{1,3})[.)]?\s*([A-E])?$/.exec(it.str.trim());
    if (!m) continue;
    let letter = m[2] as Letter | undefined;
    if (!letter) {
      const cy = it.y + it.h / 2;
      const cand = items.filter(o => o !== it && /^[A-E]$/.test(o.str.trim()) && o.x > it.x && o.x < it.x + 60 && Math.abs(o.y + o.h / 2 - cy) < Math.max(it.h, o.h))
        .sort((a, b) => a.x - b.x)[0];
      letter = cand?.str.trim() as Letter | undefined;
    }
    if (!letter) continue;
    const above = headers.filter(h => h.y < it.y);
    const head = above.sort((a, b) => Math.abs(a.x - it.x) - Math.abs(b.x - it.x))[0];
    const key = `${head?.name || ''}|${parseInt(m[1], 10)}`;
    if (!out.has(key)) out.set(key, letter);
  }
  return out;
}
