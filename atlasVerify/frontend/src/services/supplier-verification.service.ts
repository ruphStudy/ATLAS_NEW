import { apiClient } from '@/lib/api/axios';
import type {
  ManualOverridePayload,
  StartVerificationPayload,
  SupplierVerification,
  SupplierVerificationListResult,
} from '@/types';

const BASE = '/supplier-verification';

export async function startVerification(supplierId: string, payload: StartVerificationPayload = {}): Promise<SupplierVerification> {
  const { data } = await apiClient.post<SupplierVerification>(`${BASE}/${supplierId}`, payload);
  return data;
}

export async function listVerifications(params: { page?: number; limit?: number; status?: string; supplierId?: string } = {}): Promise<SupplierVerificationListResult> {
  const { data } = await apiClient.get<SupplierVerificationListResult>(BASE, { params });
  return data;
}

export async function getVerificationById(id: string): Promise<SupplierVerification> {
  const { data } = await apiClient.get<SupplierVerification>(`${BASE}/${id}`);
  return data;
}

export async function getLatestVerificationForSupplier(supplierId: string): Promise<SupplierVerification> {
  const { data } = await apiClient.get<SupplierVerification>(`${BASE}/supplier/${supplierId}/latest`);
  return data;
}

export async function manualOverrideVerification(id: string, payload: ManualOverridePayload): Promise<SupplierVerification> {
  const { data } = await apiClient.post<SupplierVerification>(`${BASE}/${id}/override`, payload);
  return data;
}
