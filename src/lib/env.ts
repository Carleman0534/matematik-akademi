import { DEFAULT_STUDENT_EMAIL_DOMAIN } from './usernames.ts';

// Tek veri kaynağı: uygulama yerel SQLite veritabanıyla çalışır (internet sürümünde bu veritabanı Vercel Blob'da saklanır).
// Aşağıdaki durumlarda eski bulut (Supabase) hiç kullanılmaz, yerel çalışmayla birebir aynı davranılır:
//   - LOCAL_MODE=true (bilgisayarda geliştirme), ya da
//   - Vercel Blob deposu bağlı (internet sürümü).
// Supabase'e geri dönmek için Blob deposunu kaldırmak yerine USE_SUPABASE=true ayarlanır.
const FORCE_LOCAL =
  process.env.USE_SUPABASE !== 'true' &&
  (process.env.LOCAL_MODE === 'true' || Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID));

// Yerel çalışmada Supabase istemcisi yine de oluşturulabilsin diye (boş adres hata fırlatır) hiçbir yere bağlanmayan
// bir yer tutucu kullanılır; çağrılar anında başarısız olur ve sayfalar yerel veritabanına düşer.
const LOCAL_PLACEHOLDER_URL = 'http://127.0.0.1:9';
const LOCAL_PLACEHOLDER_KEY = 'yerel-mod-yer-tutucu-anahtar-kullanilmaz';
export const SUPABASE_URL = FORCE_LOCAL ? LOCAL_PLACEHOLDER_URL : (process.env.NEXT_PUBLIC_SUPABASE_URL || '');
export const SUPABASE_ANON_KEY = FORCE_LOCAL ? LOCAL_PLACEHOLDER_KEY : (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');
export const STUDENT_EMAIL_DOMAIN = process.env.STUDENT_EMAIL_DOMAIN || DEFAULT_STUDENT_EMAIL_DOMAIN;
export const IMAGE_BUCKET = 'question-images';
export const EXAM_PAGE_BUCKET = 'exam-pages';

// Yerel mod kontrolü (Supabase bulut hesabı olmadan yerel SQLite ile çalışma)
export const isLocalMode = (): boolean =>
  FORCE_LOCAL ||
  SUPABASE_URL.includes('localhost') ||
  SUPABASE_URL.includes('127.0.0.1');

// .env.local doldurulmadan açılırsa çökmek yerine kurulum ekranı gösterilir
export const isConfigured = (): boolean =>
  isLocalMode() || (/^https:\/\/.+/.test(SUPABASE_URL) && SUPABASE_ANON_KEY.length > 20);
