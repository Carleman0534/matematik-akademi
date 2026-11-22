import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { verifySession, type SessionPayload } from '@/lib/sessionCookie';

// Her istekte oturumu doğrular ve giriş yapmamış kullanıcıyı korunan sayfalardan giriş ekranına yönlendirir.
// Oturum çerezi (local_session) HMAC ile imzalıdır; imzasız, değiştirilmiş ya da eski biçimdeki çerez geçersizdir.
// /api/* uç noktaları geçerli bir oturum olmadan çalışmaz; öğretmene özel olanlar rol de ister.
const PROTECTED = ['/ogretmen', '/ogrenci', '/veli', '/soru', '/coz'];

const DAY = 60 * 60 * 24;

// Kayan oturum: etkin kullanıcının oturum çerezi her istekte yenilenir. Böylece 24 saatlik süre,
// kullanıcı sitedeyken (ör. uzun bir sınavın ortasında) dolmaz; yalnızca hiç etkinlik olmazsa dolar.
// "Beni hatırla" seçildiyse süre 30 gün, değilse 1 gündür.
function slideLocalSession(request: NextRequest, res: NextResponse, rawSession: string, session: SessionPayload) {
  const maxAge = session.remember ? DAY * 30 : DAY;
  res.cookies.set('local_session', rawSession, { httpOnly: true, path: '/', maxAge });
  // İstemci sayfalarının okuduğu öğrenci çerezleri de oturumla birlikte yaşasın
  for (const name of ['student_id', 'studentId', 'active_student_name']) {
    const v = request.cookies.get(name)?.value;
    if (v !== undefined) res.cookies.set(name, v, { path: '/', maxAge, sameSite: 'lax', httpOnly: false });
  }
}

// Yalnızca öğretmenin kullanabileceği API'ler. Öğrenci ve veli sayfalarının kullandıkları (deneme çözme, sonuç,
// çalışma planı, tekrar, rozet, veli verisi vb.) burada YOKTUR; onların kendi yetki denetimi uç noktadadır.
const TEACHER_API_PREFIXES = [
  '/api/exams', '/api/teacher', '/api/lgs/curriculum', '/api/lgs/generate-questions', '/api/lgs/pdf-extract',
  '/api/lgs/extracted-questions', '/api/lgs/pdf-analysis', '/api/lgs/question-pool', '/api/reports/export',
  '/api/system/audit-logs', '/api/questions/quality-audit',
];
const TEACHER_API_EXACT = ['/api/guardians', '/api/guardians/messages', '/api/exam-sessions/live'];

function isTeacherOnlyApi(path: string, method: string): boolean {
  if (TEACHER_API_EXACT.includes(path)) return true;
  if (TEACHER_API_PREFIXES.some((p) => path === p || path.startsWith(p + '/'))) return true;
  if (/^\/api\/exam-sessions\/[^/]+\/extend-time$/.test(path)) return true;
  // PDF/deneme arşivi: okumak (liste, dosya, optik form) herkese açık oturumla; yüklemek, düzenlemek, silmek öğretmene.
  // Öğrencinin kendi denemesini başlatması ve göndermesi (session, submit) hariç.
  if (path === '/api/pdf-documents' || path.startsWith('/api/pdf-documents/')) {
    if (method === 'GET' || method === 'HEAD') return false;
    return !/^\/api\/pdf-documents\/[^/]+\/(submit|session)$/.test(path);
  }
  if (path === '/api/exam-pdfs' || path === '/api/system/exam-countdown') return method !== 'GET' && method !== 'HEAD';
  return false;
}

function apiError(status: number, error: string) {
  return NextResponse.json({ success: false, error }, { status });
}

function redirectToLogin(request: NextRequest) {
  const to = request.nextUrl.clone();
  to.pathname = '/giris';
  to.search = '';
  return NextResponse.redirect(to);
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED.some(p => path === p || path.startsWith(p + '/'));
  const isApi = path === '/api' || path.startsWith('/api/');

  // 1. Geçerli (imzalı) oturum çerezi
  const rawSession = request.cookies.get('local_session')?.value;
  const session = rawSession ? await verifySession(rawSession) : null;
  if (session && rawSession) {
    if (isApi && isTeacherOnlyApi(path, request.method) && session.role !== 'teacher') {
      return apiError(403, 'Bu işlem yalnızca öğretmene açıktır.');
    }
    const res = NextResponse.next({ request });
    slideLocalSession(request, res, rawSession, session);
    return res;
  }

  // Çerez vardı ama geçersiz (imzasız, değiştirilmiş, eski biçim): tarayıcıdan sil
  const dropBadCookie = (res: NextResponse) => {
    if (rawSession) res.cookies.delete('local_session');
    return res;
  };

  // 2. Yerel modda Supabase auth yerine yalnızca yerel oturum çerezi denetlenir
  if (process.env.LOCAL_MODE === 'true') {
    if (isApi) return dropBadCookie(apiError(401, 'Oturum gerekli; yeniden giriş yapın.'));
    if (isProtected) return dropBadCookie(redirectToLogin(request));
    return dropBadCookie(NextResponse.next({ request }));
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    if (isApi) return dropBadCookie(apiError(401, 'Oturum gerekli; yeniden giriş yapın.'));
    if (isProtected) return dropBadCookie(redirectToLogin(request));
    return dropBadCookie(NextResponse.next());
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
    if (!user && isApi) return dropBadCookie(apiError(401, 'Oturum gerekli; yeniden giriş yapın.'));
    if (!user && isProtected) return dropBadCookie(redirectToLogin(request));
  } catch {
    if (isApi) return dropBadCookie(apiError(401, 'Oturum gerekli; yeniden giriş yapın.'));
    if (isProtected) return dropBadCookie(redirectToLogin(request));
  }

  return dropBadCookie(response);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)'],
};
