import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as documentService from '@/services/document-management.service';
import { useAuthStore } from '@/stores';
import { useToast } from './use-toast';
import type { CreateDocumentPayload, DocumentFilterParams, FileAccessPurpose, UpdateDocumentPayload } from '@/types';

const DOCS_KEY = 'document-management';

export function useDocuments(params: DocumentFilterParams = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [DOCS_KEY, 'list', params],
    queryFn: () => documentService.listDocuments(params),
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
}

export function useDocument(id: string | undefined) {
  return useQuery({
    queryKey: [DOCS_KEY, 'detail', id],
    queryFn: () => documentService.getDocumentById(id as string),
    enabled: !!id,
  });
}

export function useDocumentVersions(id: string | undefined) {
  return useQuery({
    queryKey: [DOCS_KEY, 'versions', id],
    queryFn: () => documentService.listDocumentVersions(id as string),
    enabled: !!id,
  });
}

export function useDocumentHistory(id: string | undefined) {
  return useQuery({
    queryKey: [DOCS_KEY, 'history', id],
    queryFn: () => documentService.getDocumentHistory(id as string),
    enabled: !!id,
  });
}

export function useDocumentComments(id: string | undefined) {
  return useQuery({
    queryKey: [DOCS_KEY, 'comments', id],
    queryFn: () => documentService.listDocumentComments(id as string),
    enabled: !!id,
  });
}

export function useDocumentLinks(id: string | undefined) {
  return useQuery({
    queryKey: [DOCS_KEY, 'links', id],
    queryFn: () => documentService.listDocumentLinks(id as string),
    enabled: !!id,
  });
}

function invalidateDocument(queryClient: ReturnType<typeof useQueryClient>, id?: string) {
  queryClient.invalidateQueries({ queryKey: [DOCS_KEY] });
  void id;
}

export function useCreateDocument() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateDocumentPayload) => documentService.createDocument(payload),
    onSuccess: () => {
      invalidateDocument(queryClient);
      toast.success('Document created');
    },
    onError: () => toast.error('Could not create document', 'Please try again.'),
  });
}

export function useUpdateDocument(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateDocumentPayload) => documentService.updateDocument(id, payload),
    onSuccess: () => invalidateDocument(queryClient, id),
  });
}

export function useRemoveDocument() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => documentService.removeDocument(id),
    onSuccess: () => {
      invalidateDocument(queryClient);
      toast.success('Document deleted');
    },
  });
}

function useDocumentActionMutation(id: string, fn: () => Promise<unknown>, successMessage?: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      invalidateDocument(queryClient, id);
      if (successMessage) toast.success(successMessage);
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useSubmitDocumentForReview(id: string) {
  return useDocumentActionMutation(id, () => documentService.submitDocumentForReview(id), 'Submitted for review');
}

export function useApproveDocument(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (comment?: string) => documentService.approveDocument(id, comment),
    onSuccess: () => {
      invalidateDocument(queryClient, id);
      toast.success('Document approved');
    },
  });
}

export function useRejectDocument(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (reason: string) => documentService.rejectDocument(id, reason),
    onSuccess: () => {
      invalidateDocument(queryClient, id);
      toast.success('Document rejected');
    },
  });
}

export function useRequestDocumentRevision(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (notes: string) => documentService.requestDocumentRevision(id, notes),
    onSuccess: () => {
      invalidateDocument(queryClient, id);
      toast.success('Revision requested');
    },
  });
}

export function useArchiveDocument(id: string) {
  return useDocumentActionMutation(id, () => documentService.archiveDocument(id), 'Document archived');
}

export function useRestoreDocument(id: string) {
  return useDocumentActionMutation(id, () => documentService.restoreDocument(id), 'Document restored');
}

export function useRenewDocument(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateDocumentPayload) => documentService.renewDocument(id, payload),
    onSuccess: () => {
      invalidateDocument(queryClient, id);
      toast.success('Document renewed');
    },
  });
}

export function useAddDocumentComment(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (comment: string) => documentService.addDocumentComment(id, comment),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [DOCS_KEY, 'comments', id] }),
  });
}

export function useLinkDocumentEntity(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ entityType, entityId }: { entityType: string; entityId: string }) => documentService.linkDocumentEntity(id, entityType, entityId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [DOCS_KEY, 'links', id] }),
  });
}

export function useUnlinkDocumentEntity(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ entityType, entityId }: { entityType: string; entityId: string }) => documentService.unlinkDocumentEntity(id, entityType, entityId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [DOCS_KEY, 'links', id] }),
  });
}

export function useIssueDocumentAccessToken() {
  const toast = useToast();
  return useMutation({
    mutationFn: ({ id, purpose }: { id: string; purpose?: FileAccessPurpose }) => documentService.issueDocumentAccessToken(id, purpose),
    onError: () => toast.error('Could not generate access link', 'Please try again.'),
  });
}
