import { apiClient } from '@/lib/api/axios';
import type {
  CompleteInspectionPayload,
  CreateQualityInspectionPayload,
  QualityInspection,
  QualityInspectionFilterParams,
  QualityInspectionListResult,
  QualityInspectionStats,
  ScheduleInspectionPayload,
  UpdateQualityInspectionPayload,
} from '@/types';

const BASE = '/quality-inspections';

export async function listQualityInspections(params: QualityInspectionFilterParams = {}): Promise<QualityInspectionListResult> {
  const { data } = await apiClient.get<QualityInspectionListResult>(BASE, { params });
  return data;
}

export async function getQualityInspectionById(id: string): Promise<QualityInspection> {
  const { data } = await apiClient.get<QualityInspection>(`${BASE}/${id}`);
  return data;
}

export async function createQualityInspection(payload: CreateQualityInspectionPayload): Promise<QualityInspection> {
  const { data } = await apiClient.post<QualityInspection>(BASE, payload);
  return data;
}

export async function updateQualityInspection(id: string, payload: UpdateQualityInspectionPayload): Promise<QualityInspection> {
  const { data } = await apiClient.patch<QualityInspection>(`${BASE}/${id}`, payload);
  return data;
}

export async function scheduleInspection(id: string, payload: ScheduleInspectionPayload): Promise<QualityInspection> {
  const { data } = await apiClient.post<QualityInspection>(`${BASE}/${id}/schedule`, payload);
  return data;
}

export async function startInspection(id: string, payload: { inspectionDate: string; inspector?: string; inspectorName?: string }): Promise<QualityInspection> {
  const { data } = await apiClient.post<QualityInspection>(`${BASE}/${id}/start`, payload);
  return data;
}

export async function completeInspection(id: string, payload: CompleteInspectionPayload): Promise<QualityInspection> {
  const { data } = await apiClient.post<QualityInspection>(`${BASE}/${id}/complete`, payload);
  return data;
}

export async function conditionallyApproveInspection(id: string, payload: { conditionsForApproval: string; notes?: string }): Promise<QualityInspection> {
  const { data } = await apiClient.post<QualityInspection>(`${BASE}/${id}/conditional-approval`, payload);
  return data;
}

export async function rejectInspection(id: string, payload: { rejectionReason: string; notes?: string }): Promise<QualityInspection> {
  const { data } = await apiClient.post<QualityInspection>(`${BASE}/${id}/reject`, payload);
  return data;
}

export async function closeInspection(id: string, notes?: string): Promise<QualityInspection> {
  const { data } = await apiClient.post<QualityInspection>(`${BASE}/${id}/close`, { notes });
  return data;
}

export async function requestReInspection(id: string, payload: { scheduledDate?: string; notes?: string } = {}): Promise<QualityInspection> {
  const { data } = await apiClient.post<QualityInspection>(`${BASE}/${id}/re-inspect`, payload);
  return data;
}

export async function getInspectionHistory(id: string): Promise<Record<string, unknown>[]> {
  const { data } = await apiClient.get<Record<string, unknown>[]>(`${BASE}/${id}/history`);
  return data;
}

export async function deleteQualityInspection(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}

export async function getQualityInspectionStats(): Promise<QualityInspectionStats> {
  const { data } = await apiClient.get<QualityInspectionStats>(`${BASE}/stats`);
  return data;
}
