'use client';

import { useMemo, useState } from 'react';
import { RefreshCw, AlertTriangle, PauseCircle } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState } from '@/components/ui/states';
import { Pagination } from '@/components/ui/pagination';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { useCheckAllModulesHealth, useCheckModuleHealth, useOperationsHealthCheckLogs, useOperationsHealthIncidents, useOperationsWorkspaceHealthSummary } from '@/hooks';
import { formatDistanceToNow } from '@/lib/utils';
import type { OperationsHealthIncidentStatus, OperationsHealthModuleKey, OperationsHealthSnapshot } from '@/types';

const MODULE_LABELS: Record<string, string> = {
  NOTIFICATIONS: 'Notifications',
  FILE_MANAGEMENT: 'File Management',
  DOCUMENT_MANAGEMENT: 'Document Management',
  APPROVAL_WORKFLOW: 'Approval Workflow',
  TASK_MANAGEMENT: 'Task Management',
  SEARCH_FRAMEWORK: 'Search',
  BUSINESS_RULES_ENGINE: 'Business Rules',
  SETTINGS: 'Settings',
};

const MODULE_OPTIONS = Object.keys(MODULE_LABELS).map((key) => ({ value: key, label: MODULE_LABELS[key] }));

const INCIDENT_STATUS_OPTIONS: { value: OperationsHealthIncidentStatus; label: string }[] = [
  { value: 'OPEN', label: 'Open' },
  { value: 'RESOLVED', label: 'Resolved' },
];

export default function OperationsHealthPage() {
  const summary = useOperationsWorkspaceHealthSummary();
  const checkAll = useCheckAllModulesHealth();
  const checkModule = useCheckModuleHealth();

  return (
    <div>
      <PageHeader
        title="Operations Health"
        description="Notification, approval, task, document, search and rules engine health."
        actions={
          <>
            {summary.data && <StatusBadge status={summary.data.overallStatus} />}
            <Button variant="outline" size="sm" onClick={() => checkAll.mutate()} disabled={checkAll.isPending}>
              <RefreshCw className="h-3.5 w-3.5" />
              Check all
            </Button>
          </>
        }
      />

      {summary.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : summary.isError ? (
        <QueryErrorState refetch={summary.refetch} />
      ) : !summary.data || summary.data.modules.length === 0 ? (
        <EmptyState title="No health data yet" description="Run a check to populate module health snapshots." action={{ label: 'Check all', onClick: () => checkAll.mutate() }} />
      ) : (
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {summary.data.modules.map((snapshot) => (
            <ModuleHealthCard key={snapshot.module} snapshot={snapshot} onRecheck={() => checkModule.mutate(snapshot.module as OperationsHealthModuleKey)} recheckPending={checkModule.isPending} />
          ))}
        </div>
      )}

      <Tabs defaultValue="incidents">
        <TabsList>
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
          <TabsTrigger value="checklog">Check Log</TabsTrigger>
        </TabsList>
        <TabsContent value="incidents">
          <IncidentsTab />
        </TabsContent>
        <TabsContent value="checklog">
          <CheckLogTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ModuleHealthCard({ snapshot, onRecheck, recheckPending }: { snapshot: OperationsHealthSnapshot; onRecheck: () => void; recheckPending: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-sm">
          <span>{MODULE_LABELS[snapshot.module] ?? snapshot.module}</span>
          <StatusBadge status={snapshot.status} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <p className="text-sm font-semibold text-foreground">{snapshot.queueBacklog}</p>
            <p className="text-muted-foreground">Backlog</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{snapshot.queueFailedCount}</p>
            <p className="text-muted-foreground">Failed</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{snapshot.queueActiveCount}</p>
            <p className="text-muted-foreground">Active</p>
          </div>
        </div>

        {snapshot.queuePaused && (
          <p className="flex items-center gap-1 text-xs text-warning">
            <PauseCircle className="h-3 w-3" />
            Queue paused
          </p>
        )}

        {snapshot.issues.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {snapshot.issues.map((issue, i) => (
              <Badge key={i} variant="warning" className="gap-1 text-[9px]">
                <AlertTriangle className="h-2.5 w-2.5" />
                {issue.message}
              </Badge>
            ))}
          </div>
        )}

        {snapshot.safeSummary && <p className="text-xs text-muted-foreground">{snapshot.safeSummary}</p>}

        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] text-muted-foreground">Checked {formatDistanceToNow(snapshot.lastCheckedAt)}</span>
          <Button variant="ghost" size="sm" onClick={onRecheck} disabled={recheckPending}>
            <RefreshCw className="h-3 w-3" />
            Re-check
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function IncidentsTab() {
  const [module, setModule] = useState('');
  const [status, setStatus] = useState<OperationsHealthIncidentStatus | ''>('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const params = useMemo(() => ({ module: module || undefined, status: status || undefined, page, limit }), [module, status, page, limit]);
  const incidents = useOperationsHealthIncidents(params);
  const rows = incidents.data?.data ?? [];

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <Select value={module} onChange={(e) => setModule(e.target.value)} options={[{ value: '', label: 'All modules' }, ...MODULE_OPTIONS]} className="h-9 w-48" />
        <Select value={status} onChange={(e) => setStatus(e.target.value as OperationsHealthIncidentStatus | '')} options={[{ value: '', label: 'All statuses' }, ...INCIDENT_STATUS_OPTIONS]} className="h-9 w-40" />
      </div>

      {incidents.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : incidents.isError ? (
        <QueryErrorState refetch={incidents.refetch} />
      ) : rows.length === 0 ? (
        <EmptyState title="No incidents" description="No health incidents have been recorded." />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Module</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Summary</TableHead>
                <TableHead>Opened</TableHead>
                <TableHead>Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((incident) => (
                <TableRow key={incident.id}>
                  <TableCell className="text-sm text-foreground">{MODULE_LABELS[incident.module] ?? incident.module}</TableCell>
                  <TableCell>
                    <StatusBadge status={incident.severity} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={incident.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{incident.triggerSummary}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(incident.openedAt)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{incident.durationMs != null ? `${Math.round(incident.durationMs / 60000)}m` : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination
            page={incidents.data?.page ?? page}
            limit={incidents.data?.limit ?? limit}
            total={incidents.data?.total ?? 0}
            totalPages={incidents.data?.totalPages ?? 0}
            onPageChange={setPage}
            onLimitChange={(l) => {
              setLimit(l);
              setPage(1);
            }}
          />
        </>
      )}
    </div>
  );
}

function CheckLogTab() {
  const [module, setModule] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const params = useMemo(() => ({ module: module || undefined, page, limit }), [module, page, limit]);
  const logs = useOperationsHealthCheckLogs(params);
  const rows = logs.data?.data ?? [];

  return (
    <div>
      <div className="mb-4">
        <Select value={module} onChange={(e) => setModule(e.target.value)} options={[{ value: '', label: 'All modules' }, ...MODULE_OPTIONS]} className="h-9 w-48" />
      </div>

      {logs.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : logs.isError ? (
        <QueryErrorState refetch={logs.refetch} />
      ) : rows.length === 0 ? (
        <EmptyState title="No check history" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Module</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Backlog</TableHead>
                <TableHead>Failed</TableHead>
                <TableHead>Checked</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm text-foreground">{MODULE_LABELS[log.module] ?? log.module}</TableCell>
                  <TableCell>
                    <StatusBadge status={log.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground capitalize">{log.trigger.toLowerCase()}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{log.queueBacklog}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{log.queueFailedCount}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(log.checkedAt)}</TableCell>
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
    </div>
  );
}
