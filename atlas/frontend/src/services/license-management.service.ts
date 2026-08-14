import { apiClient } from '@/lib/api/axios';
import type {
  ActivateLicensePayload,
  CreateLicensePayload,
  License,
  LicenseFilterParams,
  LicenseHistoryEntry,
  LicenseIssuedToken,
  LicenseReasonPayload,
  PaginatedResult,
  RenewLicensePayload,
  TransferLicensePayload,
  UpdateLicensePayload,
} from '@/types';

const BASE = '/license-management';

export async function createLicense(payload: CreateLicensePayload): Promise<License> {
  const { data } = await apiClient.post<License>(`${BASE}/licenses`, payload);
  return data;
}

export async function listLicenses(params: LicenseFilterParams = {}): Promise<PaginatedResult<License>> {
  const { data } = await apiClient.get<PaginatedResult<License>>(`${BASE}/licenses`, { params });
  return data;
}

export async function getLicense(id: string): Promise<License> {
  const { data } = await apiClient.get<License>(`${BASE}/licenses/${id}`);
  return data;
}

export async function updateLicense(id: string, payload: UpdateLicensePayload): Promise<License> {
  const { data } = await apiClient.patch<License>(`${BASE}/licenses/${id}`, payload);
  return data;
}

export async function getLicenseHistory(id: string): Promise<LicenseHistoryEntry[]> {
  const { data } = await apiClient.get<LicenseHistoryEntry[]>(`${BASE}/licenses/${id}/history`);
  return data;
}

/** Returns the signed offline token once — never re-fetchable, so the caller must surface it to the user immediately for saving. */
export async function issueLicense(id: string): Promise<LicenseIssuedToken> {
  const { data } = await apiClient.post<LicenseIssuedToken>(`${BASE}/licenses/${id}/issue`);
  return data;
}

export async function activateLicense(id: string, payload: ActivateLicensePayload = {}): Promise<License> {
  const { data } = await apiClient.post<License>(`${BASE}/licenses/${id}/activate`, payload);
  return data;
}

export async function suspendLicense(id: string, payload: LicenseReasonPayload = {}): Promise<License> {
  const { data } = await apiClient.post<License>(`${BASE}/licenses/${id}/suspend`, payload);
  return data;
}

export async function reactivateLicense(id: string): Promise<License> {
  const { data } = await apiClient.post<License>(`${BASE}/licenses/${id}/reactivate`);
  return data;
}

export async function revokeLicense(id: string, payload: LicenseReasonPayload = {}): Promise<License> {
  const { data } = await apiClient.post<License>(`${BASE}/licenses/${id}/revoke`, payload);
  return data;
}

export async function renewLicense(id: string, payload: RenewLicensePayload): Promise<License> {
  const { data } = await apiClient.post<License>(`${BASE}/licenses/${id}/renew`, payload);
  return data;
}

export async function transferLicense(id: string, payload: TransferLicensePayload): Promise<License> {
  const { data } = await apiClient.post<License>(`${BASE}/licenses/${id}/transfer`, payload);
  return data;
}

/** Returns a fresh signed token once — the previous token is invalidated. */
export async function rotateLicenseKey(id: string): Promise<LicenseIssuedToken> {
  const { data } = await apiClient.post<LicenseIssuedToken>(`${BASE}/licenses/${id}/rotate-key`);
  return data;
}

export async function refreshLicenseEntitlements(id: string): Promise<License> {
  const { data } = await apiClient.post<License>(`${BASE}/licenses/${id}/refresh-entitlements`);
  return data;
}

export async function hasLicenseFeature(id: string, featureKey: string): Promise<{ enabled: boolean }> {
  const { data } = await apiClient.get<{ enabled: boolean }>(`${BASE}/licenses/${id}/feature/${featureKey}`);
  return data;
}

export async function getLicenseLimit(id: string, resourceKey: string): Promise<{ value: unknown }> {
  const { data } = await apiClient.get<{ value: unknown }>(`${BASE}/licenses/${id}/limit/${resourceKey}`);
  return data;
}
