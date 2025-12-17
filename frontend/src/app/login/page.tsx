import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { LoginContent } from './login-content';

export const metadata: Metadata = {
  title: 'Sign In - Tutors Marketplace',
  description: 'Sign in to find and book tutors',
};

export default async function LoginPage() {
  const session = await auth();

  if (session) {
    redirect('/');
  }

  // Check if credentials auth is enabled
  const credentialsEnabled = process.env.ENABLE_CREDENTIALS_AUTH === 'true';

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="font-bold text-2xl text-foreground">
            Tutors Marketplace
          </Link>
          <p className="mt-2 text-muted-foreground">Sign in to continue</p>
        </div>

        <LoginContent credentialsEnabled={credentialsEnabled} />

        <p className="mt-6 text-center text-muted-foreground text-sm">
          <Link href="/" className="text-primary hover:underline">
            Back to home
          </Link>
        </p>
      </div>
    </main>
  );
}
