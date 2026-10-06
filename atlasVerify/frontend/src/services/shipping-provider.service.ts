import { apiClient } from '@/lib/api/axios';
import type { ShippingProviderHealth, ShippingProviderMetadata } from '@/types';

const BASE = '/shipping-providers';

export async function listShippingProviders(): Promise<ShippingProviderMetadata[]> {
  const { data } = await apiClient.get(BASE);
  return data;
}

export async function getShippingProvider(providerKey: string): Promise<ShippingProviderMetadata> {
  const { data } = await apiClient.get(`${BASE}/${providerKey}`);
  return data;
}

export async function getCachedShippingProviderHealth(): Promise<ShippingProviderHealth[]> {
  const { data } = await apiClient.get(`${BASE}/health/all`);
  return data;
}

export async function checkAllShippingProviderHealth(): Promise<ShippingProviderHealth[]> {
  const { data } = await apiClient.post(`${BASE}/health/check`);
  return data;
}

export async function checkShippingProviderHealth(providerKey: string): Promise<ShippingProviderHealth> {
  const { data } = await apiClient.post(`${BASE}/health/check/${providerKey}`);
  return data;
}
