'use client';

import { signOut, useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

export function UserMenu() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = useCallback(() => setIsOpen((prev) => !prev), []);
  const closeMenu = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeMenu();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeMenu]);

  if (!session?.user) {
    return null;
  }

  const user = session.user;
  const initials = `${user.name?.charAt(0) || user.email?.charAt(0) || 'U'}`;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggleMenu}
        className="flex items-center gap-2 rounded-full p-1 transition-colors hover:bg-muted-100"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {user.image ? (
          <Image
            src={user.image}
            alt={user.name || 'User avatar'}
            width={36}
            height={36}
            className="rounded-full"
          />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
            {initials}
          </div>
        )}
      </button>

      {isOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            onClick={closeMenu}
            aria-label="Close menu"
          />
          <div className="absolute right-0 z-50 mt-2 w-56 rounded-lg border border-muted-200 bg-white py-1 shadow-lg">
            <div className="border-muted-200 border-b px-4 py-3">
              <p className="font-medium text-foreground text-sm">{user.name}</p>
              <p className="text-muted-foreground text-sm">{user.email}</p>
            </div>

            <nav className="py-1">
              {session.user.userType !== 'tutor' && (
                <Link
                  href="/tutors/create"
                  onClick={closeMenu}
                  className="block px-4 py-2 text-foreground text-sm transition-colors hover:bg-muted-50"
                >
                  Become a Tutor
                </Link>
              )}
              <Link
                href="/bookings"
                onClick={closeMenu}
                className="block px-4 py-2 text-foreground text-sm transition-colors hover:bg-muted-50"
              >
                My Bookings
              </Link>
            </nav>

            <div className="border-muted-200 border-t py-1">
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: '/' })}
                className="block w-full px-4 py-2 text-left text-red-600 text-sm transition-colors hover:bg-muted-50"
              >
                Sign out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
