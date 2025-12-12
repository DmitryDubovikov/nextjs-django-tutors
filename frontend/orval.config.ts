import { defineConfig } from 'orval';

export default defineConfig({
  tutors: {
    input: {
      target: './src/generated/schema.json',
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
