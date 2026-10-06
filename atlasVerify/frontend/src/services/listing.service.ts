import { apiClient } from '@/lib/api/axios';
import type {
  CreateUniversalListingPayload,
  MarketplaceListing,
  MarketplaceListingFilterParams,
  RegenerateUniversalListingPayload,
  TransformToMarketplacePayload,
  TransformToMultipleMarketplacesPayload,
  UniversalListing,
  UniversalListingFilterParams,
  UniversalListingListResult,
} from '@/types';

const BASE = '/listings';

export async function getUniversalListingsByCatalogProduct(catalogProductId: string): Promise<UniversalListing[]> {
  const { data } = await apiClient.get<UniversalListing[]>(`${BASE}/universal/catalog/${catalogProductId}`);
  return data;
}

export async function getMarketplaceListingsByUniversalListing(universalListingId: string): Promise<MarketplaceListing[]> {
  const { data } = await apiClient.get<MarketplaceListing[]>(`${BASE}/universal/${universalListingId}/marketplace-listings`);
  return data;
}

export async function listUniversalListings(params: UniversalListingFilterParams = {}): Promise<UniversalListingListResult> {
  const { data } = await apiClient.get<UniversalListingListResult>(`${BASE}/universal`, { params });
  return data;
}

export async function getUniversalListingById(id: string): Promise<UniversalListing> {
  const { data } = await apiClient.get<UniversalListing>(`${BASE}/universal/${id}`);
  return data;
}

export async function createUniversalListing(payload: CreateUniversalListingPayload): Promise<UniversalListing> {
  const { data } = await apiClient.post<UniversalListing>(`${BASE}/universal`, payload);
  return data;
}

export async function getUniversalListingHistory(id: string): Promise<Record<string, unknown>[]> {
  const { data } = await apiClient.get<Record<string, unknown>[]>(`${BASE}/universal/${id}/history`);
  return data;
}

export async function previewUniversalListing(id: string): Promise<Record<string, unknown>> {
  const { data } = await apiClient.get<Record<string, unknown>>(`${BASE}/universal/${id}/preview`);
  return data;
}

export async function regenerateUniversalListing(id: string, payload: RegenerateUniversalListingPayload): Promise<UniversalListing> {
  const { data } = await apiClient.post<UniversalListing>(`${BASE}/universal/${id}/regenerate`, payload);
  return data;
}

export async function deleteUniversalListing(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/universal/${id}`);
}

export async function transformToMarketplace(universalListingId: string, payload: TransformToMarketplacePayload): Promise<MarketplaceListing> {
  const { data } = await apiClient.post<MarketplaceListing>(`${BASE}/universal/${universalListingId}/transform`, payload);
  return data;
}

export async function transformToMultipleMarketplaces(universalListingId: string, payload: TransformToMultipleMarketplacesPayload): Promise<MarketplaceListing[]> {
  const { data } = await apiClient.post<MarketplaceListing[]>(`${BASE}/universal/${universalListingId}/transform/bulk`, payload);
  return data;
}

export async function previewMarketplaceTransformation(universalListingId: string, marketplaceKey: string, country?: string): Promise<Record<string, unknown>> {
  const { data } = await apiClient.get<Record<string, unknown>>(`${BASE}/universal/${universalListingId}/marketplace-preview`, { params: { marketplaceKey, country } });
  return data;
}

export async function listAllMarketplaceListings(params: MarketplaceListingFilterParams = {}): Promise<{ items: MarketplaceListing[]; total: number; page: number; limit: number } | MarketplaceListing[]> {
  const { data } = await apiClient.get(`${BASE}/marketplace-listings`, { params });
  return data;
}

export async function getMarketplaceListingById(id: string): Promise<MarketplaceListing> {
  const { data } = await apiClient.get<MarketplaceListing>(`${BASE}/marketplace-listings/${id}`);
  return data;
}

export async function getMarketplaceListingHistory(id: string): Promise<Record<string, unknown>[]> {
  const { data } = await apiClient.get<Record<string, unknown>[]>(`${BASE}/marketplace-listings/${id}/history`);
  return data;
}
