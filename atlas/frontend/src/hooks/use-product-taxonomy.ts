import { useQuery } from '@tanstack/react-query';
import * as productTaxonomyService from '@/services/product-taxonomy.service';
import { useAuthStore } from '@/stores';

const KEY = 'trending-concepts';

/** Read-only — never triggers a provider call itself, just reads whatever a TREND_COLD_START discovery session has already persisted. */
export function useTrendingConcepts(limit = 20) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [KEY, limit],
    queryFn: () => productTaxonomyService.listTrendingConcepts(limit),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
}
