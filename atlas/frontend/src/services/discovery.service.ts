import { apiClient } from '@/lib/api/axios';
import type { CreateDiscoverySessionPayload, DiscoverySession, DiscoverySessionListResult, DiscoveryStats, PaginationParams } from '@/types';

const BASE = '/discovery';

export async function createDiscoverySession(payload: CreateDiscoverySessionPayload): Promise<DiscoverySession> {
  const { data } = await apiClient.post<DiscoverySession>(`${BASE}/sessions`, payload);
  return data;
}

export async function listDiscoverySessions(params: PaginationParams & { status?: string; marketplace?: string } = {}): Promise<DiscoverySessionListResult> {
  const { data } = await apiClient.get<DiscoverySessionListResult>(`${BASE}/sessions`, { params });
  return data;
}

export async function getDiscoverySessionById(id: string): Promise<DiscoverySession> {
  const { data } = await apiClient.get<DiscoverySession>(`${BASE}/sessions/${id}`);
  return data;
}

export async function getDiscoverySessionResults(id: string): Promise<Record<string, unknown>[]> {
  const { data } = await apiClient.get<Record<string, unknown>[]>(`${BASE}/sessions/${id}/results`);
  return data;
}

export async function cancelDiscoverySession(id: string): Promise<DiscoverySession> {
  const { data } = await apiClient.post<DiscoverySession>(`${BASE}/sessions/${id}/cancel`);
  return data;
}

export async function getDiscoveryStats(): Promise<DiscoveryStats> {
  const { data } = await apiClient.get<DiscoveryStats>(`${BASE}/stats`);
  return data;
}

export async function getSupportedDiscoveryMarketplaces(): Promise<string[]> {
  const { data } = await apiClient.get<string[]>(`${BASE}/marketplaces`);
  return data;
}
