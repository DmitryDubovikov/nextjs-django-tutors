/**
 * Next.js middleware for route protection.
 *
 * Uses Auth.js v5 middleware to protect routes that require authentication.
 */

export { auth as middleware } from '@/auth';

export const config = {
  matcher: ['/tutors/create', '/bookings/:path*'],
};
