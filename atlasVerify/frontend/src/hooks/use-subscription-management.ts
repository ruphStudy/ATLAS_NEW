import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as subscriptionService from '@/services/subscription-management.service';
import { useAuthStore } from '@/stores';
import { useToast } from './use-toast';
import type {
  AdminOverrideSubscriptionPayload,
  CancelSubscriptionPayload,
  ChangeSubscriptionPlanPayload,
  CreateSubscriptionPayload,
  SubscriptionFilterParams,
  SubscriptionReasonPayload,
} from '@/types';

const SUBSCRIPTION_KEY = 'subscription-management';

export function useEffectiveSubscription() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [SUBSCRIPTION_KEY, 'effective'],
    queryFn: () => subscriptionService.getEffectiveSubscription(),
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
}

export function useSubscriptionEntitlement() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [SUBSCRIPTION_KEY, 'entitlement'],
    queryFn: () => subscriptionService.getSubscriptionEntitlement(),
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
}

export function useSubscriptions(params: SubscriptionFilterParams = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [SUBSCRIPTION_KEY, 'list', params],
    queryFn: () => subscriptionService.listSubscriptions(params),
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
}

export function useSubscription(id: string | undefined) {
  return useQuery({
    queryKey: [SUBSCRIPTION_KEY, 'detail', id],
    queryFn: () => subscriptionService.getSubscription(id as string),
    enabled: !!id,
  });
}

export function useSubscriptionHistory(id: string | undefined) {
  return useQuery({
    queryKey: [SUBSCRIPTION_KEY, 'history', id],
    queryFn: () => subscriptionService.getSubscriptionHistory(id as string),
    enabled: !!id,
  });
}

function invalidateSubscriptions(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: [SUBSCRIPTION_KEY] });
}

export function useCreateSubscription() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateSubscriptionPayload) => subscriptionService.createSubscription(payload),
    onSuccess: () => {
      invalidateSubscriptions(queryClient);
      toast.success('Subscription created');
    },
    onError: () => toast.error('Could not create subscription', 'Please try again.'),
  });
}

export function useActivateSubscription(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => subscriptionService.activateSubscription(id),
    onSuccess: () => {
      invalidateSubscriptions(queryClient);
      toast.success('Subscription activated');
    },
    onError: () => toast.error('Could not activate subscription', 'Please try again.'),
  });
}

export function usePauseSubscription(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: SubscriptionReasonPayload = {}) => subscriptionService.pauseSubscription(id, payload),
    onSuccess: () => {
      invalidateSubscriptions(queryClient);
      toast.success('Subscription paused');
    },
    onError: () => toast.error('Could not pause subscription', 'Please try again.'),
  });
}

export function useResumeSubscription(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: SubscriptionReasonPayload = {}) => subscriptionService.resumeSubscription(id, payload),
    onSuccess: () => {
      invalidateSubscriptions(queryClient);
      toast.success('Subscription resumed');
    },
    onError: () => toast.error('Could not resume subscription', 'Please try again.'),
  });
}

export function useSuspendSubscription(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: SubscriptionReasonPayload = {}) => subscriptionService.suspendSubscription(id, payload),
    onSuccess: () => {
      invalidateSubscriptions(queryClient);
      toast.success('Subscription suspended');
    },
    onError: () => toast.error('Could not suspend subscription', 'Please try again.'),
  });
}

export function useMarkSubscriptionPastDue(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: SubscriptionReasonPayload = {}) => subscriptionService.markSubscriptionPastDue(id, payload),
    onSuccess: () => {
      invalidateSubscriptions(queryClient);
      toast.success('Subscription marked past due');
    },
    onError: () => toast.error('Could not update subscription', 'Please try again.'),
  });
}

export function useCancelSubscription(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CancelSubscriptionPayload = {}) => subscriptionService.cancelSubscription(id, payload),
    onSuccess: () => {
      invalidateSubscriptions(queryClient);
      toast.success('Subscription cancelled');
    },
    onError: () => toast.error('Could not cancel subscription', 'Please try again.'),
  });
}

export function useChangeSubscriptionPlan(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: ChangeSubscriptionPlanPayload) => subscriptionService.changeSubscriptionPlan(id, payload),
    onSuccess: () => {
      invalidateSubscriptions(queryClient);
      toast.success('Plan change requested');
    },
    onError: () => toast.error('Could not change plan', 'Please try again.'),
  });
}

export function useAdminOverrideSubscription(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: AdminOverrideSubscriptionPayload) => subscriptionService.adminOverrideSubscription(id, payload),
    onSuccess: () => {
      invalidateSubscriptions(queryClient);
      toast.success('Subscription status overridden');
    },
    onError: () => toast.error('Could not override subscription', 'Please try again.'),
  });
}
