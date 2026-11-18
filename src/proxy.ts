import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Her istekte Supabase oturumunu yeniler ve giriş yapmamış kullanıcıyı korunan sayfalardan giriş ekranına yönlendirir.
// Rol (öğretmen/öğrenci) denetimi sayfa düzenlerinde ve veritabanında (RLS) yapılır.
const PROTECTED = ['/ogretmen', '/ogrenci', '/soru', '/coz'];

export async function proxy(request: NextRequest) {
  // Yerel modda Supabase auth yerine yerel oturum çerezi denetlenir
  if (process.env.LOCAL_MODE === 'true') {
    const localSession = request.cookies.get('local_session')?.value;
    const path = request.nextUrl.pathname;
    const isProtected = ['/ogretmen', '/ogrenci', '/veli', '/soru', '/coz'].some(p => path === p || path.startsWith(p + '/'));
    if (!localSession && isProtected) {
      const to = request.nextUrl.clone();
      to.pathname = '/giris';
      to.search = '';
      return NextResponse.redirect(to);
    }
    return NextResponse.next({ request });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next();
  let response = NextResponse.next({ request });
  const sb = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
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
