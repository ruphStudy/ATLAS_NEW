import { apiClient } from '@/lib/api/axios';
import type {
  ComplianceReasonPayload,
  ComplianceRecord,
  ComplianceRecordFilterParams,
  ComplianceRecordHistoryEntry,
  ComplianceRecordListResult,
  ComplianceRule,
  ComplianceRuleFilterParams,
  ComplianceRuleHistoryEntry,
  ComplianceRuleListResult,
  ComplianceValidationResult,
  CreateComplianceRulePayload,
  OverrideComplianceRecordPayload,
  ReviewComplianceRecordPayload,
  SubmitComplianceEvidencePayload,
  UpdateComplianceRulePayload,
  ValidateCompliancePayload,
} from '@/types';

const BASE = '/compliance-framework';

export async function listComplianceRules(params: ComplianceRuleFilterParams = {}): Promise<ComplianceRuleListResult> {
  const { data } = await apiClient.get(`${BASE}/rules`, { params });
  return data;
}

export async function getComplianceRuleById(id: string): Promise<ComplianceRule> {
  const { data } = await apiClient.get(`${BASE}/rules/${id}`);
  return data;
}

export async function createComplianceRule(payload: CreateComplianceRulePayload): Promise<ComplianceRule> {
  const { data } = await apiClient.post(`${BASE}/rules`, payload);
  return data;
}

export async function updateComplianceRule(id: string, payload: UpdateComplianceRulePayload): Promise<ComplianceRule> {
  const { data } = await apiClient.patch(`${BASE}/rules/${id}`, payload);
  return data;
}

export async function activateComplianceRule(id: string): Promise<ComplianceRule> {
  const { data } = await apiClient.post(`${BASE}/rules/${id}/activate`);
  return data;
}

export async function archiveComplianceRule(id: string, payload: ComplianceReasonPayload): Promise<ComplianceRule> {
  const { data } = await apiClient.post(`${BASE}/rules/${id}/archive`, payload);
  return data;
}

export async function getComplianceRuleHistory(id: string): Promise<ComplianceRuleHistoryEntry[]> {
  const { data } = await apiClient.get(`${BASE}/rules/${id}/history`);
  return data;
}

export async function validateComplianceAction(payload: ValidateCompliancePayload): Promise<ComplianceValidationResult> {
  const { data } = await apiClient.post(`${BASE}/validate`, payload);
  return data;
}

export async function listComplianceRecords(params: ComplianceRecordFilterParams = {}): Promise<ComplianceRecordListResult> {
  const { data } = await apiClient.get(`${BASE}/records`, { params });
  return data;
}

export async function getComplianceRecordById(id: string): Promise<ComplianceRecord> {
  const { data } = await apiClient.get(`${BASE}/records/${id}`);
  return data;
}

export async function getComplianceRecordHistory(id: string): Promise<ComplianceRecordHistoryEntry[]> {
  const { data } = await apiClient.get(`${BASE}/records/${id}/history`);
  return data;
}

export async function submitComplianceEvidence(id: string, payload: SubmitComplianceEvidencePayload): Promise<ComplianceRecord> {
  const { data } = await apiClient.post(`${BASE}/records/${id}/evidence`, payload);
  return data;
}

export async function reviewComplianceRecord(id: string, payload: ReviewComplianceRecordPayload): Promise<ComplianceRecord> {
  const { data } = await apiClient.post(`${BASE}/records/${id}/review`, payload);
  return data;
}

export async function waiveComplianceRecord(id: string, payload: ComplianceReasonPayload): Promise<ComplianceRecord> {
  const { data } = await apiClient.post(`${BASE}/records/${id}/waive`, payload);
  return data;
}

export async function markComplianceRecordNonApplicable(id: string, payload: ComplianceReasonPayload): Promise<ComplianceRecord> {
  const { data } = await apiClient.post(`${BASE}/records/${id}/non-applicable`, payload);
  return data;
}

export async function overrideComplianceRecordStatus(id: string, payload: OverrideComplianceRecordPayload): Promise<ComplianceRecord> {
  const { data } = await apiClient.post(`${BASE}/records/${id}/override`, payload);
  return data;
}

export async function getComplianceRequirementsForSubject(subjectType: string, subjectId: string): Promise<ComplianceRecord[]> {
  const { data } = await apiClient.get(`${BASE}/subjects/${subjectType}/${subjectId}/records`);
  return data;
}
