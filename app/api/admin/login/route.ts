import { NextResponse } from 'next/server';
import { ADMIN_COOKIE, adminCookieValue, adminConfigured, verifyAdminPassword } from '@/lib/admin/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!adminConfigured()) {
    return NextResponse.json({ error: 'Admin is not configured' }, { status: 503 });
  }

  let password = '';
  try {
    const body = (await request.json()) as { password?: string };
    password = typeof body.password === 'string' ? body.password : '';
  } catch {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }

  if (!verifyAdminPassword(password)) {
    return NextResponse.json({ error: 'Wrong password' }, { status: 401 });
  }

  const token = adminCookieValue();
  if (!token) {
    return NextResponse.json({ error: 'Admin is not configured' }, { status: 503 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 14,
  });
  return res;
}
