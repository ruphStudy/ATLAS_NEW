import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as settingsService from '@/services/settings-framework.service';
import { useAuthStore } from '@/stores';
import { useToast } from './use-toast';
import type { CreateSettingValuePayload, RollbackSettingValuePayload, SettingDefinitionFilterParams, SettingValueFilterParams, UpdateSettingValuePayload } from '@/types';

const SETTINGS_KEY = 'settings-framework';

export function useSettingDefinitions(params: SettingDefinitionFilterParams = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [SETTINGS_KEY, 'definitions', params],
    queryFn: () => settingsService.listSettingDefinitions(params),
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });
}

export function useSettingDefinition(key: string | undefined) {
  return useQuery({
    queryKey: [SETTINGS_KEY, 'definition', key],
    queryFn: () => settingsService.getSettingDefinition(key as string),
    enabled: !!key,
  });
}

export function useResolveSettings(moduleKey?: string, category?: string, keys?: string[], enabled = true) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [SETTINGS_KEY, 'resolve', moduleKey, category, keys],
    queryFn: () => settingsService.resolveSettings(moduleKey, category, keys),
    enabled: isAuthenticated && enabled,
    staleTime: 30 * 1000,
  });
}

export function useSettingValues(params: SettingValueFilterParams = {}, enabled = true) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [SETTINGS_KEY, 'values', params],
    queryFn: () => settingsService.listSettingValues(params),
    enabled: isAuthenticated && enabled,
    staleTime: 30 * 1000,
  });
}

export function useSettingValueHistory(id: string | undefined) {
  return useQuery({
    queryKey: [SETTINGS_KEY, 'value-history', id],
    queryFn: () => settingsService.getSettingValueHistory(id as string),
    enabled: !!id,
  });
}

function invalidateSettings(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: [SETTINGS_KEY] });
}

export function useCreateSettingValue() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateSettingValuePayload) => settingsService.createSettingValue(payload),
    onSuccess: () => {
      invalidateSettings(queryClient);
      toast.success('Setting value created');
    },
    onError: () => toast.error('Could not create setting value', 'Please try again.'),
  });
}

export function useUpdateSettingValue(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateSettingValuePayload) => settingsService.updateSettingValue(id, payload),
    onSuccess: () => invalidateSettings(queryClient),
    onError: () => toast.error('Could not update setting value', 'Please try again.'),
  });
}

function useSettingValueAction(id: string, fn: () => Promise<unknown>, successMessage?: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      invalidateSettings(queryClient);
      if (successMessage) toast.success(successMessage);
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function usePublishSettingValue(id: string) {
  return useSettingValueAction(id, () => settingsService.publishSettingValue(id), 'Setting value published');
}

export function useEnableSettingValue(id: string) {
  return useSettingValueAction(id, () => settingsService.enableSettingValue(id), 'Setting value enabled');
}

export function useDisableSettingValue(id: string) {
  return useSettingValueAction(id, () => settingsService.disableSettingValue(id), 'Setting value disabled');
}

export function useArchiveSettingValue(id: string) {
  return useSettingValueAction(id, () => settingsService.archiveSettingValue(id), 'Setting value archived');
}

export function useResetSettingValue(id: string) {
  return useSettingValueAction(id, () => settingsService.resetSettingValue(id), 'Setting value reset to default');
}

export function useRollbackSettingValue(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: RollbackSettingValuePayload) => settingsService.rollbackSettingValue(id, payload),
    onSuccess: () => {
      invalidateSettings(queryClient);
      toast.success('Setting value rolled back');
    },
    onError: () => toast.error('Could not roll back', 'Please try again.'),
  });
}
