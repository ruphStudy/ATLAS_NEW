import { apiClient } from '@/lib/api/axios';
import type {
  ApprovalActionReasonPayload,
  ApprovalAssignment,
  ApprovalDecision,
  ApprovalRequest,
  ApprovalRequestListParams,
  ApprovalRequestStatus,
  ApprovalStepInstance,
  DecideApprovalPayload,
  DelegateApprovalPayload,
  OverrideApprovalPayload,
  PaginatedResult,
  ApprovalRequestSummary,
  ReassignApprovalPayload,
} from '@/types';

export interface ApprovalRequestFilterParams {
  status?: ApprovalRequestStatus;
  assignedToMe?: boolean;
  page?: number;
  limit?: number;
}

const BASE = '/approval-workflow';

export async function listApprovalRequests(params: ApprovalRequestFilterParams = {}): Promise<PaginatedResult<ApprovalRequestSummary>> {
  const { data } = await apiClient.get<PaginatedResult<ApprovalRequestSummary>>(`${BASE}/requests`, { params });
  return data;
}

export async function listApprovalRequestsFull(params: ApprovalRequestListParams = {}): Promise<PaginatedResult<ApprovalRequest>> {
  const { data } = await apiClient.get<PaginatedResult<ApprovalRequest>>(`${BASE}/requests`, { params });
  return data;
}

export async function getApprovalRequest(id: string): Promise<ApprovalRequest> {
  const { data } = await apiClient.get<ApprovalRequest>(`${BASE}/requests/${id}`);
  return data;
}

export async function getApprovalStepInstances(id: string): Promise<ApprovalStepInstance[]> {
  const { data } = await apiClient.get<ApprovalStepInstance[]>(`${BASE}/requests/${id}/steps`);
  return data;
}

export async function getApprovalAssignmentsForStep(id: string, stepInstanceId: string): Promise<ApprovalAssignment[]> {
  const { data } = await apiClient.get<ApprovalAssignment[]>(`${BASE}/requests/${id}/steps/${stepInstanceId}/assignments`);
  return data;
}

export async function getApprovalDecisionHistory(id: string): Promise<ApprovalDecision[]> {
  const { data } = await apiClient.get<ApprovalDecision[]>(`${BASE}/requests/${id}/decisions`);
  return data;
}

export async function decideApproval(id: string, stepInstanceId: string, payload: DecideApprovalPayload): Promise<ApprovalRequest> {
  const { data } = await apiClient.post<ApprovalRequest>(`${BASE}/requests/${id}/steps/${stepInstanceId}/decide`, payload);
  return data;
}

export async function delegateApproval(id: string, stepInstanceId: string, payload: DelegateApprovalPayload): Promise<ApprovalDecision> {
  const { data } = await apiClient.post<ApprovalDecision>(`${BASE}/requests/${id}/steps/${stepInstanceId}/delegate`, payload);
  return data;
}

export async function reassignApproval(id: string, stepInstanceId: string, assignmentId: string, payload: ReassignApprovalPayload): Promise<ApprovalDecision> {
  const { data } = await apiClient.post<ApprovalDecision>(`${BASE}/requests/${id}/steps/${stepInstanceId}/assignments/${assignmentId}/reassign`, payload);
  return data;
}

export async function resubmitApproval(id: string, payload: ApprovalActionReasonPayload = {}): Promise<ApprovalRequest> {
  const { data } = await apiClient.post<ApprovalRequest>(`${BASE}/requests/${id}/resubmit`, payload);
  return data;
}

export async function cancelApproval(id: string, payload: ApprovalActionReasonPayload = {}): Promise<ApprovalRequest> {
  const { data } = await apiClient.post<ApprovalRequest>(`${BASE}/requests/${id}/cancel`, payload);
  return data;
}

export async function recallApproval(id: string, payload: ApprovalActionReasonPayload = {}): Promise<ApprovalRequest> {
  const { data } = await apiClient.post<ApprovalRequest>(`${BASE}/requests/${id}/recall`, payload);
  return data;
}

export async function overrideApproval(id: string, payload: OverrideApprovalPayload): Promise<ApprovalRequest> {
  const { data } = await apiClient.post<ApprovalRequest>(`${BASE}/requests/${id}/override`, payload);
  return data;
}
