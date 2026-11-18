// "Beni hatırla" ayarı: işaretliyse oturum çerezleri uzun süre kalır (Supabase varsayılanı),
// işaretli değilse tarayıcı kapanınca biter. Seçim, çerezle (oturum çerezi) taşınır.
export const SHORT_SESSION_COOKIE = 'ma-kisa-oturum';
export const LAST_ID_COOKIE = 'ma-son-kimlik';

type Opts = { maxAge?: number; expires?: Date; [k: string]: unknown };

// Kısa oturumda süre bilgisini kaldırır (oturum çerezi olur); silme isteklerine (maxAge 0) dokunmaz
export function adjustCookieOptions<T extends Opts>(options: T | undefined, shortSession: boolean): T | undefined {
  if (!options || !shortSession) return options;
  if (options.maxAge === 0) return options;
  const rest = { ...options };
  delete rest.maxAge;
  delete rest.expires;
  return rest as T;
}
