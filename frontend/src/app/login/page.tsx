import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { SignInButton } from '@/components/features/auth/sign-in-button';

export const metadata: Metadata = {
  title: 'Sign In - Tutors Marketplace',
  description: 'Sign in to find and book tutors',
};

export default async function LoginPage() {
  const session = await auth();

  if (session) {
    redirect('/');
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="font-bold text-2xl text-foreground">
            Tutors Marketplace
          </Link>
          <p className="mt-2 text-muted-foreground">Sign in to continue</p>
        </div>

        <div className="rounded-xl border border-muted-200 bg-white p-6 shadow-sm">
          <div className="space-y-3">
            <SignInButton provider="google" />
            <SignInButton provider="github" />
          </div>

          <p className="mt-6 text-center text-muted-foreground text-sm">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>

        <p className="mt-6 text-center text-muted-foreground text-sm">
          <Link href="/" className="text-primary hover:underline">
            Back to home
          </Link>
        </p>
      </div>
    </main>
  );
}
