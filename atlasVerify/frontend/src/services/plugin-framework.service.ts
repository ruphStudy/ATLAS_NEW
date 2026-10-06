import { apiClient } from '@/lib/api/axios';
import type {
  ActivatePluginPayload,
  CreatePluginEventSubscriptionPayload,
  PluginActivation,
  PluginActivationFilterParams,
  PluginActivationHealth,
  PluginActivationListResult,
  PluginEventSubscription,
  PluginExtensionPoint,
  PluginHistoryEntry,
  PluginManifest,
  PluginRequiredReasonPayload,
  RegisterPluginExtensionPointPayload,
  RegisterPluginManifestPayload,
  UpdatePluginManifestPayload,
} from '@/types';

const BASE = '/plugin-framework';

export async function registerPluginManifest(appKey: string, payload: RegisterPluginManifestPayload): Promise<PluginManifest> {
  const { data } = await apiClient.post<PluginManifest>(`${BASE}/apps/${appKey}/manifests`, payload);
  return data;
}

export async function updatePluginManifest(appKey: string, versionId: string, payload: UpdatePluginManifestPayload): Promise<PluginManifest> {
  const { data } = await apiClient.patch<PluginManifest>(`${BASE}/apps/${appKey}/manifests/${versionId}`, payload);
  return data;
}

export async function deprecatePluginManifest(appKey: string, versionId: string): Promise<PluginManifest> {
  const { data } = await apiClient.post<PluginManifest>(`${BASE}/apps/${appKey}/manifests/${versionId}/deprecate`);
  return data;
}

export async function getPluginManifest(appKey: string, versionId: string): Promise<PluginManifest> {
  const { data } = await apiClient.get<PluginManifest>(`${BASE}/apps/${appKey}/manifests/${versionId}`);
  return data;
}

export async function listPluginManifests(appKey: string): Promise<PluginManifest[]> {
  const { data } = await apiClient.get<PluginManifest[]>(`${BASE}/apps/${appKey}/manifests`);
  return data;
}

export async function activatePlugin(installationId: string, payload: ActivatePluginPayload = {}): Promise<PluginActivation> {
  const { data } = await apiClient.post<PluginActivation>(`${BASE}/installations/${installationId}/activate`, payload);
  return data;
}

export async function listPluginActivations(params: PluginActivationFilterParams = {}): Promise<PluginActivationListResult> {
  const { data } = await apiClient.get<PluginActivationListResult>(`${BASE}/activations`, { params });
  return data;
}

export async function getPluginActivation(id: string): Promise<PluginActivation> {
  const { data } = await apiClient.get<PluginActivation>(`${BASE}/activations/${id}`);
  return data;
}

export async function getPluginActivationHealth(id: string): Promise<PluginActivationHealth> {
  const { data } = await apiClient.get<PluginActivationHealth>(`${BASE}/activations/${id}/health`);
  return data;
}

export async function getPluginActivationHistory(id: string): Promise<PluginHistoryEntry[]> {
  const { data } = await apiClient.get<PluginHistoryEntry[]>(`${BASE}/activations/${id}/history`);
  return data;
}

export async function deactivatePlugin(id: string): Promise<PluginActivation> {
  const { data } = await apiClient.post<PluginActivation>(`${BASE}/activations/${id}/deactivate`);
  return data;
}

export async function quarantinePlugin(id: string, payload: PluginRequiredReasonPayload): Promise<PluginActivation> {
  const { data } = await apiClient.post<PluginActivation>(`${BASE}/activations/${id}/quarantine`, payload);
  return data;
}

export async function reactivatePlugin(id: string): Promise<PluginActivation> {
  const { data } = await apiClient.post<PluginActivation>(`${BASE}/activations/${id}/reactivate`);
  return data;
}

export async function registerPluginExtensionPoint(appKey: string, payload: RegisterPluginExtensionPointPayload): Promise<PluginExtensionPoint> {
  const { data } = await apiClient.post<PluginExtensionPoint>(`${BASE}/apps/${appKey}/extension-points`, payload);
  return data;
}

export async function listPluginExtensionPoints(appKey: string): Promise<PluginExtensionPoint[]> {
  const { data } = await apiClient.get<PluginExtensionPoint[]>(`${BASE}/apps/${appKey}/extension-points`);
  return data;
}

export async function removePluginExtensionPoint(appKey: string, extensionPointKey: string): Promise<PluginExtensionPoint> {
  const { data } = await apiClient.delete<PluginExtensionPoint>(`${BASE}/apps/${appKey}/extension-points/${extensionPointKey}`);
  return data;
}

export async function subscribeToPluginEvent(appKey: string, payload: CreatePluginEventSubscriptionPayload): Promise<PluginEventSubscription> {
  const { data } = await apiClient.post<PluginEventSubscription>(`${BASE}/apps/${appKey}/subscriptions`, payload);
  return data;
}

export async function listPluginEventSubscriptions(appKey: string): Promise<PluginEventSubscription[]> {
  const { data } = await apiClient.get<PluginEventSubscription[]>(`${BASE}/apps/${appKey}/subscriptions`);
  return data;
}

export async function unsubscribePluginEvent(id: string): Promise<PluginEventSubscription> {
  const { data } = await apiClient.post<PluginEventSubscription>(`${BASE}/subscriptions/${id}/unsubscribe`);
  return data;
}
