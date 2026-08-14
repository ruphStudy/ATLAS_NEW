import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as webhookService from '@/services/webhook-framework.service';
import { QUERY_KEYS } from '@/constants';
import type { CreateWebhookPayload, TestWebhookPayload, UpdateWebhookPayload, WebhookDeliveryFilterParams, WebhookFilterParams } from '@/types';
import { useToast } from './use-toast';

export function useWebhooks(params: WebhookFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.WEBHOOKS, params],
    queryFn: () => webhookService.listWebhooks(params),
    staleTime: 30 * 1000,
  });
}

export function useWebhook(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.WEBHOOKS, id],
    queryFn: () => webhookService.getWebhookById(id as string),
    enabled: !!id,
  });
}

export function useWebhookHistory(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.WEBHOOKS, id, 'history'],
    queryFn: () => webhookService.getWebhookHistory(id as string),
    enabled: !!id,
  });
}

export function useWebhookDeliveries(id: string | undefined, params: WebhookDeliveryFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.WEBHOOK_DELIVERIES, id, params],
    queryFn: () => webhookService.getWebhookDeliveries(id as string, params),
    enabled: !!id,
  });
}

export function useCreateWebhook() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateWebhookPayload) => webhookService.createWebhook(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WEBHOOKS] });
      toast.success('Webhook created');
    },
    onError: () => toast.error('Could not create webhook', 'Please try again.'),
  });
}

export function useUpdateWebhook(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateWebhookPayload) => webhookService.updateWebhook(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WEBHOOKS] });
      toast.success('Webhook updated');
    },
    onError: () => toast.error('Could not update webhook', 'Please try again.'),
  });
}

export function useDeleteWebhook() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => webhookService.deleteWebhook(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WEBHOOKS] });
      toast.success('Webhook deleted');
    },
    onError: () => toast.error('Could not delete webhook', 'Please try again.'),
  });
}

export function useEnableWebhook(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => webhookService.enableWebhook(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WEBHOOKS] });
      toast.success('Webhook enabled');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useDisableWebhook(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => webhookService.disableWebhook(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WEBHOOKS] });
      toast.success('Webhook disabled');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useRotateWebhookSecret(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => webhookService.rotateWebhookSecret(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WEBHOOKS] });
      toast.success('Webhook secret rotated');
    },
    onError: () => toast.error('Could not rotate secret', 'Please try again.'),
  });
}

export function useTestWebhook(id: string) {
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: TestWebhookPayload = {}) => webhookService.testWebhook(id, payload),
    onError: () => toast.error('Test failed', 'Please try again.'),
  });
}

export function useRedeliverWebhookDelivery(endpointId: string | undefined) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (deliveryId: string) => webhookService.redeliverWebhookDelivery(deliveryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WEBHOOK_DELIVERIES, endpointId] });
      toast.success('Delivery redelivered');
    },
    onError: () => toast.error('Could not redeliver', 'Please try again.'),
  });
}

export function useCancelWebhookDelivery(endpointId: string | undefined) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (deliveryId: string) => webhookService.cancelWebhookDelivery(deliveryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WEBHOOK_DELIVERIES, endpointId] });
      toast.success('Delivery cancelled');
    },
    onError: () => toast.error('Could not cancel delivery', 'Please try again.'),
  });
}
