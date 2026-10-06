import { apiClient } from '@/lib/api/axios';
import type { ActivityEntry, ActivityFilterParams, PaginatedResult } from '@/types';

const BASE = '/activity-center';

export async function getWorkspaceActivityFeed(limit = 20): Promise<PaginatedResult<ActivityEntry>> {
  const { data } = await apiClient.get<PaginatedResult<ActivityEntry>>(`${BASE}/feed/workspace`, { params: { limit } });
  return data;
}

export async function getPersonalActivityFeed(params: ActivityFilterParams = {}): Promise<PaginatedResult<ActivityEntry>> {
  const { data } = await apiClient.get<PaginatedResult<ActivityEntry>>(`${BASE}/feed`, { params });
  return data;
}

export async function listWorkspaceActivityFeed(params: ActivityFilterParams = {}): Promise<PaginatedResult<ActivityEntry>> {
  const { data } = await apiClient.get<PaginatedResult<ActivityEntry>>(`${BASE}/feed/workspace`, { params });
  return data;
}

export async function getEntityActivityFeed(entityType: string, entityId: string, params: ActivityFilterParams = {}): Promise<PaginatedResult<ActivityEntry>> {
  const { data } = await apiClient.get<PaginatedResult<ActivityEntry>>(`${BASE}/entities/${entityType}/${entityId}`, { params });
  return data;
}

export async function getActivityUnreadCount(): Promise<number> {
  const { data } = await apiClient.get<{ unreadCount: number }>(`${BASE}/unread-count`);
  return data.unreadCount;
}

export async function markAllActivityRead(): Promise<number> {
  const { data } = await apiClient.post<{ count: number }>(`${BASE}/mark-all-read`);
  return data.count;
}

export async function markActivityRead(id: string): Promise<ActivityEntry> {
  const { data } = await apiClient.patch<ActivityEntry>(`${BASE}/${id}/read`);
  return data;
}

export async function pinActivity(id: string): Promise<ActivityEntry> {
  const { data } = await apiClient.patch<ActivityEntry>(`${BASE}/${id}/pin`);
  return data;
}

export async function unpinActivity(id: string): Promise<ActivityEntry> {
  const { data } = await apiClient.patch<ActivityEntry>(`${BASE}/${id}/unpin`);
  return data;
}

export async function archiveActivity(id: string): Promise<ActivityEntry> {
  const { data } = await apiClient.patch<ActivityEntry>(`${BASE}/${id}/archive`);
  return data;
}

export async function restoreActivity(id: string): Promise<ActivityEntry> {
  const { data } = await apiClient.patch<ActivityEntry>(`${BASE}/${id}/restore`);
  return data;
}

export async function dismissActivity(id: string): Promise<ActivityEntry> {
  const { data } = await apiClient.patch<ActivityEntry>(`${BASE}/${id}/dismiss`);
  return data;
}

export async function removeActivity(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}
