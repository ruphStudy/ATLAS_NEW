import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as providersService from '@/services/ai-providers.service';
import { QUERY_KEYS } from '@/constants';
import type {
  AiProviderConfigFilterParams,
  AiProviderCredentialFilterParams,
  AiProviderExpansionFilterParams,
  AiProviderRegistryFilterParams,
  CreateAiProviderConfigPayload,
  CreateAiProviderCredentialPayload,
  CreateAiProviderRegistryPayload,
  OnboardAiProviderPayload,
  RotateAiProviderCredentialPayload,
  UpdateAiProviderConfigPayload,
  UpdateAiProviderCredentialPayload,
  UpdateAiProviderRegistryPayload,
} from '@/types';
import { useToast } from './use-toast';

// ── Registry ────────────────────────────────────────────────────────────
export function useProviderRegistryEntries(params: AiProviderRegistryFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_PROVIDER_REGISTRY, params],
    queryFn: () => providersService.listProviderRegistryEntries(params),
    staleTime: 30 * 1000,
  });
}

export function useProviderRegistryEntry(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_PROVIDER_REGISTRY, id],
    queryFn: () => providersService.getProviderRegistryEntryById(id as string),
    enabled: !!id,
  });
}

export function useCreateProviderRegistryEntry() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateAiProviderRegistryPayload) => providersService.createProviderRegistryEntry(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_PROVIDER_REGISTRY] });
      toast.success('Provider registered');
    },
    onError: () => toast.error('Could not register provider', 'Please try again.'),
  });
}

export function useUpdateProviderRegistryEntry(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateAiProviderRegistryPayload) => providersService.updateProviderRegistryEntry(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_PROVIDER_REGISTRY] });
      toast.success('Provider updated');
    },
    onError: () => toast.error('Could not update provider', 'Please try again.'),
  });
}

function useProviderRegistryAction(id: string, action: (id: string) => Promise<unknown>, successMessage: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => action(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_PROVIDER_REGISTRY] });
      toast.success(successMessage);
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useEnableProviderRegistryEntry(id: string) {
  return useProviderRegistryAction(id, providersService.enableProviderRegistryEntry, 'Provider enabled');
}
export function useDisableProviderRegistryEntry(id: string) {
  return useProviderRegistryAction(id, providersService.disableProviderRegistryEntry, 'Provider disabled');
}
export function useArchiveProviderRegistryEntry(id: string) {
  return useProviderRegistryAction(id, providersService.archiveProviderRegistryEntry, 'Provider archived');
}

// ── Configuration ───────────────────────────────────────────────────────
export function useProviderConfigs(params: AiProviderConfigFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_PROVIDER_CONFIGS, params],
    queryFn: () => providersService.listProviderConfigs(params),
    staleTime: 30 * 1000,
  });
}

export function useProviderConfig(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_PROVIDER_CONFIGS, id],
    queryFn: () => providersService.getProviderConfigById(id as string),
    enabled: !!id,
  });
}

export function useProviderConfigHistory(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_PROVIDER_CONFIGS, id, 'history'],
    queryFn: () => providersService.getProviderConfigHistory(id as string),
    enabled: !!id,
  });
}

export function useCreateProviderConfig() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateAiProviderConfigPayload) => providersService.createProviderConfig(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_PROVIDER_CONFIGS] });
      toast.success('Configuration created');
    },
    onError: () => toast.error('Could not create configuration', 'Please try again.'),
  });
}

export function useUpdateProviderConfig(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateAiProviderConfigPayload) => providersService.updateProviderConfig(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_PROVIDER_CONFIGS] });
      toast.success('Configuration updated');
    },
    onError: () => toast.error('Could not update configuration', 'Please try again.'),
  });
}

export function useDeleteProviderConfig() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => providersService.deleteProviderConfig(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_PROVIDER_CONFIGS] });
      toast.success('Configuration deleted');
    },
    onError: () => toast.error('Could not delete configuration', 'Please try again.'),
  });
}

function useProviderConfigAction<T = void>(id: string, action: (id: string, arg: T) => Promise<unknown>, successMessage: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (arg: T) => action(id, arg),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_PROVIDER_CONFIGS] });
      toast.success(successMessage);
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function usePublishProviderConfig(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ approvedBy, changeReason }: { approvedBy?: string; changeReason?: string } = {}) => providersService.publishProviderConfig(id, approvedBy, changeReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_PROVIDER_CONFIGS] });
      toast.success('Configuration published');
    },
    onError: () => toast.error('Publish failed', 'Please try again.'),
  });
}

export function useEnableProviderConfig(id: string) {
  return useProviderConfigAction<void>(id, () => providersService.enableProviderConfig(id), 'Configuration enabled');
}
export function useDisableProviderConfig(id: string) {
  return useProviderConfigAction<void>(id, () => providersService.disableProviderConfig(id), 'Configuration disabled');
}
export function useArchiveProviderConfig(id: string) {
  return useProviderConfigAction<void>(id, () => providersService.archiveProviderConfig(id), 'Configuration archived');
}

export function useRollbackProviderConfig(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ toVersion, reason }: { toVersion: number; reason?: string }) => providersService.rollbackProviderConfig(id, toVersion, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_PROVIDER_CONFIGS] });
      toast.success('Configuration rolled back');
    },
    onError: () => toast.error('Rollback failed', 'Please try again.'),
  });
}

// ── Credentials ─────────────────────────────────────────────────────────
export function useProviderCredentials(params: AiProviderCredentialFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_PROVIDER_CREDENTIALS, params],
    queryFn: () => providersService.listProviderCredentials(params),
    staleTime: 30 * 1000,
  });
}

export function useProviderCredential(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_PROVIDER_CREDENTIALS, id],
    queryFn: () => providersService.getProviderCredentialById(id as string),
    enabled: !!id,
  });
}

export function useProviderCredentialHistory(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_PROVIDER_CREDENTIALS, id, 'history'],
    queryFn: () => providersService.getProviderCredentialHistory(id as string),
    enabled: !!id,
  });
}

export function useCreateProviderCredential() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateAiProviderCredentialPayload) => providersService.createProviderCredential(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_PROVIDER_CREDENTIALS] });
      toast.success('Credential created');
    },
    onError: () => toast.error('Could not create credential', 'Please try again.'),
  });
}

export function useUpdateProviderCredential(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateAiProviderCredentialPayload) => providersService.updateProviderCredential(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_PROVIDER_CREDENTIALS] });
      toast.success('Credential updated');
    },
    onError: () => toast.error('Could not update credential', 'Please try again.'),
  });
}

export function useDeleteProviderCredential() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => providersService.deleteProviderCredential(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_PROVIDER_CREDENTIALS] });
      toast.success('Credential deleted');
    },
    onError: () => toast.error('Could not delete credential', 'Please try again.'),
  });
}

export function useRotateProviderCredential(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: RotateAiProviderCredentialPayload) => providersService.rotateProviderCredential(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_PROVIDER_CREDENTIALS] });
      toast.success('Credential rotated');
    },
    onError: () => toast.error('Rotation failed', 'Please try again.'),
  });
}

export function useEnableProviderCredential(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => providersService.enableProviderCredential(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_PROVIDER_CREDENTIALS] });
      toast.success('Credential enabled');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useDisableProviderCredential(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => providersService.disableProviderCredential(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_PROVIDER_CREDENTIALS] });
      toast.success('Credential disabled');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useRevokeProviderCredential(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => providersService.revokeProviderCredential(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_PROVIDER_CREDENTIALS] });
      toast.success('Credential revoked');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useValidateProviderCredential(id: string) {
  const toast = useToast();
  return useMutation({
    mutationFn: () => providersService.validateProviderCredential(id),
    onError: () => toast.error('Validation failed', 'Please try again.'),
  });
}

// ── Rollout / Expansion ─────────────────────────────────────────────────
export function useProviderExpansions(params: AiProviderExpansionFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_PROVIDER_EXPANSIONS, params],
    queryFn: () => providersService.listProviderExpansions(params),
    staleTime: 30 * 1000,
  });
}

export function useProviderExpansion(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_PROVIDER_EXPANSIONS, id],
    queryFn: () => providersService.getProviderExpansionById(id as string),
    enabled: !!id,
  });
}

export function useProviderExpansionHistory(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_PROVIDER_EXPANSIONS, id, 'history'],
    queryFn: () => providersService.getProviderExpansionHistory(id as string),
    enabled: !!id,
  });
}

export function useOnboardProviderExpansion() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: OnboardAiProviderPayload) => providersService.onboardProviderExpansion(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_PROVIDER_EXPANSIONS] });
      toast.success('Provider onboarded');
    },
    onError: () => toast.error('Could not onboard provider', 'Please try again.'),
  });
}

export function usePromoteProviderRollout(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ targetState, reason }: { targetState: string; reason?: string }) => providersService.promoteProviderRollout(id, targetState, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_PROVIDER_EXPANSIONS] });
      toast.success('Rollout updated');
    },
    onError: () => toast.error('Could not update rollout', 'Please try again.'),
  });
}
