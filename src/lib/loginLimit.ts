// Parola denemelerini sınırlar (kaba kuvvet engeli). Bellekte tutulur: sunucu örneği başına geçerlidir,
// ama tek bir kullanıcıya yönelik hızlı denemeleri durdurmak için yeterlidir.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_ID = 6;     // aynı kimlik için
const MAX_PER_IP = 40;    // aynı adres için (okuldaki ortak ağ düşünülerek yüksek)

type Rec = { n: number; first: number };
const g = globalThis as unknown as { __loginFails?: Map<string, Rec> };
const store = (g.__loginFails ??= new Map<string, Rec>());

function fresh(key: string): Rec | undefined {
  const r = store.get(key);
  if (!r) return undefined;
  if (Date.now() - r.first > WINDOW_MS) { store.delete(key); return undefined; }
  return r;
}

export function loginBlockedMinutes(id: string, ip: string): number {
  const a = fresh('id:' + id.toLowerCase());
  const b = fresh('ip:' + ip);
  const hit = (a && a.n >= MAX_PER_ID ? a : null) || (b && b.n >= MAX_PER_IP ? b : null);
  return hit ? Math.max(1, Math.ceil((hit.first + WINDOW_MS - Date.now()) / 60000)) : 0;
}

export function recordLoginFailure(id: string, ip: string) {
  if (store.size > 5000) store.clear();
  for (const key of ['id:' + id.toLowerCase(), 'ip:' + ip]) {
    const r = fresh(key);
    if (r) r.n++; else store.set(key, { n: 1, first: Date.now() });
  }
}

export function recordLoginSuccess(id: string) {
  store.delete('id:' + id.toLowerCase());
}
