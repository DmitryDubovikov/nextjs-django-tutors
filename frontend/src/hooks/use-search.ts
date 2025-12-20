import { type SearchParams, searchTutors } from '@/lib/search-client';
import { useQuery } from '@tanstack/react-query';

export function useSearch(params: SearchParams, enabled = true) {
  return useQuery({
    queryKey: ['search', params],
    queryFn: () => searchTutors(params),
    staleTime: 30000,
    enabled,
  });
}
