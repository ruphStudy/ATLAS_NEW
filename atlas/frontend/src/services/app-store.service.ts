import { apiClient } from '@/lib/api/axios';
import type {
  AppHealth,
  AppHistoryEntry,
  AppInstallation,
  AppInstallationFilterParams,
  AppInstallationListResult,
  AppListing,
  AppListingFilterParams,
  AppListingListResult,
  AppReview,
  AppReviewListResult,
  AppVersion,
  InstallAppPayload,
  PublishAppVersionPayload,
  RegisterAppListingPayload,
  RollbackAppVersionPayload,
  SubmitAppReviewPayload,
  UpdateAppInstallationPayload,
  UpdateAppListingPayload,
  UpgradeAppPayload,
} from '@/types';

const BASE = '/app-store';

// ── Catalog ─────────────────────────────────────────────────────────────
export async function listAppListings(params: AppListingFilterParams = {}): Promise<AppListingListResult> {
  const { data } = await apiClient.get<AppListingListResult>(`${BASE}/listings`, { params });
  return data;
}

export async function getAppListing(key: string): Promise<AppListing> {
  const { data } = await apiClient.get<AppListing>(`${BASE}/listings/${key}`);
  return data;
}

export async function getAppListingHistory(key: string): Promise<AppHistoryEntry[]> {
  const { data } = await apiClient.get<AppHistoryEntry[]>(`${BASE}/listings/${key}/history`);
  return data;
}

export async function listAppVersions(key: string): Promise<AppVersion[]> {
  const { data } = await apiClient.get<AppVersion[]>(`${BASE}/listings/${key}/versions`);
  return data;
}

export async function getAppHealth(key: string): Promise<AppHealth> {
  const { data } = await apiClient.get<AppHealth>(`${BASE}/listings/${key}/health`);
  return data;
}

export async function registerPrivateApp(payload: RegisterAppListingPayload): Promise<AppListing> {
  const { data } = await apiClient.post<AppListing>(`${BASE}/listings/private`, payload);
  return data;
}

export async function updateAppListing(key: string, payload: UpdateAppListingPayload): Promise<AppListing> {
  const { data } = await apiClient.patch<AppListing>(`${BASE}/listings/${key}`, payload);
  return data;
}

export async function submitAppForApproval(key: string): Promise<AppListing> {
  const { data } = await apiClient.post<AppListing>(`${BASE}/listings/${key}/submit-for-approval`);
  return data;
}

export async function publishPrivateApp(key: string): Promise<AppListing> {
  const { data } = await apiClient.post<AppListing>(`${BASE}/listings/${key}/publish-private`);
  return data;
}

export async function archiveAppListing(key: string): Promise<AppListing> {
  const { data } = await apiClient.post<AppListing>(`${BASE}/listings/${key}/archive`);
  return data;
}

export async function publishAppVersion(key: string, payload: PublishAppVersionPayload): Promise<AppVersion> {
  const { data } = await apiClient.post<AppVersion>(`${BASE}/listings/${key}/versions`, payload);
  return data;
}

export async function deprecateAppVersion(versionId: string): Promise<AppVersion> {
  const { data } = await apiClient.post<AppVersion>(`${BASE}/versions/${versionId}/deprecate`);
  return data;
}

// ── Platform catalog admin ─────────────────────────────────────────────
export async function registerCatalogApp(payload: RegisterAppListingPayload): Promise<AppListing> {
  const { data } = await apiClient.post<AppListing>(`${BASE}/catalog/listings`, payload);
  return data;
}

export async function approveAppListing(key: string): Promise<AppListing> {
  const { data } = await apiClient.post<AppListing>(`${BASE}/catalog/listings/${key}/approve`);
  return data;
}

export async function rejectAppListing(key: string, reason: string): Promise<AppListing> {
  const { data } = await apiClient.post<AppListing>(`${BASE}/catalog/listings/${key}/reject`, { reason });
  return data;
}

export async function suspendAppListing(key: string, reason: string): Promise<AppListing> {
  const { data } = await apiClient.post<AppListing>(`${BASE}/catalog/listings/${key}/suspend`, { reason });
  return data;
}

export async function reinstateAppListing(key: string): Promise<AppListing> {
  const { data } = await apiClient.post<AppListing>(`${BASE}/catalog/listings/${key}/reinstate`);
  return data;
}

export async function removeAppListing(key: string): Promise<AppListing> {
  const { data } = await apiClient.delete<AppListing>(`${BASE}/catalog/listings/${key}`);
  return data;
}

// ── Installations ───────────────────────────────────────────────────────
export async function installApp(key: string, payload: InstallAppPayload = {}): Promise<AppInstallation> {
  const { data } = await apiClient.post<AppInstallation>(`${BASE}/listings/${key}/install`, payload);
  return data;
}

export async function listAppInstallations(params: AppInstallationFilterParams = {}): Promise<AppInstallationListResult> {
  const { data } = await apiClient.get<AppInstallationListResult>(`${BASE}/installations`, { params });
  return data;
}

export async function getAppInstallation(id: string): Promise<AppInstallation> {
  const { data } = await apiClient.get<AppInstallation>(`${BASE}/installations/${id}`);
  return data;
}

export async function uninstallApp(id: string): Promise<AppInstallation> {
  const { data } = await apiClient.post<AppInstallation>(`${BASE}/installations/${id}/uninstall`);
  return data;
}

export async function enableAppInstallation(id: string): Promise<AppInstallation> {
  const { data } = await apiClient.post<AppInstallation>(`${BASE}/installations/${id}/enable`);
  return data;
}

export async function disableAppInstallation(id: string): Promise<AppInstallation> {
  const { data } = await apiClient.post<AppInstallation>(`${BASE}/installations/${id}/disable`);
  return data;
}

export async function upgradeAppInstallation(id: string, payload: UpgradeAppPayload = {}): Promise<AppInstallation> {
  const { data } = await apiClient.post<AppInstallation>(`${BASE}/installations/${id}/upgrade`, payload);
  return data;
}

export async function rollbackAppInstallation(id: string, payload: RollbackAppVersionPayload): Promise<AppInstallation> {
  const { data } = await apiClient.post<AppInstallation>(`${BASE}/installations/${id}/rollback`, payload);
  return data;
}

export async function updateAppInstallationConfig(id: string, payload: UpdateAppInstallationPayload): Promise<AppInstallation> {
  const { data } = await apiClient.patch<AppInstallation>(`${BASE}/installations/${id}/config`, payload);
  return data;
}

// ── Reviews ─────────────────────────────────────────────────────────────
export async function submitAppReview(key: string, payload: SubmitAppReviewPayload): Promise<AppReview> {
  const { data } = await apiClient.post<AppReview>(`${BASE}/listings/${key}/reviews`, payload);
  return data;
}

export async function listAppReviews(key: string, params: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' } = {}): Promise<AppReviewListResult> {
  const { data } = await apiClient.get<AppReviewListResult>(`${BASE}/listings/${key}/reviews`, { params });
  return data;
}
