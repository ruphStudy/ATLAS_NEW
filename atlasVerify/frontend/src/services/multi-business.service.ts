import { apiClient } from '@/lib/api/axios';
import type {
  BusinessEntityLink,
  ChangeBusinessOwnershipPayload,
  CreateMultiBusinessPayload,
  LinkBusinessEntityPayload,
  MultiBusiness,
  MultiBusinessFilterParams,
  MultiBusinessHistoryEntry,
  MultiBusinessListResult,
  SetParentBusinessPayload,
  UpdateMultiBusinessPayload,
} from '@/types';

const BASE = '/multi-business';

export async function listMultiBusinesses(params: MultiBusinessFilterParams = {}): Promise<MultiBusinessListResult> {
  const { data } = await apiClient.get(`${BASE}/businesses`, { params });
  return data;
}

export async function getBusinessById(id: string, workspaceId?: string): Promise<MultiBusiness> {
  const { data } = await apiClient.get(`${BASE}/businesses/${id}`, { params: { workspaceId } });
  return data;
}

export async function getBusinessChildren(id: string): Promise<MultiBusiness[]> {
  const { data } = await apiClient.get(`${BASE}/businesses/${id}/children`);
  return data;
}

export async function createBusiness(payload: CreateMultiBusinessPayload): Promise<MultiBusiness> {
  const { data } = await apiClient.post(`${BASE}/businesses`, payload);
  return data;
}

export async function updateBusiness(id: string, payload: UpdateMultiBusinessPayload): Promise<MultiBusiness> {
  const { data } = await apiClient.patch(`${BASE}/businesses/${id}`, payload);
  return data;
}

export async function activateBusiness(id: string, reason?: string): Promise<MultiBusiness> {
  const { data } = await apiClient.post(`${BASE}/businesses/${id}/activate`, { reason });
  return data;
}

export async function suspendBusiness(id: string, reason?: string): Promise<MultiBusiness> {
  const { data } = await apiClient.post(`${BASE}/businesses/${id}/suspend`, { reason });
  return data;
}

export async function archiveBusiness(id: string, reason?: string): Promise<MultiBusiness> {
  const { data } = await apiClient.post(`${BASE}/businesses/${id}/archive`, { reason });
  return data;
}

export async function restoreBusiness(id: string, reason?: string): Promise<MultiBusiness> {
  const { data } = await apiClient.post(`${BASE}/businesses/${id}/restore`, { reason });
  return data;
}

export async function setDefaultBusiness(id: string): Promise<MultiBusiness> {
  const { data } = await apiClient.post(`${BASE}/businesses/${id}/set-default`);
  return data;
}

export async function setParentBusiness(id: string, payload: SetParentBusinessPayload): Promise<MultiBusiness> {
  const { data } = await apiClient.post(`${BASE}/businesses/${id}/parent`, payload);
  return data;
}

export async function changeBusinessOwnership(id: string, payload: ChangeBusinessOwnershipPayload): Promise<MultiBusiness> {
  const { data } = await apiClient.post(`${BASE}/businesses/${id}/ownership`, payload);
  return data;
}

export async function getBusinessHistory(id: string): Promise<MultiBusinessHistoryEntry[]> {
  const { data } = await apiClient.get(`${BASE}/businesses/${id}/history`);
  return data;
}

export async function linkBusinessEntity(businessId: string, payload: LinkBusinessEntityPayload): Promise<BusinessEntityLink> {
  const { data } = await apiClient.post(`${BASE}/businesses/${businessId}/links`, payload);
  return data;
}

export async function listBusinessLinks(businessId: string): Promise<BusinessEntityLink[]> {
  const { data } = await apiClient.get(`${BASE}/businesses/${businessId}/links`);
  return data;
}

export async function unlinkBusinessEntity(businessId: string, entityType: string, entityId: string): Promise<void> {
  await apiClient.delete(`${BASE}/businesses/${businessId}/links/${entityType}/${entityId}`);
}
