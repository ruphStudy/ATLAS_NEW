import { apiClient } from '@/lib/api/axios';
import type { Notification, NotificationPriority, NotificationStatus, NotificationType } from '@/types';

export interface NotificationFilterParams {
  status?: NotificationStatus;
  type?: NotificationType;
  priority?: NotificationPriority;
  category?: string;
  sourceModule?: string;
  entityType?: string;
  entityId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: 'createdAt' | 'priority';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface PaginatedNotifications {
  data: Notification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function listNotifications(params: NotificationFilterParams = {}): Promise<PaginatedNotifications> {
  const { data } = await apiClient.get<PaginatedNotifications>('/notifications', { params });
  return data;
}

export async function getUnreadCount(): Promise<number> {
  const { data } = await apiClient.get<{ unreadCount: number }>('/notifications/unread-count');
  return data.unreadCount;
}

export async function markNotificationAsRead(id: string): Promise<Notification> {
  const { data } = await apiClient.patch<Notification>(`/notifications/${id}/read`);
  return data;
}

export async function markAllNotificationsAsRead(): Promise<number> {
  const { data } = await apiClient.post<{ count: number }>('/notifications/mark-all-read');
  return data.count;
}

export async function dismissNotification(id: string): Promise<Notification> {
  const { data } = await apiClient.patch<Notification>(`/notifications/${id}/dismiss`);
  return data;
}

export async function archiveNotification(id: string): Promise<Notification> {
  const { data } = await apiClient.patch<Notification>(`/notifications/${id}/archive`);
  return data;
}

export async function restoreNotification(id: string): Promise<Notification> {
  const { data } = await apiClient.patch<Notification>(`/notifications/${id}/restore`);
  return data;
}

export async function deleteNotification(id: string): Promise<void> {
  await apiClient.delete(`/notifications/${id}`);
}
