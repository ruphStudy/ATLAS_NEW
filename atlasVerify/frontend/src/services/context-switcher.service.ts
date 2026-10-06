import { apiClient } from '@/lib/api/axios';
import type { Brand, Business, Channel } from '@/types';

interface ListResult<T> {
  items?: T[];
  data?: T[];
  total: number;
  page: number;
  limit: number;
}

function unwrapItems<T>(result: ListResult<T>): T[] {
  return result.items ?? result.data ?? [];
}

/** Multi-Business/Brand/Channel list endpoints require an explicit `workspaceId` query param — they don't self-scope from the JWT like most other modules. */
export async function listBusinesses(workspaceId: string): Promise<Business[]> {
  const { data } = await apiClient.get<ListResult<Business>>('/multi-business/businesses', {
    params: { workspaceId, limit: 100 },
  });
  return unwrapItems(data);
}

export async function listBrands(workspaceId: string): Promise<Brand[]> {
  const { data } = await apiClient.get<ListResult<Brand>>('/multi-brand/brands', {
    params: { workspaceId, limit: 100 },
  });
  return unwrapItems(data);
}

export async function listChannels(workspaceId: string, businessId?: string, brandId?: string): Promise<Channel[]> {
  const { data } = await apiClient.get<ListResult<Channel>>('/multi-channel/channels', {
    params: { workspaceId, businessId, brandId, limit: 100 },
  });
  return unwrapItems(data);
}
