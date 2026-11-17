'use client';
// Soru fotoğrafları: orijinal dosya olduğu gibi saklanır (kalite korunur); listede hızlı görünmesi için küçük
// bir önizleme (en uzun kenar 640 px, JPEG) tarayıcıda üretilir.

export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_BYTES = 15 * 1024 * 1024;

export function checkImage(file: File): string | null {
  if (/heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name)) return 'HEIC biçimi desteklenmiyor. Telefon ayarlarından fotoğraf biçimini "En uyumlu" (JPEG) yapın ya da ekran görüntüsü yükleyin.';
  if (!ACCEPTED_TYPES.includes(file.type)) return 'Yalnızca JPEG, PNG ve WEBP fotoğraflar yüklenebilir.';
  if (file.size > MAX_BYTES) return 'Fotoğraf 15 MB\'tan büyük olamaz.';
  return null;
}

export const extOf = (file: File) => file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';

export async function makeThumb(file: File, max = 640): Promise<{ blob: Blob; width: number; height: number }> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * scale)), h = Math.max(1, Math.round(bmp.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Önizleme oluşturulamadı.');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bmp, 0, 0, w, h);
  const width = bmp.width, height = bmp.height;
  bmp.close();
  const blob = await new Promise<Blob>((res, rej) => canvas.toBlob(b => b ? res(b) : rej(new Error('Önizleme oluşturulamadı.')), 'image/jpeg', 0.82));
  return { blob, width, height };
}
