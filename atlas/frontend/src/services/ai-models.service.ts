import { apiClient } from '@/lib/api/axios';
import type {
  AiCapabilityDefinition,
  AiCapabilityDefinitionFilterParams,
  AiCapabilityDefinitionListResult,
  AiCapabilityOverride,
  AiCapabilityOverrideFilterParams,
  AiCapabilityOverrideListResult,
  AiCapabilityResolutionResult,
  AiModel,
  AiModelConfiguration,
  AiModelFilterParams,
  AiModelListResult,
  CreateAiCapabilityDefinitionPayload,
  CreateAiCapabilityOverridePayload,
  CreateModelConfigurationPayload,
  ModelCompatibilityResult,
  ModelConfigurationFilterParams,
  ModelConfigurationListResult,
  ModelDiscoveryResult,
  ModelResolutionParams,
  RegisterAiModelPayload,
  ResolveAiCapabilityParams,
  ResolvedModel,
  UpdateAiCapabilityDefinitionPayload,
  UpdateAiCapabilityOverridePayload,
  UpdateAiModelPayload,
  UpdateModelConfigurationPayload,
} from '@/types';

const MODEL_BASE = '/ai-model-management';
const CAPABILITY_BASE = '/ai-capabilities';

// ── Models ──────────────────────────────────────────────────────────────
export async function listAiModels(params: AiModelFilterParams = {}): Promise<AiModelListResult> {
  const { data } = await apiClient.get<AiModelListResult>(`${MODEL_BASE}/models`, { params });
  return data;
}

export async function getAiModelById(id: string, workspaceId?: string): Promise<AiModel> {
  const { data } = await apiClient.get<AiModel>(`${MODEL_BASE}/models/${id}`, { params: { workspaceId } });
  return data;
}

export async function registerAiModel(payload: RegisterAiModelPayload): Promise<AiModel> {
  const { data } = await apiClient.post<AiModel>(`${MODEL_BASE}/models`, payload);
  return data;
}

export async function updateAiModel(id: string, payload: UpdateAiModelPayload, workspaceId?: string): Promise<AiModel> {
  const { data } = await apiClient.patch<AiModel>(`${MODEL_BASE}/models/${id}`, payload, { params: { workspaceId } });
  return data;
}

export async function deleteAiModel(id: string, workspaceId?: string): Promise<void> {
  await apiClient.delete(`${MODEL_BASE}/models/${id}`, { params: { workspaceId } });
}

export async function enableAiModel(id: string, workspaceId?: string): Promise<AiModel> {
  const { data } = await apiClient.patch<AiModel>(`${MODEL_BASE}/models/${id}/enable`, {}, { params: { workspaceId } });
  return data;
}

export async function disableAiModel(id: string, workspaceId?: string): Promise<AiModel> {
  const { data } = await apiClient.patch<AiModel>(`${MODEL_BASE}/models/${id}/disable`, {}, { params: { workspaceId } });
  return data;
}

export async function deprecateAiModel(id: string, workspaceId?: string): Promise<AiModel> {
  const { data } = await apiClient.patch<AiModel>(`${MODEL_BASE}/models/${id}/deprecate`, {}, { params: { workspaceId } });
  return data;
}

export async function archiveAiModel(id: string, workspaceId?: string): Promise<AiModel> {
  const { data } = await apiClient.patch<AiModel>(`${MODEL_BASE}/models/${id}/archive`, {}, { params: { workspaceId } });
  return data;
}

export async function getModelCompatibility(id: string, capability: string, workspaceId?: string): Promise<ModelCompatibilityResult> {
  const { data } = await apiClient.get<ModelCompatibilityResult>(`${MODEL_BASE}/models/${id}/compatibility/${capability}`, { params: { workspaceId } });
  return data;
}

export async function discoverAiModels(params: { provider?: string; capability?: string; region?: string; workspaceId?: string } = {}): Promise<ModelDiscoveryResult> {
  const { data } = await apiClient.get<ModelDiscoveryResult>(`${MODEL_BASE}/discover`, { params });
  return data;
}

export async function resolveAiModel(payload: ModelResolutionParams): Promise<ResolvedModel> {
  const { data } = await apiClient.post<ResolvedModel>(`${MODEL_BASE}/resolve`, payload);
  return data;
}

// ── Model configurations ────────────────────────────────────────────────
export async function listModelConfigurations(params: ModelConfigurationFilterParams): Promise<ModelConfigurationListResult> {
  const { data } = await apiClient.get<ModelConfigurationListResult>(`${MODEL_BASE}/configurations`, { params });
  return data;
}

export async function createModelConfiguration(payload: CreateModelConfigurationPayload): Promise<AiModelConfiguration> {
  const { data } = await apiClient.post<AiModelConfiguration>(`${MODEL_BASE}/configurations`, payload);
  return data;
}

export async function updateModelConfiguration(id: string, workspaceId: string, payload: UpdateModelConfigurationPayload): Promise<AiModelConfiguration> {
  const { data } = await apiClient.patch<AiModelConfiguration>(`${MODEL_BASE}/configurations/${id}`, payload, { params: { workspaceId } });
  return data;
}

export async function deleteModelConfiguration(id: string, workspaceId: string): Promise<void> {
  await apiClient.delete(`${MODEL_BASE}/configurations/${id}`, { params: { workspaceId } });
}

// ── Capability definitions ──────────────────────────────────────────────
export async function listCapabilityDefinitions(params: AiCapabilityDefinitionFilterParams = {}): Promise<AiCapabilityDefinitionListResult> {
  const { data } = await apiClient.get<AiCapabilityDefinitionListResult>(CAPABILITY_BASE, { params });
  return data;
}

export async function getCapabilityDefinitionById(id: string): Promise<AiCapabilityDefinition> {
  const { data } = await apiClient.get<AiCapabilityDefinition>(`${CAPABILITY_BASE}/${id}`);
  return data;
}

export async function createCapabilityDefinition(payload: CreateAiCapabilityDefinitionPayload): Promise<AiCapabilityDefinition> {
  const { data } = await apiClient.post<AiCapabilityDefinition>(CAPABILITY_BASE, payload);
  return data;
}

export async function updateCapabilityDefinition(id: string, payload: UpdateAiCapabilityDefinitionPayload): Promise<AiCapabilityDefinition> {
  const { data } = await apiClient.put<AiCapabilityDefinition>(`${CAPABILITY_BASE}/${id}`, payload);
  return data;
}

export async function enableCapabilityDefinition(id: string): Promise<AiCapabilityDefinition> {
  const { data } = await apiClient.post<AiCapabilityDefinition>(`${CAPABILITY_BASE}/${id}/enable`);
  return data;
}

export async function disableCapabilityDefinition(id: string): Promise<AiCapabilityDefinition> {
  const { data } = await apiClient.post<AiCapabilityDefinition>(`${CAPABILITY_BASE}/${id}/disable`);
  return data;
}

// ── Capability overrides ────────────────────────────────────────────────
export async function listCapabilityOverrides(params: AiCapabilityOverrideFilterParams = {}): Promise<AiCapabilityOverrideListResult> {
  const { data } = await apiClient.get<AiCapabilityOverrideListResult>(`${CAPABILITY_BASE}/overrides`, { params });
  return data;
}

export async function createCapabilityOverride(payload: CreateAiCapabilityOverridePayload): Promise<AiCapabilityOverride> {
  const { data } = await apiClient.post<AiCapabilityOverride>(`${CAPABILITY_BASE}/overrides`, payload);
  return data;
}

export async function updateCapabilityOverride(id: string, payload: UpdateAiCapabilityOverridePayload): Promise<AiCapabilityOverride> {
  const { data } = await apiClient.put<AiCapabilityOverride>(`${CAPABILITY_BASE}/overrides/${id}`, payload);
  return data;
}

export async function enableCapabilityOverride(id: string): Promise<AiCapabilityOverride> {
  const { data } = await apiClient.post<AiCapabilityOverride>(`${CAPABILITY_BASE}/overrides/${id}/enable`);
  return data;
}

export async function disableCapabilityOverride(id: string): Promise<AiCapabilityOverride> {
  const { data } = await apiClient.post<AiCapabilityOverride>(`${CAPABILITY_BASE}/overrides/${id}/disable`);
  return data;
}

export async function resolveCapability(params: ResolveAiCapabilityParams): Promise<AiCapabilityResolutionResult> {
  const { data } = await apiClient.get<AiCapabilityResolutionResult>(`${CAPABILITY_BASE}/resolve`, { params });
  return data;
}
