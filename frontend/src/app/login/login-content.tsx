'use client';

import { useState } from 'react';

import { CredentialsForm } from '@/components/features/auth/credentials-form';
import { SignInButton } from '@/components/features/auth/sign-in-button';

interface LoginContentProps {
  credentialsEnabled: boolean;
}

export function LoginContent({ credentialsEnabled }: LoginContentProps) {
  const [showCredentials, setShowCredentials] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');

  return (
    <div className="rounded-xl border border-muted-200 bg-white p-6 shadow-sm">
      {/* OAuth Buttons */}
      <div className="space-y-3">
        <SignInButton provider="google" />
        <SignInButton provider="github" />
      </div>

      {/* Credentials Form (if enabled) */}
      {credentialsEnabled && (
        <>
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-muted-200" />
            <span className="text-muted-foreground text-sm">or</span>
            <div className="h-px flex-1 bg-muted-200" />
          </div>

          {showCredentials ? (
            <>
              <CredentialsForm mode={mode} />

              <div className="mt-4 text-center text-sm">
                {mode === 'login' ? (
                  <>
                    Don&apos;t have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('register')}
                      className="text-primary hover:underline"
                    >
                      Create one
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className="text-primary hover:underline"
                    >
                      Sign in
                    </button>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowCredentials(false)}
                className="mt-3 w-full text-center text-muted-foreground text-sm hover:underline"
              >
                Back to OAuth options
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setShowCredentials(true)}
              className="flex w-full items-center justify-center rounded-lg border border-muted-300 bg-white px-4 py-3 font-medium text-foreground transition-colors hover:bg-muted-50"
            >
              <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <title>Email</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              Sign in with Email
            </button>
          )}

          <div className="mt-4 rounded-lg bg-yellow-50 p-3 text-center text-xs text-yellow-700">
            Credentials auth will be disabled soon. Please switch to OAuth.
          </div>
        </>
      )}

      <p className="mt-6 text-center text-muted-foreground text-sm">
        By signing in, you agree to our Terms of Service and Privacy Policy
      </p>
    </div>
  );
}
