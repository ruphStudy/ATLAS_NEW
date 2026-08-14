import { apiClient } from '@/lib/api/axios';
import type {
  CreateSavedSearchPayload,
  GlobalSearchFilterParams,
  GlobalSearchResponse,
  RecentEntity,
  RecentSearchEntry,
  SavedSearch,
  SearchEntityRegistration,
  SearchHistoryEntry,
  UpdateSavedSearchPayload,
} from '@/types';

export interface GlobalSearchParams {
  q?: string;
  entityTypes?: string[];
  module?: string;
  page?: number;
  limit?: number;
}

export async function globalSearch(params: GlobalSearchParams | GlobalSearchFilterParams): Promise<GlobalSearchResponse> {
  const { data } = await apiClient.get<GlobalSearchResponse>('/global-search/query', { params });
  return data;
}

export async function getSearchSuggestions(q: string, limit?: number): Promise<string[]> {
  const { data } = await apiClient.get<string[]>('/global-search/suggestions', { params: { q, limit } });
  return data;
}

export async function recordSearchResultOpened(entityType: string, entityId: string, module?: string, title?: string): Promise<void> {
  await apiClient.post('/global-search/opened', { entityType, entityId, module, title });
}

export async function getRecentSearches(limit?: number): Promise<RecentSearchEntry[]> {
  const { data } = await apiClient.get<RecentSearchEntry[]>('/global-search/recent-searches', { params: { limit } });
  return data;
}

export async function getSearchHistory(limit?: number): Promise<SearchHistoryEntry[]> {
  const { data } = await apiClient.get<SearchHistoryEntry[]>('/global-search/search-history', { params: { limit } });
  return data;
}

export async function getRecentEntities(limit?: number): Promise<RecentEntity[]> {
  const { data } = await apiClient.get<RecentEntity[]>('/global-search/recent-entities', { params: { limit } });
  return data;
}

export async function createSavedSearch(payload: CreateSavedSearchPayload): Promise<SavedSearch> {
  const { data } = await apiClient.post<SavedSearch>('/global-search/saved-searches', payload);
  return data;
}

export async function listSavedSearches(): Promise<SavedSearch[]> {
  const { data } = await apiClient.get<SavedSearch[]>('/global-search/saved-searches');
  return data;
}

export async function updateSavedSearch(id: string, payload: UpdateSavedSearchPayload): Promise<SavedSearch> {
  const { data } = await apiClient.patch<SavedSearch>(`/global-search/saved-searches/${id}`, payload);
  return data;
}

export async function deleteSavedSearch(id: string): Promise<void> {
  await apiClient.delete(`/global-search/saved-searches/${id}`);
}

export async function listSearchRegistrations(): Promise<SearchEntityRegistration[]> {
  const { data } = await apiClient.get<SearchEntityRegistration[]>('/search-framework/registrations');
  return data;
}
