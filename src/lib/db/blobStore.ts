// Veritabanı dosyasının Vercel Blob'daki kalıcı kopyası.
//
// Vercel'de her sunucu örneği veritabanını geçici /tmp klasöründe tutar; örnekler birbirinin
// yazdığını görmez ve /tmp her yeni sürümde ya da uykudan sonra silinir. Bu modül tek bir
// "asıl" kopyayı Vercel Blob'da (özel erişim) saklar: örnekler açılışta oradan okur, her
// değişiklikten sonra oraya yazar ve ETag ile değişip değişmediğini ucuza kontrol eder.
//
// Etkinleşmesi için Vercel projesine bir Blob deposu bağlanmalıdır (BLOB_READ_WRITE_TOKEN
// ortam değişkeni otomatik eklenir). Değişken yoksa uygulama eskisi gibi yerel dosyayla çalışır.
import { get, put, BlobPreconditionFailedError } from '@vercel/blob';

export const BLOB_DB_PATHNAME = process.env.DB_BLOB_PATHNAME || 'db/app.db';

export function blobStoreConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
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
  // VERCEL_BLOB_API_URL yalnızca yerel deneme sunucusu (emülatör) için tanımlanır; canlıda boştur.
  const override = process.env.VERCEL_BLOB_API_URL;
  const target = override ? `${override.replace(/\/$/, '')}/${BLOB_DB_PATHNAME}` : BLOB_DB_PATHNAME;
  const res = await get(target, {
    access: 'private',
    useCache: false,
    ...(knownEtag ? { ifNoneMatch: knownEtag } : {}),
  });
  if (!res) return { status: 'missing' };
  if (res.statusCode === 304) return { status: 'unchanged', etag: res.blob.etag };
  return { status: 'changed', etag: res.blob.etag, bytes: await streamToBytes(res.stream) };
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
