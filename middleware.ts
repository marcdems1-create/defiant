import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { LEGACY_REDIRECT_HOSTS, PRODUCTION_HOST } from '@/lib/config/site';

// Cookie name must match ADMIN_COOKIE in lib/admin/auth.ts. Do not import
// that module here — it is server-only (next/headers + crypto).

function canonicalHostRedirect(request: NextRequest): NextResponse | null {
  const host = request.headers.get('host')?.split(':')[0]?.toLowerCase();
  if (!host || host === PRODUCTION_HOST) return null;
  if (!(LEGACY_REDIRECT_HOSTS as readonly string[]).includes(host)) return null;

  const url = request.nextUrl.clone();
  url.hostname = PRODUCTION_HOST;
  url.protocol = 'https:';
  url.port = '';
  return NextResponse.redirect(url, 308);
}

export function middleware(request: NextRequest) {
  const canonical = canonicalHostRedirect(request);
  if (canonical) return canonical;

  const { pathname } = request.nextUrl;
  const isAdminApp =
    pathname === '/admin' ||
    (pathname.startsWith('/admin/') && !pathname.startsWith('/admin/login'));
  if (isAdminApp && !request.cookies.get('oh_admin')?.value) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
