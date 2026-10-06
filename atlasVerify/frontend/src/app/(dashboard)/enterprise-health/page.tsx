'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FilterBar } from '@/components/ui/filter-bar';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/states';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/action-menu';
import { ReasonDialog } from '@/components/suppliers/reason-dialog';
import {
  useAcknowledgeEnterpriseHealthIncident,
  useBusinessHealthDashboard,
  useEnterpriseHealthIncident,
  useEnterpriseHealthIncidents,
  useOrganizationHealthDashboard,
  usePlatformHealthDashboard,
  useProviderHealthDashboard,
  useRegionHealthDashboard,
  useResolveEnterpriseHealthIncident,
  useRunEnterpriseHealthSweep,
  useWorkspace,
  useWorkspaceScopedHealthDashboard,
} from '@/hooks';
import { useAuthStore } from '@/stores';
import { formatDate } from '@/lib/utils';
import type { EnterpriseHealthIncidentStatus, EnterpriseHealthScope, EnterpriseHealthScoreBreakdown, MonitoringAlertSeverity, MonitoringHealthLevel } from '@/types';

const LEVEL_TONE: Record<MonitoringHealthLevel, StatusTone> = {
  HEALTHY: 'success',
  DEGRADED: 'warning',
  UNHEALTHY: 'danger',
  OFFLINE: 'danger',
  MAINTENANCE: 'info',
  UNKNOWN: 'neutral',
};

const INCIDENT_STATUS_OPTIONS: { value: EnterpriseHealthIncidentStatus; label: string }[] = [
  { value: 'OPEN', label: 'Open' },
  { value: 'ACKNOWLEDGED', label: 'Acknowledged' },
  { value: 'RESOLVED', label: 'Resolved' },
];

const SEVERITY_OPTIONS: { value: MonitoringAlertSeverity; label: string }[] = [
  { value: 'WARNING', label: 'Warning' },
  { value: 'CRITICAL', label: 'Critical' },
];

function useOrganizationId() {
  const workspaceId = useAuthStore((s) => s.user?.workspaceId);
  const { data: workspace } = useWorkspace(workspaceId);
  return workspace?.organizationId ?? undefined;
}

export default function EnterpriseHealthPage() {
  return (
    <div>
      <PageHeader title="Enterprise Health" description="Cross-scope health scoring for platform, organization, business, workspace, region and provider levels." />
      <Tabs defaultValue="platform">
        <TabsList>
          <TabsTrigger value="platform">Platform</TabsTrigger>
          <TabsTrigger value="organization">Organization</TabsTrigger>
          <TabsTrigger value="scoped">Business / Workspace / Region / Provider</TabsTrigger>
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
        </TabsList>
        <TabsContent value="platform">
          <PlatformTab />
        </TabsContent>
        <TabsContent value="organization">
          <OrganizationTab />
        </TabsContent>
        <TabsContent value="scoped">
          <ScopedTab />
        </TabsContent>
        <TabsContent value="incidents">
          <IncidentsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DashboardCard({
  loading,
  dashboard,
  onSweep,
  sweepPending,
}: {
  loading: boolean;
  dashboard?: { level: MonitoringHealthLevel; previousLevel?: MonitoringHealthLevel | null; breakdown: EnterpriseHealthScoreBreakdown; openIncidentCount: number; unhealthySourceKeys: string[]; generatedAt: string };
  onSweep?: () => void;
  sweepPending?: boolean;
}) {
  if (loading) return <Skeleton className="h-64 w-full" />;
  if (!dashboard) return <EmptyState title="No health data available" description="This scope has not been evaluated yet." />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            Overall health
            <StatusBadge status={dashboard.level} tone={LEVEL_TONE[dashboard.level]} />
            {dashboard.previousLevel && dashboard.previousLevel !== dashboard.level && (
              <span className="text-xs font-normal text-muted-foreground">was {dashboard.previousLevel}</span>
            )}
          </span>
          {onSweep && (
            <Button size="sm" variant="outline" onClick={onSweep} disabled={sweepPending}>
              {sweepPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Run detection sweep
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <ScoreField label="Score" value={dashboard.breakdown.score} />
          <ScoreField label="Availability" value={dashboard.breakdown.availabilityScore} />
          <ScoreField label="Latency" value={dashboard.breakdown.latencyScore} />
          <ScoreField label="Failure" value={dashboard.breakdown.failureScore} />
          <ScoreField label="Backlog" value={dashboard.breakdown.backlogScore} />
          <ScoreField label="Dependency" value={dashboard.breakdown.dependencyScore} />
          <ScoreField label="Security" value={dashboard.breakdown.securityScore} />
          <ScoreField label="Recovery" value={dashboard.breakdown.recoveryScore} />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {dashboard.openIncidentCount} open incident{dashboard.openIncidentCount === 1 ? '' : 's'} · generated {formatDate(dashboard.generatedAt)}
        </p>
        {dashboard.unhealthySourceKeys.length > 0 && (
          <div className="mt-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Unhealthy sources</p>
            <p className="text-sm text-danger">{dashboard.unhealthySourceKeys.join(', ')}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ScoreField({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

function PlatformTab() {
  const dashboard = usePlatformHealthDashboard();
  return <DashboardCard loading={dashboard.isLoading} dashboard={dashboard.data} />;
}

function OrganizationTab() {
  const organizationId = useOrganizationId();
  const dashboard = useOrganizationHealthDashboard(organizationId);
  const sweep = useRunEnterpriseHealthSweep(organizationId ?? '');

  if (!organizationId) return <EmptyState title="No organization context" description="This workspace is not linked to an organization." />;

  return <DashboardCard loading={dashboard.isLoading} dashboard={dashboard.data} onSweep={() => sweep.mutate({})} sweepPending={sweep.isPending} />;
}

function ScopedTab() {
  const organizationId = useOrganizationId();
  const [scope, setScope] = useState<Exclude<EnterpriseHealthScope, 'PLATFORM' | 'ORGANIZATION'>>('WORKSPACE');
  const [ref, setRef] = useState('');

  const businessDashboard = useBusinessHealthDashboard(organizationId, scope === 'BUSINESS' ? ref : undefined);
  const workspaceDashboard = useWorkspaceScopedHealthDashboard(organizationId, scope === 'WORKSPACE' ? ref : undefined);
  const regionDashboard = useRegionHealthDashboard(organizationId, scope === 'REGION' ? ref : undefined);
  const providerDashboard = useProviderHealthDashboard(organizationId, scope === 'PROVIDER' ? ref : undefined);

  const active = scope === 'BUSINESS' ? businessDashboard : scope === 'WORKSPACE' ? workspaceDashboard : scope === 'REGION' ? regionDashboard : providerDashboard;

  if (!organizationId) return <EmptyState title="No organization context" description="This workspace is not linked to an organization." />;

  return (
    <div>
      <div className="mb-4 flex items-end gap-3">
        <Select
          value={scope}
          onChange={(e) => setScope(e.target.value as typeof scope)}
          options={[
            { value: 'BUSINESS', label: 'Business' },
            { value: 'WORKSPACE', label: 'Workspace' },
            { value: 'REGION', label: 'Region' },
            { value: 'PROVIDER', label: 'Provider' },
          ]}
          className="h-9 w-40"
        />
        <Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder={`${scope.toLowerCase()} ID / code`} className="h-9 w-64" />
      </div>
      {!ref ? <EmptyState title="Enter a reference" description="Provide an ID or code to view this scope's health." /> : <DashboardCard loading={active.isLoading} dashboard={active.data} />}
    </div>
  );
}

function IncidentsTab() {
  const organizationId = useOrganizationId();
  const [status, setStatus] = useState<EnterpriseHealthIncidentStatus | ''>('');
  const [severity, setSeverity] = useState<MonitoringAlertSeverity | ''>('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data, isLoading } = useEnterpriseHealthIncidents(organizationId, { status: status || undefined, severity: severity || undefined, page, limit: 20 });

  if (!organizationId) return <EmptyState title="No organization context" description="This workspace is not linked to an organization." />;

  return (
    <div>
      <div className="mb-4">
        <FilterBar hasActiveFilters={!!status || !!severity} onClearFilters={() => { setStatus(''); setSeverity(''); setPage(1); }}>
          <Select value={status} onChange={(e) => { setStatus(e.target.value as EnterpriseHealthIncidentStatus | ''); setPage(1); }} placeholder="All statuses" options={INCIDENT_STATUS_OPTIONS} className="h-9 w-40" />
          <Select value={severity} onChange={(e) => { setSeverity(e.target.value as MonitoringAlertSeverity | ''); setPage(1); }} placeholder="All severities" options={SEVERITY_OPTIONS} className="h-9 w-36" />
        </FilterBar>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No incidents found" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Incident</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Opened</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((inc) => (
                <TableRow key={inc.id} clickable onClick={() => setSelectedId(inc.id)}>
                  <TableCell className="text-sm font-medium text-foreground">{inc.title}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{inc.scope} {inc.scopeRef ? `· ${inc.scopeRef}` : ''}</TableCell>
                  <TableCell>
                    <StatusBadge status={inc.severity} tone={inc.severity === 'CRITICAL' ? 'danger' : 'warning'} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={inc.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(inc.openedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.total > 0 && <Pagination page={page} limit={20} total={data.total} totalPages={data.totalPages} onPageChange={setPage} onLimitChange={() => {}} />}
        </>
      )}

      <IncidentDetailDialog organizationId={organizationId} id={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function IncidentDetailDialog({ organizationId, id, onClose }: { organizationId: string; id: string | null; onClose: () => void }) {
  const { data: incident, isLoading } = useEnterpriseHealthIncident(organizationId, id ?? undefined);
  const acknowledge = useAcknowledgeEnterpriseHealthIncident(organizationId, id ?? '');
  const resolve = useResolveEnterpriseHealthIncident(organizationId, id ?? '');
  const [resolveOpen, setResolveOpen] = useState(false);

  const actions: ActionMenuItem[] = [];
  if (incident) {
    if (incident.status === 'OPEN') actions.push({ label: 'Acknowledge', onSelect: () => acknowledge.mutate() });
    if (incident.status !== 'RESOLVED') actions.push({ label: 'Resolve', onSelect: () => setResolveOpen(true) });
  }

  return (
    <Dialog open={!!id} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>{incident?.title ?? 'Incident'}</span>
            {incident && <ActionMenu items={actions} />}
          </DialogTitle>
        </DialogHeader>
        {isLoading || !incident ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <Field label="Scope" value={incident.scope} />
              <Field label="Scope ref" value={incident.scopeRef ?? '—'} />
              <Field label="Severity" value={incident.severity} />
              <Field label="Status" value={incident.status} />
              <Field label="Opened" value={formatDate(incident.openedAt)} />
              <Field label="Acknowledged" value={incident.acknowledgedAt ? formatDate(incident.acknowledgedAt) : '—'} />
              <Field label="Resolved" value={incident.resolvedAt ? formatDate(incident.resolvedAt) : '—'} />
              <Field label="Triggered workflow" value={incident.triggeredWorkflowExecutionId ?? '—'} />
            </div>
            {incident.description && <p className="text-sm text-muted-foreground">{incident.description}</p>}
            {incident.resolution && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Resolution</p>
                <p className="text-sm text-foreground">{incident.resolution}</p>
              </div>
            )}
            {incident.affectedSourceKeys.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Affected sources</p>
                <p className="text-sm text-foreground">{incident.affectedSourceKeys.join(', ')}</p>
              </div>
            )}
            {incident.affectedRegions.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Affected regions</p>
                <p className="text-sm text-foreground">{incident.affectedRegions.join(', ')}</p>
              </div>
            )}
            {incident.affectedProviders.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Affected providers</p>
                <p className="text-sm text-foreground">{incident.affectedProviders.join(', ')}</p>
              </div>
            )}
            {incident.affectedWorkspaceIds.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Affected workspaces</p>
                <p className="text-sm text-foreground">{incident.affectedWorkspaceIds.join(', ')}</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
      <ReasonDialog open={resolveOpen} onOpenChange={setResolveOpen} title="Resolve this incident" confirmLabel="Resolve" pending={resolve.isPending} onSubmit={(reason) => resolve.mutate(reason, { onSuccess: () => setResolveOpen(false) })} />
    </Dialog>
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
