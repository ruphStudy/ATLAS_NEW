import { apiClient } from '@/lib/api/axios';
import type {
  MarketplaceConnectionTestHistoryParams,
  MarketplaceConnectionTestHistoryResult,
  MarketplaceConnectionTestRecord,
  MarketplaceConnectionTestRequest,
  MarketplaceConnectionTestResult,
} from '@/types';

const BASE = '/marketplace-connection-test';

export async function testMarketplaceConnection(payload: MarketplaceConnectionTestRequest): Promise<MarketplaceConnectionTestResult> {
  const { data } = await apiClient.post<MarketplaceConnectionTestResult>(`${BASE}/test`, payload);
  return data;
}

export async function testAllMarketplaceConnections(workspaceId: string): Promise<MarketplaceConnectionTestResult[]> {
  const { data } = await apiClient.post<MarketplaceConnectionTestResult[]>(`${BASE}/test-all`, { workspaceId });
  return data;
}

export async function getMarketplaceConnectionTestHistory(params: MarketplaceConnectionTestHistoryParams): Promise<MarketplaceConnectionTestHistoryResult> {
  const { data } = await apiClient.get<MarketplaceConnectionTestHistoryResult>(`${BASE}/history/${params.workspaceId}`, {
    params: { providerKey: params.providerKey, accountId: params.accountId, success: params.success, page: params.page, limit: params.limit },
  });
  return data;
}

export async function getMarketplaceConnectionTestById(workspaceId: string, id: string): Promise<MarketplaceConnectionTestRecord> {
  const { data } = await apiClient.get<MarketplaceConnectionTestRecord>(`${BASE}/${workspaceId}/result/${id}`);
  return data;
}

export async function getMarketplaceConnectionTestByCorrelationId(correlationId: string): Promise<MarketplaceConnectionTestRecord> {
  const { data } = await apiClient.get<MarketplaceConnectionTestRecord>(`${BASE}/correlation/${correlationId}`);
  return data;
}
