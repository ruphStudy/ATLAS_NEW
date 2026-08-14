import { apiClient } from '@/lib/api/axios';
import type {
  CreateWebhookPayload,
  TestWebhookPayload,
  UpdateWebhookPayload,
  WebhookDelivery,
  WebhookDeliveryFilterParams,
  WebhookDeliveryListResult,
  WebhookEndpoint,
  WebhookEndpointCreatedSecret,
  WebhookFilterParams,
  WebhookHistoryEntry,
  WebhookListResult,
  WebhookTestResult,
} from '@/types';

const BASE = '/webhook-framework';

export async function listWebhooks(params: WebhookFilterParams = {}): Promise<WebhookListResult> {
  const { data } = await apiClient.get<WebhookListResult>(`${BASE}/endpoints`, { params });
  return data;
}

export async function getWebhookById(id: string): Promise<WebhookEndpoint> {
  const { data } = await apiClient.get<WebhookEndpoint>(`${BASE}/endpoints/${id}`);
  return data;
}

export async function createWebhook(payload: CreateWebhookPayload): Promise<WebhookEndpointCreatedSecret> {
  const { data } = await apiClient.post<WebhookEndpointCreatedSecret>(`${BASE}/endpoints`, payload);
  return data;
}

export async function updateWebhook(id: string, payload: UpdateWebhookPayload): Promise<WebhookEndpoint> {
  const { data } = await apiClient.patch<WebhookEndpoint>(`${BASE}/endpoints/${id}`, payload);
  return data;
}

export async function deleteWebhook(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/endpoints/${id}`);
}

export async function enableWebhook(id: string): Promise<WebhookEndpoint> {
  const { data } = await apiClient.post<WebhookEndpoint>(`${BASE}/endpoints/${id}/enable`);
  return data;
}

export async function disableWebhook(id: string): Promise<WebhookEndpoint> {
  const { data } = await apiClient.post<WebhookEndpoint>(`${BASE}/endpoints/${id}/disable`);
  return data;
}

export async function rotateWebhookSecret(id: string): Promise<WebhookEndpointCreatedSecret> {
  const { data } = await apiClient.post<WebhookEndpointCreatedSecret>(`${BASE}/endpoints/${id}/rotate-secret`);
  return data;
}

export async function testWebhook(id: string, payload: TestWebhookPayload = {}): Promise<WebhookTestResult> {
  const { data } = await apiClient.post<WebhookTestResult>(`${BASE}/endpoints/${id}/test`, payload);
  return data;
}

export async function getWebhookHistory(id: string): Promise<WebhookHistoryEntry[]> {
  const { data } = await apiClient.get<WebhookHistoryEntry[]>(`${BASE}/endpoints/${id}/history`);
  return data;
}

export async function getWebhookDeliveries(id: string, params: WebhookDeliveryFilterParams = {}): Promise<WebhookDeliveryListResult> {
  const { data } = await apiClient.get<WebhookDeliveryListResult>(`${BASE}/endpoints/${id}/deliveries`, { params });
  return data;
}

export async function redeliverWebhookDelivery(deliveryId: string): Promise<WebhookDelivery> {
  const { data } = await apiClient.post<WebhookDelivery>(`${BASE}/deliveries/${deliveryId}/redeliver`);
  return data;
}

export async function cancelWebhookDelivery(deliveryId: string): Promise<WebhookDelivery> {
  const { data } = await apiClient.post<WebhookDelivery>(`${BASE}/deliveries/${deliveryId}/cancel`);
  return data;
}
