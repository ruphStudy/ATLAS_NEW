'use client';

import { useState } from 'react';
import { Download, Loader2, Plus, Save } from 'lucide-react';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useCreateSavedDashboard, useCurrentUser, useDashboardExportStatus, useExportDashboard, useToast, useUpdateSavedDashboard } from '@/hooks';
import type { DashboardExportFormat, SavedDashboard } from '@/types';
import type { DashboardFilterState } from './dashboard-filters';

const EXPORT_FORMATS: DashboardExportFormat[] = ['csv', 'xlsx', 'pdf', 'json'];

export function DashboardViewControls({
  dashboards,
  activeDashboardId,
  onSelectDashboard,
  filters,
}: {
  dashboards: SavedDashboard[];
  activeDashboardId: string | null;
  onSelectDashboard: (id: string) => void;
  filters: DashboardFilterState;
}) {
  const user = useCurrentUser();
  const createDashboard = useCreateSavedDashboard();
  const updateDashboard = useUpdateSavedDashboard();
  const exportDashboard = useExportDashboard();
  const toast = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  const [exportId, setExportId] = useState<string>();

  const { data: exportStatus } = useDashboardExportStatus(exportId);

  const handleCreate = () => {
    if (!user) return;
    createDashboard.mutate(
      {
        workspaceId: user.workspaceId,
        dashboardKey: `executive-${Date.now()}`,
        name: newViewName,
        layout: { columns: 12, rows: 6, gap: 16, padding: 16 },
        createdBy: user.id,
        filters: { marketplaceIds: filters.marketplaceIds, currency: filters.currency },
        dateRange: { start: filters.startDate, end: filters.endDate },
      },
      {
        onSuccess: (dashboard) => {
          setCreateOpen(false);
          setNewViewName('');
          onSelectDashboard(dashboard.id);
        },
      },
    );
  };

  const handleSaveCurrentView = () => {
    if (!activeDashboardId) return;
    updateDashboard.mutate({
      id: activeDashboardId,
      payload: { filters: { marketplaceIds: filters.marketplaceIds, currency: filters.currency }, dateRange: { start: filters.startDate, end: filters.endDate } },
    });
  };

  const handleExport = (format: DashboardExportFormat) => {
    if (!activeDashboardId) {
      toast.error('Save a dashboard view first', 'Exports are tied to a saved view.');
      return;
    }
    exportDashboard.mutate(
      { dashboardId: activeDashboardId, format, filters: { marketplaceIds: filters.marketplaceIds, currency: filters.currency } },
      { onSuccess: (exp) => setExportId(exp.id) },
    );
  };

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <Select
        value={activeDashboardId ?? ''}
        onChange={(e) => onSelectDashboard(e.target.value)}
        placeholder="Executive Overview (default)"
        options={dashboards.map((d) => ({ value: d.id, label: d.name }))}
        className="h-9 w-56"
      />

      <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
        <Plus className="h-3.5 w-3.5" />
        New view
      </Button>

      {activeDashboardId && (
        <Button variant="outline" size="sm" onClick={handleSaveCurrentView} disabled={updateDashboard.isPending}>
          {updateDashboard.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save filters to view
        </Button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={exportDashboard.isPending}>
            {exportDashboard.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {EXPORT_FORMATS.map((format) => (
            <DropdownMenuItem key={format} onSelect={() => handleExport(format)}>
              {format.toUpperCase()}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {exportStatus?.fileUrl && (
        <a href={exportStatus.fileUrl} target="_blank" rel="noreferrer" className="text-xs font-medium text-primary hover:underline">
          Download ready export
        </a>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Save as a new view</DialogTitle>
          </DialogHeader>
          <FormField label="View name" htmlFor="view-name" required>
            <Input id="view-name" value={newViewName} onChange={(e) => setNewViewName(e.target.value)} placeholder="Q1 board review" />
          </FormField>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!newViewName || createDashboard.isPending}>
              {createDashboard.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
