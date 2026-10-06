import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as flagsService from '@/services/feature-flags.service';
import { useAuthStore } from '@/stores';
import { useToast } from './use-toast';
import type {
  CreateFeatureFlagDefinitionPayload,
  CreateFeatureFlagOverridePayload,
  FeatureFlagDefinitionFilterParams,
  FeatureFlagOverrideFilterParams,
  UpdateFeatureFlagDefinitionPayload,
  UpdateFeatureFlagOverridePayload,
} from '@/types';

const FLAGS_KEY = 'feature-flags';

export function useFeatureFlagDefinitions(params: FeatureFlagDefinitionFilterParams = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [FLAGS_KEY, 'definitions', params],
    queryFn: () => flagsService.listFeatureFlagDefinitions(params),
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
}

export function useFeatureFlagDefinition(key: string | undefined) {
  return useQuery({
    queryKey: [FLAGS_KEY, 'definition', key],
    queryFn: () => flagsService.getFeatureFlagDefinition(key as string),
    enabled: !!key,
  });
}

export function useFeatureFlagDefinitionHistory(key: string | undefined) {
  return useQuery({
    queryKey: [FLAGS_KEY, 'definition-history', key],
    queryFn: () => flagsService.getFeatureFlagDefinitionHistory(key as string),
    enabled: !!key,
  });
}

export function useOverridesForFlag(key: string | undefined) {
  return useQuery({
    queryKey: [FLAGS_KEY, 'flag-overrides', key],
    queryFn: () => flagsService.listOverridesForFlag(key as string),
    enabled: !!key,
  });
}

export function useAllFeatureFlagOverrides(params: FeatureFlagOverrideFilterParams = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [FLAGS_KEY, 'overrides', params],
    queryFn: () => flagsService.listAllOverrides(params),
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
}

function invalidateFlags(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: [FLAGS_KEY] });
}

export function useCreateFeatureFlagDefinition() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateFeatureFlagDefinitionPayload) => flagsService.createFeatureFlagDefinition(payload),
    onSuccess: () => {
      invalidateFlags(queryClient);
      toast.success('Feature flag created');
    },
    onError: () => toast.error('Could not create feature flag', 'Please try again.'),
  });
}

export function useUpdateFeatureFlagDefinition(key: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateFeatureFlagDefinitionPayload) => flagsService.updateFeatureFlagDefinition(key, payload),
    onSuccess: () => {
      invalidateFlags(queryClient);
      toast.success('Feature flag updated');
    },
    onError: () => toast.error('Could not update feature flag', 'Please try again.'),
  });
}

function useFlagAction(key: string, fn: () => Promise<unknown>, successMessage?: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      invalidateFlags(queryClient);
      if (successMessage) toast.success(successMessage);
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useEnableFeatureFlagDefinition(key: string) {
  return useFlagAction(key, () => flagsService.enableFeatureFlagDefinition(key), 'Feature flag enabled');
}

export function useDisableFeatureFlagDefinition(key: string) {
  return useFlagAction(key, () => flagsService.disableFeatureFlagDefinition(key), 'Feature flag disabled');
}

export function useArchiveFeatureFlagDefinition(key: string) {
  return useFlagAction(key, () => flagsService.archiveFeatureFlagDefinition(key), 'Feature flag archived');
}

export function useRestoreFeatureFlagDefinition(key: string) {
  return useFlagAction(key, () => flagsService.restoreFeatureFlagDefinition(key), 'Feature flag restored');
}

export function useActivateKillSwitch(key: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (reason: string) => flagsService.activateKillSwitch(key, reason),
    onSuccess: () => {
      invalidateFlags(queryClient);
      toast.success('Kill switch activated');
    },
    onError: () => toast.error('Could not activate kill switch', 'Please try again.'),
  });
}

export function useDeactivateKillSwitch(key: string) {
  return useFlagAction(key, () => flagsService.deactivateKillSwitch(key), 'Kill switch deactivated');
}

export function useCreateFeatureFlagOverride(key: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateFeatureFlagOverridePayload) => flagsService.createFeatureFlagOverride(key, payload),
    onSuccess: () => {
      invalidateFlags(queryClient);
      toast.success('Override created');
    },
    onError: () => toast.error('Could not create override', 'Please try again.'),
  });
}

export function useUpdateFeatureFlagOverride(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateFeatureFlagOverridePayload) => flagsService.updateOverride(id, payload),
    onSuccess: () => invalidateFlags(queryClient),
    onError: () => toast.error('Could not update override', 'Please try again.'),
  });
}

export function useEnableFeatureFlagOverride() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => flagsService.enableOverride(id),
    onSuccess: () => invalidateFlags(queryClient),
  });
}

export function useDisableFeatureFlagOverride() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => flagsService.disableOverride(id),
    onSuccess: () => invalidateFlags(queryClient),
  });
}

export function useArchiveFeatureFlagOverride() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => flagsService.archiveOverride(id, reason),
    onSuccess: () => {
      invalidateFlags(queryClient);
      toast.success('Override archived');
    },
  });
}
