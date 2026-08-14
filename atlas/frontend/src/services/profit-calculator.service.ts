import { apiClient } from '@/lib/api/axios';
import type { CreateProfitCalculationPayload, ProfitCalculation } from '@/types';

const BASE = '/profit-calculator';

export async function createProfitCalculation(payload: CreateProfitCalculationPayload): Promise<ProfitCalculation> {
  const { data } = await apiClient.post<ProfitCalculation>(BASE, payload);
  return data;
}

export async function getLatestProfitCalculationForOpportunity(opportunityId: string): Promise<ProfitCalculation | null> {
  const { data } = await apiClient.get<ProfitCalculation | null>(`${BASE}/opportunity/${opportunityId}/latest`);
  return data;
}
