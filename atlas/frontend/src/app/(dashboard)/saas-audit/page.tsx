'use client';

import { useState } from 'react';
import { Download, ShieldAlert } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FilterBar } from '@/components/ui/filter-bar';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/states';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/action-menu';
import { ReasonDialog } from '@/components/suppliers/reason-dialog';
import {
  useAcknowledgeSecurityIncident,
  useCreateAuditArchive,
  useDismissSecurityIncident,
  useDownloadAuditArchive,
  useEndImpersonation,
  useExportSaasAuditTrail,
  useImpersonationSessions,
  usePurgeRetention,
  useResolveSecurityIncident,
  useRunDetectionSweep,
  useSaasAdminActions,
  useSaasAuditArchives,
  useSaasAuditTrail,
  useSaasSecurityIncidents,
} from '@/hooks';
import { formatDate } from '@/lib/utils';
import type { AuditRiskLevel, ImpersonationStatus, SaasIncidentStatus, SaasIncidentType, SaasSecurityIncident } from '@/types';
import { PlatformAdminGuard } from '@/components/auth/platform-admin-guard';

const RISK_TONE: Record<AuditRiskLevel, 'success' | 'warning' | 'danger'> = {
  NORMAL: 'success',
  SUSPICIOUS: 'warning',
  HIGH_RISK: 'danger',
};

export default function SaasAuditPage() {
  return (
    <PlatformAdminGuard>
      <SaasAuditPageContent />
    </PlatformAdminGuard>
  );
}

function SaasAuditPageContent() {
  return (
    <div>
      <PageHeader title="SaaS Audit" description="Cross-tenant audit trail, admin actions, impersonation sessions and security incidents." />
      <Tabs defaultValue="trail">
        <TabsList>
          <TabsTrigger value="trail">Audit Trail</TabsTrigger>
          <TabsTrigger value="admin-actions">Admin Actions</TabsTrigger>
          <TabsTrigger value="impersonation">Impersonation Sessions</TabsTrigger>
          <TabsTrigger value="incidents">Security Incidents</TabsTrigger>
          <TabsTrigger value="archives">Archives</TabsTrigger>
        </TabsList>

        <TabsContent value="trail">
          <AuditTrailTab />
        </TabsContent>
        <TabsContent value="admin-actions">
          <AdminActionsTab />
        </TabsContent>
        <TabsContent value="impersonation">
          <ImpersonationTab />
        </TabsContent>
        <TabsContent value="incidents">
          <IncidentsTab />
        </TabsContent>
        <TabsContent value="archives">
          <ArchivesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AuditTrailTab() {
  const [workspaceId, setWorkspaceId] = useState('');
  const [module, setModule] = useState('');
  const [riskLevel, setRiskLevel] = useState<AuditRiskLevel | ''>('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useSaasAuditTrail({ workspaceId: workspaceId || undefined, module: module || undefined, riskLevel: riskLevel || undefined, page, limit: 20 });
  const exportTrail = useExportSaasAuditTrail();

  const handleExport = () => {
    exportTrail.mutate(
      { workspaceId: workspaceId || undefined, module: module || undefined, riskLevel: riskLevel || undefined, format: 'CSV' },
      {
        onSuccess: (result) => {
          const blob = new Blob([result.content], { type: result.format === 'CSV' ? 'text/csv' : 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `saas-audit-trail.${result.format.toLowerCase()}`;
          a.click();
          URL.revokeObjectURL(url);
        },
      },
    );
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <FilterBar hasActiveFilters={!!workspaceId || !!module || !!riskLevel} onClearFilters={() => { setWorkspaceId(''); setModule(''); setRiskLevel(''); setPage(1); }}>
          <Input value={workspaceId} onChange={(e) => { setWorkspaceId(e.target.value); setPage(1); }} placeholder="Workspace ID…" className="h-9 w-44" />
          <Input value={module} onChange={(e) => { setModule(e.target.value); setPage(1); }} placeholder="Module…" className="h-9 w-40" />
          <Select
            value={riskLevel}
            onChange={(e) => { setRiskLevel(e.target.value as AuditRiskLevel | ''); setPage(1); }}
            placeholder="All risk levels"
            options={[{ value: 'NORMAL', label: 'Normal' }, { value: 'SUSPICIOUS', label: 'Suspicious' }, { value: 'HIGH_RISK', label: 'High risk' }]}
            className="h-9 w-36"
          />
        </FilterBar>
        <Button variant="outline" onClick={handleExport} disabled={exportTrail.isPending}>
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No audit entries" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workspace</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-sm text-muted-foreground">{entry.workspaceId}</TableCell>
                  <TableCell className="text-sm text-foreground">{entry.module}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{entry.action}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{entry.actorName ?? entry.actorId ?? entry.actorType}</TableCell>
                  <TableCell>
                    <StatusBadge status={entry.outcome} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={entry.riskLevel} tone={RISK_TONE[entry.riskLevel]} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(entry.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.total > 0 && <Pagination page={page} limit={20} total={data.total} totalPages={data.totalPages} onPageChange={setPage} onLimitChange={() => {}} />}
        </>
      )}
    </div>
  );
}

function AdminActionsTab() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useSaasAdminActions({ page, limit: 20 });

  return isLoading ? (
    <Skeleton className="h-64 w-full" />
  ) : !data || data.data.length === 0 ? (
    <EmptyState title="No admin actions recorded" />
  ) : (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Action</TableHead>
            <TableHead>Target workspace</TableHead>
            <TableHead>Performed by</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>When</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.data.map((a) => (
            <TableRow key={a.id}>
              <TableCell className="text-sm text-foreground">{a.actionType}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{a.targetWorkspaceId ?? '—'}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{a.performedBy}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{a.reason ?? '—'}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{formatDate(a.createdAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {data.total > 0 && <Pagination page={page} limit={20} total={data.total} totalPages={data.totalPages} onPageChange={setPage} onLimitChange={() => {}} />}
    </>
  );
}

function ImpersonationTab() {
  const [status, setStatus] = useState<ImpersonationStatus | ''>('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useImpersonationSessions({ status: status || undefined, page, limit: 20 });
  const endImpersonation = useEndImpersonation();

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Select value={status} onChange={(e) => { setStatus(e.target.value as ImpersonationStatus | ''); setPage(1); }} placeholder="All statuses" options={[{ value: 'ACTIVE', label: 'Active' }, { value: 'ENDED', label: 'Ended' }]} className="h-9 w-36" />
      </div>
      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No impersonation sessions" icon={ShieldAlert} />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Admin</TableHead>
                <TableHead>Target user</TableHead>
                <TableHead>Target workspace</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Started</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="text-sm text-muted-foreground">{s.adminUserId}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.targetUserId}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.targetWorkspaceId}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.reason}</TableCell>
                  <TableCell>
                    <StatusBadge status={s.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(s.startedAt)}</TableCell>
                  <TableCell className="text-right">
                    {s.status === 'ACTIVE' && (
                      <Button variant="ghost" size="sm" onClick={() => endImpersonation.mutate(s.id)} disabled={endImpersonation.isPending}>
                        End session
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.total > 0 && <Pagination page={page} limit={20} total={data.total} totalPages={data.totalPages} onPageChange={setPage} onLimitChange={() => {}} />}
        </>
      )}
    </div>
  );
}

const INCIDENT_TYPE_OPTIONS: { value: SaasIncidentType; label: string }[] = [
  { value: 'PRIVILEGE_ESCALATION', label: 'Privilege escalation' },
  { value: 'DESTRUCTIVE_ACTION', label: 'Destructive action' },
  { value: 'REPEATED_FAILURE', label: 'Repeated failure' },
  { value: 'SUSPICIOUS_CROSS_TENANT_ACCESS', label: 'Suspicious cross-tenant access' },
  { value: 'POLICY_VIOLATION', label: 'Policy violation' },
];

const INCIDENT_STATUS_OPTIONS: { value: SaasIncidentStatus; label: string }[] = [
  { value: 'OPEN', label: 'Open' },
  { value: 'ACKNOWLEDGED', label: 'Acknowledged' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'DISMISSED', label: 'Dismissed' },
];

function IncidentsTab() {
  const [incidentType, setIncidentType] = useState<SaasIncidentType | ''>('');
  const [status, setStatus] = useState<SaasIncidentStatus | ''>('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useSaasSecurityIncidents({ incidentType: incidentType || undefined, status: status || undefined, page, limit: 20 });
  const runSweep = useRunDetectionSweep();
  const [resolveTarget, setResolveTarget] = useState<string | null>(null);
  const [dismissTarget, setDismissTarget] = useState<string | null>(null);
  const resolve = useResolveSecurityIncident(resolveTarget ?? '');
  const dismiss = useDismissSecurityIncident(dismissTarget ?? '');

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <FilterBar hasActiveFilters={!!incidentType || !!status} onClearFilters={() => { setIncidentType(''); setStatus(''); setPage(1); }}>
          <Select value={incidentType} onChange={(e) => { setIncidentType(e.target.value as SaasIncidentType | ''); setPage(1); }} placeholder="All types" options={INCIDENT_TYPE_OPTIONS} className="h-9 w-56" />
          <Select value={status} onChange={(e) => { setStatus(e.target.value as SaasIncidentStatus | ''); setPage(1); }} placeholder="All statuses" options={INCIDENT_STATUS_OPTIONS} className="h-9 w-40" />
        </FilterBar>
        <Button variant="outline" onClick={() => runSweep.mutate(undefined)} disabled={runSweep.isPending}>
          Run detection sweep
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No security incidents" icon={ShieldAlert} />
      ) : (
        <>
          <div className="space-y-2">
            {data.data.map((inc) => (
              <IncidentRow key={inc.id} incident={inc} onResolve={() => setResolveTarget(inc.id)} onDismiss={() => setDismissTarget(inc.id)} />
            ))}
          </div>
          {data.total > 0 && <Pagination page={page} limit={20} total={data.total} totalPages={data.totalPages} onPageChange={setPage} onLimitChange={() => {}} />}
        </>
      )}

      <ReasonDialog
        open={!!resolveTarget}
        onOpenChange={(o) => !o && setResolveTarget(null)}
        title="Resolve this incident"
        confirmLabel="Resolve"
        pending={resolve.isPending}
        onSubmit={(reason) => resolveTarget && resolve.mutate({ reason }, { onSuccess: () => setResolveTarget(null) })}
      />
      <ReasonDialog
        open={!!dismissTarget}
        onOpenChange={(o) => !o && setDismissTarget(null)}
        title="Dismiss this incident"
        confirmLabel="Dismiss"
        variant="danger"
        pending={dismiss.isPending}
        onSubmit={(reason) => dismissTarget && dismiss.mutate({ reason }, { onSuccess: () => setDismissTarget(null) })}
      />
    </div>
  );
}

function IncidentRow({
  incident,
  onResolve,
  onDismiss,
}: {
  incident: SaasSecurityIncident;
  onResolve: () => void;
  onDismiss: () => void;
}) {
  const acknowledge = useAcknowledgeSecurityIncident(incident.id);
  const actions: ActionMenuItem[] = [];
  if (incident.status === 'OPEN') {
    actions.push({ label: 'Acknowledge', onSelect: () => acknowledge.mutate() });
  }
  if (incident.status !== 'RESOLVED' && incident.status !== 'DISMISSED') {
    actions.push({ label: 'Resolve', onSelect: onResolve });
    actions.push({ label: 'Dismiss', onSelect: onDismiss, destructive: true });
  }

  return (
    <div className="rounded-[var(--radius)] border border-border p-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-medium text-foreground">{incident.incidentType}</span>
        <div className="flex items-center gap-2">
          <StatusBadge status={incident.severity} tone={RISK_TONE[incident.severity]} />
          <StatusBadge status={incident.status} />
          <ActionMenu items={actions} />
        </div>
      </div>
      <p className="mt-1 text-muted-foreground">{incident.summary}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {incident.workspaceId ? `Workspace ${incident.workspaceId} · ` : ''}
        {formatDate(incident.createdAt)}
      </p>
    </div>
  );
}

function ArchivesTab() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useSaasAuditArchives({ page, limit: 20 });
  const createArchive = useCreateAuditArchive();
  const downloadArchive = useDownloadAuditArchive();
  const purgeRetention = usePurgeRetention();
  const [createOpen, setCreateOpen] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [retentionDays, setRetentionDays] = useState('');

  const download = (id: string) => {
    downloadArchive.mutate(id, {
      onSuccess: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `saas-audit-archive-${id}.json`;
        a.click();
        URL.revokeObjectURL(url);
      },
    });
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-end gap-2">
          <FormField label="Retention days" htmlFor="retention-days">
            <Input id="retention-days" type="number" min="1" value={retentionDays} onChange={(e) => setRetentionDays(e.target.value)} className="h-9 w-36" />
          </FormField>
          <Button variant="outline" onClick={() => purgeRetention.mutate(retentionDays ? Number(retentionDays) : undefined)} disabled={purgeRetention.isPending}>
            Purge retention
          </Button>
        </div>
        <Button onClick={() => setCreateOpen(true)}>New archive</Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No archives yet" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workspace</TableHead>
                <TableHead>Range</TableHead>
                <TableHead>Entries</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="text-sm text-muted-foreground">{a.workspaceId ?? 'All (platform-wide)'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(a.fromDate)} – {formatDate(a.toDate)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{a.entryCount}</TableCell>
                  <TableCell>
                    <StatusBadge status={a.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    {a.status === 'COMPLETED' && (
                      <Button variant="ghost" size="sm" onClick={() => download(a.id)} disabled={downloadArchive.isPending}>
                        Download
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.total > 0 && <Pagination page={page} limit={20} total={data.total} totalPages={data.totalPages} onPageChange={setPage} onLimitChange={() => {}} />}
        </>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>New audit archive</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <FormField label="From date" htmlFor="archive-from" required>
              <Input id="archive-from" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </FormField>
            <FormField label="To date" htmlFor="archive-to" required>
              <Input id="archive-to" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createArchive.mutate({ fromDate, toDate }, { onSuccess: () => { setCreateOpen(false); setFromDate(''); setToDate(''); } })}
              disabled={!fromDate || !toDate || createArchive.isPending}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
