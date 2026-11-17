import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL } from '@/lib/env';

// Yönetici istemcisi: RLS'yi atlar. YALNIZCA sunucuda, yalnızca öğretmen olduğu doğrulanmış isteklerde
// (öğrenci hesabı açma, şifre sıfırlama) kullanılır. Anahtar tarayıcıya hiçbir zaman gönderilmez.
export function supabaseAdmin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY tanımlı değil (.env.local). Öğrenci hesabı açmak için gerekli.');
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
