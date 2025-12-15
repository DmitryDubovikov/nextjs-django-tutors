import { auth } from '@/auth';

const PROTECTED_ROUTES = ['/tutors/create', '/bookings'];

export default auth((req) => {
  const isProtected = PROTECTED_ROUTES.some((route) => req.nextUrl.pathname.startsWith(route));

  if (isProtected && !req.auth) {
    const loginUrl = new URL('/login', req.nextUrl.origin);
    loginUrl.searchParams.set('callbackUrl', req.nextUrl.pathname);
    return Response.redirect(loginUrl);
  }

  return undefined;
});

export const config = {
  matcher: ['/tutors/create', '/bookings/:path*'],
};
