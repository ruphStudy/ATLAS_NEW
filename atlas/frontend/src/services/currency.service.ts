import { apiClient } from '@/lib/api/axios';
import type {
  ConfigureProviderPriorityPayload,
  ConversionResult,
  ConvertAmountPayload,
  CreateCurrencyPayload,
  Currency,
  CurrencyFilterParams,
  CurrencyHistoryEntry,
  CurrencyListResult,
  ExchangeRate,
  ExchangeRateFilterParams,
  ExchangeRateListResult,
  ExchangeRateProviderConfig,
  RecordRatePayload,
  RefreshRateFromProviderPayload,
  RejectRatePayload,
  ResolveRateWithFallbackPayload,
  UpdateCurrencyPayload,
  UpdateRatePayload,
  UpsertWorkspaceCurrencyConfigPayload,
  WorkspaceCurrencyConfig,
} from '@/types';

const BASE = '/currencies';

export async function listCurrencies(params: CurrencyFilterParams = {}): Promise<CurrencyListResult> {
  const { data } = await apiClient.get(BASE, { params });
  return data;
}

export async function getCurrencyByCode(code: string): Promise<Currency> {
  const { data } = await apiClient.get(`${BASE}/code/${code}`);
  return data;
}

export async function getCurrencyById(id: string): Promise<Currency> {
  const { data } = await apiClient.get(`${BASE}/${id}`);
  return data;
}

export async function createCurrency(payload: CreateCurrencyPayload): Promise<Currency> {
  const { data } = await apiClient.post(BASE, payload);
  return data;
}

export async function updateCurrency(id: string, payload: UpdateCurrencyPayload): Promise<Currency> {
  const { data } = await apiClient.patch(`${BASE}/${id}`, payload);
  return data;
}

export async function enableCurrency(id: string): Promise<Currency> {
  const { data } = await apiClient.post(`${BASE}/${id}/enable`);
  return data;
}

export async function disableCurrency(id: string): Promise<Currency> {
  const { data } = await apiClient.post(`${BASE}/${id}/disable`);
  return data;
}

export async function archiveCurrency(id: string): Promise<Currency> {
  const { data } = await apiClient.post(`${BASE}/${id}/archive`);
  return data;
}

export async function restoreCurrency(id: string): Promise<Currency> {
  const { data } = await apiClient.post(`${BASE}/${id}/restore`);
  return data;
}

export async function getCurrencyHistory(id: string): Promise<CurrencyHistoryEntry[]> {
  const { data } = await apiClient.get(`${BASE}/${id}/history`);
  return data;
}

export async function upsertWorkspaceCurrencyConfig(workspaceId: string, payload: UpsertWorkspaceCurrencyConfigPayload): Promise<WorkspaceCurrencyConfig> {
  const { data } = await apiClient.post(`${BASE}/workspace/${workspaceId}/config`, payload);
  return data;
}

export async function getWorkspaceCurrencyConfig(workspaceId: string): Promise<WorkspaceCurrencyConfig | null> {
  const { data } = await apiClient.get(`${BASE}/workspace/${workspaceId}/config`);
  return data;
}

export async function getRateHistory(params: ExchangeRateFilterParams = {}): Promise<ExchangeRateListResult> {
  const { data } = await apiClient.get(`${BASE}/rates`, { params });
  return data;
}

export async function getRate(rateId: string): Promise<ExchangeRate> {
  const { data } = await apiClient.get(`${BASE}/rates/${rateId}`);
  return data;
}

export async function recordManualRate(payload: RecordRatePayload): Promise<ExchangeRate> {
  const { data } = await apiClient.post(`${BASE}/rates/manual`, payload);
  return data;
}

export async function recordScheduledRate(payload: RecordRatePayload): Promise<ExchangeRate> {
  const { data } = await apiClient.post(`${BASE}/rates/scheduled`, payload);
  return data;
}

export async function refreshRateFromProvider(payload: RefreshRateFromProviderPayload): Promise<ExchangeRate> {
  const { data } = await apiClient.post(`${BASE}/rates/provider`, payload);
  return data;
}

export async function resolveRateWithFallback(payload: ResolveRateWithFallbackPayload): Promise<ExchangeRate> {
  const { data } = await apiClient.post(`${BASE}/rates/resolve`, payload);
  return data;
}

export async function updateRate(rateId: string, payload: UpdateRatePayload): Promise<ExchangeRate> {
  const { data } = await apiClient.patch(`${BASE}/rates/${rateId}`, payload);
  return data;
}

export async function approveRate(rateId: string): Promise<ExchangeRate> {
  const { data } = await apiClient.post(`${BASE}/rates/${rateId}/approve`);
  return data;
}

export async function publishRate(rateId: string): Promise<ExchangeRate> {
  const { data } = await apiClient.post(`${BASE}/rates/${rateId}/publish`);
  return data;
}

export async function rejectRate(rateId: string, payload: RejectRatePayload): Promise<ExchangeRate> {
  const { data } = await apiClient.post(`${BASE}/rates/${rateId}/reject`, payload);
  return data;
}

export async function archiveRateRecord(rateId: string): Promise<ExchangeRate> {
  const { data } = await apiClient.post(`${BASE}/rates/${rateId}/archive`);
  return data;
}

export async function configureProviderPriority(payload: ConfigureProviderPriorityPayload): Promise<ExchangeRateProviderConfig> {
  const { data } = await apiClient.post(`${BASE}/providers/priority`, payload);
  return data;
}

export async function getProviderPriorities(workspaceId?: string): Promise<ExchangeRateProviderConfig[]> {
  const { data } = await apiClient.get(`${BASE}/providers/priority`, { params: { workspaceId } });
  return data;
}

export async function convertAmount(payload: ConvertAmountPayload): Promise<ConversionResult> {
  const { data } = await apiClient.post(`${BASE}/convert`, payload);
  return data;
}
