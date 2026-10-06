import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as channelsService from '@/services/channels.service';
import { QUERY_KEYS } from '@/constants';
import { useAuthStore } from '@/stores';
import type { ChannelFilterParams, CreateChannelProductMappingPayload, RegisterChannelPayload, UpdateChannelPayload } from '@/types';
import { useToast } from './use-toast';

function useWorkspaceId() {
  return useAuthStore((s) => s.user?.workspaceId);
}

export function useChannelRegistrations(params: Omit<ChannelFilterParams, 'workspaceId'> = {}) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [QUERY_KEYS.CHANNELS, workspaceId, params],
    queryFn: () => channelsService.listChannelRegistrations({ ...params, workspaceId }),
    enabled: !!workspaceId,
    staleTime: 30 * 1000,
  });
}

export function useChannel(id: string | undefined) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [QUERY_KEYS.CHANNELS, id],
    queryFn: () => channelsService.getChannelById(id as string, workspaceId as string),
    enabled: !!id,
  });
}

export function useChannelHistory(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.CHANNELS, id, 'history'],
    queryFn: () => channelsService.getChannelHistory(id as string),
    enabled: !!id,
  });
}

export function useChannelHealth(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.CHANNELS, id, 'health'],
    queryFn: () => channelsService.getChannelHealth(id as string),
    enabled: !!id,
    staleTime: 15 * 1000,
  });
}

export function useChannelMappings(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.CHANNELS, id, 'mappings'],
    queryFn: () => channelsService.listChannelMappings(id as string),
    enabled: !!id,
  });
}

export function useRegisterChannel() {
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: Omit<RegisterChannelPayload, 'workspaceId'>) => channelsService.registerChannel({ ...payload, workspaceId: workspaceId as string }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CHANNELS] });
      toast.success('Channel registered');
    },
    onError: () => toast.error('Could not register channel', 'Please check the form and try again.'),
  });
}

export function useUpdateChannel(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateChannelPayload) => channelsService.updateChannel(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CHANNELS] });
      toast.success('Channel updated');
    },
    onError: () => toast.error('Could not update channel', 'Please try again.'),
  });
}

function useChannelAction(id: string, action: (id: string, reason?: string) => Promise<unknown>, successMessage: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (reason?: string) => action(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CHANNELS] });
      toast.success(successMessage);
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useEnableChannel(id: string) {
  return useChannelAction(id, channelsService.enableChannel, 'Channel enabled');
}

export function useDisableChannel(id: string) {
  return useChannelAction(id, channelsService.disableChannel, 'Channel disabled');
}

export function useArchiveChannel(id: string) {
  return useChannelAction(id, channelsService.archiveChannel, 'Channel archived');
}

export function useRestoreChannel(id: string) {
  return useChannelAction(id, channelsService.restoreChannel, 'Channel restored');
}

export function useSetDefaultChannel(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => channelsService.setDefaultChannel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CHANNELS] });
      toast.success('Set as default channel');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useCreateChannelMapping(channelId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateChannelProductMappingPayload) => channelsService.createChannelMapping(channelId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CHANNELS, channelId, 'mappings'] });
      toast.success('Mapping created');
    },
    onError: () => toast.error('Could not create mapping', 'Please try again.'),
  });
}

export function useDeleteChannelMapping(channelId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (mappingId: string) => channelsService.deleteChannelMapping(channelId, mappingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CHANNELS, channelId, 'mappings'] });
      toast.success('Mapping removed');
    },
    onError: () => toast.error('Could not remove mapping', 'Please try again.'),
  });
}
