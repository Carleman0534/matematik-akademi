import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Her istekte Supabase oturumunu yeniler ve giriş yapmamış kullanıcıyı korunan sayfalardan giriş ekranına yönlendirir.
// Rol (öğretmen/öğrenci) denetimi sayfa düzenlerinde ve veritabanında (RLS) yapılır.
const PROTECTED = ['/ogretmen', '/ogrenci', '/veli', '/soru', '/coz'];

const DAY = 60 * 60 * 24;

// Kayan oturum: etkin kullanıcının oturum çerezi her istekte yenilenir. Böylece 24 saatlik süre,
// kullanıcı sitedeyken (ör. uzun bir sınavın ortasında) dolmaz; yalnızca hiç etkinlik olmazsa dolar.
// "Beni hatırla" seçildiyse süre 30 gün, değilse 1 gündür (girişte çereze yazılan `remember` alanı).
function slideLocalSession(request: NextRequest, res: NextResponse, rawSession: string) {
  let remember: unknown;
  try { remember = JSON.parse(rawSession)?.remember; } catch { return; }
  // `remember` alanı olmayan eski oturum çerezlerine dokunulmaz (süreleri girişte belirlenmişti)
  if (typeof remember !== 'boolean') return;
  const maxAge = remember ? DAY * 30 : DAY;

  res.cookies.set('local_session', rawSession, { httpOnly: true, path: '/', maxAge });
  // İstemci sayfalarının okuduğu öğrenci çerezleri de oturumla birlikte yaşasın
  for (const name of ['student_id', 'studentId', 'active_student_name']) {
    const v = request.cookies.get(name)?.value;
    if (v !== undefined) res.cookies.set(name, v, { path: '/', maxAge, sameSite: 'lax', httpOnly: false });
  }
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED.some(p => path === p || path.startsWith(p + '/'));

  // 1. Yerel / Fallback oturum çerezi varsa doğrudan izin ver
  const localSession = request.cookies.get('local_session')?.value;
  if (localSession) {
    const res = NextResponse.next({ request });
    slideLocalSession(request, res, localSession);
    return res;
  }

  // 2. Yerel modda Supabase auth yerine yerel oturum çerezi denetlenir
  if (process.env.LOCAL_MODE === 'true') {
    if (!localSession && isProtected) {
      const to = request.nextUrl.clone();
      to.pathname = '/giris';
      to.search = '';
      return NextResponse.redirect(to);
    }
    return NextResponse.next({ request });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    if (isProtected) {
      const to = request.nextUrl.clone();
      to.pathname = '/giris';
      to.search = '';
      return NextResponse.redirect(to);
    }
    return NextResponse.next();
  }

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

  try {
    const { data: { user } } = await sb.auth.getUser();
    if (!user && isProtected) {
      const to = request.nextUrl.clone();
      to.pathname = '/giris';
      to.search = '';
      return NextResponse.redirect(to);
    }
  } catch {
    if (isProtected) {
      const to = request.nextUrl.clone();
      to.pathname = '/giris';
      to.search = '';
      return NextResponse.redirect(to);
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)'],
};
