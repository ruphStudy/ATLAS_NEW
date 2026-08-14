import { apiClient } from '@/lib/api/axios';
import type {
  AddBillingAdjustmentPayload,
  BillingFilterParams,
  BillingHistoryEntry,
  BillingItem,
  BillingPeriod,
  BillingReasonPayload,
  BillingReconciliationReport,
  BillingRule,
  CreateBillingRulePayload,
  GenerateBillingPeriodPayload,
  PaginatedResult,
  RecordBillingPaymentPayload,
  RefundBillingPeriodPayload,
  UpdateBillingRulePayload,
} from '@/types';

const BASE = '/billing-engine';

export async function createBillingRule(payload: CreateBillingRulePayload): Promise<BillingRule> {
  const { data } = await apiClient.post<BillingRule>(`${BASE}/rules`, payload);
  return data;
}

export async function listBillingRules(): Promise<BillingRule[]> {
  const { data } = await apiClient.get<BillingRule[]>(`${BASE}/rules`);
  return data;
}

export async function updateBillingRule(id: string, payload: UpdateBillingRulePayload): Promise<BillingRule> {
  const { data } = await apiClient.post<BillingRule>(`${BASE}/rules/${id}`, payload);
  return data;
}

export async function generateBillingPeriod(payload: GenerateBillingPeriodPayload): Promise<BillingPeriod> {
  const { data } = await apiClient.post<BillingPeriod>(`${BASE}/periods`, payload);
  return data;
}

export async function listBillingPeriods(params: BillingFilterParams = {}): Promise<PaginatedResult<BillingPeriod>> {
  const { data } = await apiClient.get<PaginatedResult<BillingPeriod>>(`${BASE}/periods`, { params });
  return data;
}

export async function getBillingPeriod(id: string): Promise<BillingPeriod> {
  const { data } = await apiClient.get<BillingPeriod>(`${BASE}/periods/${id}`);
  return data;
}

export async function getBillingPeriodItems(id: string): Promise<BillingItem[]> {
  const { data } = await apiClient.get<BillingItem[]>(`${BASE}/periods/${id}/items`);
  return data;
}

export async function getBillingPeriodHistory(id: string): Promise<BillingHistoryEntry[]> {
  const { data } = await apiClient.get<BillingHistoryEntry[]>(`${BASE}/periods/${id}/history`);
  return data;
}

export async function addBillingAdjustment(id: string, payload: AddBillingAdjustmentPayload): Promise<BillingPeriod> {
  const { data } = await apiClient.post<BillingPeriod>(`${BASE}/periods/${id}/adjustments`, payload);
  return data;
}

export async function billBillingPeriod(id: string): Promise<BillingPeriod> {
  const { data } = await apiClient.post<BillingPeriod>(`${BASE}/periods/${id}/bill`);
  return data;
}

export async function recordBillingPayment(id: string, payload: RecordBillingPaymentPayload): Promise<BillingPeriod> {
  const { data } = await apiClient.post<BillingPeriod>(`${BASE}/periods/${id}/payments`, payload);
  return data;
}

export async function voidBillingPeriod(id: string, payload: BillingReasonPayload): Promise<BillingPeriod> {
  const { data } = await apiClient.post<BillingPeriod>(`${BASE}/periods/${id}/void`, payload);
  return data;
}

export async function refundBillingPeriod(id: string, payload: RefundBillingPeriodPayload): Promise<BillingPeriod> {
  const { data } = await apiClient.post<BillingPeriod>(`${BASE}/periods/${id}/refund`, payload);
  return data;
}

export async function reconcileBillingPeriod(id: string): Promise<BillingReconciliationReport> {
  const { data } = await apiClient.post<BillingReconciliationReport>(`${BASE}/periods/${id}/reconcile`);
  return data;
}
