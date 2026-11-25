// Veritabanı dosyasının Vercel Blob'daki kalıcı kopyası.
//
// Vercel'de her sunucu örneği veritabanını geçici /tmp klasöründe tutar; örnekler birbirinin
// yazdığını görmez ve /tmp her yeni sürümde ya da uykudan sonra silinir. Bu modül tek bir
// "asıl" kopyayı Vercel Blob'da (özel erişim) saklar: örnekler açılışta oradan okur, her
// değişiklikten sonra oraya yazar ve ETag ile değişip değişmediğini ucuza kontrol eder.
//
// Etkinleşmesi için Vercel projesine bir Blob deposu bağlanmalıdır (BLOB_READ_WRITE_TOKEN
// ortam değişkeni otomatik eklenir). Değişken yoksa uygulama eskisi gibi yerel dosyayla çalışır.
import { get, put, list, del, BlobPreconditionFailedError } from '@vercel/blob';

export const BLOB_DB_PATHNAME = process.env.DB_BLOB_PATHNAME || 'db/app.db';

export function blobStoreConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

// Veritabanı ile aynı koşul: Vercel'de (ya da production derlemesinde) ve Blob deposu bağlıysa
export function blobStoreActive(): boolean {
  return (!!process.env.VERCEL || process.env.NODE_ENV === 'production') && blobStoreConfigured();
}

// VERCEL_BLOB_API_URL yalnızca yerel deneme sunucusu (emülatör) için tanımlanır; canlıda boştur.
function blobTarget(pathname: string): string {
  const override = process.env.VERCEL_BLOB_API_URL;
  return override ? `${override.replace(/\/$/, '')}/${pathname}` : pathname;
}

// PDF ve yükleme parçaları gibi dosyalar: veritabanından ayrı, kendi nesneleri olarak saklanır
export async function putFileToBlob(pathname: string, bytes: Uint8Array, contentType: string): Promise<void> {
  await put(pathname, Buffer.from(bytes), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType,
  });
}

export async function getFileFromBlob(pathname: string): Promise<Uint8Array | null> {
  const res = await get(blobTarget(pathname), { access: 'private', useCache: false });
  if (!res || res.statusCode !== 200 || !res.stream) return null;
  return streamToBytes(res.stream);
}

export async function deleteBlobPrefix(prefix: string): Promise<void> {
  const { blobs } = await list({ prefix, limit: 1000 });
  if (blobs.length) await del(blobs.map(b => b.url));
}

export async function deleteBlobFile(pathname: string): Promise<void> {
  await deleteBlobPrefix(pathname);
}

async function streamToBytes(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      total += value.byteLength;
    }
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

export type BlobPullResult =
  | { status: 'missing' }
  | { status: 'unchanged'; etag: string }
  | { status: 'changed'; etag: string; bytes: Uint8Array };

// Blob'daki kopyayı okur. knownEtag verilirse ve dosya değişmediyse indirmez (304).
export async function pullDbFromBlob(knownEtag?: string | null): Promise<BlobPullResult> {
  const res = await get(blobTarget(BLOB_DB_PATHNAME), {
    access: 'private',
    useCache: false,
    ...(knownEtag ? { ifNoneMatch: knownEtag } : {}),
  });
  if (!res) return { status: 'missing' };
  if (res.statusCode === 304) return { status: 'unchanged', etag: res.blob.etag };
  return { status: 'changed', etag: res.blob.etag, bytes: await streamToBytes(res.stream) };
}

// Günlük yedek: db/backups/app-YYYY-MM-DD.db. Her gün yalnızca ilk yazmada bir kez oluşur (Blob kotası için),
// son 14 yedek tutulur. Hata olursa ana yazmayı etkilemez; çağıran yutar.
export const BACKUP_PREFIX = 'db/backups/';
const KEEP_BACKUPS = 14;

export async function backupDbToBlob(bytes: Uint8Array, day: string): Promise<'created' | 'exists'> {
  const name = `${BACKUP_PREFIX}app-${day}.db`;
  try {
    await put(name, Buffer.from(bytes), {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: false,
      contentType: 'application/octet-stream',
    });
  } catch (err) {
    if (/already exists|exists/i.test(String((err as Error)?.message))) return 'exists';
    throw err;
  }
  // Eski yedekleri temizle
  const { blobs } = await list({ prefix: BACKUP_PREFIX, limit: 200 });
  const sorted = blobs.map((b) => b.pathname).sort();
  const old = sorted.slice(0, Math.max(0, sorted.length - KEEP_BACKUPS));
  if (old.length) await del(old);
  return 'created';
}

// Kopyayı yazar. expectedEtag verilirse yalnızca Blob'daki kopya hâlâ o sürümse yazar;
// arada başka bir örnek yazmışsa 'conflict' döner (çağıran karar verir).
export async function pushDbToBlob(
  bytes: Uint8Array,
  expectedEtag?: string | null
): Promise<{ status: 'ok'; etag: string } | { status: 'conflict' }> {
  try {
    const res = await put(BLOB_DB_PATHNAME, Buffer.from(bytes), {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/octet-stream',
      cacheControlMaxAge: 60,
      ...(expectedEtag ? { ifMatch: expectedEtag } : {}),
    });
    return { status: 'ok', etag: res.etag };
  } catch (err) {
    if (err instanceof BlobPreconditionFailedError) return { status: 'conflict' };
    throw err;
  }
}
