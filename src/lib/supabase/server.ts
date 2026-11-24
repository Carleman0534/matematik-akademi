import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { SUPABASE_URL, SUPABASE_ANON_KEY, isLocalMode } from '@/lib/env';

// Her istek için yeni sunucu istemcisi (kullanıcının oturumuyla; RLS geçerli)
export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    // Yerel modda hiçbir yere bağlanılmaz: ağ isteği beklemek yerine anında hata döner (sayfalar yerel veritabanına düşer).
    // Aksi halde bağlantı zaman aşımı her sayfa açılışına saniyeler ekler.
    // (503/520 yanıtlarını istemci 1+2+4 sn bekleyerek yeniden dener; bu yüzden 501 kullanılır.)
    ...(isLocalMode() ? { global: { fetch: async () => new Response(JSON.stringify({ message: 'Yerel modda bulut kullanılmaz' }), { status: 501, headers: { 'content-type': 'application/json' } }) } } : {}),
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        // Sunucu bileşenlerinde çerez yazılamaz; oturum yenilemesini proxy.ts yapar
        try { list.forEach(({ name, value, options }) => store.set(name, value, options)); } catch {}
      },
    },
  });
}
