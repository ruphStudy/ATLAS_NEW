import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as webhookService from '@/services/marketplace-webhook.service';
import { useAuthStore } from '@/stores';
import { useToast } from './use-toast';
import type { MarketplaceWebhookConfigFilterParams, MarketplaceWebhookDeliveryFilterParams, RegisterMarketplaceWebhookPayload, UpdateMarketplaceWebhookPayload } from '@/types';

const KEY = 'marketplace-webhook';

function useWorkspaceId() {
  return useAuthStore((s) => s.user?.workspaceId);
}

export function useMarketplaceWebhookConfigs(params: Omit<MarketplaceWebhookConfigFilterParams, 'workspaceId'> = {}) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [KEY, 'configs', workspaceId, params],
    queryFn: () => webhookService.listMarketplaceWebhookConfigs({ ...params, workspaceId }),
    enabled: !!workspaceId,
    staleTime: 30 * 1000,
  });
}

export function useMarketplaceWebhookConfig(webhookId: string | undefined) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [KEY, 'config', workspaceId, webhookId],
    queryFn: () => webhookService.getMarketplaceWebhookConfig(workspaceId as string, webhookId as string),
    enabled: !!workspaceId && !!webhookId,
  });
}

function invalidateWebhookConfigs(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: [KEY, 'configs'] });
  queryClient.invalidateQueries({ queryKey: [KEY, 'config'] });
}

export function useRegisterMarketplaceWebhook() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: RegisterMarketplaceWebhookPayload) => webhookService.registerMarketplaceWebhook(payload),
    onSuccess: () => {
      invalidateWebhookConfigs(queryClient);
      toast.success('Webhook subscription registered');
    },
    onError: () => toast.error('Could not register webhook', 'Please try again.'),
  });
}

export function useUpdateMarketplaceWebhook(webhookId: string) {
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateMarketplaceWebhookPayload) => webhookService.updateMarketplaceWebhook(workspaceId as string, webhookId, payload),
    onSuccess: () => {
      invalidateWebhookConfigs(queryClient);
      toast.success('Webhook updated');
    },
    onError: () => toast.error('Could not update webhook', 'Please try again.'),
  });
}

function useWebhookAction(webhookId: string, action: (workspaceId: string, webhookId: string) => Promise<unknown>, successMessage: string) {
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => action(workspaceId as string, webhookId),
    onSuccess: () => {
      invalidateWebhookConfigs(queryClient);
      toast.success(successMessage);
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useEnableMarketplaceWebhook(webhookId: string) {
  return useWebhookAction(webhookId, webhookService.enableMarketplaceWebhook, 'Webhook enabled');
}

export function useDisableMarketplaceWebhook(webhookId: string) {
  return useWebhookAction(webhookId, webhookService.disableMarketplaceWebhook, 'Webhook disabled');
}

export function useDeleteMarketplaceWebhook() {
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (webhookId: string) => webhookService.deleteMarketplaceWebhook(workspaceId as string, webhookId),
    onSuccess: () => {
      invalidateWebhookConfigs(queryClient);
      toast.success('Webhook subscription deleted');
    },
    onError: () => toast.error('Could not delete webhook', 'Please try again.'),
  });
}

export function useRotateMarketplaceWebhookSecret(webhookId: string) {
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => webhookService.rotateMarketplaceWebhookSecret(workspaceId as string, webhookId),
    onSuccess: () => {
      invalidateWebhookConfigs(queryClient);
      toast.success('Secret rotated — copy it now, it will not be shown again');
    },
    onError: () => toast.error('Could not rotate secret', 'Please try again.'),
  });
}

export function useMarketplaceWebhookDeliveries(accountId: string | undefined, params: MarketplaceWebhookDeliveryFilterParams = {}) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [KEY, 'deliveries', workspaceId, accountId, params],
    queryFn: () => webhookService.listMarketplaceWebhookDeliveries(workspaceId as string, accountId as string, params),
    enabled: !!workspaceId && !!accountId,
    staleTime: 15 * 1000,
  });
}

export function useMarketplaceWebhookMetrics(accountId?: string) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [KEY, 'metrics', workspaceId, accountId],
    queryFn: () => webhookService.getMarketplaceWebhookMetrics(workspaceId as string, accountId),
    enabled: !!workspaceId,
    staleTime: 30 * 1000,
  });
}
