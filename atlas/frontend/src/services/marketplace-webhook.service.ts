import { apiClient } from '@/lib/api/axios';
import type {
  MarketplaceWebhookConfig,
  MarketplaceWebhookConfigFilterParams,
  MarketplaceWebhookConfigListResult,
  MarketplaceWebhookDeliveryFilterParams,
  MarketplaceWebhookDeliveryListResult,
  MarketplaceWebhookMetrics,
  MarketplaceWebhookSecret,
  RegisterMarketplaceWebhookPayload,
  UpdateMarketplaceWebhookPayload,
} from '@/types';

const BASE = '/marketplace-webhook';

export async function registerMarketplaceWebhook(payload: RegisterMarketplaceWebhookPayload): Promise<MarketplaceWebhookConfig> {
  const { data } = await apiClient.post<MarketplaceWebhookConfig>(`${BASE}/register`, payload);
  return data;
}

export async function updateMarketplaceWebhook(workspaceId: string, webhookId: string, payload: UpdateMarketplaceWebhookPayload): Promise<MarketplaceWebhookConfig> {
  const { data } = await apiClient.patch<MarketplaceWebhookConfig>(`${BASE}/${workspaceId}/${webhookId}`, payload);
  return data;
}

export async function enableMarketplaceWebhook(workspaceId: string, webhookId: string): Promise<MarketplaceWebhookConfig> {
  const { data } = await apiClient.post<MarketplaceWebhookConfig>(`${BASE}/${workspaceId}/${webhookId}/enable`);
  return data;
}

export async function disableMarketplaceWebhook(workspaceId: string, webhookId: string): Promise<MarketplaceWebhookConfig> {
  const { data } = await apiClient.post<MarketplaceWebhookConfig>(`${BASE}/${workspaceId}/${webhookId}/disable`);
  return data;
}

export async function deleteMarketplaceWebhook(workspaceId: string, webhookId: string): Promise<void> {
  await apiClient.delete(`${BASE}/${workspaceId}/${webhookId}`);
}

export async function rotateMarketplaceWebhookSecret(workspaceId: string, webhookId: string): Promise<MarketplaceWebhookSecret> {
  const { data } = await apiClient.post<MarketplaceWebhookSecret>(`${BASE}/${workspaceId}/${webhookId}/rotate-secret`);
  return data;
}

export async function listMarketplaceWebhookConfigs(params: MarketplaceWebhookConfigFilterParams): Promise<MarketplaceWebhookConfigListResult> {
  const { data } = await apiClient.get<MarketplaceWebhookConfigListResult>(`${BASE}/configs`, { params });
  return data;
}

export async function getMarketplaceWebhookConfig(workspaceId: string, webhookId: string): Promise<MarketplaceWebhookConfig> {
  const { data } = await apiClient.get<MarketplaceWebhookConfig>(`${BASE}/configs/${workspaceId}/${webhookId}`);
  return data;
}

export async function listMarketplaceWebhookDeliveries(workspaceId: string, accountId: string, params: MarketplaceWebhookDeliveryFilterParams = {}): Promise<MarketplaceWebhookDeliveryListResult> {
  const { data } = await apiClient.get<MarketplaceWebhookDeliveryListResult>(`${BASE}/deliveries/${workspaceId}/${accountId}`, { params });
  return data;
}

export async function getMarketplaceWebhookMetrics(workspaceId: string, accountId?: string): Promise<MarketplaceWebhookMetrics> {
  const { data } = await apiClient.get<MarketplaceWebhookMetrics>(`${BASE}/metrics/${workspaceId}`, { params: { accountId } });
  return data;
}
