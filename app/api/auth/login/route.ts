import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthConfigured, verifyAdminCredentials } from '@/lib/auth';
import { adminSessionCookie, createSessionToken } from '@/lib/session';

function isSameOrigin(request: NextRequest): boolean {
  return request.headers.get('origin') === request.nextUrl.origin;
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Request origin is not allowed.' }, { status: 403 });
  }

  if (!isAdminAuthConfigured()) {
    return NextResponse.json(
      { error: 'Admin sign-in is not configured. Contact the administrator.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 4096) {
    return NextResponse.json({ error: 'Request is too large.' }, { status: 413 });
  }

  let body: unknown;
  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).length > 4096) {
      return NextResponse.json({ error: 'Request is too large.' }, { status: 413 });
    }
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const credentials = body as Record<string, unknown>;
  if (
    typeof credentials.username !== 'string' ||
    typeof credentials.password !== 'string' ||
    credentials.username.trim().length === 0 ||
    credentials.username.length > 128 ||
    credentials.password.length === 0 ||
    credentials.password.length > 1024
  ) {
    return NextResponse.json({ error: 'Invalid username or password.' }, { status: 400 });
  }

  if (!(await verifyAdminCredentials(credentials.username, credentials.password))) {
    return NextResponse.json(
      { error: 'Invalid username or password.' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const username = process.env.AUTH_USERNAME?.trim();
  if (!username) {
    return NextResponse.json(
      { error: 'Admin sign-in is not configured. Contact the administrator.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const rememberMe = credentials.rememberMe === true;
  const { token, maxAge } = await createSessionToken(username, rememberMe);
  const response = NextResponse.json({ success: true });
  response.headers.set('Cache-Control', 'no-store');
  response.cookies.set(adminSessionCookie, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge,
  });
  return response;
}
