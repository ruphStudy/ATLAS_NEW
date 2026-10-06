import { apiClient } from '@/lib/api/axios';
import type { CreateOpportunityPayload, Opportunity, OpportunityFilterParams, OpportunityListResult, UpdateOpportunityPayload } from '@/types';

const BASE = '/opportunities';

export async function listOpportunities(params: OpportunityFilterParams = {}): Promise<OpportunityListResult> {
  const { data } = await apiClient.get<OpportunityListResult>(BASE, { params });
  return data;
}

export async function getOpportunityById(id: string): Promise<Opportunity> {
  const { data } = await apiClient.get<Opportunity>(`${BASE}/${id}`);
  return data;
}

export async function createOpportunity(payload: CreateOpportunityPayload): Promise<Opportunity> {
  const { data } = await apiClient.post<Opportunity>(BASE, payload);
  return data;
}

export async function updateOpportunity(id: string, payload: UpdateOpportunityPayload): Promise<Opportunity> {
  const { data } = await apiClient.patch<Opportunity>(`${BASE}/${id}`, payload);
  return data;
}

export async function deleteOpportunity(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}

/** Promotes a MarketplaceProductCandidate into an Opportunity for the current workspace. Idempotent — promoting the same candidate again returns the existing Opportunity (backend: POST /opportunities/promote). */
export async function promoteCandidate(marketplaceProductCandidateId: string): Promise<Opportunity> {
  const { data } = await apiClient.post<Opportunity>(`${BASE}/promote`, { marketplaceProductCandidateId });
  return data;
}
