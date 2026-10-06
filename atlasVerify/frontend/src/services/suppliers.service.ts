import { apiClient } from '@/lib/api/axios';
import type {
  CreateSupplierPayload,
  Supplier,
  SupplierFilterParams,
  SupplierListResult,
  SupplierStatusHistoryEntry,
  UpdateSupplierPayload,
  UpdateSupplierStatusPayload,
} from '@/types';

const BASE = '/suppliers';

export async function listSuppliers(params: SupplierFilterParams = {}): Promise<SupplierListResult> {
  const { data } = await apiClient.get<SupplierListResult>(BASE, { params });
  return data;
}

export async function getSupplierById(id: string): Promise<Supplier> {
  const { data } = await apiClient.get<Supplier>(`${BASE}/${id}`);
  return data;
}

export async function createSupplier(payload: CreateSupplierPayload): Promise<Supplier> {
  const { data } = await apiClient.post<Supplier>(BASE, payload);
  return data;
}

export async function updateSupplier(id: string, payload: UpdateSupplierPayload): Promise<Supplier> {
  const { data } = await apiClient.patch<Supplier>(`${BASE}/${id}`, payload);
  return data;
}

export async function deleteSupplier(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}

export async function getSupplierStats(): Promise<Record<string, number>> {
  const { data } = await apiClient.get<Record<string, number>>(`${BASE}/stats`);
  return data;
}

export async function updateSupplierStatus(id: string, payload: UpdateSupplierStatusPayload): Promise<Supplier> {
  const { data } = await apiClient.patch<Supplier>(`${BASE}/${id}/status`, payload);
  return data;
}

export async function getSupplierStatusHistory(id: string): Promise<SupplierStatusHistoryEntry[]> {
  const { data } = await apiClient.get<SupplierStatusHistoryEntry[]>(`${BASE}/${id}/status-history`);
  return data;
}

export async function getSupplierProfileHistory(id: string): Promise<Record<string, unknown>[]> {
  const { data } = await apiClient.get<Record<string, unknown>[]>(`${BASE}/${id}/profile-history`);
  return data;
}
