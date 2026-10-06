import { apiClient } from '@/lib/api/axios';
import type {
  AiCostBudget,
  AiCostBudgetAlert,
  AiCostPricingConfig,
  AiCostRecord,
  AiCostRecordFilterParams,
  AiCostRecordListResult,
  AiCostSummary,
  CostBudgetFilterParams,
  CostBudgetListResult,
  CostPricingConfigFilterParams,
  CostPricingConfigListResult,
  CostSummaryFilterParams,
  CreateCostBudgetPayload,
  CreateCostPricingConfigPayload,
  EstimateAiCostPayload,
  EstimateCostResult,
  UpdateCostBudgetPayload,
  UpdateCostPricingConfigPayload,
} from '@/types';

const BASE = '/ai-cost-tracking';

export async function estimateAiCost(payload: EstimateAiCostPayload): Promise<EstimateCostResult> {
  const { data } = await apiClient.post<EstimateCostResult>(`${BASE}/estimate`, payload);
  return data;
}

export async function listCostRecords(params: AiCostRecordFilterParams): Promise<AiCostRecordListResult> {
  const { data } = await apiClient.get<AiCostRecordListResult>(`${BASE}/records`, { params });
  return data;
}

export async function getCostRecordById(id: string, workspaceId: string): Promise<AiCostRecord> {
  const { data } = await apiClient.get<AiCostRecord>(`${BASE}/records/${id}`, { params: { workspaceId } });
  return data;
}

export async function getCostSummary(params: CostSummaryFilterParams): Promise<AiCostSummary> {
  const { data } = await apiClient.get<AiCostSummary>(`${BASE}/summary`, { params });
  return data;
}

export async function listCostPricingConfigs(params: CostPricingConfigFilterParams): Promise<CostPricingConfigListResult> {
  const { data } = await apiClient.get<CostPricingConfigListResult>(`${BASE}/pricing-configs`, { params });
  return data;
}

export async function getCostPricingConfigById(id: string): Promise<AiCostPricingConfig> {
  const { data } = await apiClient.get<AiCostPricingConfig>(`${BASE}/pricing-configs/${id}`);
  return data;
}

export async function createCostPricingConfig(payload: CreateCostPricingConfigPayload): Promise<AiCostPricingConfig> {
  const { data } = await apiClient.post<AiCostPricingConfig>(`${BASE}/pricing-configs`, payload);
  return data;
}

export async function updateCostPricingConfig(id: string, payload: UpdateCostPricingConfigPayload): Promise<AiCostPricingConfig> {
  const { data } = await apiClient.patch<AiCostPricingConfig>(`${BASE}/pricing-configs/${id}`, payload);
  return data;
}

export async function deleteCostPricingConfig(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/pricing-configs/${id}`);
}

export async function listCostBudgets(params: CostBudgetFilterParams): Promise<CostBudgetListResult> {
  const { data } = await apiClient.get<CostBudgetListResult>(`${BASE}/budgets`, { params });
  return data;
}

export async function getCostBudgetById(id: string): Promise<AiCostBudget> {
  const { data } = await apiClient.get<AiCostBudget>(`${BASE}/budgets/${id}`);
  return data;
}

export async function createCostBudget(payload: CreateCostBudgetPayload): Promise<AiCostBudget> {
  const { data } = await apiClient.post<AiCostBudget>(`${BASE}/budgets`, payload);
  return data;
}

export async function updateCostBudget(id: string, payload: UpdateCostBudgetPayload): Promise<AiCostBudget> {
  const { data } = await apiClient.patch<AiCostBudget>(`${BASE}/budgets/${id}`, payload);
  return data;
}

export async function deleteCostBudget(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/budgets/${id}`);
}

export async function getCostBudgetAlerts(id: string): Promise<AiCostBudgetAlert[]> {
  const { data } = await apiClient.get<AiCostBudgetAlert[]>(`${BASE}/budgets/${id}/alerts`);
  return data;
}
