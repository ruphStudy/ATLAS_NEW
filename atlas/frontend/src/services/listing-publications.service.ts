import { apiClient } from '@/lib/api/axios';
import type {
  BulkPublishPayload,
  BulkPublishResult,
  ListingPublication,
  PublicationFilterParams,
  PublicationHistoryEntry,
  PublicationListResult,
  PublicationStats,
  PublishListingPayload,
} from '@/types';

const BASE = '/listing-publications';

export async function listPublications(params: PublicationFilterParams = {}): Promise<PublicationListResult> {
  const { data } = await apiClient.get<PublicationListResult>(BASE, { params });
  return data;
}

export async function getPublicationById(id: string): Promise<ListingPublication> {
  const { data } = await apiClient.get<ListingPublication>(`${BASE}/${id}`);
  return data;
}

export async function publishListing(payload: PublishListingPayload): Promise<ListingPublication> {
  const { data } = await apiClient.post<ListingPublication>(BASE, payload);
  return data;
}

export async function bulkPublishListings(payload: BulkPublishPayload): Promise<BulkPublishResult> {
  const { data } = await apiClient.post<BulkPublishResult>(`${BASE}/bulk`, payload);
  return data;
}

export async function getPublicationsForListing(listingId: string): Promise<ListingPublication[]> {
  const { data } = await apiClient.get<ListingPublication[]>(`${BASE}/listing/${listingId}`);
  return data;
}

export async function republishListing(id: string, notes?: string): Promise<ListingPublication> {
  const { data } = await apiClient.post<ListingPublication>(`${BASE}/${id}/republish`, { notes });
  return data;
}

export async function retryPublication(id: string, notes?: string): Promise<ListingPublication> {
  const { data } = await apiClient.post<ListingPublication>(`${BASE}/${id}/retry`, { notes });
  return data;
}

export async function unpublishListing(id: string, reason?: string): Promise<ListingPublication> {
  const { data } = await apiClient.post<ListingPublication>(`${BASE}/${id}/unpublish`, { reason });
  return data;
}

export async function archivePublication(id: string, reason?: string): Promise<ListingPublication> {
  const { data } = await apiClient.post<ListingPublication>(`${BASE}/${id}/archive`, { reason });
  return data;
}

export async function getPublicationHistory(id: string): Promise<PublicationHistoryEntry[]> {
  const { data } = await apiClient.get<PublicationHistoryEntry[]>(`${BASE}/${id}/history`);
  return data;
}

export async function deletePublication(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}

export async function getPublicationStats(): Promise<PublicationStats> {
  const { data } = await apiClient.get<PublicationStats>(`${BASE}/stats`);
  return data;
}
