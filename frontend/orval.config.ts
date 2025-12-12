import { defineConfig } from 'orval';

export default defineConfig({
  tutors: {
    input: {
      target: 'http://localhost:8000/api/schema/',
    },
    output: {
      mode: 'tags-split',
      target: './src/generated/api',
      schemas: './src/generated/schemas',
      client: 'react-query',
      httpClient: 'fetch',
      clean: true,
      override: {
        mutator: {
          path: './src/lib/api-client.ts',
          name: 'customFetch',
        },
        query: {
          useQuery: true,
          useMutation: true,
          signal: false,
        },
      },
    },
  },
});
