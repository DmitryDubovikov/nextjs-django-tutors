import { auth } from '@/auth';

const PROTECTED_ROUTES = ['/tutors/create', '/bookings'];
const ADMIN_ROUTES = ['/admin'];

export default auth((req) => {
  const isProtected = PROTECTED_ROUTES.some((route) => req.nextUrl.pathname.startsWith(route));
  const isAdminRoute = ADMIN_ROUTES.some((route) => req.nextUrl.pathname.startsWith(route));

  if ((isProtected || isAdminRoute) && !req.auth) {
    const loginUrl = new URL('/login', req.nextUrl.origin);
    loginUrl.searchParams.set('callbackUrl', req.nextUrl.pathname);
    return Response.redirect(loginUrl);
  }

  if (isAdminRoute && !req.auth?.user?.isStaff) {
    return Response.redirect(new URL('/', req.nextUrl.origin));
  }

  return undefined;
});

export const config = {
  matcher: ['/tutors/create', '/bookings/:path*', '/admin/:path*'],
};
