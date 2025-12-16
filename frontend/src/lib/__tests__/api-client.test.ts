import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { server } from '../../../tests/setup';
import { createMockSession } from '../../../tests/test-utils';
import { ApiError, type ApiResponse, customFetch, setClientAccessToken } from '../api-client';

// Mock auth function
const mockAuth = vi.fn();
vi.mock('@/auth', () => ({
  auth: () => mockAuth(),
}));

describe('customFetch', () => {
  beforeEach(() => {
    mockAuth.mockReset();
    // Reset client token for test isolation
    setClientAccessToken(null);
  });

  afterEach(() => {
    server.resetHandlers();
  });

  describe('URL handling', () => {
    it('builds full URL from relative path', async () => {
      mockAuth.mockResolvedValue(null);

      let capturedUrl = '';
      server.use(
        http.get('*/api/tutors/', ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ data: 'test' });
        })
      );

      await customFetch('/api/tutors/');

      expect(capturedUrl).toContain('/api/tutors/');
    });

    it('uses absolute URL as-is', async () => {
      mockAuth.mockResolvedValue(null);

      let capturedUrl = '';
      server.use(
        http.get('https://api.example.com/tutors/', ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ data: 'test' });
        })
      );

      await customFetch('https://api.example.com/tutors/');

      expect(capturedUrl).toBe('https://api.example.com/tutors/');
    });
  });

  describe('authentication header', () => {
    it('adds Authorization header when session exists on server-side', async () => {
      // Simulate server-side by removing window
      vi.stubGlobal('window', undefined);

      const mockSession = createMockSession();
      mockAuth.mockResolvedValue(mockSession);

      let capturedAuthHeader: string | null = null;
      server.use(
        http.get('*/api/tutors/', ({ request }) => {
          capturedAuthHeader = request.headers.get('Authorization');
          return HttpResponse.json({ data: 'test' });
        })
      );

      await customFetch('/api/tutors/');

      expect(capturedAuthHeader).toBe('Bearer test-access-token');
    });

    it('does not add Authorization header when no session on server-side', async () => {
      // Simulate server-side by removing window
      vi.stubGlobal('window', undefined);

      mockAuth.mockResolvedValue(null);

      let capturedAuthHeader: string | null = null;
      server.use(
        http.get('*/api/tutors/', ({ request }) => {
          capturedAuthHeader = request.headers.get('Authorization');
          return HttpResponse.json({ data: 'test' });
        })
      );

      await customFetch('/api/tutors/');

      expect(capturedAuthHeader).toBeNull();
    });

    it('continues without auth header if auth throws error', async () => {
      // Simulate server-side by removing window
      vi.stubGlobal('window', undefined);

      mockAuth.mockRejectedValue(new Error('Auth error'));

      let requestReceived = false;
      server.use(
        http.get('*/api/tutors/', () => {
          requestReceived = true;
          return HttpResponse.json({ data: 'test' });
        })
      );

      await customFetch('/api/tutors/');

      expect(requestReceived).toBe(true);
    });

    it('adds Authorization header on client-side when token is set', async () => {
      // Simulate client-side by having window defined
      vi.stubGlobal('window', {});

      setClientAccessToken('client-test-token');

      let capturedAuthHeader: string | null = null;
      server.use(
        http.get('*/api/tutors/', ({ request }) => {
          capturedAuthHeader = request.headers.get('Authorization');
          return HttpResponse.json({ data: 'test' });
        })
      );

      await customFetch('/api/tutors/');

      expect(capturedAuthHeader).toBe('Bearer client-test-token');
    });

    it('does not add Authorization header on client-side when no token is set', async () => {
      // Simulate client-side by having window defined
      vi.stubGlobal('window', {});

      // Token is null (reset in beforeEach)

      let capturedAuthHeader: string | null = null;
      server.use(
        http.get('*/api/tutors/', ({ request }) => {
          capturedAuthHeader = request.headers.get('Authorization');
          return HttpResponse.json({ data: 'test' });
        })
      );

      await customFetch('/api/tutors/');

      expect(capturedAuthHeader).toBeNull();
    });

    it('updates Authorization header when token changes on client-side', async () => {
      // Simulate client-side by having window defined
      vi.stubGlobal('window', {});

      // First request with token A
      setClientAccessToken('token-a');

      let capturedAuthHeader: string | null = null;
      server.use(
        http.get('*/api/tutors/', ({ request }) => {
          capturedAuthHeader = request.headers.get('Authorization');
          return HttpResponse.json({ data: 'test' });
        })
      );

      await customFetch('/api/tutors/');
      expect(capturedAuthHeader).toBe('Bearer token-a');

      // Update token
      setClientAccessToken('token-b');

      await customFetch('/api/tutors/');
      expect(capturedAuthHeader).toBe('Bearer token-b');

      // Clear token (logout)
      setClientAccessToken(null);

      await customFetch('/api/tutors/');
      expect(capturedAuthHeader).toBeNull();
    });
  });

  describe('request headers', () => {
    it('sets Content-Type to application/json by default', async () => {
      mockAuth.mockResolvedValue(null);

      let capturedContentType: string | null = null;
      server.use(
        http.get('*/api/tutors/', ({ request }) => {
          capturedContentType = request.headers.get('Content-Type');
          return HttpResponse.json({ data: 'test' });
        })
      );

      await customFetch('/api/tutors/');

      expect(capturedContentType).toBe('application/json');
    });

    it('merges custom headers with defaults', async () => {
      mockAuth.mockResolvedValue(null);

      let capturedHeaders: { contentType: string | null; custom: string | null } = {
        contentType: null,
        custom: null,
      };
      server.use(
        http.get('*/api/tutors/', ({ request }) => {
          capturedHeaders = {
            contentType: request.headers.get('Content-Type'),
            custom: request.headers.get('X-Custom-Header'),
          };
          return HttpResponse.json({ data: 'test' });
        })
      );

      await customFetch('/api/tutors/', {
        headers: {
          'X-Custom-Header': 'custom-value',
        },
      });

      expect(capturedHeaders.contentType).toBe('application/json');
      expect(capturedHeaders.custom).toBe('custom-value');
    });

    it('allows overriding Content-Type', async () => {
      mockAuth.mockResolvedValue(null);

      let capturedContentType: string | null = null;
      server.use(
        http.get('*/api/tutors/', ({ request }) => {
          capturedContentType = request.headers.get('Content-Type');
          return HttpResponse.json({ data: 'test' });
        })
      );

      await customFetch('/api/tutors/', {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      expect(capturedContentType).toBe('multipart/form-data');
    });
  });

  describe('successful responses', () => {
    it('returns parsed JSON data with metadata', async () => {
      mockAuth.mockResolvedValue(null);
      const mockData = { id: 1, name: 'Test Tutor' };

      server.use(
        http.get('*/api/tutors/1/', () => {
          return HttpResponse.json(mockData, { status: 200 });
        })
      );

      const result = await customFetch<ApiResponse>('/api/tutors/1/');

      expect(result).toMatchObject({
        data: mockData,
        status: 200,
      });
      expect(result.headers).toBeDefined();
      expect(typeof result.headers.get).toBe('function');
    });

    it('handles 204 No Content response', async () => {
      mockAuth.mockResolvedValue(null);

      server.use(
        http.delete('*/api/tutors/1/', () => {
          return new HttpResponse(null, { status: 204 });
        })
      );

      const result = await customFetch<ApiResponse>('/api/tutors/1/', {
        method: 'DELETE',
      });

      expect(result).toMatchObject({
        data: {},
        status: 204,
      });
      expect(result.headers).toBeDefined();
      expect(typeof result.headers.get).toBe('function');
    });
  });

  describe('error handling', () => {
    it('throws ApiError for 400 Bad Request', async () => {
      mockAuth.mockResolvedValue(null);
      const errorData = { error: 'Invalid data' };

      server.use(
        http.get('*/api/tutors/', () => {
          return HttpResponse.json(errorData, { status: 400, statusText: 'Bad Request' });
        })
      );

      await expect(customFetch('/api/tutors/')).rejects.toThrow(ApiError);
    });

    it('throws ApiError for 401 Unauthorized', async () => {
      mockAuth.mockResolvedValue(null);

      server.use(
        http.get('*/api/tutors/', () => {
          return HttpResponse.json(
            { error: 'Unauthorized' },
            { status: 401, statusText: 'Unauthorized' }
          );
        })
      );

      await expect(customFetch('/api/tutors/')).rejects.toThrow(ApiError);
    });

    it('throws ApiError for 403 Forbidden', async () => {
      mockAuth.mockResolvedValue(null);

      server.use(
        http.get('*/api/tutors/', () => {
          return HttpResponse.json(
            { error: 'Forbidden' },
            { status: 403, statusText: 'Forbidden' }
          );
        })
      );

      await expect(customFetch('/api/tutors/')).rejects.toThrow(ApiError);
    });

    it('throws ApiError for 404 Not Found', async () => {
      mockAuth.mockResolvedValue(null);

      server.use(
        http.get('*/api/tutors/999/', () => {
          return HttpResponse.json(
            { error: 'Not found' },
            { status: 404, statusText: 'Not Found' }
          );
        })
      );

      await expect(customFetch('/api/tutors/999/')).rejects.toThrow(ApiError);
    });

    it('throws ApiError for 500 Internal Server Error', async () => {
      mockAuth.mockResolvedValue(null);

      server.use(
        http.get('*/api/tutors/', () => {
          return HttpResponse.json(
            { error: 'Server error' },
            { status: 500, statusText: 'Internal Server Error' }
          );
        })
      );

      await expect(customFetch('/api/tutors/')).rejects.toThrow(ApiError);
    });

    it('includes error data in ApiError', async () => {
      mockAuth.mockResolvedValue(null);
      const errorData = { error: 'Validation failed', fields: ['name', 'email'] };

      server.use(
        http.get('*/api/tutors/', () => {
          return HttpResponse.json(errorData, { status: 400, statusText: 'Bad Request' });
        })
      );

      try {
        await customFetch('/api/tutors/');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        if (error instanceof ApiError) {
          expect(error.status).toBe(400);
          expect(error.statusText).toBe('Bad Request');
          expect(error.data).toEqual(errorData);
        }
      }
    });

    it('handles non-JSON error responses', async () => {
      mockAuth.mockResolvedValue(null);

      server.use(
        http.get('*/api/tutors/', () => {
          return new HttpResponse('Plain text error', {
            status: 500,
            statusText: 'Internal Server Error',
          });
        })
      );

      try {
        await customFetch('/api/tutors/');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        if (error instanceof ApiError) {
          expect(error.status).toBe(500);
          expect(error.data).toEqual({});
        }
      }
    });
  });

  describe('request options', () => {
    it('passes method option to fetch', async () => {
      mockAuth.mockResolvedValue(null);

      let capturedMethod = '';
      server.use(
        http.post('*/api/tutors/', ({ request }) => {
          capturedMethod = request.method;
          return HttpResponse.json({ success: true }, { status: 201 });
        })
      );

      await customFetch('/api/tutors/', { method: 'POST' });

      expect(capturedMethod).toBe('POST');
    });

    it('passes body option to fetch', async () => {
      mockAuth.mockResolvedValue(null);

      let capturedBody = '';
      server.use(
        http.post('*/api/tutors/', async ({ request }) => {
          capturedBody = await request.text();
          return HttpResponse.json({ success: true }, { status: 201 });
        })
      );

      const body = JSON.stringify({ name: 'Test' });
      await customFetch('/api/tutors/', { method: 'POST', body });

      expect(capturedBody).toBe(body);
    });

    it('passes all fetch options', async () => {
      mockAuth.mockResolvedValue(null);

      let capturedRequest: { method: string; body: string } = { method: '', body: '' };
      server.use(
        http.post('*/api/tutors/', async ({ request }) => {
          capturedRequest = {
            method: request.method,
            body: await request.text(),
          };
          return HttpResponse.json({ data: 'test' }, { status: 200 });
        })
      );

      await customFetch('/api/tutors/', {
        method: 'POST',
        body: JSON.stringify({ test: 'data' }),
      });

      expect(capturedRequest.method).toBe('POST');
      expect(capturedRequest.body).toBe(JSON.stringify({ test: 'data' }));
    });
  });
});

describe('ApiError', () => {
  it('creates error with status, statusText, and data', () => {
    const error = new ApiError(404, 'Not Found', { message: 'Resource not found' });

    expect(error.status).toBe(404);
    expect(error.statusText).toBe('Not Found');
    expect(error.data).toEqual({ message: 'Resource not found' });
  });

  it('has correct error message', () => {
    const error = new ApiError(400, 'Bad Request', {});

    expect(error.message).toBe('API Error: 400 Bad Request');
  });

  it('has correct error name', () => {
    const error = new ApiError(500, 'Internal Server Error', {});

    expect(error.name).toBe('ApiError');
  });

  it('is instance of Error', () => {
    const error = new ApiError(403, 'Forbidden', {});

    expect(error).toBeInstanceOf(Error);
  });
});
