import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as tagsService from '@/services/tags-management.service';
import { useAuthStore } from '@/stores';
import { useToast } from './use-toast';
import type {
  AssignTagPayload,
  BulkAssignTagsPayload,
  BulkRemoveTagsPayload,
  CreateTagGroupPayload,
  CreateTagPayload,
  CreateTagSavedViewPayload,
  TagFilterParams,
  UpdateTagGroupPayload,
  UpdateTagPayload,
} from '@/types';

const TAGS_KEY = 'tags-management';

export function useTags(params: TagFilterParams = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [TAGS_KEY, 'list', params],
    queryFn: () => tagsService.listTags(params),
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
}

export function useTagsForEntity(entityType: string | undefined, entityId: string | undefined, module?: string) {
  return useQuery({
    queryKey: [TAGS_KEY, 'entity', entityType, entityId, module],
    queryFn: () => tagsService.listTagsForEntity(entityType as string, entityId as string, module),
    enabled: !!entityType && !!entityId,
  });
}

export function useTagGroups() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [TAGS_KEY, 'groups'],
    queryFn: tagsService.listTagGroups,
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });
}

export function useTagHistory(id: string | undefined) {
  return useQuery({
    queryKey: [TAGS_KEY, 'history', id],
    queryFn: () => tagsService.getTagHistory(id as string),
    enabled: !!id,
  });
}

export function useTagSavedViews() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [TAGS_KEY, 'saved-views'],
    queryFn: tagsService.listTagSavedViews,
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });
}

function invalidateTags(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: [TAGS_KEY] });
}

export function useCreateTag() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateTagPayload) => tagsService.createTag(payload),
    onSuccess: () => {
      invalidateTags(queryClient);
      toast.success('Tag created');
    },
    onError: () => toast.error('Could not create tag', 'Please try again.'),
  });
}

export function useUpdateTag(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateTagPayload) => tagsService.updateTag(id, payload),
    onSuccess: () => invalidateTags(queryClient),
  });
}

export function useDeleteTag() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => tagsService.deleteTag(id),
    onSuccess: () => {
      invalidateTags(queryClient);
      toast.success('Tag deleted');
    },
  });
}

export function useArchiveTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tagsService.archiveTag(id),
    onSuccess: () => invalidateTags(queryClient),
  });
}

export function useRestoreTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tagsService.restoreTag(id),
    onSuccess: () => invalidateTags(queryClient),
  });
}

export function useAssignTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AssignTagPayload }) => tagsService.assignTag(id, payload),
    onSuccess: () => invalidateTags(queryClient),
  });
}

export function useUnassignTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, entityType, entityId }: { id: string; entityType: string; entityId: string }) => tagsService.unassignTag(id, entityType, entityId),
    onSuccess: () => invalidateTags(queryClient),
  });
}

export function useBulkAssignTags() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: BulkAssignTagsPayload) => tagsService.bulkAssignTags(payload),
    onSuccess: () => {
      invalidateTags(queryClient);
      toast.success('Tags assigned');
    },
  });
}

export function useBulkRemoveTags() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: BulkRemoveTagsPayload) => tagsService.bulkRemoveTags(payload),
    onSuccess: () => {
      invalidateTags(queryClient);
      toast.success('Tags removed');
    },
  });
}

export function useCreateTagGroup() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateTagGroupPayload) => tagsService.createTagGroup(payload),
    onSuccess: () => {
      invalidateTags(queryClient);
      toast.success('Group created');
    },
  });
}

export function useUpdateTagGroup(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateTagGroupPayload) => tagsService.updateTagGroup(id, payload),
    onSuccess: () => invalidateTags(queryClient),
  });
}

export function useRemoveTagGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tagsService.removeTagGroup(id),
    onSuccess: () => invalidateTags(queryClient),
  });
}

export function useCreateTagSavedView() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateTagSavedViewPayload) => tagsService.createTagSavedView(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TAGS_KEY, 'saved-views'] });
      toast.success('View saved');
    },
  });
}

export function useDeleteTagSavedView() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tagsService.deleteTagSavedView(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [TAGS_KEY, 'saved-views'] }),
  });
}
