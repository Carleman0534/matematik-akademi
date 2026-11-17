// Öğrenciler e-posta yerine kullanıcı adıyla giriş yapar. Supabase Auth e-posta istediği için kullanıcı adı,
// hiçbir zaman e-posta gönderilmeyen iç bir adrese çevrilir: ayse.yilmaz → ayse.yilmaz@<STUDENT_EMAIL_DOMAIN>.

export const DEFAULT_STUDENT_EMAIL_DOMAIN = 'ogrenci.matematikakademi.app';

const TR_MAP: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', i: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' };

export function normalizeUsername(raw: string): string {
  return String(raw || '')
    .trim()
    .toLocaleLowerCase('tr')
    .replace(/[çğıiöşüâîû]/g, ch => TR_MAP[ch] || ch)
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/\.{2,}/g, '.')
    .replace(/^[._-]+|[._-]+$/g, '');
}

export function validateUsername(u: string): string | null {
  if (u.length < 3) return 'Kullanıcı adı en az 3 karakter olmalı.';
  if (u.length > 30) return 'Kullanıcı adı en fazla 30 karakter olabilir.';
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(u)) return 'Kullanıcı adında yalnızca harf, rakam, nokta, alt çizgi ve tire kullanılabilir.';
  return null;
}

export function validatePassword(p: string): string | null {
  if (String(p || '').length < 8) return 'Şifre en az 8 karakter olmalı.';
  return null;
}

export const isEmail = (s: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || '').trim());

export function usernameToEmail(username: string, domain: string = DEFAULT_STUDENT_EMAIL_DOMAIN): string {
  return normalizeUsername(username) + '@' + domain;
}

// Giriş kutusuna yazılan değer: e-posta ise olduğu gibi, değilse kullanıcı adı olarak çevrilir
export function loginIdToEmail(id: string, domain: string = DEFAULT_STUDENT_EMAIL_DOMAIN): string {
  const v = String(id || '').trim();
  return isEmail(v) ? v.toLowerCase() : usernameToEmail(v, domain);
}
