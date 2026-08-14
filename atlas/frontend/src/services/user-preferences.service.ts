import { apiClient } from '@/lib/api/axios';
import type {
  AiPreferencesSettings,
  AppearancePreferences,
  DefaultsPreferences,
  DisplayPreferences,
  NotificationPreferencesSettings,
  ResolvedSettingFull,
  SettingDefinitionFilterParams,
  SettingValueHistoryEntry,
  PaginatedResult,
  SettingDefinition,
  UpdateAiPreferencesPayload,
  UpdateAppearancePreferencesPayload,
  UpdateDefaultsPreferencesPayload,
  UpdateDisplayPreferencesPayload,
  UpdateNotificationPreferencesPayload,
  UpdateWorkspaceViewPreferencesPayload,
  WorkspaceViewPreferences,
} from '@/types';

const BASE = '/user-preferences';

export async function getWorkspaceViewPreferences(): Promise<WorkspaceViewPreferences> {
  const { data } = await apiClient.get<WorkspaceViewPreferences>(`${BASE}/workspace-view`);
  return data;
}

export async function updateWorkspaceViewPreferences(payload: UpdateWorkspaceViewPreferencesPayload): Promise<WorkspaceViewPreferences> {
  const { data } = await apiClient.patch<WorkspaceViewPreferences>(`${BASE}/workspace-view`, payload);
  return data;
}

export async function getDisplayPreferences(): Promise<DisplayPreferences> {
  const { data } = await apiClient.get<DisplayPreferences>(`${BASE}/display`);
  return data;
}

export async function updateDisplayPreferences(payload: UpdateDisplayPreferencesPayload): Promise<DisplayPreferences> {
  const { data } = await apiClient.patch<DisplayPreferences>(`${BASE}/display`, payload);
  return data;
}

export async function getNotificationPreferences(): Promise<NotificationPreferencesSettings> {
  const { data } = await apiClient.get<NotificationPreferencesSettings>(`${BASE}/notifications`);
  return data;
}

export async function updateNotificationPreferences(payload: UpdateNotificationPreferencesPayload): Promise<NotificationPreferencesSettings> {
  const { data } = await apiClient.patch<NotificationPreferencesSettings>(`${BASE}/notifications`, payload);
  return data;
}

export async function getDefaultsPreferences(): Promise<DefaultsPreferences> {
  const { data } = await apiClient.get<DefaultsPreferences>(`${BASE}/defaults`);
  return data;
}

export async function updateDefaultsPreferences(payload: UpdateDefaultsPreferencesPayload): Promise<DefaultsPreferences> {
  const { data } = await apiClient.patch<DefaultsPreferences>(`${BASE}/defaults`, payload);
  return data;
}

export async function getAppearancePreferences(): Promise<AppearancePreferences> {
  const { data } = await apiClient.get<AppearancePreferences>(`${BASE}/appearance`);
  return data;
}

export async function updateAppearancePreferences(payload: UpdateAppearancePreferencesPayload): Promise<AppearancePreferences> {
  const { data } = await apiClient.patch<AppearancePreferences>(`${BASE}/appearance`, payload);
  return data;
}

export async function getAiPreferences(): Promise<AiPreferencesSettings> {
  const { data } = await apiClient.get<AiPreferencesSettings>(`${BASE}/ai`);
  return data;
}

export async function updateAiPreferences(payload: UpdateAiPreferencesPayload): Promise<AiPreferencesSettings> {
  const { data } = await apiClient.patch<AiPreferencesSettings>(`${BASE}/ai`, payload);
  return data;
}

export async function listPreferenceDefinitions(filter: SettingDefinitionFilterParams = {}): Promise<PaginatedResult<SettingDefinition>> {
  const { data } = await apiClient.get<PaginatedResult<SettingDefinition>>(`${BASE}/definitions`, { params: filter });
  return data;
}

export async function resolvePreferenceKey(key: string): Promise<ResolvedSettingFull> {
  const { data } = await apiClient.get<ResolvedSettingFull>(`${BASE}/resolve/${key}`);
  return data;
}

export async function resetPreferenceByKey(key: string): Promise<unknown> {
  const { data } = await apiClient.post(`${BASE}/values/${key}/reset`);
  return data;
}

export async function getPreferenceHistoryByKey(key: string): Promise<SettingValueHistoryEntry[]> {
  const { data } = await apiClient.get<SettingValueHistoryEntry[]>(`${BASE}/values/${key}/history`);
  return data;
}
