// Oturum çerezinin (local_session) imzalanması ve doğrulanması.
//
// Eskiden çerez düz bir JSON'du: tarayıcıda {"userId":"x","role":"teacher"} yazan herkes öğretmen olabilirdi.
// Artık çerez  v1.<yük>.<imza>  biçimindedir; imza HMAC-SHA256 ile üretilir ve yalnızca sunucudaki gizli anahtarla
// doğrulanır. Yük değiştirilirse ya da imzasız (eski biçim) bir çerez gelirse oturum geçersiz sayılır.
//
// Web Crypto kullanılır: hem proxy.ts'te hem sunucu kodunda çalışır, ek paket gerekmez.

export type SessionRole = 'teacher' | 'student' | 'parent';

export interface SessionPayload {
  userId: string;
  fullName: string;
  role: SessionRole;
  isAdmin: boolean;
  studentId: string | null;
  remember: boolean;
}

const VERSION = 'v1';
const encoder = new TextEncoder();
const decoder = new TextDecoder();

// Gizli anahtar: SESSION_SECRET varsa o; yoksa sunucuda zaten bulunan gizli değerlerden biri türetilir.
// Hiçbiri yoksa (canlıda) oturum üretilmez/doğrulanmaz; yerel geliştirmede sabit bir anahtar kullanılır.
function secretMaterial(): string | null {
  const fromEnv =
    process.env.SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.BLOB_READ_WRITE_TOKEN ||
    process.env.BLOB_STORE_ID;
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV !== 'production' || process.env.LOCAL_MODE === 'true') {
    return 'yerel-gelistirme-anahtari-yalnizca-bu-bilgisayarda-gecerli';
  }
  return null;
}

let keyCache: { material: string; key: Promise<CryptoKey> } | null = null;

function getKey(): Promise<CryptoKey> | null {
  const material = secretMaterial();
  if (!material) return null;
  if (!keyCache || keyCache.material !== material) {
    keyCache = {
      material,
      key: crypto.subtle.importKey('raw', encoder.encode(`${material}|local_session|${VERSION}`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']),
    };
  }
  return keyCache.key;
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): Uint8Array | null {
  try {
    const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4);
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

// Çerez değeri üretir. Gizli anahtar yoksa hata fırlatır (oturum açılamaz).
export async function signSession(payload: SessionPayload): Promise<string> {
  const key = getKey();
  if (!key) throw new Error('SESSION_SECRET tanımlı değil; oturum oluşturulamıyor.');
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign('HMAC', await key, encoder.encode(`${VERSION}.${body}`));
  return `${VERSION}.${body}.${toBase64Url(new Uint8Array(sig))}`;
}

// Geçerliyse yükü, değilse (imzasız, değiştirilmiş, bozuk, eski biçim) null döndürür.
export async function verifySession(value: string | undefined | null): Promise<SessionPayload | null> {
  if (!value) return null;
  const parts = value.split('.');
  if (parts.length !== 3 || parts[0] !== VERSION) return null;
  const key = getKey();
  if (!key) return null;
  const sig = fromBase64Url(parts[2]);
  if (!sig) return null;
  let ok = false;
  try {
    ok = await crypto.subtle.verify('HMAC', await key, sig as BufferSource, encoder.encode(`${VERSION}.${parts[1]}`));
  } catch {
    return null;
  }
  if (!ok) return null;

  const raw = fromBase64Url(parts[1]);
  if (!raw) return null;
  try {
    const p = JSON.parse(decoder.decode(raw)) as Partial<SessionPayload>;
    if (typeof p.userId !== 'string' || !p.userId) return null;
    if (p.role !== 'teacher' && p.role !== 'student' && p.role !== 'parent') return null;
    return {
      userId: p.userId,
      fullName: typeof p.fullName === 'string' ? p.fullName : '',
      role: p.role,
      isAdmin: p.isAdmin === true,
      studentId: typeof p.studentId === 'string' ? p.studentId : null,
      remember: p.remember === true,
    };
  } catch {
    return null;
  }
}
