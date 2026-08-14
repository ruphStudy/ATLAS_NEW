import { apiClient } from '@/lib/api/axios';
import type { AttributeMapping, CategoryMapping, CreateCategoryMappingPayload, MappingFilterParams } from '@/types';

const BASE = '/marketplace-mapping';

export async function listCategoryMappings(workspaceId: string, params: MappingFilterParams = {}): Promise<CategoryMapping[] | { items: CategoryMapping[] }> {
  const { data } = await apiClient.get(`${BASE}/category-mappings`, { params: { workspaceId, ...params } });
  return data;
}

export async function createCategoryMapping(workspaceId: string, payload: CreateCategoryMappingPayload): Promise<CategoryMapping> {
  const { data } = await apiClient.post<CategoryMapping>(`${BASE}/category-mappings`, payload, { params: { workspaceId } });
  return data;
}

export async function listAttributeMappings(workspaceId: string, params: MappingFilterParams = {}): Promise<AttributeMapping[] | { items: AttributeMapping[] }> {
  const { data } = await apiClient.get(`${BASE}/attribute-mappings`, { params: { workspaceId, ...params } });
  return data;
}
