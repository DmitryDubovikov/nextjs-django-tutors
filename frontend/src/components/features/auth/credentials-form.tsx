'use client';

import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface CredentialsFormProps {
  mode: 'login' | 'register';
}

export function CredentialsForm({ mode }: CredentialsFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (mode === 'register') {
        // First register the user via API
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const res = await fetch(`${API_URL}/api/auth/register/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            first_name: firstName,
            last_name: lastName,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || 'Registration failed');
          setIsLoading(false);
          return;
        }
      }

      // Sign in with credentials
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password');
        setIsLoading(false);
        return;
      }

      // Redirect to home on success
      router.push('/');
      router.refresh();
    } catch {
      setError('An error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {mode === 'register' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="firstName" className="mb-1 block font-medium text-sm">
              First Name
            </label>
            <input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full rounded-lg border border-muted-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="John"
            />
          </div>
          <div>
            <label htmlFor="lastName" className="mb-1 block font-medium text-sm">
              Last Name
            </label>
            <input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full rounded-lg border border-muted-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Doe"
            />
          </div>
        </div>
      )}

      <div>
        <label htmlFor="email" className="mb-1 block font-medium text-sm">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-lg border border-muted-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="test@example.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1 block font-medium text-sm">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="w-full rounded-lg border border-muted-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="••••••••"
        />
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-red-600 text-sm">{error}</div>}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-lg bg-primary px-4 py-3 font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? 'Loading...' : mode === 'login' ? 'Sign In' : 'Create Account'}
      </button>
    </form>
  );
}
