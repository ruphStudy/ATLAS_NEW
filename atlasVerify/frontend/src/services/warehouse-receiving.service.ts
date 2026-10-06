import { apiClient } from '@/lib/api/axios';
import type { CreateReceivingPayload, ReceiveLinesPayload, Receiving, ReceivingFilterParams, ReceivingListResult } from '@/types';

const BASE = '/warehouse-receiving';

export async function listReceivings(params: ReceivingFilterParams = {}): Promise<ReceivingListResult> {
  const { data } = await apiClient.get<ReceivingListResult>(BASE, { params });
  return data;
}

export async function getReceivingById(id: string): Promise<Receiving> {
  const { data } = await apiClient.get<Receiving>(`${BASE}/${id}`);
  return data;
}

export async function createReceiving(payload: CreateReceivingPayload): Promise<Receiving> {
  const { data } = await apiClient.post<Receiving>(BASE, payload);
  return data;
}

export async function startReceiving(id: string, payload: { receivedBy?: string } = {}): Promise<Receiving> {
  const { data } = await apiClient.post<Receiving>(`${BASE}/${id}/start`, payload);
  return data;
}

export async function receiveLines(id: string, payload: ReceiveLinesPayload): Promise<Receiving> {
  const { data } = await apiClient.post<Receiving>(`${BASE}/${id}/receive-lines`, payload);
  return data;
}

export async function completeReceiving(id: string, notes?: string): Promise<Receiving> {
  const { data } = await apiClient.post<Receiving>(`${BASE}/${id}/complete`, { notes });
  return data;
}

export async function cancelReceiving(id: string, reason: string): Promise<Receiving> {
  const { data } = await apiClient.post<Receiving>(`${BASE}/${id}/cancel`, { reason });
  return data;
}

export async function reopenReceiving(id: string, reason?: string): Promise<Receiving> {
  const { data } = await apiClient.post<Receiving>(`${BASE}/${id}/reopen`, { reason });
  return data;
}
