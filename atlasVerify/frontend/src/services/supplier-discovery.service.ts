import { apiClient } from '@/lib/api/axios';
import type {
  CreateSupplierDiscoverySessionPayload,
  SupplierDiscoverySession,
  SupplierDiscoverySessionListResult,
  SupplierDiscoveryStats,
} from '@/types';

const BASE = '/supplier-discovery';

export async function createSupplierDiscoverySession(payload: CreateSupplierDiscoverySessionPayload): Promise<SupplierDiscoverySession> {
  const { data } = await apiClient.post<SupplierDiscoverySession>(`${BASE}/sessions`, payload);
  return data;
}

export async function listSupplierDiscoverySessions(params: { page?: number; limit?: number; provider?: string; keyword?: string } = {}): Promise<SupplierDiscoverySessionListResult> {
  const { data } = await apiClient.get<SupplierDiscoverySessionListResult>(`${BASE}/sessions`, { params });
  return data;
}

export async function getSupplierDiscoverySessionById(id: string): Promise<SupplierDiscoverySession> {
  const { data } = await apiClient.get<SupplierDiscoverySession>(`${BASE}/sessions/${id}`);
  return data;
}

export async function getSupplierDiscoverySessionResults(id: string): Promise<unknown[]> {
  const { data } = await apiClient.get<unknown[]>(`${BASE}/sessions/${id}/results`);
  return data;
}

export async function cancelSupplierDiscoverySession(id: string): Promise<SupplierDiscoverySession> {
  const { data } = await apiClient.post<SupplierDiscoverySession>(`${BASE}/sessions/${id}/cancel`);
  return data;
}

export async function getSupplierDiscoveryStats(): Promise<SupplierDiscoveryStats> {
  const { data } = await apiClient.get<SupplierDiscoveryStats>(`${BASE}/stats`);
  return data;
}

export async function getSupportedSupplierProviders(): Promise<string[]> {
  const { data } = await apiClient.get<string[]>(`${BASE}/providers`);
  return data;
}
