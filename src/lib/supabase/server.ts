import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/env';
import { SHORT_SESSION_COOKIE, adjustCookieOptions } from '@/lib/supabase/session';

// Her istek için yeni sunucu istemcisi (kullanıcının oturumuyla; RLS geçerli).
// shortSession: "Beni hatırla" işaretli değilse oturum çerezi yazılır (girişte açıkça verilir; sonra çerezden okunur).
export async function supabaseServer(shortSession?: boolean) {
  const store = await cookies();
  const short = shortSession ?? store.get(SHORT_SESSION_COOKIE)?.value === '1';
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        // Sunucu bileşenlerinde çerez yazılamaz; oturum yenilemesini proxy.ts yapar
        try { list.forEach(({ name, value, options }) => store.set(name, value, adjustCookieOptions(options, short))); } catch {}
      },
    },
  });
}
