import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as activityService from '@/services/activity-center.service';
import { getWorkspaceActivityFeed } from '@/services/activity-center.service';
import { useAuthStore } from '@/stores';
import type { ActivityFilterParams } from '@/types';

const ACTIVITY_QUERY_KEY = 'activity-center';

export function useWorkspaceActivityFeed(limit = 20) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['activity-center-workspace-feed', limit],
    queryFn: () => getWorkspaceActivityFeed(limit),
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
}

export function usePersonalActivityFeed(params: ActivityFilterParams = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [ACTIVITY_QUERY_KEY, 'personal', params],
    queryFn: () => activityService.getPersonalActivityFeed(params),
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
}

export function useWorkspaceActivityFeedFiltered(params: ActivityFilterParams = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [ACTIVITY_QUERY_KEY, 'workspace', params],
    queryFn: () => activityService.listWorkspaceActivityFeed(params),
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
}

export function useEntityActivityFeed(entityType: string | undefined, entityId: string | undefined, params: ActivityFilterParams = {}) {
  return useQuery({
    queryKey: [ACTIVITY_QUERY_KEY, 'entity', entityType, entityId, params],
    queryFn: () => activityService.getEntityActivityFeed(entityType as string, entityId as string, params),
    enabled: !!entityType && !!entityId,
    staleTime: 30 * 1000,
  });
}

export function useActivityUnreadCount() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [ACTIVITY_QUERY_KEY, 'unread-count'],
    queryFn: activityService.getActivityUnreadCount,
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

function useActivityMutation(mutationFn: (id: string) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ACTIVITY_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['activity-center-workspace-feed'] });
    },
  });
}

export function useMarkAllActivityRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: activityService.markAllActivityRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [ACTIVITY_QUERY_KEY] }),
  });
}

export function useMarkActivityRead() {
  return useActivityMutation(activityService.markActivityRead);
}

export function usePinActivity() {
  return useActivityMutation(activityService.pinActivity);
}

export function useUnpinActivity() {
  return useActivityMutation(activityService.unpinActivity);
}

export function useArchiveActivity() {
  return useActivityMutation(activityService.archiveActivity);
}

export function useRestoreActivity() {
  return useActivityMutation(activityService.restoreActivity);
}

export function useDismissActivity() {
  return useActivityMutation(activityService.dismissActivity);
}

export function useRemoveActivity() {
  return useActivityMutation(activityService.removeActivity);
}
