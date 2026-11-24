import { NextRequest, NextResponse } from 'next/server';
import { adminSessionCookie, verifySessionToken } from '@/lib/session';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isStaticAsset =
    pathname.startsWith('/_next/') ||
    (!pathname.startsWith('/api/') &&
      /\.(?:png|jpe?g|svg|webp|gif|ico|woff2?|ttf|otf|mp3|wav|m4a|aac|mp4|webm|pdf)$/i.test(
        pathname
      ));
  const isPublicRoute =
    pathname === '/' ||
    pathname === '/tv' ||
    pathname === '/tv/' ||
    pathname === '/track' ||
    pathname === '/track/' ||
    pathname === '/login' ||
    pathname === '/api/tv/queue' ||
    pathname === '/api/track' ||
    pathname === '/api/track/' ||
    pathname === '/api/auth/login' ||
    pathname === '/api/auth/logout' ||
    isStaticAsset;

  if (
    ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method) &&
    request.headers.get('origin') !== request.nextUrl.origin
  ) {
    return NextResponse.json(
      { error: 'Request origin is not allowed.' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  if (isPublicRoute) return NextResponse.next();

  const token = request.cookies.get(adminSessionCookie)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (session) {
    const response = NextResponse.next();
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      { error: 'Authentication required.' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/login';
  loginUrl.search = '';
  loginUrl.searchParams.set(
    'next',
    `${pathname}${request.nextUrl.search}`
  );
  const response = NextResponse.redirect(loginUrl);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
