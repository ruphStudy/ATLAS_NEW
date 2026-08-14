import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as fileService from '@/services/file-management.service';
import { useAuthStore } from '@/stores';
import { useToast } from './use-toast';
import type { FileAccessPurpose, FileFilterParams, UploadFilePayload } from '@/types';

const FILES_KEY = 'file-management';

export function useFiles(params: FileFilterParams = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [FILES_KEY, 'list', params],
    queryFn: () => fileService.listFiles(params),
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
}

export function useFile(id: string | undefined) {
  return useQuery({
    queryKey: [FILES_KEY, 'detail', id],
    queryFn: () => fileService.getFileById(id as string),
    enabled: !!id,
  });
}

export function useStorageQuota() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [FILES_KEY, 'quota'],
    queryFn: fileService.getStorageQuota,
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });
}

export function useFileFolders(parentFolderId?: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [FILES_KEY, 'folders', parentFolderId],
    queryFn: () => fileService.listFolders(parentFolderId),
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });
}

export function useFileVersions(id: string | undefined) {
  return useQuery({
    queryKey: [FILES_KEY, 'versions', id],
    queryFn: () => fileService.listFileVersions(id as string),
    enabled: !!id,
  });
}

function invalidateFiles(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: [FILES_KEY] });
}

export function useUploadFile() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UploadFilePayload) => fileService.uploadFile(payload),
    onSuccess: () => {
      invalidateFiles(queryClient);
      toast.success('File uploaded');
    },
    onError: () => toast.error('Could not upload file', 'Please try again.'),
  });
}

export function useCreateFolder() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: { name: string; parentFolderId?: string; module?: string }) => fileService.createFolder(payload),
    onSuccess: () => {
      invalidateFiles(queryClient);
      toast.success('Folder created');
    },
    onError: () => toast.error('Could not create folder', 'Please try again.'),
  });
}

export function useRemoveFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fileService.removeFolder(id),
    onSuccess: () => invalidateFiles(queryClient),
  });
}

export function useBulkArchiveFiles() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (ids: string[]) => fileService.bulkArchiveFiles(ids),
    onSuccess: () => {
      invalidateFiles(queryClient);
      toast.success('Files archived');
    },
  });
}

export function useBulkRestoreFiles() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (ids: string[]) => fileService.bulkRestoreFiles(ids),
    onSuccess: () => {
      invalidateFiles(queryClient);
      toast.success('Files restored');
    },
  });
}

export function useBulkDeleteFiles() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (ids: string[]) => fileService.bulkDeleteFiles(ids),
    onSuccess: () => {
      invalidateFiles(queryClient);
      toast.success('Files deleted');
    },
  });
}

export function useAddFileVersion(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: { contentBase64: string; checksum?: string; changeReason?: string }) => fileService.addFileVersion(id, payload),
    onSuccess: () => {
      invalidateFiles(queryClient);
      toast.success('New version uploaded');
    },
    onError: () => toast.error('Could not upload new version', 'Please try again.'),
  });
}

export function useRenameFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => fileService.renameFile(id, name),
    onSuccess: () => invalidateFiles(queryClient),
  });
}

export function useMoveFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, folderId }: { id: string; folderId: string | null }) => fileService.moveFile(id, folderId),
    onSuccess: () => invalidateFiles(queryClient),
  });
}

export function useCopyFile() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload?: { folderId?: string | null; name?: string } }) => fileService.copyFile(id, payload),
    onSuccess: () => {
      invalidateFiles(queryClient);
      toast.success('File copied');
    },
  });
}

export function useArchiveFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fileService.archiveFile(id),
    onSuccess: () => invalidateFiles(queryClient),
  });
}

export function useRestoreFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fileService.restoreFile(id),
    onSuccess: () => invalidateFiles(queryClient),
  });
}

export function useDeleteFile() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => fileService.deleteFile(id),
    onSuccess: () => {
      invalidateFiles(queryClient);
      toast.success('File deleted');
    },
  });
}

export function useIssueFileAccessToken() {
  const toast = useToast();
  return useMutation({
    mutationFn: ({ id, purpose, ttlMs, maxUses }: { id: string; purpose: FileAccessPurpose; ttlMs?: number; maxUses?: number }) =>
      fileService.issueFileAccessToken(id, purpose, ttlMs, maxUses),
    onError: () => toast.error('Could not generate access link', 'Please try again.'),
  });
}
