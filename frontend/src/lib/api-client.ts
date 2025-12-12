/**
 * Custom fetch client for API requests.
 * Used as the mutator for orval-generated hooks.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Custom fetch function for orval-generated hooks.
 * Orval calls this with (url, options) signature.
 */
export async function customFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const fetchOptions = options;
  // Build full URL
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

  // Prepare headers
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...fetchOptions?.headers,
  };

  // Make request
  const response = await fetch(fullUrl, {
    ...fetchOptions,
    headers,
  });

  // Handle errors
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(response.status, response.statusText, errorData);
  }

  // Parse response
  if (response.status === 204) {
    return {} as T;
  }

  const data = await response.json();

  return data as T;
}

/**
 * API error class with status and data.
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public data: unknown
  ) {
    super(`API Error: ${status} ${statusText}`);
    this.name = 'ApiError';
  }
}

export default customFetch;
