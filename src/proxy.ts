import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { SHORT_SESSION_COOKIE, adjustCookieOptions } from '@/lib/supabase/session';

// Her istekte Supabase oturumunu yeniler ve giriş yapmamış kullanıcıyı korunan sayfalardan giriş ekranına yönlendirir.
// Rol (öğretmen/öğrenci) denetimi sayfa düzenlerinde ve veritabanında (RLS) yapılır.
const PROTECTED = ['/ogretmen', '/ogrenci', '/soru', '/coz'];

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next();
  let response = NextResponse.next({ request });
  const short = request.cookies.get(SHORT_SESSION_COOKIE)?.value === '1';
  const sb = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, adjustCookieOptions(options, short)));
      },
    },
  });
  const { data: { user } } = await sb.auth.getUser();
  const path = request.nextUrl.pathname;
  if (!user && PROTECTED.some(p => path === p || path.startsWith(p + '/'))) {
    const to = request.nextUrl.clone();
    to.pathname = '/giris';
    to.search = '';
    return NextResponse.redirect(to);
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)'],
};
