import { apiClient } from '@/lib/api/axios';
import type {
  BackupJob,
  BackupJobFilterParams,
  BackupJobListResult,
  BackupPolicy,
  BackupPolicyFilterParams,
  BackupPolicyHistoryEntry,
  BackupPolicyListResult,
  BackupRecord,
  BackupRecordFilterParams,
  BackupRecordListResult,
  CreateBackupPolicyPayload,
  TriggerBackupPayload,
  UpdateBackupPolicyPayload,
} from '@/types';

const BASE = '/backup-management';

export async function listBackupPolicies(params: BackupPolicyFilterParams = {}): Promise<BackupPolicyListResult> {
  const { data } = await apiClient.get(`${BASE}/policies`, { params });
  return data;
}

export async function getBackupPolicyById(id: string): Promise<BackupPolicy> {
  const { data } = await apiClient.get(`${BASE}/policies/${id}`);
  return data;
}

export async function createBackupPolicy(payload: CreateBackupPolicyPayload): Promise<BackupPolicy> {
  const { data } = await apiClient.post(`${BASE}/policies`, payload);
  return data;
}

export async function updateBackupPolicy(id: string, payload: UpdateBackupPolicyPayload): Promise<BackupPolicy> {
  const { data } = await apiClient.patch(`${BASE}/policies/${id}`, payload);
  return data;
}

export async function activateBackupPolicy(id: string): Promise<BackupPolicy> {
  const { data } = await apiClient.post(`${BASE}/policies/${id}/activate`);
  return data;
}

export async function pauseBackupPolicy(id: string): Promise<BackupPolicy> {
  const { data } = await apiClient.post(`${BASE}/policies/${id}/pause`);
  return data;
}

export async function archiveBackupPolicy(id: string): Promise<BackupPolicy> {
  const { data } = await apiClient.post(`${BASE}/policies/${id}/archive`);
  return data;
}

export async function restoreBackupPolicy(id: string): Promise<BackupPolicy> {
  const { data } = await apiClient.post(`${BASE}/policies/${id}/restore`);
  return data;
}

export async function getBackupPolicyHistory(id: string): Promise<BackupPolicyHistoryEntry[]> {
  const { data } = await apiClient.get(`${BASE}/policies/${id}/history`);
  return data;
}

export async function triggerBackup(id: string, payload: TriggerBackupPayload = {}): Promise<BackupJob> {
  const { data } = await apiClient.post(`${BASE}/policies/${id}/trigger`, payload);
  return data;
}

export async function listBackupJobs(params: BackupJobFilterParams = {}): Promise<BackupJobListResult> {
  const { data } = await apiClient.get(`${BASE}/jobs`, { params });
  return data;
}

export async function getBackupJobById(id: string): Promise<BackupJob> {
  const { data } = await apiClient.get(`${BASE}/jobs/${id}`);
  return data;
}

export async function listBackupRecords(params: BackupRecordFilterParams = {}): Promise<BackupRecordListResult> {
  const { data } = await apiClient.get(`${BASE}/records`, { params });
  return data;
}

export async function listAvailableBackups(targetType?: string): Promise<BackupRecord[]> {
  const { data } = await apiClient.get(`${BASE}/records/available`, { params: { targetType } });
  return data;
}

export async function getBackupRecordById(id: string): Promise<BackupRecord> {
  const { data } = await apiClient.get(`${BASE}/records/${id}`);
  return data;
}

export async function verifyBackupRecord(id: string): Promise<BackupRecord> {
  const { data } = await apiClient.post(`${BASE}/records/${id}/verify`);
  return data;
}
