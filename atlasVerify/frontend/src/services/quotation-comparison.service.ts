import { apiClient } from '@/lib/api/axios';
import type {
  CreateQuotationComparisonPayload,
  QuotationComparison,
  QuotationComparisonFilterParams,
  QuotationComparisonListResult,
  SelectSupplierPayload,
} from '@/types';

const BASE = '/quotation-comparison';

export async function listQuotationComparisons(params: QuotationComparisonFilterParams = {}): Promise<QuotationComparisonListResult> {
  const { data } = await apiClient.get<QuotationComparisonListResult>(BASE, { params });
  return data;
}

export async function getQuotationComparisonById(id: string): Promise<QuotationComparison> {
  const { data } = await apiClient.get<QuotationComparison>(`${BASE}/${id}`);
  return data;
}

export async function createQuotationComparison(payload: CreateQuotationComparisonPayload): Promise<QuotationComparison> {
  const { data } = await apiClient.post<QuotationComparison>(BASE, payload);
  return data;
}

export async function getLatestComparisonForRfq(rfqId: string): Promise<QuotationComparison> {
  const { data } = await apiClient.get<QuotationComparison>(`${BASE}/rfq/${rfqId}/latest`);
  return data;
}

export async function getComparisonHistoryForRfq(rfqId: string): Promise<QuotationComparison[]> {
  const { data } = await apiClient.get<QuotationComparison[]>(`${BASE}/rfq/${rfqId}/history`);
  return data;
}

export async function selectComparisonSupplier(id: string, payload: SelectSupplierPayload): Promise<QuotationComparison> {
  const { data } = await apiClient.post<QuotationComparison>(`${BASE}/${id}/select-supplier`, payload);
  return data;
}

export async function deleteQuotationComparison(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}
