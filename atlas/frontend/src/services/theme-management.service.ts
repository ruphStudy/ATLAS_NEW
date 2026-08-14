import { apiClient } from '@/lib/api/axios';
import type {
  ContrastWarning,
  CreateThemePayload,
  EffectiveTheme,
  PaginatedResult,
  RollbackThemePayload,
  SetActiveThemePayload,
  Theme,
  ThemeFilterParams,
  ThemeHistoryEntry,
  ThemeTokens,
  UpdateThemePayload,
} from '@/types';

const BASE = '/theme-management';

export async function getEffectiveTheme(): Promise<EffectiveTheme> {
  const { data } = await apiClient.get<EffectiveTheme>(`${BASE}/effective-theme`);
  return data;
}

export async function setActiveTheme(payload: SetActiveThemePayload): Promise<void> {
  await apiClient.post(`${BASE}/active-theme`, payload);
}

export async function validateThemeTokens(tokens: ThemeTokens): Promise<ContrastWarning[]> {
  const { data } = await apiClient.post<ContrastWarning[]>(`${BASE}/validate`, tokens);
  return data;
}

export async function createTheme(payload: CreateThemePayload): Promise<Theme> {
  const { data } = await apiClient.post<Theme>(`${BASE}/themes`, payload);
  return data;
}

export async function listThemes(params: ThemeFilterParams = {}): Promise<PaginatedResult<Theme>> {
  const { data } = await apiClient.get<PaginatedResult<Theme>>(`${BASE}/themes`, { params });
  return data;
}

export async function getTheme(id: string): Promise<Theme> {
  const { data } = await apiClient.get<Theme>(`${BASE}/themes/${id}`);
  return data;
}

export async function updateTheme(id: string, payload: UpdateThemePayload): Promise<Theme> {
  const { data } = await apiClient.patch<Theme>(`${BASE}/themes/${id}`, payload);
  return data;
}

export async function getThemeHistory(id: string): Promise<ThemeHistoryEntry[]> {
  const { data } = await apiClient.get<ThemeHistoryEntry[]>(`${BASE}/themes/${id}/history`);
  return data;
}

export async function publishTheme(id: string): Promise<Theme> {
  const { data } = await apiClient.post<Theme>(`${BASE}/themes/${id}/publish`);
  return data;
}

export async function archiveTheme(id: string): Promise<Theme> {
  const { data } = await apiClient.post<Theme>(`${BASE}/themes/${id}/archive`);
  return data;
}

export async function restoreTheme(id: string): Promise<Theme> {
  const { data } = await apiClient.post<Theme>(`${BASE}/themes/${id}/restore`);
  return data;
}

export async function rollbackTheme(id: string, payload: RollbackThemePayload): Promise<Theme> {
  const { data } = await apiClient.post<Theme>(`${BASE}/themes/${id}/rollback`, payload);
  return data;
}
