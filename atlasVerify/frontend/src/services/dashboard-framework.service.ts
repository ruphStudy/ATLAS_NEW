import { apiClient } from '@/lib/api/axios';
import type { CreateSavedDashboardPayload, DashboardExport, DashboardExportFormat, SavedDashboard, UpdateSavedDashboardPayload } from '@/types';

export async function listDashboards(workspaceId: string): Promise<SavedDashboard[]> {
  const { data } = await apiClient.get<SavedDashboard[]>('/dashboard-framework/dashboards', { params: { workspaceId } });
  return data;
}

export async function createDashboard(payload: CreateSavedDashboardPayload): Promise<SavedDashboard> {
  const { data } = await apiClient.post<SavedDashboard>('/dashboard-framework/dashboards', payload);
  return data;
}

export async function updateDashboard(id: string, workspaceId: string, updatedBy: string, payload: UpdateSavedDashboardPayload): Promise<SavedDashboard> {
  const { data } = await apiClient.put<SavedDashboard>(`/dashboard-framework/dashboards/${id}`, payload, { params: { workspaceId, updatedBy } });
  return data;
}

export async function exportDashboard(dashboardId: string, workspaceId: string, exportFormat: DashboardExportFormat, createdBy: string, filters?: Record<string, unknown>): Promise<DashboardExport> {
  const { data } = await apiClient.post<DashboardExport>('/dashboard-framework/exports', { dashboardId, workspaceId, exportFormat, createdBy, filters });
  return data;
}

export async function getExport(id: string, workspaceId: string): Promise<DashboardExport> {
  const { data } = await apiClient.get<DashboardExport>(`/dashboard-framework/exports/${id}`, { params: { workspaceId } });
  return data;
}
