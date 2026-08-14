import { apiClient } from '@/lib/api/axios';
import type {
  CalculatePricingPayload,
  CreatePricingConfigPayload,
  PricingCalculationResult,
  PricingComparisonResult,
  PricingConfig,
  PricingConfigFilterParams,
  PricingRecord,
  PricingRecordFilterParams,
  PricingRecordHistoryEntry,
  PricingRecordListResult,
  SimulatePricingPayload,
  UpdatePricingConfigPayload,
} from '@/types';

const BASE = '/pricing';

export async function listPricingConfigs(params: PricingConfigFilterParams = {}): Promise<{ data: PricingConfig[]; total: number; page: number; limit: number; totalPages: number }> {
  const { data } = await apiClient.get(`${BASE}/configs`, { params });
  return data;
}

export async function getPricingConfigById(id: string): Promise<PricingConfig> {
  const { data } = await apiClient.get<PricingConfig>(`${BASE}/configs/${id}`);
  return data;
}

export async function createPricingConfig(payload: CreatePricingConfigPayload): Promise<PricingConfig> {
  const { data } = await apiClient.post<PricingConfig>(`${BASE}/configs`, payload);
  return data;
}

export async function updatePricingConfig(id: string, payload: UpdatePricingConfigPayload): Promise<PricingConfig> {
  const { data } = await apiClient.put<PricingConfig>(`${BASE}/configs/${id}`, payload);
  return data;
}

export async function deletePricingConfig(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/configs/${id}`);
}

export async function calculatePricing(payload: CalculatePricingPayload): Promise<PricingCalculationResult> {
  const { data } = await apiClient.post<PricingCalculationResult>(`${BASE}/calculate`, payload);
  return data;
}

export async function bulkCalculatePricing(items: CalculatePricingPayload[]): Promise<unknown> {
  const { data } = await apiClient.post(`${BASE}/calculate/bulk`, { items });
  return data;
}

export async function simulatePricing(payload: SimulatePricingPayload): Promise<PricingCalculationResult> {
  const { data } = await apiClient.post<PricingCalculationResult>(`${BASE}/simulate`, payload);
  return data;
}

export async function listPricingRecords(params: PricingRecordFilterParams = {}): Promise<PricingRecordListResult> {
  const { data } = await apiClient.get<PricingRecordListResult>(`${BASE}/records`, { params });
  return data;
}

export async function getPricingRecordById(id: string): Promise<PricingRecord> {
  const { data } = await apiClient.get<PricingRecord>(`${BASE}/records/${id}`);
  return data;
}

export async function getPricingRecordHistory(id: string): Promise<PricingRecordHistoryEntry[]> {
  const { data } = await apiClient.get<PricingRecordHistoryEntry[]>(`${BASE}/records/${id}/history`);
  return data;
}

export async function approvePricingRecord(id: string, notes?: string): Promise<PricingRecord> {
  const { data } = await apiClient.post<PricingRecord>(`${BASE}/records/${id}/approve`, { notes });
  return data;
}

export async function archivePricingRecord(id: string, reason?: string): Promise<void> {
  await apiClient.post(`${BASE}/records/${id}/archive`, { reason });
}

export async function compareAcrossMarketplaces(catalogProductId: string): Promise<PricingComparisonResult> {
  const { data } = await apiClient.get<PricingComparisonResult>(`${BASE}/compare/${catalogProductId}`);
  return data;
}
