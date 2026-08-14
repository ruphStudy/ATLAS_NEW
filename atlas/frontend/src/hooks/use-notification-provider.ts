import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as npService from '@/services/notification-provider.service';
import { useAuthStore } from '@/stores';
import { useToast } from './use-toast';
import type {
  CreateNotificationProviderConfigPayload,
  CreateNotificationProviderCredentialPayload,
  NotificationDeliveryFilterParams,
  NotificationProviderConfigFilterParams,
  NotificationProviderCredentialFilterParams,
  NotificationProviderRegistryFilterParams,
  RegisterNotificationProviderEntryPayload,
  RotateNotificationProviderCredentialPayload,
  UpdateNotificationProviderConfigPayload,
  UpdateNotificationProviderCredentialPayload,
  UpdateNotificationProviderEntryPayload,
} from '@/types';

const KEY = 'notification-provider';

function useWorkspaceId() {
  return useAuthStore((s) => s.user?.workspaceId);
}

export function useNotificationProviderRegistry(params: Omit<NotificationProviderRegistryFilterParams, 'workspaceId'> = {}) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [KEY, 'registry', workspaceId, params],
    queryFn: () => npService.listNotificationProviderRegistryEntries({ ...params, workspaceId: workspaceId as string }),
    enabled: !!workspaceId,
    staleTime: 30 * 1000,
  });
}

export function useNotificationProviderRegistryEntry(id: string | undefined) {
  return useQuery({
    queryKey: [KEY, 'registry', 'entry', id],
    queryFn: () => npService.getNotificationProviderRegistryEntry(id as string),
    enabled: !!id,
  });
}

function invalidateRegistry(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: [KEY, 'registry'] });
}

export function useRegisterNotificationProviderEntry() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const workspaceId = useWorkspaceId();
  return useMutation({
    mutationFn: (payload: Omit<RegisterNotificationProviderEntryPayload, 'workspaceId'>) => npService.registerNotificationProviderEntry({ ...payload, workspaceId }),
    onSuccess: () => {
      invalidateRegistry(queryClient);
      toast.success('Provider registered');
    },
    onError: () => toast.error('Could not register provider', 'Please try again.'),
  });
}

export function useUpdateNotificationProviderEntry(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateNotificationProviderEntryPayload) => npService.updateNotificationProviderEntry(id, payload),
    onSuccess: () => {
      invalidateRegistry(queryClient);
      toast.success('Provider updated');
    },
    onError: () => toast.error('Could not update provider', 'Please try again.'),
  });
}

function useRegistryAction(id: string, action: (id: string) => Promise<unknown>, successMessage: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => action(id),
    onSuccess: () => {
      invalidateRegistry(queryClient);
      toast.success(successMessage);
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useEnableNotificationProviderEntry(id: string) {
  return useRegistryAction(id, npService.enableNotificationProviderEntry, 'Provider enabled');
}

export function useDisableNotificationProviderEntry(id: string) {
  return useRegistryAction(id, npService.disableNotificationProviderEntry, 'Provider disabled');
}

export function useArchiveNotificationProviderEntry(id: string) {
  return useRegistryAction(id, npService.archiveNotificationProviderEntry, 'Provider archived');
}

export function useNotificationProviderConfigs(params: Omit<NotificationProviderConfigFilterParams, 'workspaceId'> = {}) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [KEY, 'configs', workspaceId, params],
    queryFn: () => npService.listNotificationProviderConfigs({ ...params, workspaceId: workspaceId as string }),
    enabled: !!workspaceId,
    staleTime: 30 * 1000,
  });
}

export function useNotificationProviderConfig(id: string | undefined) {
  return useQuery({
    queryKey: [KEY, 'configs', 'entry', id],
    queryFn: () => npService.getNotificationProviderConfig(id as string),
    enabled: !!id,
  });
}

export function useNotificationProviderConfigHistory(id: string | undefined) {
  return useQuery({
    queryKey: [KEY, 'configs', 'entry', id, 'history'],
    queryFn: () => npService.getNotificationProviderConfigHistory(id as string),
    enabled: !!id,
  });
}

function invalidateConfigs(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: [KEY, 'configs'] });
}

export function useCreateNotificationProviderConfig() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const workspaceId = useWorkspaceId();
  return useMutation({
    mutationFn: (payload: Omit<CreateNotificationProviderConfigPayload, 'workspaceId'>) => npService.createNotificationProviderConfig({ ...payload, workspaceId: workspaceId as string }),
    onSuccess: () => {
      invalidateConfigs(queryClient);
      toast.success('Configuration created');
    },
    onError: () => toast.error('Could not create configuration', 'Please try again.'),
  });
}

export function useUpdateNotificationProviderConfig(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateNotificationProviderConfigPayload) => npService.updateNotificationProviderConfig(id, payload),
    onSuccess: () => {
      invalidateConfigs(queryClient);
      toast.success('Configuration updated');
    },
    onError: () => toast.error('Could not update configuration', 'Please try again.'),
  });
}

export function useEnableNotificationProviderConfig(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => npService.enableNotificationProviderConfig(id),
    onSuccess: () => {
      invalidateConfigs(queryClient);
      toast.success('Configuration enabled');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useDisableNotificationProviderConfig(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => npService.disableNotificationProviderConfig(id),
    onSuccess: () => {
      invalidateConfigs(queryClient);
      toast.success('Configuration disabled');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useDeleteNotificationProviderConfig(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => npService.deleteNotificationProviderConfig(id),
    onSuccess: () => {
      invalidateConfigs(queryClient);
      toast.success('Configuration deleted');
    },
    onError: () => toast.error('Could not delete configuration', 'Please try again.'),
  });
}

export function useRollbackNotificationProviderConfig(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ version, changedBy }: { version: number; changedBy?: string }) => npService.rollbackNotificationProviderConfig(id, version, changedBy),
    onSuccess: () => {
      invalidateConfigs(queryClient);
      toast.success('Configuration rolled back');
    },
    onError: () => toast.error('Could not roll back configuration', 'Please try again.'),
  });
}

export function useNotificationProviderCredentials(params: Omit<NotificationProviderCredentialFilterParams, 'workspaceId'> = {}) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [KEY, 'credentials', workspaceId, params],
    queryFn: () => npService.listNotificationProviderCredentials({ ...params, workspaceId: workspaceId as string }),
    enabled: !!workspaceId,
    staleTime: 30 * 1000,
  });
}

export function useNotificationProviderCredentialHistory(id: string | undefined) {
  return useQuery({
    queryKey: [KEY, 'credentials', 'entry', id, 'history'],
    queryFn: () => npService.getNotificationProviderCredentialHistory(id as string),
    enabled: !!id,
  });
}

function invalidateCredentials(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: [KEY, 'credentials'] });
}

export function useCreateNotificationProviderCredential() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const workspaceId = useWorkspaceId();
  return useMutation({
    mutationFn: (payload: Omit<CreateNotificationProviderCredentialPayload, 'workspaceId'>) => npService.createNotificationProviderCredential({ ...payload, workspaceId: workspaceId as string }),
    onSuccess: () => {
      invalidateCredentials(queryClient);
      toast.success('Credential added');
    },
    onError: () => toast.error('Could not add credential', 'Please try again.'),
  });
}

export function useUpdateNotificationProviderCredential(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateNotificationProviderCredentialPayload) => npService.updateNotificationProviderCredential(id, payload),
    onSuccess: () => {
      invalidateCredentials(queryClient);
      toast.success('Credential updated');
    },
    onError: () => toast.error('Could not update credential', 'Please try again.'),
  });
}

export function useRotateNotificationProviderCredential(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: RotateNotificationProviderCredentialPayload) => npService.rotateNotificationProviderCredential(id, payload),
    onSuccess: () => {
      invalidateCredentials(queryClient);
      toast.success('Credential rotated');
    },
    onError: () => toast.error('Could not rotate credential', 'Please try again.'),
  });
}

export function useRevokeNotificationProviderCredential(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => npService.revokeNotificationProviderCredential(id),
    onSuccess: () => {
      invalidateCredentials(queryClient);
      toast.success('Credential revoked');
    },
    onError: () => toast.error('Could not revoke credential', 'Please try again.'),
  });
}

export function useValidateNotificationProviderConnection(id: string) {
  const toast = useToast();
  return useMutation({
    mutationFn: () => npService.validateNotificationProviderConnection(id),
    onError: () => toast.error('Connection test failed', 'Please try again.'),
  });
}

export function useNotificationDeliveries(params: Omit<NotificationDeliveryFilterParams, 'workspaceId'> = {}) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [KEY, 'deliveries', workspaceId, params],
    queryFn: () => npService.listNotificationDeliveries({ ...params, workspaceId: workspaceId as string }),
    enabled: !!workspaceId,
    staleTime: 15 * 1000,
  });
}

export function useNotificationDelivery(id: string | undefined) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [KEY, 'deliveries', 'entry', id],
    queryFn: () => npService.getNotificationDelivery(id as string, workspaceId as string),
    enabled: !!id && !!workspaceId,
  });
}

export function useCancelNotificationDelivery(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const workspaceId = useWorkspaceId();
  return useMutation({
    mutationFn: () => npService.cancelNotificationDelivery(id, workspaceId as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY, 'deliveries'] });
      toast.success('Delivery cancelled');
    },
    onError: () => toast.error('Could not cancel delivery', 'Please try again.'),
  });
}

export function useProcessScheduledNotificationDeliveries() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const workspaceId = useWorkspaceId();
  return useMutation({
    mutationFn: () => npService.processScheduledNotificationDeliveries(workspaceId as string),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [KEY, 'deliveries'] });
      toast.success(`${result.processed} scheduled notification(s) processed`);
    },
    onError: () => toast.error('Could not process scheduled deliveries', 'Please try again.'),
  });
}
