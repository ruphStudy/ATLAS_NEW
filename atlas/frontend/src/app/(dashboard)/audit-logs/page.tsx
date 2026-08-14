'use client';

import { useMemo, useState } from 'react';
import { Download, Flag } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { FilterBar } from '@/components/ui/filter-bar';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState } from '@/components/ui/states';
import { Pagination } from '@/components/ui/pagination';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { Drawer, DrawerBody, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { useAuditLogDetail, useAuditLogs } from '@/hooks';
import { exportAuditLogs } from '@/services/audit-logs.service';
import { formatDate } from '@/lib/utils';
import type { AuditActionCategory, AuditLogFilterParams, AuditRiskLevel } from '@/types';

const ACTION_CATEGORY_OPTIONS: { value: AuditActionCategory; label: string }[] = [
  { value: 'CREATE', label: 'Create' },
  { value: 'UPDATE', label: 'Update' },
  { value: 'DELETE', label: 'Delete' },
  { value: 'RESTORE', label: 'Restore' },
  { value: 'APPROVE', label: 'Approve' },
  { value: 'REJECT', label: 'Reject' },
  { value: 'PUBLISH', label: 'Publish' },
  { value: 'SYNC', label: 'Sync' },
  { value: 'LOGIN', label: 'Login' },
  { value: 'PERMISSION', label: 'Permission' },
  { value: 'CONFIGURATION', label: 'Configuration' },
  { value: 'OVERRIDE', label: 'Override' },
  { value: 'OTHER', label: 'Other' },
];

const RISK_OPTIONS: { value: AuditRiskLevel; label: string }[] = [
  { value: 'NORMAL', label: 'Normal' },
  { value: 'SUSPICIOUS', label: 'Suspicious' },
  { value: 'HIGH_RISK', label: 'High risk' },
];

const riskTone: Record<AuditRiskLevel, 'success' | 'warning' | 'danger'> = {
  NORMAL: 'success',
  SUSPICIOUS: 'warning',
  HIGH_RISK: 'danger',
};

function triggerDownload(content: string, format: 'CSV' | 'JSON') {
  const mime = format === 'CSV' ? 'text/csv' : 'application/json';
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `audit-logs.${format.toLowerCase()}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function AuditLogsPage() {
  const [module, setModule] = useState('');
  const [actionCategory, setActionCategory] = useState<AuditActionCategory | ''>('');
  const [riskLevel, setRiskLevel] = useState<AuditRiskLevel | ''>('');
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [exporting, setExporting] = useState<'CSV' | 'JSON' | null>(null);

  const params = useMemo<AuditLogFilterParams>(
    () => ({
      module: module || undefined,
      actionCategory: actionCategory || undefined,
      riskLevel: riskLevel || undefined,
      flagged: flaggedOnly || undefined,
      search: search || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      sortOrder: 'desc',
      page,
      limit,
    }),
    [module, actionCategory, riskLevel, flaggedOnly, search, startDate, endDate, page, limit],
  );

  const logs = useAuditLogs(params);
  const rows = logs.data?.data ?? [];
  const hasActiveFilters = !!(module || actionCategory || riskLevel || flaggedOnly || search || startDate || endDate);

  async function handleExport(format: 'CSV' | 'JSON') {
    setExporting(format);
    try {
      const result = await exportAuditLogs({ ...params, format, page: undefined, limit: undefined });
      triggerDownload(result.content, result.format);
    } finally {
      setExporting(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        description="Workspace-wide audit trail — who did what, when, and what changed."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => handleExport('CSV')} disabled={exporting !== null}>
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport('JSON')} disabled={exporting !== null}>
              <Download className="h-3.5 w-3.5" />
              Export JSON
            </Button>
          </>
        }
      />

      <FilterBar
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Search audit logs…"
        hasActiveFilters={hasActiveFilters}
        onClearFilters={() => {
          setModule('');
          setActionCategory('');
          setRiskLevel('');
          setFlaggedOnly(false);
          setSearch('');
          setStartDate('');
          setEndDate('');
          setPage(1);
        }}
        className="mb-4"
      >
        <Input value={module} onChange={(e) => setModule(e.target.value)} placeholder="Module" className="h-9 w-36" />
        <Select
          value={actionCategory}
          onChange={(e) => setActionCategory(e.target.value as AuditActionCategory | '')}
          options={[{ value: '', label: 'All actions' }, ...ACTION_CATEGORY_OPTIONS]}
          className="h-9 w-40"
        />
        <Select
          value={riskLevel}
          onChange={(e) => setRiskLevel(e.target.value as AuditRiskLevel | '')}
          options={[{ value: '', label: 'All risk levels' }, ...RISK_OPTIONS]}
          className="h-9 w-40"
        />
        <Button variant={flaggedOnly ? 'secondary' : 'outline'} size="sm" onClick={() => setFlaggedOnly((f) => !f)}>
          <Flag className="h-3.5 w-3.5" />
          Flagged only
        </Button>
      </FilterBar>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <FormField label="Start date" htmlFor="al-start">
          <Input id="al-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9" />
        </FormField>
        <FormField label="End date" htmlFor="al-end">
          <Input id="al-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9" />
        </FormField>
      </div>

      {logs.isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : logs.isError ? (
        <QueryErrorState refetch={logs.refetch} />
      ) : rows.length === 0 ? (
        <EmptyState title="No audit log entries" description="Nothing matches these filters." />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} className="cursor-pointer" onClick={() => setDetailId(row.id)}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {row.flagged && <Flag className="h-3.5 w-3.5 shrink-0 text-danger" />}
                      <div>
                        <p className="text-sm font-medium text-foreground">{row.action}</p>
                        <p className="text-xs text-muted-foreground">{row.actionCategory.toLowerCase()}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{row.actorName ?? row.actorId ?? row.actorType}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{row.module}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{row.entityType ? `${row.entityType} · ${row.entityId}` : '—'}</TableCell>
                  <TableCell>
                    <StatusBadge status={row.outcome} />
                  </TableCell>
                  <TableCell>
                    <Badge variant={riskTone[row.riskLevel]} className="text-[10px] capitalize">
                      {row.riskLevel.toLowerCase().replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(row.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination
            page={logs.data?.page ?? page}
            limit={logs.data?.limit ?? limit}
            total={logs.data?.total ?? 0}
            totalPages={logs.data?.totalPages ?? 0}
            onPageChange={setPage}
            onLimitChange={(l) => {
              setLimit(l);
              setPage(1);
            }}
          />
        </>
      )}

      <AuditLogDetailDrawer id={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}

function AuditLogDetailDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const detail = useAuditLogDetail(id ?? undefined);

  return (
    <Drawer open={!!id} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent size="lg">
        <DrawerHeader>
          <DrawerTitle>Audit log entry</DrawerTitle>
        </DrawerHeader>
        <DrawerBody>
          {detail.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : !detail.data ? (
            <EmptyState title="Entry not found" className="border-none py-8" />
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <Field label="Action" value={detail.data.action} />
                <Field label="Category" value={detail.data.actionCategory} />
                <Field label="Module" value={detail.data.module} />
                <Field label="Outcome" value={detail.data.outcome} />
                <Field label="Actor" value={detail.data.actorName ?? detail.data.actorId ?? detail.data.actorType} />
                <Field label="Actor role" value={detail.data.actorRole ?? '—'} />
                <Field label="Entity" value={detail.data.entityType ? `${detail.data.entityType} · ${detail.data.entityId}` : '—'} />
                <Field label="Risk level" value={detail.data.riskLevel.replace('_', ' ')} />
                <Field label="Flagged" value={detail.data.flagged ? (detail.data.flagReason ?? 'Yes') : 'No'} />
                <Field label="When" value={formatDate(detail.data.createdAt)} />
              </div>

              {detail.data.reason && <Field label="Reason" value={detail.data.reason} />}

              {(detail.data.beforeState !== undefined || detail.data.afterState !== undefined) && (
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Changes</p>
                  {detail.data.changedFields && detail.data.changedFields.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-1.5">
                      {detail.data.changedFields.map((f) => (
                        <Badge key={f} variant="secondary" className="text-[10px]">
                          {f}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="mb-1 text-xs text-muted-foreground">Before</p>
                      <pre className="max-h-64 overflow-auto rounded-[var(--radius)] border border-border bg-secondary p-3 text-xs text-foreground">
                        {detail.data.beforeState != null ? JSON.stringify(detail.data.beforeState, null, 2) : '—'}
                      </pre>
                    </div>
                    <div>
                      <p className="mb-1 text-xs text-muted-foreground">After</p>
                      <pre className="max-h-64 overflow-auto rounded-[var(--radius)] border border-border bg-secondary p-3 text-xs text-foreground">
                        {detail.data.afterState != null ? JSON.stringify(detail.data.afterState, null, 2) : '—'}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-foreground">{value}</p>
    </div>
  );
}
