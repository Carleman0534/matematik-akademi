'use client';
// Deneme dosyalarını sayfa görsellerine çevirir (tarayıcıda). PDF, telefonlarda güvenilir görünmediği için her sayfa
// JPEG'e dönüştürülür; fotoğraflar da en uzun kenarı 2000 px olacak şekilde küçültülür. Sunucuya yalnızca görseller gider.

export interface PageImage { blob: Blob; width: number; height: number }
export const MAX_PAGES = 80;
const TARGET_WIDTH = 1600;

const isPdf = (f: File) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name);

export function checkExamFile(f: File): string | null {
  if (/heic|heif/i.test(f.type) || /\.(heic|heif)$/i.test(f.name)) return `${f.name}: HEIC desteklenmiyor (telefon ayarı: Kamera → Biçimler → En Uyumlu).`;
  if (!isPdf(f) && !['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) return `${f.name}: yalnızca PDF, JPEG, PNG ya da WEBP yüklenebilir.`;
  if (f.size > 60 * 1024 * 1024) return `${f.name}: dosya 60 MB'tan büyük.`;
  return null;
}

const toJpeg = (canvas: HTMLCanvasElement, q = 0.85) =>
  new Promise<Blob>((res, rej) => canvas.toBlob(b => (b ? res(b) : rej(new Error('Görsel oluşturulamadı.'))), 'image/jpeg', q));

async function imageToPage(file: File): Promise<PageImage> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * scale)), h = Math.max(1, Math.round(bmp.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Görsel işlenemedi.');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  return { blob: await toJpeg(canvas), width: w, height: h };
}

async function pdfToPages(file: File, onPage: (done: number, total: number) => void, budget: number): Promise<PageImage[]> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const total = Math.min(doc.numPages, budget);
  const out: PageImage[] = [];
  try {
    for (let i = 1; i <= total; i++) {
      const page = await doc.getPage(i);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: Math.min(3, TARGET_WIDTH / base.width) });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('PDF işlenemedi.');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvas, canvasContext: ctx, viewport }).promise;
      out.push({ blob: await toJpeg(canvas), width: canvas.width, height: canvas.height });
      page.cleanup();
      onPage(i, total);
    }
  } finally {
    await doc.loadingTask.destroy();
  }
  return out;
}

// PDF'in sayfa sayısı (arşive yüklerken bilgi olarak)
export async function countPdfPages(file: File): Promise<number | null> {
  try {
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
    const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    const n = doc.numPages;
    await doc.loadingTask.destroy();
    return n;
  } catch { return null; }
}

// Arşivdeki PDF'i (süreli adresinden) dosya olarak indirir
export async function fetchPdfFile(url: string, name: string): Promise<File> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('PDF arşivden indirilemedi (bağlantının süresi dolmuş olabilir; sayfayı yenileyin).');
  return new File([await res.blob()], name || 'belge.pdf', { type: 'application/pdf' });
}

// Dosyaları sırayla sayfalara çevirir; toplam en çok MAX_PAGES sayfa
export async function filesToPages(files: File[], onProgress: (msg: string) => void, already = 0): Promise<PageImage[]> {
  const pages: PageImage[] = [];
  for (const f of files) {
    const budget = MAX_PAGES - already - pages.length;
    if (budget <= 0) throw new Error(`Bir denemede en çok ${MAX_PAGES} sayfa olabilir.`);
    if (isPdf(f)) {
      onProgress(`${f.name} açılıyor…`);
      pages.push(...await pdfToPages(f, (d, t) => onProgress(`${f.name}: ${d}/${t} sayfa hazırlandı`), budget));
    } else {
      onProgress(`${f.name} hazırlanıyor…`);
      pages.push(await imageToPage(f));
    }
  }
  return pages;
}
