import { apiClient } from '@/lib/api/axios';
import type {
  AdminOverrideSubscriptionPayload,
  CancelSubscriptionPayload,
  ChangeSubscriptionPlanPayload,
  CreateSubscriptionPayload,
  PaginatedResult,
  Subscription,
  SubscriptionEntitlement,
  SubscriptionFilterParams,
  SubscriptionHistoryEntry,
  SubscriptionReasonPayload,
} from '@/types';

const BASE = '/subscription-management';

export async function getEffectiveSubscription(): Promise<Subscription | null> {
  const { data } = await apiClient.get<Subscription | null>(`${BASE}/effective`);
  return data;
}

export async function getSubscriptionEntitlement(): Promise<SubscriptionEntitlement | null> {
  const { data } = await apiClient.get<SubscriptionEntitlement | null>(`${BASE}/entitlement`);
  return data;
}

export async function createSubscription(payload: CreateSubscriptionPayload): Promise<Subscription> {
  const { data } = await apiClient.post<Subscription>(`${BASE}/subscriptions`, payload);
  return data;
}

export async function listSubscriptions(params: SubscriptionFilterParams = {}): Promise<PaginatedResult<Subscription>> {
  const { data } = await apiClient.get<PaginatedResult<Subscription>>(`${BASE}/subscriptions`, { params });
  return data;
}

export async function getSubscription(id: string): Promise<Subscription> {
  const { data } = await apiClient.get<Subscription>(`${BASE}/subscriptions/${id}`);
  return data;
}

export async function getSubscriptionHistory(id: string): Promise<SubscriptionHistoryEntry[]> {
  const { data } = await apiClient.get<SubscriptionHistoryEntry[]>(`${BASE}/subscriptions/${id}/history`);
  return data;
}

export async function activateSubscription(id: string): Promise<Subscription> {
  const { data } = await apiClient.post<Subscription>(`${BASE}/subscriptions/${id}/activate`);
  return data;
}

export async function pauseSubscription(id: string, payload: SubscriptionReasonPayload = {}): Promise<Subscription> {
  const { data } = await apiClient.post<Subscription>(`${BASE}/subscriptions/${id}/pause`, payload);
  return data;
}

export async function resumeSubscription(id: string, payload: SubscriptionReasonPayload = {}): Promise<Subscription> {
  const { data } = await apiClient.post<Subscription>(`${BASE}/subscriptions/${id}/resume`, payload);
  return data;
}

export async function suspendSubscription(id: string, payload: SubscriptionReasonPayload = {}): Promise<Subscription> {
  const { data } = await apiClient.post<Subscription>(`${BASE}/subscriptions/${id}/suspend`, payload);
  return data;
}

export async function markSubscriptionPastDue(id: string, payload: SubscriptionReasonPayload = {}): Promise<Subscription> {
  const { data } = await apiClient.post<Subscription>(`${BASE}/subscriptions/${id}/mark-past-due`, payload);
  return data;
}

export async function cancelSubscription(id: string, payload: CancelSubscriptionPayload = {}): Promise<Subscription> {
  const { data } = await apiClient.post<Subscription>(`${BASE}/subscriptions/${id}/cancel`, payload);
  return data;
}

export async function changeSubscriptionPlan(id: string, payload: ChangeSubscriptionPlanPayload): Promise<Subscription> {
  const { data } = await apiClient.post<Subscription>(`${BASE}/subscriptions/${id}/change-plan`, payload);
  return data;
}

export async function adminOverrideSubscription(id: string, payload: AdminOverrideSubscriptionPayload): Promise<Subscription> {
  const { data } = await apiClient.post<Subscription>(`${BASE}/subscriptions/${id}/admin-override`, payload);
  return data;
}
