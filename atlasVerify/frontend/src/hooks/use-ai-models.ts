import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as modelsService from '@/services/ai-models.service';
import { QUERY_KEYS } from '@/constants';
import type {
  AiCapabilityDefinitionFilterParams,
  AiCapabilityOverrideFilterParams,
  AiModelFilterParams,
  CreateAiCapabilityDefinitionPayload,
  CreateAiCapabilityOverridePayload,
  CreateModelConfigurationPayload,
  ModelConfigurationFilterParams,
  ModelResolutionParams,
  RegisterAiModelPayload,
  ResolveAiCapabilityParams,
  UpdateAiCapabilityDefinitionPayload,
  UpdateAiCapabilityOverridePayload,
  UpdateAiModelPayload,
  UpdateModelConfigurationPayload,
} from '@/types';
import { useToast } from './use-toast';

// ── Models ──────────────────────────────────────────────────────────────
export function useAiModels(params: AiModelFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_MODELS, params],
    queryFn: () => modelsService.listAiModels(params),
    staleTime: 60 * 1000,
  });
}

export function useAiModel(id: string | undefined, workspaceId?: string) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_MODELS, id],
    queryFn: () => modelsService.getAiModelById(id as string, workspaceId),
    enabled: !!id,
  });
}

export function useRegisterAiModel() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: RegisterAiModelPayload) => modelsService.registerAiModel(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_MODELS] });
      toast.success('Model registered');
    },
    onError: () => toast.error('Could not register model', 'Please try again.'),
  });
}

export function useUpdateAiModel(id: string, workspaceId?: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateAiModelPayload) => modelsService.updateAiModel(id, payload, workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_MODELS] });
      toast.success('Model updated');
    },
    onError: () => toast.error('Could not update model', 'Please try again.'),
  });
}

function useAiModelAction(id: string, workspaceId: string | undefined, action: (id: string, workspaceId?: string) => Promise<unknown>, successMessage: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => action(id, workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_MODELS] });
      toast.success(successMessage);
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useEnableAiModel(id: string, workspaceId?: string) {
  return useAiModelAction(id, workspaceId, modelsService.enableAiModel, 'Model enabled');
}
export function useDisableAiModel(id: string, workspaceId?: string) {
  return useAiModelAction(id, workspaceId, modelsService.disableAiModel, 'Model disabled');
}
export function useDeprecateAiModel(id: string, workspaceId?: string) {
  return useAiModelAction(id, workspaceId, modelsService.deprecateAiModel, 'Model deprecated');
}
export function useArchiveAiModel(id: string, workspaceId?: string) {
  return useAiModelAction(id, workspaceId, modelsService.archiveAiModel, 'Model archived');
}

export function useModelCompatibility(id: string | undefined, capability: string | undefined, workspaceId?: string) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_MODELS, id, 'compatibility', capability],
    queryFn: () => modelsService.getModelCompatibility(id as string, capability as string, workspaceId),
    enabled: !!id && !!capability,
  });
}

export function useDiscoverAiModels(params: { provider?: string; capability?: string; region?: string; workspaceId?: string } = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_MODELS, 'discover', params],
    queryFn: () => modelsService.discoverAiModels(params),
  });
}

export function useResolveAiModel() {
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: ModelResolutionParams) => modelsService.resolveAiModel(payload),
    onError: () => toast.error('Could not resolve model', 'Please try again.'),
  });
}

// ── Model configurations ────────────────────────────────────────────────
export function useModelConfigurations(params: ModelConfigurationFilterParams) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_MODEL_CONFIGS, params],
    queryFn: () => modelsService.listModelConfigurations(params),
    enabled: !!params.workspaceId,
  });
}

export function useCreateModelConfiguration() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateModelConfigurationPayload) => modelsService.createModelConfiguration(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_MODEL_CONFIGS] });
      toast.success('Model configuration created');
    },
    onError: () => toast.error('Could not create configuration', 'Please try again.'),
  });
}

export function useUpdateModelConfiguration(id: string, workspaceId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateModelConfigurationPayload) => modelsService.updateModelConfiguration(id, workspaceId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_MODEL_CONFIGS] });
      toast.success('Model configuration updated');
    },
    onError: () => toast.error('Could not update configuration', 'Please try again.'),
  });
}

export function useDeleteModelConfiguration(workspaceId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => modelsService.deleteModelConfiguration(id, workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_MODEL_CONFIGS] });
      toast.success('Model configuration deleted');
    },
    onError: () => toast.error('Could not delete configuration', 'Please try again.'),
  });
}

// ── Capability definitions ──────────────────────────────────────────────
export function useCapabilityDefinitions(params: AiCapabilityDefinitionFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_CAPABILITY_DEFINITIONS, params],
    queryFn: () => modelsService.listCapabilityDefinitions(params),
  });
}

export function useCapabilityDefinition(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_CAPABILITY_DEFINITIONS, id],
    queryFn: () => modelsService.getCapabilityDefinitionById(id as string),
    enabled: !!id,
  });
}

export function useCreateCapabilityDefinition() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateAiCapabilityDefinitionPayload) => modelsService.createCapabilityDefinition(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_CAPABILITY_DEFINITIONS] });
      toast.success('Capability definition created');
    },
    onError: () => toast.error('Could not create capability', 'Please try again.'),
  });
}

export function useUpdateCapabilityDefinition(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateAiCapabilityDefinitionPayload) => modelsService.updateCapabilityDefinition(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_CAPABILITY_DEFINITIONS] });
      toast.success('Capability definition updated');
    },
    onError: () => toast.error('Could not update capability', 'Please try again.'),
  });
}

export function useEnableCapabilityDefinition(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => modelsService.enableCapabilityDefinition(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_CAPABILITY_DEFINITIONS] });
      toast.success('Capability enabled');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useDisableCapabilityDefinition(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => modelsService.disableCapabilityDefinition(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_CAPABILITY_DEFINITIONS] });
      toast.success('Capability disabled');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

// ── Capability overrides ────────────────────────────────────────────────
export function useCapabilityOverrides(params: AiCapabilityOverrideFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_CAPABILITY_OVERRIDES, params],
    queryFn: () => modelsService.listCapabilityOverrides(params),
  });
}

export function useCreateCapabilityOverride() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateAiCapabilityOverridePayload) => modelsService.createCapabilityOverride(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_CAPABILITY_OVERRIDES] });
      toast.success('Override created');
    },
    onError: () => toast.error('Could not create override', 'Please try again.'),
  });
}

export function useUpdateCapabilityOverride(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateAiCapabilityOverridePayload) => modelsService.updateCapabilityOverride(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_CAPABILITY_OVERRIDES] });
      toast.success('Override updated');
    },
    onError: () => toast.error('Could not update override', 'Please try again.'),
  });
}

export function useEnableCapabilityOverride(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => modelsService.enableCapabilityOverride(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_CAPABILITY_OVERRIDES] });
      toast.success('Override enabled');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useDisableCapabilityOverride(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => modelsService.disableCapabilityOverride(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_CAPABILITY_OVERRIDES] });
      toast.success('Override disabled');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useResolveCapability(params: ResolveAiCapabilityParams | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_CAPABILITY_OVERRIDES, 'resolve', params],
    queryFn: () => modelsService.resolveCapability(params!),
    enabled: !!params?.capabilityKey,
  });
}
