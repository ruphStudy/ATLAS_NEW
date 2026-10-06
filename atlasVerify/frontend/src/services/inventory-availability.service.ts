import { apiClient } from '@/lib/api/axios';
import type { AvailabilitySnapshot } from '@/types';

export async function getAvailabilityBySku(workspaceId: string, sku: string): Promise<AvailabilitySnapshot | null> {
  const { data } = await apiClient.get<AvailabilitySnapshot | null>('/inventory-availability/by-sku', { params: { workspaceId, sku } });
  return data;
}
