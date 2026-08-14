import { apiClient } from '@/lib/api/axios';
import type {
  AtlasDocument,
  CreateDocumentPayload,
  DocumentApprovalHistoryEntry,
  DocumentComment,
  DocumentEntityLink,
  DocumentFilterParams,
  FileAccessPurpose,
  FileAccessToken,
  FileVersion,
  PaginatedResult,
  UpdateDocumentPayload,
} from '@/types';

const BASE = '/document-management';

export async function createDocument(payload: CreateDocumentPayload): Promise<AtlasDocument> {
  const { data } = await apiClient.post<AtlasDocument>(BASE, payload);
  return data;
}

export async function listDocuments(params: DocumentFilterParams = {}): Promise<PaginatedResult<AtlasDocument>> {
  const { data } = await apiClient.get<PaginatedResult<AtlasDocument>>(BASE, { params });
  return data;
}

export async function getDocumentById(id: string): Promise<AtlasDocument> {
  const { data } = await apiClient.get<AtlasDocument>(`${BASE}/${id}`);
  return data;
}

export async function updateDocument(id: string, payload: UpdateDocumentPayload): Promise<AtlasDocument> {
  const { data } = await apiClient.patch<AtlasDocument>(`${BASE}/${id}`, payload);
  return data;
}

export async function removeDocument(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}

export async function listDocumentVersions(id: string): Promise<FileVersion[]> {
  const { data } = await apiClient.get<FileVersion[]>(`${BASE}/${id}/versions`);
  return data;
}

export async function addDocumentVersion(id: string, payload: { contentBase64: string; changeReason?: string }): Promise<AtlasDocument> {
  const { data } = await apiClient.post<AtlasDocument>(`${BASE}/${id}/versions`, payload);
  return data;
}

export async function getDocumentHistory(id: string): Promise<DocumentApprovalHistoryEntry[]> {
  const { data } = await apiClient.get<DocumentApprovalHistoryEntry[]>(`${BASE}/${id}/history`);
  return data;
}

export async function submitDocumentForReview(id: string): Promise<AtlasDocument> {
  const { data } = await apiClient.post<AtlasDocument>(`${BASE}/${id}/submit`);
  return data;
}

export async function approveDocument(id: string, comment?: string): Promise<AtlasDocument> {
  const { data } = await apiClient.post<AtlasDocument>(`${BASE}/${id}/approve`, { comment });
  return data;
}

export async function rejectDocument(id: string, reason: string): Promise<AtlasDocument> {
  const { data } = await apiClient.post<AtlasDocument>(`${BASE}/${id}/reject`, { reason });
  return data;
}

export async function requestDocumentRevision(id: string, notes: string): Promise<AtlasDocument> {
  const { data } = await apiClient.post<AtlasDocument>(`${BASE}/${id}/request-revision`, { notes });
  return data;
}

export async function archiveDocument(id: string): Promise<AtlasDocument> {
  const { data } = await apiClient.post<AtlasDocument>(`${BASE}/${id}/archive`);
  return data;
}

export async function restoreDocument(id: string): Promise<AtlasDocument> {
  const { data } = await apiClient.post<AtlasDocument>(`${BASE}/${id}/restore`);
  return data;
}

export async function renewDocument(id: string, payload: CreateDocumentPayload): Promise<AtlasDocument> {
  const { data } = await apiClient.post<AtlasDocument>(`${BASE}/${id}/renew`, payload);
  return data;
}

export async function addDocumentComment(id: string, comment: string): Promise<DocumentComment> {
  const { data } = await apiClient.post<DocumentComment>(`${BASE}/${id}/comments`, { comment });
  return data;
}

export async function listDocumentComments(id: string): Promise<DocumentComment[]> {
  const { data } = await apiClient.get<DocumentComment[]>(`${BASE}/${id}/comments`);
  return data;
}

export async function linkDocumentEntity(id: string, entityType: string, entityId: string): Promise<DocumentEntityLink> {
  const { data } = await apiClient.post<DocumentEntityLink>(`${BASE}/${id}/links`, { entityType, entityId });
  return data;
}

export async function listDocumentLinks(id: string): Promise<DocumentEntityLink[]> {
  const { data } = await apiClient.get<DocumentEntityLink[]>(`${BASE}/${id}/links`);
  return data;
}

export async function unlinkDocumentEntity(id: string, entityType: string, entityId: string): Promise<void> {
  await apiClient.delete(`${BASE}/${id}/links/${entityType}/${entityId}`);
}

export async function issueDocumentAccessToken(id: string, purpose?: FileAccessPurpose): Promise<FileAccessToken> {
  const { data } = await apiClient.post<FileAccessToken>(`${BASE}/${id}/access-tokens`, { purpose });
  return data;
}

/** Streams the raw file bytes (auth via the normal Bearer header, not a public link) — caller turns this into an object URL to trigger a browser save. */
export async function downloadDocumentFile(id: string): Promise<Blob> {
  const { data } = await apiClient.get<Blob>(`${BASE}/${id}/download`, { responseType: 'blob' });
  return data;
}
