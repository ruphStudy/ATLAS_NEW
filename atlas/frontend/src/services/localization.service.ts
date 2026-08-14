import { apiClient } from '@/lib/api/axios';
import type {
  CreateLocalePayload,
  CreateNamespacePayload,
  CreateTranslationKeyPayload,
  EffectiveLocale,
  ImportTranslationsPayload,
  Locale,
  LocaleAvailability,
  LocaleFilterParams,
  LocaleHistoryEntry,
  LocaleProviderRequirement,
  LocalizationEffectiveSettings,
  MissingKeysResult,
  PaginatedResult,
  SetLocaleAvailabilityPayload,
  SetProviderRequirementPayload,
  SetTranslationPayload,
  Translation,
  TranslationCompleteness,
  TranslationHistoryEntry,
  TranslationIssue,
  TranslationKey,
  TranslationNamespace,
  UpdateLocalePayload,
} from '@/types';

const BASE = '/localization';

export async function getEffectiveLocale(): Promise<EffectiveLocale> {
  const { data } = await apiClient.get<EffectiveLocale>(`${BASE}/effective-locale`);
  return data;
}

export async function getEffectiveRegionalSettings(): Promise<LocalizationEffectiveSettings> {
  const { data } = await apiClient.get<LocalizationEffectiveSettings>(`${BASE}/effective-regional-settings`);
  return data;
}

export async function switchLocale(localeCode: string, scope?: 'USER' | 'WORKSPACE' | 'ORGANIZATION'): Promise<{ localeCode: string; scope: string }> {
  const { data } = await apiClient.post<{ localeCode: string; scope: string }>(`${BASE}/switch-locale`, { localeCode, scope });
  return data;
}

export async function createLocale(payload: CreateLocalePayload): Promise<Locale> {
  const { data } = await apiClient.post<Locale>(`${BASE}/locales`, payload);
  return data;
}

export async function listLocales(activeOnly?: boolean): Promise<Locale[]> {
  const { data } = await apiClient.get<Locale[]>(`${BASE}/locales`, { params: { activeOnly } });
  return data;
}

export async function findLocales(filter: LocaleFilterParams = {}): Promise<PaginatedResult<Locale>> {
  const { data } = await apiClient.get<PaginatedResult<Locale>>(`${BASE}/locales/search`, { params: filter });
  return data;
}

export async function getLocale(code: string): Promise<Locale> {
  const { data } = await apiClient.get<Locale>(`${BASE}/locales/${code}`);
  return data;
}

export async function getLocaleHistory(code: string): Promise<LocaleHistoryEntry[]> {
  const { data } = await apiClient.get<LocaleHistoryEntry[]>(`${BASE}/locales/${code}/history`);
  return data;
}

export async function updateLocale(code: string, payload: UpdateLocalePayload): Promise<Locale> {
  const { data } = await apiClient.patch<Locale>(`${BASE}/locales/${code}`, payload);
  return data;
}

export async function enableLocale(code: string, reason?: string): Promise<Locale> {
  const { data } = await apiClient.post<Locale>(`${BASE}/locales/${code}/enable`, { reason });
  return data;
}

export async function disableLocale(code: string, reason?: string): Promise<Locale> {
  const { data } = await apiClient.post<Locale>(`${BASE}/locales/${code}/disable`, { reason });
  return data;
}

export async function archiveLocale(code: string, reason?: string): Promise<Locale> {
  const { data } = await apiClient.post<Locale>(`${BASE}/locales/${code}/archive`, { reason });
  return data;
}

export async function restoreLocale(code: string, reason?: string): Promise<Locale> {
  const { data } = await apiClient.post<Locale>(`${BASE}/locales/${code}/restore`, { reason });
  return data;
}

export async function setDefaultLocale(code: string): Promise<Locale> {
  const { data } = await apiClient.post<Locale>(`${BASE}/locales/${code}/set-default`);
  return data;
}

export async function getEnabledLanguages(): Promise<string[]> {
  const { data } = await apiClient.get<{ localeCodes: string[] }>(`${BASE}/languages/enabled`);
  return data.localeCodes;
}

export async function setEnabledLanguages(localeCodes: string[], scope?: 'WORKSPACE' | 'ORGANIZATION'): Promise<string[]> {
  const { data } = await apiClient.post<{ localeCodes: string[] }>(`${BASE}/languages/enabled`, { localeCodes, scope });
  return data.localeCodes;
}

export async function getPreferredLanguages(): Promise<string[]> {
  const { data } = await apiClient.get<{ localeCodes: string[] }>(`${BASE}/languages/preferred`);
  return data.localeCodes;
}

export async function setPreferredLanguages(localeCodes: string[]): Promise<string[]> {
  const { data } = await apiClient.post<{ localeCodes: string[] }>(`${BASE}/languages/preferred`, { localeCodes });
  return data.localeCodes;
}

export async function setLocaleAvailability(payload: SetLocaleAvailabilityPayload): Promise<LocaleAvailability> {
  const { data } = await apiClient.post<LocaleAvailability>(`${BASE}/locale-availability`, payload);
  return data;
}

export async function listLocaleAvailability(localeCode?: string, workspaceId?: string): Promise<LocaleAvailability[]> {
  const { data } = await apiClient.get<LocaleAvailability[]>(`${BASE}/locale-availability`, { params: { localeCode, workspaceId } });
  return data;
}

export async function getTranslationCompleteness(namespaceKey: string, localeCode: string): Promise<TranslationCompleteness> {
  const { data } = await apiClient.get<TranslationCompleteness>(`${BASE}/namespaces/${namespaceKey}/completeness/${localeCode}`);
  return data;
}

export async function listAvailableLocales(countryCode?: string, marketplaceKey?: string): Promise<string[]> {
  const { data } = await apiClient.get<{ localeCodes: string[] }>(`${BASE}/locale-availability/resolve`, { params: { countryCode, marketplaceKey } });
  return data.localeCodes;
}

// ── Namespaces & keys ────────────────────────────────────────────

export async function createNamespace(payload: CreateNamespacePayload): Promise<TranslationNamespace> {
  const { data } = await apiClient.post<TranslationNamespace>(`${BASE}/namespaces`, payload);
  return data;
}

export async function listNamespaces(): Promise<TranslationNamespace[]> {
  const { data } = await apiClient.get<TranslationNamespace[]>(`${BASE}/namespaces`);
  return data;
}

export async function getNamespace(namespaceKey: string): Promise<TranslationNamespace> {
  const { data } = await apiClient.get<TranslationNamespace>(`${BASE}/namespaces/${namespaceKey}`);
  return data;
}

export async function createTranslationKey(namespaceKey: string, payload: CreateTranslationKeyPayload): Promise<TranslationKey> {
  const { data } = await apiClient.post<TranslationKey>(`${BASE}/namespaces/${namespaceKey}/keys`, payload);
  return data;
}

export async function listTranslationKeys(namespaceKey: string): Promise<TranslationKey[]> {
  const { data } = await apiClient.get<TranslationKey[]>(`${BASE}/namespaces/${namespaceKey}/keys`);
  return data;
}

export async function deleteTranslationKey(namespaceKey: string, key: string): Promise<void> {
  await apiClient.delete(`${BASE}/namespaces/${namespaceKey}/keys/${encodeURIComponent(key)}`);
}

// ── Missing keys / import / export ────────────────────────────────

export async function findMissingKeys(namespaceKey: string, localeCode: string): Promise<MissingKeysResult> {
  const { data } = await apiClient.get<MissingKeysResult>(`${BASE}/namespaces/${namespaceKey}/missing/${localeCode}`);
  return data;
}

export async function exportNamespace(namespaceKey: string, localeCode: string): Promise<Record<string, string>> {
  const { data } = await apiClient.get<Record<string, string>>(`${BASE}/namespaces/${namespaceKey}/export/${localeCode}`);
  return data;
}

export async function importNamespace(namespaceKey: string, localeCode: string, payload: ImportTranslationsPayload): Promise<{ imported: number }> {
  const { data } = await apiClient.post<{ imported: number }>(`${BASE}/namespaces/${namespaceKey}/import/${localeCode}`, payload);
  return data;
}

// ── Translations ─────────────────────────────────────────────────

export async function getTranslationHistory(namespaceKey: string, key: string, localeCode: string): Promise<TranslationHistoryEntry[]> {
  const { data } = await apiClient.get<TranslationHistoryEntry[]>(`${BASE}/namespaces/${namespaceKey}/keys/${encodeURIComponent(key)}/history/${localeCode}`);
  return data;
}

export async function setTranslation(namespaceKey: string, key: string, localeCode: string, payload: SetTranslationPayload): Promise<Translation> {
  const { data } = await apiClient.post<Translation>(`${BASE}/namespaces/${namespaceKey}/keys/${encodeURIComponent(key)}/translations/${localeCode}`, payload);
  return data;
}

export async function bulkTranslate(namespaceKey: string, localeCode: string): Promise<Record<string, string>> {
  const { data } = await apiClient.get<Record<string, string>>(`${BASE}/namespaces/${namespaceKey}/bundle/${localeCode}`);
  return data;
}

// ── Issues ───────────────────────────────────────────────────────

export async function detectTranslationIssues(namespaceKey: string, localeCode: string): Promise<TranslationIssue[]> {
  const { data } = await apiClient.get<TranslationIssue[]>(`${BASE}/namespaces/${namespaceKey}/issues/${localeCode}`);
  return data;
}

// ── Marketplace/provider locale requirements ──────────────────────

export async function setProviderRequirement(payload: SetProviderRequirementPayload): Promise<LocaleProviderRequirement> {
  const { data } = await apiClient.post<LocaleProviderRequirement>(`${BASE}/provider-requirements`, payload);
  return data;
}

export async function listProviderRequirements(marketplaceKey?: string, workspaceId?: string): Promise<LocaleProviderRequirement[]> {
  const { data } = await apiClient.get<LocaleProviderRequirement[]>(`${BASE}/provider-requirements`, { params: { marketplaceKey, workspaceId } });
  return data;
}

// ── Locale-aware formatting preview ───────────────────────────────

export async function formatDatePreview(date: string, localeCode?: string): Promise<string> {
  const { data } = await apiClient.post<{ value: string }>(`${BASE}/format/date`, { date, localeCode });
  return data.value;
}

export async function formatNumberPreview(value: number, localeCode?: string): Promise<string> {
  const { data } = await apiClient.post<{ value: string }>(`${BASE}/format/number`, { value, localeCode });
  return data.value;
}

export async function formatCurrencyPreview(value: number, localeCode?: string, currencyCode?: string): Promise<string> {
  const { data } = await apiClient.post<{ value: string }>(`${BASE}/format/currency`, { value, localeCode, currencyCode });
  return data.value;
}
