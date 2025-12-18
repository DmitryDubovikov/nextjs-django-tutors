import { MessageCircle } from 'lucide-react';
import Link from 'next/link';

import { auth } from '@/auth';
import { UserMenu } from '@/components/features/auth/user-menu';

export async function Header() {
  const session = await auth();

  return (
    <header className="border-muted-200 border-b bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="font-bold text-foreground text-xl">
            Tutors Marketplace
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <Link href="/tutors" className="text-muted-foreground text-sm hover:text-foreground">
              Find Tutors
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {session ? (
            <>
              {session.user.userType !== 'tutor' && (
                <Link
                  href="/tutors/create"
                  className="hidden rounded-lg border border-primary bg-white px-4 py-2 font-medium text-primary text-sm transition-colors hover:bg-primary-50 md:block"
                >
                  Become a Tutor
                </Link>
              )}
              <a
                href="/chat"
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title="Messages"
              >
                <MessageCircle className="h-5 w-5" />
              </a>
              <UserMenu />
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground text-sm transition-colors hover:bg-primary-600"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
