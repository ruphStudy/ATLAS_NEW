import { apiClient } from '@/lib/api/axios';
import type {
  ApprovalCheckResult,
  CreateListingApprovalPayload,
  ListingApproval,
  ListingApprovalFilterParams,
  ListingApprovalHistoryEntry,
  ListingApprovalListResult,
  ListingApprovalStats,
} from '@/types';

const BASE = '/listing-approvals';

export async function listListingApprovals(params: ListingApprovalFilterParams = {}): Promise<ListingApprovalListResult> {
  const { data } = await apiClient.get<ListingApprovalListResult>(BASE, { params });
  return data;
}

export async function getListingApprovalById(id: string): Promise<ListingApproval> {
  const { data } = await apiClient.get<ListingApproval>(`${BASE}/${id}`);
  return data;
}

export async function createListingApproval(payload: CreateListingApprovalPayload): Promise<ListingApproval> {
  const { data } = await apiClient.post<ListingApproval>(BASE, payload);
  return data;
}

export async function getLatestApprovalForListing(listingId: string): Promise<ListingApproval> {
  const { data } = await apiClient.get<ListingApproval>(`${BASE}/listing/${listingId}/latest`);
  return data;
}

export async function getApprovalsForListing(listingId: string): Promise<ListingApproval[]> {
  const { data } = await apiClient.get<ListingApproval[]>(`${BASE}/listing/${listingId}`);
  return data;
}

export async function approveListingApproval(id: string, comment?: string, checkResults?: ApprovalCheckResult[]): Promise<ListingApproval> {
  const { data } = await apiClient.post<ListingApproval>(`${BASE}/${id}/approve`, { comment, checkResults });
  return data;
}

export async function rejectListingApproval(id: string, reason: string, checkResults?: ApprovalCheckResult[]): Promise<ListingApproval> {
  const { data } = await apiClient.post<ListingApproval>(`${BASE}/${id}/reject`, { reason, checkResults });
  return data;
}

export async function requestListingRevision(id: string, notes: string, checkResults?: ApprovalCheckResult[]): Promise<ListingApproval> {
  const { data } = await apiClient.post<ListingApproval>(`${BASE}/${id}/request-revision`, { notes, checkResults });
  return data;
}

export async function resubmitListingApproval(id: string, comment?: string): Promise<ListingApproval> {
  const { data } = await apiClient.post<ListingApproval>(`${BASE}/${id}/resubmit`, { comment });
  return data;
}

export async function markListingReadyToPublish(id: string, comment?: string): Promise<ListingApproval> {
  const { data } = await apiClient.post<ListingApproval>(`${BASE}/${id}/mark-ready-to-publish`, { comment });
  return data;
}

export async function getListingApprovalHistory(id: string): Promise<ListingApprovalHistoryEntry[]> {
  const { data } = await apiClient.get<ListingApprovalHistoryEntry[]>(`${BASE}/${id}/history`);
  return data;
}

export async function deleteListingApproval(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}

export async function getListingApprovalStats(): Promise<ListingApprovalStats> {
  const { data } = await apiClient.get<ListingApprovalStats>(`${BASE}/stats`);
  return data;
}
