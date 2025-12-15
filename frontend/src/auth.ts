/**
 * Auth.js v5 configuration for Next.js.
 *
 * Sets up Google and GitHub OAuth providers and handles
 * exchanging OAuth tokens for Django JWT tokens.
 */

import NextAuth, { type User } from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';

declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    refreshToken?: string;
    error?: string;
    user: User & {
      id: string;
      userType?: string;
    };
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    error?: string;
    backendUser?: {
      id: number;
      email: string;
      first_name: string;
      last_name: string;
      avatar: string;
      user_type: string;
    };
  }
}

const INTERNAL_API_URL = process.env.INTERNAL_API_URL || 'http://backend:8000';

/** Access token lifetime in milliseconds (14 minutes to refresh before 15min expiry) */
const ACCESS_TOKEN_LIFETIME_MS = 14 * 60 * 1000;

/**
 * Refresh the access token using the refresh token.
 */
async function refreshAccessToken(token: {
  refreshToken?: string;
  backendUser?: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    avatar: string;
    user_type: string;
  };
}): Promise<{
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpires?: number;
  error?: string;
  backendUser?: typeof token.backendUser;
}> {
  try {
    const res = await fetch(`${INTERNAL_API_URL}/api/auth/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: token.refreshToken }),
    });

    if (!res.ok) {
      console.error('Token refresh failed:', res.status);
      return {
        ...token,
        error: 'RefreshAccessTokenError',
      };
    }

    const data = await res.json();
    return {
      accessToken: data.access,
      refreshToken: data.refresh ?? token.refreshToken,
      accessTokenExpires: Date.now() + ACCESS_TOKEN_LIFETIME_MS,
      backendUser: token.backendUser,
    };
  } catch (error) {
    console.error('Token refresh error:', error);
    return {
      ...token,
      error: 'RefreshAccessTokenError',
    };
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      authorization: { params: { prompt: 'consent', access_type: 'offline' } },
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID ?? '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? '',
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // Initial sign in - exchange OAuth token for Django JWT
      if (account) {
        const endpoint = account.provider === 'google' ? '/api/auth/google/' : '/api/auth/github/';
        const body =
          account.provider === 'google'
            ? { id_token: account.id_token }
            : { access_token: account.access_token };

        try {
          const res = await fetch(`${INTERNAL_API_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });

          if (!res.ok) {
            const errorText = await res.text();
            console.error('Backend auth failed:', errorText);
            token.error = 'BackendAuthError';
            return token;
          }

          const data = await res.json();
          token.accessToken = data.access;
          token.refreshToken = data.refresh;
          token.accessTokenExpires = Date.now() + ACCESS_TOKEN_LIFETIME_MS;
          token.backendUser = data.user;
          token.error = undefined;
        } catch (error) {
          console.error('Backend auth error:', error);
          token.error = 'BackendAuthError';
        }
        return token;
      }

      // Return previous token if it hasn't expired yet
      if (token.accessTokenExpires && Date.now() < token.accessTokenExpires) {
        return token;
      }

      // Access token has expired, try to refresh it
      if (token.refreshToken) {
        const refreshedToken = await refreshAccessToken(token);
        return {
          ...token,
          ...refreshedToken,
        };
      }

      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.refreshToken = token.refreshToken;
      session.error = token.error;
      if (token.backendUser) {
        session.user = {
          ...session.user,
          id: String(token.backendUser.id),
          name: `${token.backendUser.first_name} ${token.backendUser.last_name}`.trim(),
          email: token.backendUser.email,
          image: token.backendUser.avatar,
          userType: token.backendUser.user_type,
        };
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
});
