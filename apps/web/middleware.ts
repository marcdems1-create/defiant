import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Cookie name must match ADMIN_COOKIE in lib/admin/auth.ts. Do not import
// that module here — it is server-only (next/headers + crypto).

export function middleware(request: NextRequest) {
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
  matcher: ['/admin', '/admin/:path*'],
};
