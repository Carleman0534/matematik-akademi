// Veritabanı dosyası ve PDF'ler için ücretsiz Supabase deposu (Vercel Blob'un yerine).
//
// - Veritabanı: public.app_db_state tablosunda tek satır (base64). Yazma, "sürüm hâlâ X ise" koşuluyla yapılır
//   (app_db_put); iki sunucu örneği aynı anda yazarsa ikincisi çakışma alır ve en son kopyanın üstüne yeniden uygular.
//   İlk yazma yalnızca satır hiç yoksa yapılır: başlangıç kopyası mevcut veriyi asla ezemez.
// - Dosyalar (PDF, yükleme parçaları): Storage'da özel bir kovada. Öğrenciye PDF, kısa süreli imzalı bağlantıyla
//   doğrudan Supabase'den gider (Vercel'in aktarım hakkı harcanmaz).
//
// Ayarlar (Vercel → Settings → Environment Variables, yerelde .env.local):
//   DB_SUPABASE_URL           https://<proje>.supabase.co
//   DB_SUPABASE_SERVICE_KEY   service_role anahtarı (yalnızca sunucuda kullanılır)
//   DB_STORE_NAMESPACE        isteğe bağlı; varsayılan "live" (yerel denemelerde "test" gibi ayrı bir ad)
// Kurulum SQL'i: supabase/app-db-store.sql
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const BUCKET = process.env.DB_SUPABASE_BUCKET || 'app-files';
const KEEP_BACKUPS = 14;

// Önce bu depoya özel değişkenler; yoksa projede zaten tanımlı olan Supabase değişkenleri kullanılır
// (USE_SUPABASE=true ile eski Supabase moduna dönülmüşse bu depo devre dışıdır).
function storeUrl(): string | undefined {
  if (process.env.DB_SUPABASE_URL) return process.env.DB_SUPABASE_URL;
  if (process.env.USE_SUPABASE === 'true') return undefined;
  return process.env.NEXT_PUBLIC_SUPABASE_URL || undefined;
}
function storeKey(): string | undefined {
  if (process.env.DB_SUPABASE_SERVICE_KEY) return process.env.DB_SUPABASE_SERVICE_KEY;
  if (process.env.USE_SUPABASE === 'true') return undefined;
  return process.env.SUPABASE_SERVICE_ROLE_KEY || undefined;
}

export function supabaseStoreConfigured(): boolean {
  const url = storeUrl();
  return Boolean(url && /^https:\/\//.test(url) && storeKey());
}

// Tanılama için gizli olmayan bilgi: hangi Supabase projesine bağlanıldığı (yalnızca alan adı)
export function supabaseStoreHost(): string | null {
  try { return supabaseStoreConfigured() ? new URL(storeUrl()!).host : null; } catch { return null; }
}

function ns(): string {
  return (process.env.DB_STORE_NAMESPACE || 'live').replace(/[^A-Za-z0-9_-]/g, '') || 'live';
}

let client: SupabaseClient | null = null;
function sb(): SupabaseClient {
  if (!client) {
    client = createClient(storeUrl()!, storeKey()!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

const filePath = (pathname: string) => `${ns()}/${pathname.replace(/^\/+/, '')}`;

function toB64(bytes: Uint8Array): string {
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString('base64');
}

// ── Veritabanı ──────────────────────────────────────────────────────────────────────────────
export type PullResult =
  | { status: 'missing' }
  | { status: 'unchanged'; etag: string }
  | { status: 'changed'; etag: string; bytes: Uint8Array };

export async function sbPullDb(knownEtag?: string | null): Promise<PullResult> {
  const known = knownEtag && /^\d+$/.test(knownEtag) ? Number(knownEtag) : -1;
  const { data, error } = await sb().rpc('app_db_get', { p_id: ns(), p_known: known });
  if (error) throw new Error(`Supabase veritabanı okunamadı: ${error.message}`);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { status: 'missing' };
  const etag = String(row.version);
  if (row.data == null) return { status: 'unchanged', etag };
  return { status: 'changed', etag, bytes: new Uint8Array(Buffer.from(String(row.data), 'base64')) };
}

export async function sbPushDb(
  bytes: Uint8Array,
  expectedEtag?: string | null
): Promise<{ status: 'ok'; etag: string } | { status: 'conflict' }> {
  const expected = expectedEtag && /^\d+$/.test(expectedEtag) ? Number(expectedEtag) : null;
  const { data, error } = await sb().rpc('app_db_put', { p_id: ns(), p_expected: expected, p_data: toB64(bytes) });
  if (error) throw new Error(`Supabase veritabanı yazılamadı: ${error.message}`);
  if (data == null) return { status: 'conflict' };
  return { status: 'ok', etag: String(data) };
}

// Günlük yedek (her gün ilk yazmada bir kez); son 14 gün tutulur
export async function sbBackupDb(bytes: Uint8Array, day: string): Promise<'created' | 'exists'> {
  const { data, error } = await sb()
    .from('app_db_backups')
    .upsert({ id: ns(), day, data: toB64(bytes) }, { onConflict: 'id,day', ignoreDuplicates: true })
    .select('day');
  if (error) throw new Error(`Yedek alınamadı: ${error.message}`);
  const created = Array.isArray(data) && data.length > 0;
  if (created) {
    const { data: days } = await sb().from('app_db_backups').select('day').eq('id', ns()).order('day', { ascending: false });
    const old = (days || []).slice(KEEP_BACKUPS).map(d => d.day as string);
    if (old.length) await sb().from('app_db_backups').delete().eq('id', ns()).in('day', old);
  }
  return created ? 'created' : 'exists';
}

// ── Dosyalar ────────────────────────────────────────────────────────────────────────────────
export async function sbPutFile(pathname: string, bytes: Uint8Array, contentType: string): Promise<void> {
  const { error } = await sb().storage.from(BUCKET).upload(filePath(pathname), Buffer.from(bytes), { upsert: true, contentType });
  if (error) throw new Error(`Dosya yüklenemedi (${pathname}): ${error.message}`);
}

export async function sbGetFile(pathname: string): Promise<Uint8Array | null> {
  const { data, error } = await sb().storage.from(BUCKET).download(filePath(pathname));
  if (error || !data) return null;
  return new Uint8Array(await data.arrayBuffer());
}

export async function sbSignedUrl(pathname: string, seconds = 3600): Promise<string | null> {
  const { data, error } = await sb().storage.from(BUCKET).createSignedUrl(filePath(pathname), seconds);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

// Bir yolun altındaki dosyaları (ya da tam o dosyayı) siler
export async function sbDeletePrefix(prefix: string): Promise<void> {
  const full = filePath(prefix);
  if (!full.endsWith('/')) {
    const { error } = await sb().storage.from(BUCKET).remove([full]);
    if (error) throw new Error(`Dosya silinemedi: ${error.message}`);
    return;
  }
  const { data, error } = await sb().storage.from(BUCKET).list(full.replace(/\/$/, ''), { limit: 1000 });
  if (error) throw new Error(`Dosyalar listelenemedi: ${error.message}`);
  const paths = (data || []).map(f => `${full}${f.name}`);
  if (paths.length) await sb().storage.from(BUCKET).remove(paths);
}
