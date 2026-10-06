'use client';

import { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FilterBar } from '@/components/ui/filter-bar';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/states';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/action-menu';
import { ReasonDialog } from '@/components/suppliers/reason-dialog';
import {
  useAcknowledgeMonitoringIncident,
  useActivateMonitoringAlertRule,
  useActivateMonitoringSlo,
  useArchiveMonitoringSlo,
  useCreateMonitoringAlertRule,
  useCreateMonitoringSlo,
  useDetectCascadingFailures,
  useMonitoringAlertRules,
  useMonitoringCorrelationTrace,
  useMonitoringIncidents,
  useMonitoringSlos,
  usePauseMonitoringAlertRule,
  usePauseMonitoringSlo,
  usePlatformHealth,
  useResolveMonitoringIncident,
  useRestoreMonitoringSlo,
  useWorkspaceHealth,
} from '@/hooks';
import { formatDate } from '@/lib/utils';
import { useAuthStore } from '@/stores';
import type {
  CreateMonitoringAlertRulePayload,
  CreateMonitoringSloPayload,
  MonitoringAlertSeverity,
  MonitoringAlertRuleStatus,
  MonitoringDimension,
  MonitoringHealthLevel,
  MonitoringIncidentStatus,
  MonitoringSloStatus,
} from '@/types';

const LEVEL_TONE: Record<MonitoringHealthLevel, StatusTone> = {
  HEALTHY: 'success',
  DEGRADED: 'warning',
  UNHEALTHY: 'danger',
  OFFLINE: 'danger',
  MAINTENANCE: 'info',
  UNKNOWN: 'neutral',
};

const DIMENSION_OPTIONS: { value: MonitoringDimension; label: string }[] = [
  { value: 'AVAILABILITY', label: 'Availability' },
  { value: 'LATENCY', label: 'Latency' },
  { value: 'THROUGHPUT', label: 'Throughput' },
  { value: 'ERROR_RATE', label: 'Error rate' },
  { value: 'SATURATION', label: 'Saturation' },
  { value: 'QUEUE_BACKLOG', label: 'Queue backlog' },
];

const SLO_STATUS_OPTIONS: { value: MonitoringSloStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PAUSED', label: 'Paused' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const ALERT_RULE_STATUS_OPTIONS: { value: MonitoringAlertRuleStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PAUSED', label: 'Paused' },
];

const SEVERITY_OPTIONS: { value: MonitoringAlertSeverity; label: string }[] = [
  { value: 'WARNING', label: 'Warning' },
  { value: 'CRITICAL', label: 'Critical' },
];

const INCIDENT_STATUS_OPTIONS: { value: MonitoringIncidentStatus; label: string }[] = [
  { value: 'OPEN', label: 'Open' },
  { value: 'ACKNOWLEDGED', label: 'Acknowledged' },
  { value: 'RESOLVED', label: 'Resolved' },
];

export default function MonitoringFrameworkPage() {
  return (
    <div>
      <PageHeader title="Monitoring Framework" description="Normalized health signals, SLIs/SLOs, alert rules, incidents and correlation traces across every monitored source." />
      <Tabs defaultValue="dashboards">
        <TabsList>
          <TabsTrigger value="dashboards">Dashboards</TabsTrigger>
          <TabsTrigger value="slos">SLOs</TabsTrigger>
          <TabsTrigger value="alert-rules">Alert Rules</TabsTrigger>
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
          <TabsTrigger value="correlation">Correlation Trace</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboards">
          <DashboardsTab />
        </TabsContent>
        <TabsContent value="slos">
          <SlosTab />
        </TabsContent>
        <TabsContent value="alert-rules">
          <AlertRulesTab />
        </TabsContent>
        <TabsContent value="incidents">
          <IncidentsTab />
        </TabsContent>
        <TabsContent value="correlation">
          <CorrelationTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DashboardsTab() {
  const workspaceId = useAuthStore((s) => s.user?.workspaceId);
  const workspace = useWorkspaceHealth();
  const platform = usePlatformHealth();
  const cascading = useDetectCascadingFailures();

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <SignalCard title="Workspace" query={workspace} onRunDetection={workspaceId ? () => cascading.mutate(workspaceId) : undefined} detecting={cascading.isPending} />
      <SignalCard title="Platform" query={platform} />
    </div>
  );
}

function SignalCard({
  title,
  query,
  onRunDetection,
  detecting,
}: {
  title: string;
  query: { isLoading: boolean; data?: { overallLevel: MonitoringHealthLevel; sources: { sourceKey: string; service?: string; provider?: string; region?: string; level: MonitoringHealthLevel; latencyMs?: number; errorRate?: number; queueBacklog?: number; message?: string }[]; openIncidentCount: number; generatedAt: string } };
  onRunDetection?: () => void;
  detecting?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            {title}
            {query.data && <StatusBadge status={query.data.overallLevel} tone={LEVEL_TONE[query.data.overallLevel]} />}
          </span>
          {onRunDetection && (
            <Button size="sm" variant="outline" onClick={onRunDetection} disabled={detecting}>
              {detecting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Detect cascading failures
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : !query.data || query.data.sources.length === 0 ? (
          <EmptyState title="No monitored sources" className="border-none py-6" />
        ) : (
          <div className="space-y-2">
            {query.data.sources.map((s, i) => (
              <div key={`${s.sourceKey}-${i}`} className="flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <span className="text-foreground">{s.service ?? s.sourceKey}</span>
                  {s.provider && <span className="ml-1.5 text-xs text-muted-foreground">{s.provider}</span>}
                  {s.region && <span className="ml-1.5 text-xs text-muted-foreground">{s.region}</span>}
                  {(s.latencyMs != null || s.errorRate != null || s.queueBacklog != null) && (
                    <p className="text-xs text-muted-foreground">
                      {s.latencyMs != null && `${s.latencyMs}ms `}
                      {s.errorRate != null && `${(s.errorRate * 100).toFixed(1)}% errors `}
                      {s.queueBacklog != null && `${s.queueBacklog} backlog`}
                    </p>
                  )}
                </div>
                <StatusBadge status={s.level} tone={LEVEL_TONE[s.level]} className="shrink-0" />
              </div>
            ))}
            <p className="pt-2 text-xs text-muted-foreground">
              {query.data.openIncidentCount} open incident{query.data.openIncidentCount === 1 ? '' : 's'} · generated {formatDate(query.data.generatedAt)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SlosTab() {
  const [service, setService] = useState('');
  const [status, setStatus] = useState<MonitoringSloStatus | ''>('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading } = useMonitoringSlos({ service: service || undefined, status: status || undefined, page, limit: 20 });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <FilterBar hasActiveFilters={!!service || !!status} onClearFilters={() => { setService(''); setStatus(''); setPage(1); }}>
          <Input value={service} onChange={(e) => { setService(e.target.value); setPage(1); }} placeholder="Service" className="h-9 w-40" />
          <Select value={status} onChange={(e) => { setStatus(e.target.value as MonitoringSloStatus | ''); setPage(1); }} placeholder="All statuses" options={SLO_STATUS_OPTIONS} className="h-9 w-36" />
        </FilterBar>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Create SLO
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No SLOs found" />
      ) : (
        <>
          <div className="space-y-2">
            {data.data.map((slo) => (
              <SloRow key={slo.id} slo={slo} />
            ))}
          </div>
          {data.total > 0 && <Pagination page={page} limit={20} total={data.total} totalPages={Math.ceil(data.total / 20)} onPageChange={setPage} onLimitChange={() => {}} />}
        </>
      )}

      <CreateSloDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function SloRow({ slo }: { slo: { id: string; service: string; dimension: string; targetValue: number; warningThreshold: number; criticalThreshold: number; windowMinutes: number; status: MonitoringSloStatus } }) {
  const activate = useActivateMonitoringSlo(slo.id);
  const pause = usePauseMonitoringSlo(slo.id);
  const archive = useArchiveMonitoringSlo(slo.id);
  const restore = useRestoreMonitoringSlo(slo.id);

  const actions: ActionMenuItem[] = [];
  if (slo.status === 'DRAFT' || slo.status === 'PAUSED') actions.push({ label: 'Activate', onSelect: () => activate.mutate() });
  if (slo.status === 'ACTIVE') actions.push({ label: 'Pause', onSelect: () => pause.mutate() });
  if (slo.status !== 'ARCHIVED') actions.push({ label: 'Archive', onSelect: () => archive.mutate(), destructive: true, separatorBefore: true });
  if (slo.status === 'ARCHIVED') actions.push({ label: 'Restore', onSelect: () => restore.mutate() });

  return (
    <div className="rounded-[var(--radius)] border border-border p-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-medium text-foreground">
          {slo.service} · {slo.dimension}
        </span>
        <div className="flex items-center gap-2">
          <StatusBadge status={slo.status} />
          <ActionMenu items={actions} />
        </div>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Target {slo.targetValue} · Warning {slo.warningThreshold} · Critical {slo.criticalThreshold} · window {slo.windowMinutes}m
      </p>
    </div>
  );
}

function CreateSloDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const create = useCreateMonitoringSlo();
  const [form, setForm] = useState<CreateMonitoringSloPayload>({ service: '', dimension: 'AVAILABILITY', targetValue: 0, warningThreshold: 0, criticalThreshold: 0 });
  const reset = () => setForm({ service: '', dimension: 'AVAILABILITY', targetValue: 0, warningThreshold: 0, criticalThreshold: 0 });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Create SLO</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Service" htmlFor="slo-service" required>
            <Input id="slo-service" value={form.service} onChange={(e) => setForm((f) => ({ ...f, service: e.target.value }))} />
          </FormField>
          <FormField label="Dimension" htmlFor="slo-dimension" required>
            <Select id="slo-dimension" value={form.dimension} onChange={(e) => setForm((f) => ({ ...f, dimension: e.target.value as MonitoringDimension }))} options={DIMENSION_OPTIONS} />
          </FormField>
          <FormField label="Target value" htmlFor="slo-target" required>
            <Input id="slo-target" type="number" value={form.targetValue || ''} onChange={(e) => setForm((f) => ({ ...f, targetValue: Number(e.target.value) }))} />
          </FormField>
          <FormField label="Window (minutes)" htmlFor="slo-window">
            <Input id="slo-window" type="number" value={form.windowMinutes ?? ''} onChange={(e) => setForm((f) => ({ ...f, windowMinutes: e.target.value ? Number(e.target.value) : undefined }))} />
          </FormField>
          <FormField label="Warning threshold" htmlFor="slo-warning" required>
            <Input id="slo-warning" type="number" value={form.warningThreshold || ''} onChange={(e) => setForm((f) => ({ ...f, warningThreshold: Number(e.target.value) }))} />
          </FormField>
          <FormField label="Critical threshold" htmlFor="slo-critical" required>
            <Input id="slo-critical" type="number" value={form.criticalThreshold || ''} onChange={(e) => setForm((f) => ({ ...f, criticalThreshold: Number(e.target.value) }))} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => create.mutate(form, { onSuccess: () => { onOpenChange(false); reset(); } })} disabled={!form.service || create.isPending}>
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AlertRulesTab() {
  const [sourceKey, setSourceKey] = useState('');
  const [status, setStatus] = useState<MonitoringAlertRuleStatus | ''>('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading } = useMonitoringAlertRules({ sourceKey: sourceKey || undefined, status: status || undefined, page, limit: 20 });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <FilterBar hasActiveFilters={!!sourceKey || !!status} onClearFilters={() => { setSourceKey(''); setStatus(''); setPage(1); }}>
          <Input value={sourceKey} onChange={(e) => { setSourceKey(e.target.value); setPage(1); }} placeholder="Source key" className="h-9 w-44" />
          <Select value={status} onChange={(e) => { setStatus(e.target.value as MonitoringAlertRuleStatus | ''); setPage(1); }} placeholder="All statuses" options={ALERT_RULE_STATUS_OPTIONS} className="h-9 w-36" />
        </FilterBar>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Create alert rule
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No alert rules found" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Last triggered</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((rule) => (
                <AlertRuleRow key={rule.id} rule={rule} />
              ))}
            </TableBody>
          </Table>
          {data.total > 0 && <Pagination page={page} limit={20} total={data.total} totalPages={Math.ceil(data.total / 20)} onPageChange={setPage} onLimitChange={() => {}} />}
        </>
      )}

      <CreateAlertRuleDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function AlertRuleRow({ rule }: { rule: { id: string; sourceKey: string; conditionField: string; conditionOperator: string; severity: MonitoringAlertSeverity; lastTriggeredAt?: string | null; status: MonitoringAlertRuleStatus } }) {
  const activate = useActivateMonitoringAlertRule(rule.id);
  const pause = usePauseMonitoringAlertRule(rule.id);

  const actions: ActionMenuItem[] = [];
  if (rule.status === 'PAUSED') actions.push({ label: 'Activate', onSelect: () => activate.mutate() });
  if (rule.status === 'ACTIVE') actions.push({ label: 'Pause', onSelect: () => pause.mutate() });

  return (
    <TableRow>
      <TableCell className="text-sm font-medium text-foreground">{rule.sourceKey}</TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {rule.conditionField} {rule.conditionOperator}
      </TableCell>
      <TableCell>
        <StatusBadge status={rule.severity} tone={rule.severity === 'CRITICAL' ? 'danger' : 'warning'} />
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{rule.lastTriggeredAt ? formatDate(rule.lastTriggeredAt) : 'Never'}</TableCell>
      <TableCell>
        <StatusBadge status={rule.status} />
      </TableCell>
      <TableCell>
        <ActionMenu items={actions} />
      </TableCell>
    </TableRow>
  );
}

function CreateAlertRuleDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const create = useCreateMonitoringAlertRule();
  const [form, setForm] = useState<CreateMonitoringAlertRulePayload>({
    sourceKey: '',
    conditionField: '',
    conditionOperator: 'GREATER_THAN',
    conditionValue: '',
    severity: 'WARNING',
  });
  const reset = () => setForm({ sourceKey: '', conditionField: '', conditionOperator: 'GREATER_THAN', conditionValue: '', severity: 'WARNING' });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Create alert rule</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Source key" htmlFor="ar-source" required>
            <Input id="ar-source" value={form.sourceKey} onChange={(e) => setForm((f) => ({ ...f, sourceKey: e.target.value }))} />
          </FormField>
          <FormField label="Severity" htmlFor="ar-severity" required>
            <Select id="ar-severity" value={form.severity} onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value as MonitoringAlertSeverity }))} options={SEVERITY_OPTIONS} />
          </FormField>
          <FormField label="Condition field" htmlFor="ar-field" required>
            <Input id="ar-field" value={form.conditionField} onChange={(e) => setForm((f) => ({ ...f, conditionField: e.target.value }))} placeholder="errorRate" />
          </FormField>
          <FormField label="Operator" htmlFor="ar-operator" required>
            <Input id="ar-operator" value={form.conditionOperator} onChange={(e) => setForm((f) => ({ ...f, conditionOperator: e.target.value }))} placeholder="GREATER_THAN" />
          </FormField>
          <div className="col-span-2">
            <FormField label="Threshold value" htmlFor="ar-value" required>
              <Input id="ar-value" value={String(form.conditionValue ?? '')} onChange={(e) => setForm((f) => ({ ...f, conditionValue: e.target.value }))} />
            </FormField>
          </div>
          <FormField label="Cooldown (minutes)" htmlFor="ar-cooldown">
            <Input id="ar-cooldown" type="number" value={form.cooldownMinutes ?? ''} onChange={(e) => setForm((f) => ({ ...f, cooldownMinutes: e.target.value ? Number(e.target.value) : undefined }))} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => create.mutate(form, { onSuccess: () => { onOpenChange(false); reset(); } })}
            disabled={!form.sourceKey || !form.conditionField || !form.conditionOperator || create.isPending}
          >
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function IncidentsTab() {
  const [status, setStatus] = useState<MonitoringIncidentStatus | ''>('');
  const [severity, setSeverity] = useState<MonitoringAlertSeverity | ''>('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useMonitoringIncidents({ status: status || undefined, severity: severity || undefined, page, limit: 20 });

  return (
    <div>
      <div className="mb-4">
        <FilterBar hasActiveFilters={!!status || !!severity} onClearFilters={() => { setStatus(''); setSeverity(''); setPage(1); }}>
          <Select value={status} onChange={(e) => { setStatus(e.target.value as MonitoringIncidentStatus | ''); setPage(1); }} placeholder="All statuses" options={INCIDENT_STATUS_OPTIONS} className="h-9 w-40" />
          <Select value={severity} onChange={(e) => { setSeverity(e.target.value as MonitoringAlertSeverity | ''); setPage(1); }} placeholder="All severities" options={SEVERITY_OPTIONS} className="h-9 w-36" />
        </FilterBar>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No incidents found" />
      ) : (
        <>
          <div className="space-y-2">
            {data.data.map((inc) => (
              <IncidentRow key={inc.id} incident={inc} />
            ))}
          </div>
          {data.total > 0 && <Pagination page={page} limit={20} total={data.total} totalPages={Math.ceil(data.total / 20)} onPageChange={setPage} onLimitChange={() => {}} />}
        </>
      )}
    </div>
  );
}

function IncidentRow({
  incident,
}: {
  incident: { id: string; title: string; service?: string | null; severity: MonitoringAlertSeverity; status: MonitoringIncidentStatus; openedAt: string; resolvedAt?: string | null; correlationId?: string | null };
}) {
  const acknowledge = useAcknowledgeMonitoringIncident(incident.id);
  const resolve = useResolveMonitoringIncident(incident.id);
  const [resolveOpen, setResolveOpen] = useState(false);

  const actions: ActionMenuItem[] = [];
  if (incident.status === 'OPEN') actions.push({ label: 'Acknowledge', onSelect: () => acknowledge.mutate() });
  if (incident.status !== 'RESOLVED') actions.push({ label: 'Resolve', onSelect: () => setResolveOpen(true) });

  return (
    <div className="rounded-[var(--radius)] border border-border p-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-medium text-foreground">{incident.title}</span>
        <div className="flex items-center gap-2">
          <StatusBadge status={incident.severity} tone={incident.severity === 'CRITICAL' ? 'danger' : 'warning'} />
          <StatusBadge status={incident.status} />
          {actions.length > 0 && <ActionMenu items={actions} />}
        </div>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {incident.service ? `${incident.service} · ` : ''}
        opened {formatDate(incident.openedAt)}
        {incident.correlationId ? ` · correlation ${incident.correlationId}` : ''}
      </p>
      <ReasonDialog open={resolveOpen} onOpenChange={setResolveOpen} title="Resolve this incident" label="Resolution" confirmLabel="Resolve" pending={resolve.isPending} onSubmit={(resolution) => resolve.mutate({ resolution }, { onSuccess: () => setResolveOpen(false) })} />
    </div>
  );
}

function CorrelationTab() {
  const [correlationId, setCorrelationId] = useState('');
  const [searched, setSearched] = useState('');
  const { data, isLoading } = useMonitoringCorrelationTrace(searched || undefined);

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-end gap-2">
        <FormField label="Correlation ID" htmlFor="corr-id">
          <Input id="corr-id" value={correlationId} onChange={(e) => setCorrelationId(e.target.value)} className="h-9 w-72" />
        </FormField>
        <Button size="sm" onClick={() => setSearched(correlationId)} disabled={!correlationId}>
          Trace
        </Button>
      </div>
      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : !searched ? (
        <p className="text-sm text-muted-foreground">Enter a correlation ID to view its cross-module trace.</p>
      ) : !data || data.length === 0 ? (
        <EmptyState title="No events found for this correlation ID" />
      ) : (
        <ul className="space-y-2">
          {data.map((ev) => (
            <li key={ev.id} className="rounded-[var(--radius)] border border-border p-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">
                  {ev.module} · {ev.eventType}
                </span>
                <span className="text-xs text-muted-foreground">{formatDate(ev.occurredAt)}</span>
              </div>
              {ev.refId && <p className="mt-1 text-xs text-muted-foreground">ref: {ev.refId}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
