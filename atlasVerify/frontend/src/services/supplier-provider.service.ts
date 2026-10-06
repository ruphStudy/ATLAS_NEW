import { apiClient } from '@/lib/api/axios';
import type { SupplierProviderHealth, SupplierProviderMetadata } from '@/types';

const BASE = '/supplier-providers';

export async function listSupplierProviders(): Promise<SupplierProviderMetadata[]> {
  const { data } = await apiClient.get(BASE);
  return data;
}

export async function getSupplierProvider(providerCode: string): Promise<SupplierProviderMetadata> {
  const { data } = await apiClient.get(`${BASE}/${providerCode}`);
  return data;
}

export async function getCachedSupplierProviderHealth(): Promise<SupplierProviderHealth[]> {
  const { data } = await apiClient.get(`${BASE}/health/all`);
  return data;
}

export async function checkAllSupplierProviderHealth(): Promise<SupplierProviderHealth[]> {
  const { data } = await apiClient.post(`${BASE}/health/check`);
  return data;
}

export async function checkSupplierProviderHealth(providerCode: string): Promise<SupplierProviderHealth> {
  const { data } = await apiClient.post(`${BASE}/health/check/${providerCode}`);
  return data;
}
