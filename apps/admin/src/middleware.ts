import { NextResponse, type NextRequest } from 'next/server';

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? 'trustnear_admin_session';
const PUBLIC_PATHS = ['/login'];

/**
 * Route guard. Unauthed users hitting protected paths are bounced to /login.
 * Authed users hitting /login are bounced to /dashboard.
 *
 * Verifying the token's signature/role would require importing jose here, but
 * Edge Runtime can't read from Node modules — so we only check existence at the
 * edge and re-verify in each server component via apiFetch (the API rejects
 * invalid tokens with 401, which surfaces as an error.tsx).
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = req.cookies.has(COOKIE_NAME);
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!hasSession && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  if (hasSession && isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = '/dashboard';
    url.search = '';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
