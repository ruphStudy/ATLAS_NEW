import { apiClient } from '@/lib/api/axios';
import type {
  FileAccessPurpose,
  FileAccessToken,
  FileFilterParams,
  FileFolder,
  FileRecord,
  FileVersion,
  PaginatedResult,
  StorageQuota,
  UploadFilePayload,
} from '@/types';

const BASE = '/file-management';

export async function uploadFile(payload: UploadFilePayload): Promise<FileRecord> {
  const { data } = await apiClient.post<FileRecord>(BASE, payload);
  return data;
}

export async function listFiles(params: FileFilterParams = {}): Promise<PaginatedResult<FileRecord>> {
  const { data } = await apiClient.get<PaginatedResult<FileRecord>>(BASE, { params });
  return data;
}

export async function getFileById(id: string): Promise<FileRecord> {
  const { data } = await apiClient.get<FileRecord>(`${BASE}/${id}`);
  return data;
}

export async function getStorageQuota(): Promise<StorageQuota> {
  const { data } = await apiClient.get<StorageQuota>(`${BASE}/quota`);
  return data;
}

export async function listFolders(parentFolderId?: string): Promise<FileFolder[]> {
  const { data } = await apiClient.get<FileFolder[]>(`${BASE}/folders`, { params: { parentFolderId } });
  return data;
}

export async function createFolder(payload: { name: string; parentFolderId?: string; module?: string }): Promise<FileFolder> {
  const { data } = await apiClient.post<FileFolder>(`${BASE}/folders`, payload);
  return data;
}

export async function removeFolder(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/folders/${id}`);
}

export async function bulkArchiveFiles(ids: string[]): Promise<{ count: number }> {
  const { data } = await apiClient.post<{ count: number }>(`${BASE}/bulk/archive`, { ids });
  return data;
}

export async function bulkRestoreFiles(ids: string[]): Promise<{ count: number }> {
  const { data } = await apiClient.post<{ count: number }>(`${BASE}/bulk/restore`, { ids });
  return data;
}

export async function bulkDeleteFiles(ids: string[]): Promise<{ count: number }> {
  const { data } = await apiClient.post<{ count: number }>(`${BASE}/bulk/delete`, { ids });
  return data;
}

export async function listFileVersions(id: string): Promise<FileVersion[]> {
  const { data } = await apiClient.get<FileVersion[]>(`${BASE}/${id}/versions`);
  return data;
}

export async function addFileVersion(id: string, payload: { contentBase64: string; checksum?: string; changeReason?: string }): Promise<FileRecord> {
  const { data } = await apiClient.post<FileRecord>(`${BASE}/${id}/versions`, payload);
  return data;
}

export async function renameFile(id: string, name: string): Promise<FileRecord> {
  const { data } = await apiClient.patch<FileRecord>(`${BASE}/${id}/rename`, { name });
  return data;
}

export async function moveFile(id: string, folderId: string | null): Promise<FileRecord> {
  const { data } = await apiClient.patch<FileRecord>(`${BASE}/${id}/move`, { folderId });
  return data;
}

export async function copyFile(id: string, payload: { folderId?: string | null; name?: string } = {}): Promise<FileRecord> {
  const { data } = await apiClient.post<FileRecord>(`${BASE}/${id}/copy`, payload);
  return data;
}

export async function archiveFile(id: string): Promise<FileRecord> {
  const { data } = await apiClient.post<FileRecord>(`${BASE}/${id}/archive`);
  return data;
}

export async function restoreFile(id: string): Promise<FileRecord> {
  const { data } = await apiClient.post<FileRecord>(`${BASE}/${id}/restore`);
  return data;
}

export async function deleteFile(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}

export async function issueFileAccessToken(id: string, purpose: FileAccessPurpose, ttlMs?: number, maxUses?: number): Promise<FileAccessToken> {
  const { data } = await apiClient.post<FileAccessToken>(`${BASE}/${id}/access-tokens`, { purpose, ttlMs, maxUses });
  return data;
}
