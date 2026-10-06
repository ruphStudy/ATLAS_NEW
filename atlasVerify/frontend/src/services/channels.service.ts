import { apiClient } from '@/lib/api/axios';
import type {
  ChannelRegistration,
  ChannelFilterParams,
  ChannelHistoryEntry,
  ChannelListResult,
  ChannelProductMapping,
  CreateChannelProductMappingPayload,
  RegisterChannelPayload,
  UpdateChannelPayload,
} from '@/types';

const BASE = '/multi-channel/channels';

export async function listChannelRegistrations(params: ChannelFilterParams): Promise<ChannelListResult> {
  const { data } = await apiClient.get<ChannelListResult>(BASE, { params });
  return data;
}

export async function getChannelById(id: string, workspaceId: string): Promise<ChannelRegistration> {
  const { data } = await apiClient.get<ChannelRegistration>(`${BASE}/${id}`, { params: { workspaceId } });
  return data;
}

export async function registerChannel(payload: RegisterChannelPayload): Promise<ChannelRegistration> {
  const { data } = await apiClient.post<ChannelRegistration>(BASE, payload);
  return data;
}

export async function updateChannel(id: string, payload: UpdateChannelPayload): Promise<ChannelRegistration> {
  const { data } = await apiClient.patch<ChannelRegistration>(`${BASE}/${id}`, payload);
  return data;
}

export async function enableChannel(id: string, reason?: string): Promise<ChannelRegistration> {
  const { data } = await apiClient.post<ChannelRegistration>(`${BASE}/${id}/enable`, { reason });
  return data;
}

export async function disableChannel(id: string, reason?: string): Promise<ChannelRegistration> {
  const { data } = await apiClient.post<ChannelRegistration>(`${BASE}/${id}/disable`, { reason });
  return data;
}

export async function archiveChannel(id: string, reason?: string): Promise<ChannelRegistration> {
  const { data } = await apiClient.post<ChannelRegistration>(`${BASE}/${id}/archive`, { reason });
  return data;
}

export async function restoreChannel(id: string, reason?: string): Promise<ChannelRegistration> {
  const { data } = await apiClient.post<ChannelRegistration>(`${BASE}/${id}/restore`, { reason });
  return data;
}

export async function setDefaultChannel(id: string): Promise<ChannelRegistration> {
  const { data } = await apiClient.post<ChannelRegistration>(`${BASE}/${id}/set-default`, {});
  return data;
}

export async function getChannelHistory(id: string): Promise<ChannelHistoryEntry[]> {
  const { data } = await apiClient.get<ChannelHistoryEntry[]>(`${BASE}/${id}/history`);
  return data;
}

export async function getChannelHealth(id: string): Promise<Record<string, unknown>> {
  const { data } = await apiClient.get<Record<string, unknown>>(`${BASE}/${id}/health`);
  return data;
}

export async function assertChannelCapability(id: string, capability: string): Promise<{ supported: boolean }> {
  const { data } = await apiClient.get<{ supported: boolean }>(`${BASE}/${id}/capabilities/${capability}`);
  return data;
}

export async function listChannelMappings(id: string): Promise<ChannelProductMapping[]> {
  const { data } = await apiClient.get<ChannelProductMapping[]>(`${BASE}/${id}/mappings`);
  return data;
}

export async function createChannelMapping(id: string, payload: CreateChannelProductMappingPayload): Promise<ChannelProductMapping> {
  const { data } = await apiClient.post<ChannelProductMapping>(`${BASE}/${id}/mappings`, payload);
  return data;
}

export async function deleteChannelMapping(id: string, mappingId: string): Promise<void> {
  await apiClient.delete(`${BASE}/${id}/mappings/${mappingId}`);
}
