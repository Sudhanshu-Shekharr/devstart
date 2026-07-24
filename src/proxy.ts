import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function proxy(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const isAuth = !!token;

  const isDashboardRoute = request.nextUrl.pathname.startsWith('/dashboard');
  const isApiRoute = request.nextUrl.pathname.startsWith('/api');
  const isAuthRoute = request.nextUrl.pathname.startsWith('/api/auth');

  // Skip proxy for auth routes
  if (isAuthRoute) {
    return NextResponse.next();
  }

  // Protect /dashboard
  if (isDashboardRoute && !isAuth) {
    return NextResponse.redirect(new URL('/api/auth/signin', request.url));
  }

  // Protect mutating /api routes (POST, PUT, DELETE, PATCH)
  // GET endpoints are intentionally public (e.g. /api/internships browse API)
  if (isApiRoute && !isAuth) {
    const isMutatingRequest = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method);
    if (isMutatingRequest) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
};
