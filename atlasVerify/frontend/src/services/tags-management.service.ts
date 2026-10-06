import { apiClient } from '@/lib/api/axios';
import type {
  AssignTagPayload,
  BulkAssignTagsPayload,
  BulkRemoveTagsPayload,
  CreateTagGroupPayload,
  CreateTagPayload,
  CreateTagSavedViewPayload,
  PaginatedResult,
  Tag,
  TagAssignment,
  TagFilterParams,
  TagGroup,
  TagHistoryEntry,
  TagSavedView,
  UpdateTagGroupPayload,
  UpdateTagPayload,
} from '@/types';

const BASE = '/tags-management';

export async function createTag(payload: CreateTagPayload): Promise<Tag> {
  const { data } = await apiClient.post<Tag>(`${BASE}/tags`, payload);
  return data;
}

export async function listTags(params: TagFilterParams = {}): Promise<PaginatedResult<Tag>> {
  const { data } = await apiClient.get<PaginatedResult<Tag>>(`${BASE}/tags`, { params });
  return data;
}

export async function listTagsForEntity(entityType: string, entityId: string, module?: string): Promise<Tag[]> {
  const { data } = await apiClient.get<Tag[]>(`${BASE}/tags/entity`, { params: { entityType, entityId, module } });
  return data;
}

export async function getTagById(id: string): Promise<Tag> {
  const { data } = await apiClient.get<Tag>(`${BASE}/tags/${id}`);
  return data;
}

export async function updateTag(id: string, payload: UpdateTagPayload): Promise<Tag> {
  const { data } = await apiClient.patch<Tag>(`${BASE}/tags/${id}`, payload);
  return data;
}

export async function deleteTag(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/tags/${id}`);
}

export async function archiveTag(id: string): Promise<Tag> {
  const { data } = await apiClient.post<Tag>(`${BASE}/tags/${id}/archive`);
  return data;
}

export async function restoreTag(id: string): Promise<Tag> {
  const { data } = await apiClient.post<Tag>(`${BASE}/tags/${id}/restore`);
  return data;
}

export async function getTagHistory(id: string): Promise<TagHistoryEntry[]> {
  const { data } = await apiClient.get<TagHistoryEntry[]>(`${BASE}/tags/${id}/history`);
  return data;
}

export async function assignTag(id: string, payload: AssignTagPayload): Promise<TagAssignment> {
  const { data } = await apiClient.post<TagAssignment>(`${BASE}/tags/${id}/assign`, payload);
  return data;
}

export async function unassignTag(id: string, entityType: string, entityId: string): Promise<void> {
  await apiClient.delete(`${BASE}/tags/${id}/assign`, { params: { entityType, entityId } });
}

export async function bulkAssignTags(payload: BulkAssignTagsPayload): Promise<TagAssignment[]> {
  const { data } = await apiClient.post<TagAssignment[]>(`${BASE}/tags/bulk-assign`, payload);
  return data;
}

export async function bulkRemoveTags(payload: BulkRemoveTagsPayload): Promise<{ removed: number }> {
  const { data } = await apiClient.post<{ removed: number }>(`${BASE}/tags/bulk-remove`, payload);
  return data;
}

export async function createTagGroup(payload: CreateTagGroupPayload): Promise<TagGroup> {
  const { data } = await apiClient.post<TagGroup>(`${BASE}/groups`, payload);
  return data;
}

export async function listTagGroups(): Promise<TagGroup[]> {
  const { data } = await apiClient.get<TagGroup[]>(`${BASE}/groups`);
  return data;
}

export async function updateTagGroup(id: string, payload: UpdateTagGroupPayload): Promise<TagGroup> {
  const { data } = await apiClient.patch<TagGroup>(`${BASE}/groups/${id}`, payload);
  return data;
}

export async function removeTagGroup(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/groups/${id}`);
}

export async function createTagSavedView(payload: CreateTagSavedViewPayload): Promise<TagSavedView> {
  const { data } = await apiClient.post<TagSavedView>(`${BASE}/saved-views`, payload);
  return data;
}

export async function listTagSavedViews(): Promise<TagSavedView[]> {
  const { data } = await apiClient.get<TagSavedView[]>(`${BASE}/saved-views`);
  return data;
}

export async function deleteTagSavedView(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/saved-views/${id}`);
}
