import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as searchService from '@/services/search.service';
import { globalSearch } from '@/services/search.service';
import { QUERY_KEYS } from '@/constants';
import { useAuthStore } from '@/stores';
import { useToast } from './use-toast';
import { useDebounce } from './use-debounce';
import type { CreateSavedSearchPayload, GlobalSearchFilterParams, UpdateSavedSearchPayload } from '@/types';

export function useGlobalSearch(rawQuery: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const query = useDebounce(rawQuery.trim(), 300);

  return useQuery({
    queryKey: [QUERY_KEYS.GLOBAL_SEARCH, query],
    queryFn: () => globalSearch({ q: query, limit: 20 }),
    enabled: isAuthenticated && query.length >= 2,
    staleTime: 15 * 1000,
  });
}

/** Full-filter search for the dedicated Search page (entity types, module, tags, status, owner, marketplace, warehouse, country, date range, mode). */
export function useGlobalSearchResults(params: GlobalSearchFilterParams) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [QUERY_KEYS.GLOBAL_SEARCH, 'page', params],
    queryFn: () => globalSearch(params),
    enabled: isAuthenticated,
    staleTime: 15 * 1000,
  });
}

export function useSearchSuggestions(rawQuery: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const query = useDebounce(rawQuery.trim(), 250);
  return useQuery({
    queryKey: [QUERY_KEYS.SEARCH_SUGGESTIONS, query],
    queryFn: () => searchService.getSearchSuggestions(query, 8),
    enabled: isAuthenticated && query.length >= 2,
    staleTime: 30 * 1000,
  });
}

export function useSearchRegistrations() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['search-framework', 'registrations'],
    queryFn: searchService.listSearchRegistrations,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRecentSearches(limit?: number) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['global-search', 'recent-searches', limit],
    queryFn: () => searchService.getRecentSearches(limit),
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
}

export function useSearchHistory(limit?: number) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['global-search', 'search-history', limit],
    queryFn: () => searchService.getSearchHistory(limit),
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
}

export function useRecentEntities(limit?: number) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['global-search', 'recent-entities', limit],
    queryFn: () => searchService.getRecentEntities(limit),
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
}

const SAVED_SEARCHES_KEY = ['global-search', 'saved-searches'];

export function useSavedSearches() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: SAVED_SEARCHES_KEY,
    queryFn: searchService.listSavedSearches,
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
}

export function useCreateSavedSearch() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateSavedSearchPayload) => searchService.createSavedSearch(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SAVED_SEARCHES_KEY });
      toast.success('Search saved');
    },
    onError: () => toast.error('Could not save search', 'Please try again.'),
  });
}

export function useUpdateSavedSearch(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateSavedSearchPayload) => searchService.updateSavedSearch(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SAVED_SEARCHES_KEY }),
    onError: () => toast.error('Could not update saved search', 'Please try again.'),
  });
}

export function useDeleteSavedSearch() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => searchService.deleteSavedSearch(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SAVED_SEARCHES_KEY });
      toast.success('Saved search deleted');
    },
  });
}
