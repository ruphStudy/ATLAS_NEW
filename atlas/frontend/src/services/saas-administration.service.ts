import { apiClient } from '@/lib/api/axios';
import type {
  ActivateTenantPayload,
  AddTenantNotePayload,
  AdminActionLogFilterParams,
  AdminActionLogListResult,
  AdminNote,
  AssignPlanPayload,
  FeatureOverridePayload,
  ImpersonationResult,
  QuotaOverridePayload,
  StartImpersonationPayload,
  SubscriptionOverridePayload,
  SuspendTenantPayload,
  TenantAdminProfile,
  TenantFilterParams,
  TenantListResult,
  TenantOverview,
  TerminateTenantPayload,
  UpdateInternalFlagsPayload,
  UpdateSupportStatusPayload,
} from '@/types';

const BASE = '/saas-administration';

export async function searchTenants(filter: TenantFilterParams = {}): Promise<TenantListResult> {
  const { data } = await apiClient.get<TenantListResult>(`${BASE}/tenants`, { params: filter });
  return data;
}

export async function getTenantOverview(workspaceId: string): Promise<TenantOverview> {
  const { data } = await apiClient.get<TenantOverview>(`${BASE}/tenants/${workspaceId}`);
  return data;
}

export async function activateTenant(workspaceId: string, payload: ActivateTenantPayload = {}): Promise<void> {
  await apiClient.post(`${BASE}/tenants/${workspaceId}/activate`, payload);
}

export async function suspendTenant(workspaceId: string, payload: SuspendTenantPayload): Promise<void> {
  await apiClient.post(`${BASE}/tenants/${workspaceId}/suspend`, payload);
}

export async function reactivateTenant(workspaceId: string, payload: ActivateTenantPayload = {}): Promise<void> {
  await apiClient.post(`${BASE}/tenants/${workspaceId}/reactivate`, payload);
}

export async function terminateTenant(workspaceId: string, payload: TerminateTenantPayload): Promise<void> {
  await apiClient.post(`${BASE}/tenants/${workspaceId}/terminate`, payload);
}

export async function assignTenantPlan(workspaceId: string, payload: AssignPlanPayload): Promise<void> {
  await apiClient.post(`${BASE}/tenants/${workspaceId}/plan`, payload);
}

export async function overrideTenantSubscription(workspaceId: string, payload: SubscriptionOverridePayload): Promise<void> {
  await apiClient.post(`${BASE}/tenants/${workspaceId}/subscription-override`, payload);
}

export async function overrideTenantQuota(workspaceId: string, payload: QuotaOverridePayload): Promise<void> {
  await apiClient.post(`${BASE}/tenants/${workspaceId}/quota-override`, payload);
}

export async function overrideTenantFeature(workspaceId: string, payload: FeatureOverridePayload): Promise<void> {
  await apiClient.post(`${BASE}/tenants/${workspaceId}/feature-override`, payload);
}

export async function listTenantLicenses(workspaceId: string): Promise<unknown> {
  const { data } = await apiClient.get(`${BASE}/tenants/${workspaceId}/licenses`);
  return data;
}

export async function getTenantUsage(workspaceId: string, resourceKey?: string): Promise<unknown> {
  const { data } = await apiClient.get(`${BASE}/tenants/${workspaceId}/usage`, { params: { resourceKey } });
  return data;
}

export async function addTenantNote(workspaceId: string, payload: AddTenantNotePayload): Promise<AdminNote> {
  const { data } = await apiClient.post<AdminNote>(`${BASE}/tenants/${workspaceId}/notes`, payload);
  return data;
}

export async function listTenantNotes(workspaceId: string): Promise<AdminNote[]> {
  const { data } = await apiClient.get<AdminNote[]>(`${BASE}/tenants/${workspaceId}/notes`);
  return data;
}

export async function getTenantAdminProfile(workspaceId: string): Promise<TenantAdminProfile | null> {
  const { data } = await apiClient.get<TenantAdminProfile | null>(`${BASE}/tenants/${workspaceId}/profile`);
  return data;
}

export async function updateTenantFlags(workspaceId: string, payload: UpdateInternalFlagsPayload): Promise<TenantAdminProfile> {
  const { data } = await apiClient.post<TenantAdminProfile>(`${BASE}/tenants/${workspaceId}/flags`, payload);
  return data;
}

export async function updateTenantSupportStatus(workspaceId: string, payload: UpdateSupportStatusPayload): Promise<TenantAdminProfile> {
  const { data } = await apiClient.post<TenantAdminProfile>(`${BASE}/tenants/${workspaceId}/support-status`, payload);
  return data;
}

export async function startImpersonation(workspaceId: string, payload: StartImpersonationPayload): Promise<ImpersonationResult> {
  const { data } = await apiClient.post<ImpersonationResult>(`${BASE}/tenants/${workspaceId}/impersonate`, payload);
  return data;
}

export async function endImpersonation(sessionId: string): Promise<void> {
  await apiClient.post(`${BASE}/impersonation/${sessionId}/end`);
}

export async function listAdminActionLog(filter: AdminActionLogFilterParams = {}): Promise<AdminActionLogListResult> {
  const { data } = await apiClient.get<AdminActionLogListResult>(`${BASE}/action-log`, { params: filter });
  return data;
}
