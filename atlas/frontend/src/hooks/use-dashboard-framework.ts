import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as dashboardFrameworkService from '@/services/dashboard-framework.service';
import { useAuthStore } from '@/stores';
import type { CreateSavedDashboardPayload, DashboardExportFormat, UpdateSavedDashboardPayload } from '@/types';
import { useToast } from './use-toast';

const DASHBOARDS_QUERY_KEY = ['dashboard-framework-dashboards'];

export function useSavedDashboards() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const workspaceId = useAuthStore((s) => s.user?.workspaceId);

  return useQuery({
    queryKey: [...DASHBOARDS_QUERY_KEY, workspaceId],
    queryFn: () => dashboardFrameworkService.listDashboards(workspaceId as string),
    enabled: isAuthenticated && !!workspaceId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateSavedDashboard() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateSavedDashboardPayload) => dashboardFrameworkService.createDashboard(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DASHBOARDS_QUERY_KEY });
      toast.success('Dashboard view created');
    },
    onError: () => toast.error('Could not create dashboard view', 'Please try again.'),
  });
}

export function useUpdateSavedDashboard() {
  const queryClient = useQueryClient();
  const workspaceId = useAuthStore((s) => s.user?.workspaceId);
  const userId = useAuthStore((s) => s.user?.id);
  const toast = useToast();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateSavedDashboardPayload }) =>
      dashboardFrameworkService.updateDashboard(id, workspaceId as string, userId as string, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DASHBOARDS_QUERY_KEY });
    },
    onError: () => toast.error('Could not save dashboard view', 'Please try again.'),
  });
}

export function useExportDashboard() {
  const workspaceId = useAuthStore((s) => s.user?.workspaceId);
  const userId = useAuthStore((s) => s.user?.id);
  const toast = useToast();

  return useMutation({
    mutationFn: ({ dashboardId, format, filters }: { dashboardId: string; format: DashboardExportFormat; filters?: Record<string, unknown> }) =>
      dashboardFrameworkService.exportDashboard(dashboardId, workspaceId as string, format, userId as string, filters),
    onSuccess: () => toast.success('Export started', "We'll prepare your file shortly."),
    onError: () => toast.error('Could not start export', 'Please try again.'),
  });
}

export function useDashboardExportStatus(exportId: string | undefined) {
  const workspaceId = useAuthStore((s) => s.user?.workspaceId);

  return useQuery({
    queryKey: ['dashboard-export-status', exportId],
    queryFn: () => dashboardFrameworkService.getExport(exportId as string, workspaceId as string),
    enabled: !!exportId && !!workspaceId,
    // Poll until a file is ready or the backend reports a terminal status — `status` isn't a typed enum on the DTO, so `fileUrl` presence is the reliable success signal.
    refetchInterval: (query) => (query.state.data?.fileUrl || query.state.data?.status?.toLowerCase().includes('fail') ? false : 2000),
  });
}
