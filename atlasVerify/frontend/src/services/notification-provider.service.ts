import { apiClient } from '@/lib/api/axios';
import type {
  CreateNotificationProviderConfigPayload,
  CreateNotificationProviderCredentialPayload,
  NotificationDelivery,
  NotificationDeliveryFilterParams,
  NotificationDeliveryListResult,
  NotificationProviderConfig,
  NotificationProviderConfigFilterParams,
  NotificationProviderConfigHistoryEntry,
  NotificationProviderConfigListResult,
  NotificationProviderConnectionValidationResult,
  NotificationProviderCredential,
  NotificationProviderCredentialFilterParams,
  NotificationProviderCredentialHistoryEntry,
  NotificationProviderCredentialListResult,
  NotificationProviderRegistryEntry,
  NotificationProviderRegistryFilterParams,
  NotificationProviderRegistryListResult,
  RegisterNotificationProviderEntryPayload,
  RotateNotificationProviderCredentialPayload,
  UpdateNotificationProviderConfigPayload,
  UpdateNotificationProviderCredentialPayload,
  UpdateNotificationProviderEntryPayload,
} from '@/types';

const BASE = '/notification-provider';

export async function listNotificationProviderRegistryEntries(params: NotificationProviderRegistryFilterParams): Promise<NotificationProviderRegistryListResult> {
  const { data } = await apiClient.get(`${BASE}/registry`, { params });
  return data;
}

export async function getNotificationProviderRegistryEntry(id: string): Promise<NotificationProviderRegistryEntry> {
  const { data } = await apiClient.get(`${BASE}/registry/${id}`);
  return data;
}

export async function registerNotificationProviderEntry(payload: RegisterNotificationProviderEntryPayload): Promise<NotificationProviderRegistryEntry> {
  const { data } = await apiClient.post(`${BASE}/registry`, payload);
  return data;
}

export async function updateNotificationProviderEntry(id: string, payload: UpdateNotificationProviderEntryPayload): Promise<NotificationProviderRegistryEntry> {
  const { data } = await apiClient.patch(`${BASE}/registry/${id}`, payload);
  return data;
}

export async function enableNotificationProviderEntry(id: string): Promise<NotificationProviderRegistryEntry> {
  const { data } = await apiClient.post(`${BASE}/registry/${id}/enable`);
  return data;
}

export async function disableNotificationProviderEntry(id: string): Promise<NotificationProviderRegistryEntry> {
  const { data } = await apiClient.post(`${BASE}/registry/${id}/disable`);
  return data;
}

export async function archiveNotificationProviderEntry(id: string): Promise<NotificationProviderRegistryEntry> {
  const { data } = await apiClient.post(`${BASE}/registry/${id}/archive`);
  return data;
}

export async function listNotificationProviderConfigs(params: NotificationProviderConfigFilterParams): Promise<NotificationProviderConfigListResult> {
  const { data } = await apiClient.get(`${BASE}/configurations`, { params });
  return data;
}

export async function getNotificationProviderConfig(id: string): Promise<NotificationProviderConfig> {
  const { data } = await apiClient.get(`${BASE}/configurations/${id}`);
  return data;
}

export async function createNotificationProviderConfig(payload: CreateNotificationProviderConfigPayload): Promise<NotificationProviderConfig> {
  const { data } = await apiClient.post(`${BASE}/configurations`, payload);
  return data;
}

export async function updateNotificationProviderConfig(id: string, payload: UpdateNotificationProviderConfigPayload): Promise<NotificationProviderConfig> {
  const { data } = await apiClient.patch(`${BASE}/configurations/${id}`, payload);
  return data;
}

export async function enableNotificationProviderConfig(id: string): Promise<NotificationProviderConfig> {
  const { data } = await apiClient.post(`${BASE}/configurations/${id}/enable`);
  return data;
}

export async function disableNotificationProviderConfig(id: string): Promise<NotificationProviderConfig> {
  const { data } = await apiClient.post(`${BASE}/configurations/${id}/disable`);
  return data;
}

export async function deleteNotificationProviderConfig(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/configurations/${id}`);
}

export async function getNotificationProviderConfigHistory(id: string): Promise<NotificationProviderConfigHistoryEntry[]> {
  const { data } = await apiClient.get(`${BASE}/configurations/${id}/history`);
  return data;
}

export async function rollbackNotificationProviderConfig(id: string, version: number, changedBy?: string): Promise<NotificationProviderConfig> {
  const { data } = await apiClient.post(`${BASE}/configurations/${id}/rollback/${version}`, { changedBy });
  return data;
}

export async function listNotificationProviderCredentials(params: NotificationProviderCredentialFilterParams): Promise<NotificationProviderCredentialListResult> {
  const { data } = await apiClient.get(`${BASE}/credentials`, { params });
  return data;
}

export async function getNotificationProviderCredential(id: string): Promise<NotificationProviderCredential> {
  const { data } = await apiClient.get(`${BASE}/credentials/${id}`);
  return data;
}

export async function createNotificationProviderCredential(payload: CreateNotificationProviderCredentialPayload): Promise<NotificationProviderCredential> {
  const { data } = await apiClient.post(`${BASE}/credentials`, payload);
  return data;
}

export async function updateNotificationProviderCredential(id: string, payload: UpdateNotificationProviderCredentialPayload): Promise<NotificationProviderCredential> {
  const { data } = await apiClient.patch(`${BASE}/credentials/${id}`, payload);
  return data;
}

export async function rotateNotificationProviderCredential(id: string, payload: RotateNotificationProviderCredentialPayload): Promise<NotificationProviderCredential> {
  const { data } = await apiClient.post(`${BASE}/credentials/${id}/rotate`, payload);
  return data;
}

export async function revokeNotificationProviderCredential(id: string): Promise<void> {
  await apiClient.post(`${BASE}/credentials/${id}/revoke`);
}

export async function getNotificationProviderCredentialHistory(id: string): Promise<NotificationProviderCredentialHistoryEntry[]> {
  const { data } = await apiClient.get(`${BASE}/credentials/${id}/history`);
  return data;
}

export async function validateNotificationProviderConnection(id: string): Promise<NotificationProviderConnectionValidationResult> {
  const { data } = await apiClient.post(`${BASE}/credentials/${id}/validate-connection`);
  return data;
}

export async function listNotificationDeliveries(params: NotificationDeliveryFilterParams): Promise<NotificationDeliveryListResult> {
  const { data } = await apiClient.get(`${BASE}/deliveries`, { params });
  return data;
}

export async function getNotificationDelivery(id: string, workspaceId: string): Promise<NotificationDelivery> {
  const { data } = await apiClient.get(`${BASE}/deliveries/${id}`, { params: { workspaceId } });
  return data;
}

export async function cancelNotificationDelivery(id: string, workspaceId: string): Promise<NotificationDelivery> {
  const { data } = await apiClient.post(`${BASE}/deliveries/${id}/cancel`, undefined, { params: { workspaceId } });
  return data;
}

export async function processScheduledNotificationDeliveries(workspaceId: string): Promise<{ processed: number }> {
  const { data } = await apiClient.post(`${BASE}/deliveries/process-scheduled`, undefined, { params: { workspaceId } });
  return data;
}
