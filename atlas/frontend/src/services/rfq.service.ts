import { apiClient } from '@/lib/api/axios';
import type { CreateRfqPayload, Rfq, RfqFilterParams, RfqListResult, SubmitRfqResponsePayload, UpdateRfqPayload } from '@/types';

const BASE = '/rfq';

export async function listRfqs(params: RfqFilterParams = {}): Promise<RfqListResult> {
  const { data } = await apiClient.get<RfqListResult>(BASE, { params });
  return data;
}

export async function getRfqById(id: string): Promise<Rfq> {
  const { data } = await apiClient.get<Rfq>(`${BASE}/${id}`);
  return data;
}

export async function createRfq(payload: CreateRfqPayload): Promise<Rfq> {
  const { data } = await apiClient.post<Rfq>(BASE, payload);
  return data;
}

export async function updateRfq(id: string, payload: UpdateRfqPayload): Promise<Rfq> {
  const { data } = await apiClient.patch<Rfq>(`${BASE}/${id}`, payload);
  return data;
}

export async function sendRfq(id: string): Promise<Rfq> {
  const { data } = await apiClient.post<Rfq>(`${BASE}/${id}/send`);
  return data;
}

export async function submitRfqSupplierResponse(rfqId: string, supplierId: string, payload: SubmitRfqResponsePayload): Promise<Rfq> {
  const { data } = await apiClient.post<Rfq>(`${BASE}/${rfqId}/suppliers/${supplierId}/respond`, payload);
  return data;
}

export async function cancelRfq(id: string, reason: string): Promise<Rfq> {
  const { data } = await apiClient.post<Rfq>(`${BASE}/${id}/cancel`, { reason });
  return data;
}

export async function closeRfq(id: string, reason?: string): Promise<Rfq> {
  const { data } = await apiClient.post<Rfq>(`${BASE}/${id}/close`, { reason });
  return data;
}

export async function deleteRfq(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}

export async function getRfqStats(): Promise<Record<string, number>> {
  const { data } = await apiClient.get<Record<string, number>>(`${BASE}/stats`);
  return data;
}
