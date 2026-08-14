import { apiClient } from '@/lib/api/axios';
import type {
  AiProviderConfig,
  AiProviderConfigFilterParams,
  AiProviderConfigHistoryEntry,
  AiProviderConfigListResult,
  AiProviderCredential,
  AiProviderCredentialFilterParams,
  AiProviderCredentialHistoryEntry,
  AiProviderCredentialListResult,
  AiProviderExpansion,
  AiProviderExpansionFilterParams,
  AiProviderExpansionHistoryEntry,
  AiProviderExpansionListResult,
  AiProviderRegistryEntry,
  AiProviderRegistryFilterParams,
  AiProviderRegistryListResult,
  AiConnectionValidationResult,
  CreateAiProviderConfigPayload,
  CreateAiProviderCredentialPayload,
  CreateAiProviderRegistryPayload,
  OnboardAiProviderPayload,
  RotateAiProviderCredentialPayload,
  UpdateAiProviderConfigPayload,
  UpdateAiProviderCredentialPayload,
  UpdateAiProviderRegistryPayload,
} from '@/types';

const REGISTRY_BASE = '/ai-provider-registry';
const CONFIG_BASE = '/ai-provider-configurations';
const CREDENTIAL_BASE = '/ai-provider-credentials';
const EXPANSION_BASE = '/ai-provider-expansion';

// ── Registry ────────────────────────────────────────────────────────────
export async function listProviderRegistryEntries(params: AiProviderRegistryFilterParams = {}): Promise<AiProviderRegistryListResult> {
  const { data } = await apiClient.get<AiProviderRegistryListResult>(REGISTRY_BASE, { params });
  return data;
}

export async function getProviderRegistryEntryById(id: string): Promise<AiProviderRegistryEntry> {
  const { data } = await apiClient.get<AiProviderRegistryEntry>(`${REGISTRY_BASE}/${id}`);
  return data;
}

export async function createProviderRegistryEntry(payload: CreateAiProviderRegistryPayload): Promise<AiProviderRegistryEntry> {
  const { data } = await apiClient.post<AiProviderRegistryEntry>(REGISTRY_BASE, payload);
  return data;
}

export async function updateProviderRegistryEntry(id: string, payload: UpdateAiProviderRegistryPayload): Promise<AiProviderRegistryEntry> {
  const { data } = await apiClient.put<AiProviderRegistryEntry>(`${REGISTRY_BASE}/${id}`, payload);
  return data;
}

export async function enableProviderRegistryEntry(id: string): Promise<AiProviderRegistryEntry> {
  const { data } = await apiClient.post<AiProviderRegistryEntry>(`${REGISTRY_BASE}/${id}/enable`);
  return data;
}

export async function disableProviderRegistryEntry(id: string): Promise<AiProviderRegistryEntry> {
  const { data } = await apiClient.post<AiProviderRegistryEntry>(`${REGISTRY_BASE}/${id}/disable`);
  return data;
}

export async function archiveProviderRegistryEntry(id: string): Promise<AiProviderRegistryEntry> {
  const { data } = await apiClient.post<AiProviderRegistryEntry>(`${REGISTRY_BASE}/${id}/archive`);
  return data;
}

// ── Configuration ───────────────────────────────────────────────────────
export async function listProviderConfigs(params: AiProviderConfigFilterParams = {}): Promise<AiProviderConfigListResult> {
  const { data } = await apiClient.get<AiProviderConfigListResult>(CONFIG_BASE, { params });
  return data;
}

export async function getProviderConfigById(id: string): Promise<AiProviderConfig> {
  const { data } = await apiClient.get<AiProviderConfig>(`${CONFIG_BASE}/${id}`);
  return data;
}

export async function createProviderConfig(payload: CreateAiProviderConfigPayload): Promise<AiProviderConfig> {
  const { data } = await apiClient.post<AiProviderConfig>(CONFIG_BASE, payload);
  return data;
}

export async function updateProviderConfig(id: string, payload: UpdateAiProviderConfigPayload): Promise<AiProviderConfig> {
  const { data } = await apiClient.put<AiProviderConfig>(`${CONFIG_BASE}/${id}`, payload);
  return data;
}

export async function deleteProviderConfig(id: string): Promise<void> {
  await apiClient.delete(`${CONFIG_BASE}/${id}`);
}

export async function publishProviderConfig(id: string, approvedBy?: string, changeReason?: string): Promise<AiProviderConfig> {
  const { data } = await apiClient.post<AiProviderConfig>(`${CONFIG_BASE}/${id}/publish`, { approvedBy, changeReason });
  return data;
}

export async function enableProviderConfig(id: string): Promise<AiProviderConfig> {
  const { data } = await apiClient.post<AiProviderConfig>(`${CONFIG_BASE}/${id}/enable`);
  return data;
}

export async function disableProviderConfig(id: string): Promise<AiProviderConfig> {
  const { data } = await apiClient.post<AiProviderConfig>(`${CONFIG_BASE}/${id}/disable`);
  return data;
}

export async function archiveProviderConfig(id: string): Promise<void> {
  await apiClient.post(`${CONFIG_BASE}/${id}/archive`);
}

export async function rollbackProviderConfig(id: string, toVersion: number, reason?: string): Promise<AiProviderConfig> {
  const { data } = await apiClient.post<AiProviderConfig>(`${CONFIG_BASE}/${id}/rollback`, { toVersion, reason });
  return data;
}

export async function getProviderConfigHistory(id: string): Promise<AiProviderConfigHistoryEntry[]> {
  const { data } = await apiClient.get<AiProviderConfigHistoryEntry[]>(`${CONFIG_BASE}/${id}/history`);
  return data;
}

// ── Credentials ─────────────────────────────────────────────────────────
export async function listProviderCredentials(params: AiProviderCredentialFilterParams = {}): Promise<AiProviderCredentialListResult> {
  const { data } = await apiClient.get<AiProviderCredentialListResult>(CREDENTIAL_BASE, { params });
  return data;
}

export async function getProviderCredentialById(id: string): Promise<AiProviderCredential> {
  const { data } = await apiClient.get<AiProviderCredential>(`${CREDENTIAL_BASE}/${id}`);
  return data;
}

export async function createProviderCredential(payload: CreateAiProviderCredentialPayload): Promise<AiProviderCredential> {
  const { data } = await apiClient.post<AiProviderCredential>(CREDENTIAL_BASE, payload);
  return data;
}

export async function updateProviderCredential(id: string, payload: UpdateAiProviderCredentialPayload): Promise<AiProviderCredential> {
  const { data } = await apiClient.put<AiProviderCredential>(`${CREDENTIAL_BASE}/${id}`, payload);
  return data;
}

export async function deleteProviderCredential(id: string): Promise<void> {
  await apiClient.delete(`${CREDENTIAL_BASE}/${id}`);
}

export async function rotateProviderCredential(id: string, payload: RotateAiProviderCredentialPayload): Promise<AiProviderCredential> {
  const { data } = await apiClient.post<AiProviderCredential>(`${CREDENTIAL_BASE}/${id}/rotate`, payload);
  return data;
}

export async function enableProviderCredential(id: string): Promise<AiProviderCredential> {
  const { data } = await apiClient.post<AiProviderCredential>(`${CREDENTIAL_BASE}/${id}/enable`);
  return data;
}

export async function disableProviderCredential(id: string): Promise<AiProviderCredential> {
  const { data } = await apiClient.post<AiProviderCredential>(`${CREDENTIAL_BASE}/${id}/disable`);
  return data;
}

export async function revokeProviderCredential(id: string): Promise<AiProviderCredential> {
  const { data } = await apiClient.post<AiProviderCredential>(`${CREDENTIAL_BASE}/${id}/revoke`);
  return data;
}

export async function validateProviderCredential(id: string): Promise<AiConnectionValidationResult> {
  const { data } = await apiClient.post<AiConnectionValidationResult>(`${CREDENTIAL_BASE}/${id}/validate`);
  return data;
}

export async function getProviderCredentialHistory(id: string): Promise<AiProviderCredentialHistoryEntry[]> {
  const { data } = await apiClient.get<AiProviderCredentialHistoryEntry[]>(`${CREDENTIAL_BASE}/${id}/history`);
  return data;
}

// ── Rollout / Expansion ─────────────────────────────────────────────────
export async function listProviderExpansions(params: AiProviderExpansionFilterParams = {}): Promise<AiProviderExpansionListResult> {
  const { data } = await apiClient.get<AiProviderExpansionListResult>(EXPANSION_BASE, { params });
  return data;
}

export async function getProviderExpansionById(id: string): Promise<AiProviderExpansion> {
  const { data } = await apiClient.get<AiProviderExpansion>(`${EXPANSION_BASE}/${id}`);
  return data;
}

export async function onboardProviderExpansion(payload: OnboardAiProviderPayload): Promise<AiProviderExpansion> {
  const { data } = await apiClient.post<AiProviderExpansion>(EXPANSION_BASE, payload);
  return data;
}

export async function promoteProviderRollout(id: string, targetState: string, reason?: string): Promise<AiProviderExpansion> {
  const { data } = await apiClient.post<AiProviderExpansion>(`${EXPANSION_BASE}/${id}/rollout`, { targetState, reason });
  return data;
}

export async function getProviderExpansionHistory(id: string): Promise<AiProviderExpansionHistoryEntry[]> {
  const { data } = await apiClient.get<AiProviderExpansionHistoryEntry[]>(`${EXPANSION_BASE}/${id}/history`);
  return data;
}
