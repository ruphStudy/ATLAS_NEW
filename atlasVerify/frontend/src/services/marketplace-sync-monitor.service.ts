import { apiClient } from '@/lib/api/axios';
import type {
  CancelSyncPayload,
  RetrySyncPayload,
  SyncActionResult,
  SyncAggregate,
  SyncErrorSummaryEntry,
  SyncHistoryEntry,
  SyncIssue,
  SyncIssueType,
  SyncItemFailure,
  SyncListFilterParams,
  SyncMetrics,
  SyncModule,
  SyncQueueHealthSnapshot,
} from '@/types';

const BASE = '/marketplace/sync-monitor';

export async function listAllSyncs(workspaceId: string): Promise<SyncAggregate[]> {
  const { data } = await apiClient.get<SyncAggregate[]>(`${BASE}/syncs/all/${workspaceId}`);
  return data;
}

export async function getSyncSnapshot(workspaceId: string, module: SyncModule, provider: string, accountId?: string): Promise<SyncAggregate> {
  const { data } = await apiClient.get<SyncAggregate>(`${BASE}/snapshot`, { params: { workspaceId, module, provider, accountId } });
  return data;
}

export async function getActiveIssues(workspaceId: string, module?: SyncModule): Promise<SyncIssue[]> {
  const { data } = await apiClient.get<SyncIssue[]>(`${BASE}/issues`, { params: { workspaceId, module, activeOnly: true } });
  return data;
}

export async function retrySync(payload: RetrySyncPayload): Promise<SyncActionResult> {
  const { data } = await apiClient.post<SyncActionResult>(`${BASE}/retry`, payload);
  return data;
}

export async function cancelSync(payload: CancelSyncPayload): Promise<SyncActionResult> {
  const { data } = await apiClient.post<SyncActionResult>(`${BASE}/cancel`, payload);
  return data;
}

export async function resolveIssue(workspaceId: string, issueId: string): Promise<SyncActionResult> {
  const { data } = await apiClient.post<SyncActionResult>(`${BASE}/issues/resolve/${workspaceId}/${issueId}`, {});
  return data;
}

export async function getSyncMetrics(workspaceId: string, module?: SyncModule): Promise<SyncMetrics> {
  const { data } = await apiClient.get<SyncMetrics>(`${BASE}/metrics/${workspaceId}`, { params: { module } });
  return data;
}

export async function listSyncsFiltered(params: SyncListFilterParams): Promise<SyncHistoryEntry[]> {
  const { data } = await apiClient.get<SyncHistoryEntry[]>(`${BASE}/syncs`, { params });
  return data;
}

export async function getSyncHistory(workspaceId: string, module: SyncModule, provider: string, accountId?: string, limit?: number): Promise<SyncHistoryEntry[]> {
  const { data } = await apiClient.get<SyncHistoryEntry[]>(`${BASE}/history`, { params: { workspaceId, module, provider, accountId, limit } });
  return data;
}

export async function getItemFailures(workspaceId: string, jobId?: string, module?: SyncModule, unresolvedOnly?: boolean): Promise<SyncItemFailure[]> {
  const { data } = await apiClient.get<SyncItemFailure[]>(`${BASE}/failures`, { params: { workspaceId, jobId, module, unresolvedOnly } });
  return data;
}

export async function getErrorSummary(workspaceId: string, jobId: string): Promise<SyncErrorSummaryEntry[]> {
  const { data } = await apiClient.get<SyncErrorSummaryEntry[]>(`${BASE}/errors/${workspaceId}/${jobId}`);
  return data;
}

export async function detectSyncIssues(workspaceId: string, module?: SyncModule): Promise<SyncIssue[]> {
  const { data } = await apiClient.post<SyncIssue[]>(`${BASE}/issues/detect`, { workspaceId, module });
  return data;
}

export async function getIssuesByType(workspaceId: string, module?: SyncModule, type?: SyncIssueType): Promise<SyncIssue[]> {
  const { data } = await apiClient.get<SyncIssue[]>(`${BASE}/issues`, { params: { workspaceId, module, type } });
  return data;
}

export async function getSyncQueueHealth(workspaceId: string, module: SyncModule): Promise<SyncQueueHealthSnapshot> {
  const { data } = await apiClient.get<SyncQueueHealthSnapshot>(`${BASE}/queue-health/${workspaceId}/${module}`);
  return data;
}
