'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KpiCard } from '@/components/ui/kpi-card';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { StatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/states';
import {
  useCheckAllModules,
  useCheckModule,
  usePlatformHealthSummary,
  usePlatformIncidents,
  useSaasHealthCheckLogs,
  useSaasMonitoringIncidents,
  useTenantHealthSummary,
} from '@/hooks';
import { formatDate } from '@/lib/utils';
import type { SaasHealthIncidentStatus, SaasHealthModuleKey, SaasHealthStatus } from '@/types';
import { PlatformAdminGuard } from '@/components/auth/platform-admin-guard';

const MODULE_OPTIONS: { value: SaasHealthModuleKey; label: string }[] = [
  { value: 'SUBSCRIPTION_MANAGEMENT', label: 'Subscription Management' },
  { value: 'BILLING_ENGINE', label: 'Billing Engine' },
  { value: 'PAYMENT_PROVIDER', label: 'Payment Provider' },
  { value: 'USAGE_TRACKING', label: 'Usage Tracking' },
  { value: 'QUOTA_MANAGEMENT', label: 'Quota Management' },
  { value: 'FEATURE_FLAGS', label: 'Feature Flags' },
  { value: 'LICENSE_MANAGEMENT', label: 'License Management' },
  { value: 'API_KEY_MANAGEMENT', label: 'API Key Management' },
  { value: 'OAUTH_MANAGEMENT', label: 'OAuth Management' },
  { value: 'SSO_FRAMEWORK', label: 'SSO Framework' },
  { value: 'WEBHOOK_FRAMEWORK', label: 'Webhook Framework' },
  { value: 'APP_STORE', label: 'App Store' },
  { value: 'PLUGIN_FRAMEWORK', label: 'Plugin Framework' },
  { value: 'SAAS_ADMINISTRATION', label: 'SaaS Administration' },
  { value: 'SAAS_AUDIT', label: 'SaaS Audit' },
];

const HEALTH_TONE: Record<SaasHealthStatus, 'success' | 'warning' | 'danger'> = {
  HEALTHY: 'success',
  DEGRADED: 'warning',
  UNHEALTHY: 'danger',
};

const INCIDENT_STATUS_OPTIONS: { value: SaasHealthIncidentStatus; label: string }[] = [
  { value: 'OPEN', label: 'Open' },
  { value: 'RESOLVED', label: 'Resolved' },
];

export default function SaasMonitoringPage() {
  return (
    <PlatformAdminGuard>
      <SaasMonitoringPageContent />
    </PlatformAdminGuard>
  );
}

function SaasMonitoringPageContent() {
  const platformSummary = usePlatformHealthSummary();
  const tenantSummary = useTenantHealthSummary();
  const checkAll = useCheckAllModules();
  const checkModule = useCheckModule();
  const [selectedModule, setSelectedModule] = useState<SaasHealthModuleKey>('BILLING_ENGINE');

  return (
    <div>
      <PageHeader
        title="SaaS Monitoring"
        description="Cross-tenant health for tenant provisioning, billing, payments, APIs, webhooks, OAuth, SSO, apps and plugins."
        actions={
          <Button variant="outline" onClick={() => checkAll.mutate()} disabled={checkAll.isPending}>
            <RefreshCw className="h-4 w-4" />
            Check all modules
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Platform status" value={platformSummary.data?.overallStatus ?? '—'} loading={platformSummary.isLoading} />
        <KpiCard label="Tenants checked" value={platformSummary.data?.tenantsChecked ?? 0} loading={platformSummary.isLoading} />
        <KpiCard label="Your tenant status" value={tenantSummary.data?.overallStatus ?? '—'} loading={tenantSummary.isLoading} />
        <KpiCard label="Your modules checked" value={tenantSummary.data?.modules.length ?? 0} loading={tenantSummary.isLoading} />
      </div>

      <Tabs defaultValue="modules">
        <TabsList>
          <TabsTrigger value="modules">Module Breakdown</TabsTrigger>
          <TabsTrigger value="tenant">Your Tenant Modules</TabsTrigger>
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
          <TabsTrigger value="platform-incidents">Platform Incidents</TabsTrigger>
          <TabsTrigger value="check-logs">Check Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="modules">
          {platformSummary.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : !platformSummary.data || Object.keys(platformSummary.data.moduleBreakdown).length === 0 ? (
            <EmptyState title="No module breakdown yet" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Module</TableHead>
                  <TableHead>Healthy</TableHead>
                  <TableHead>Degraded</TableHead>
                  <TableHead>Unhealthy</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(platformSummary.data.moduleBreakdown).map(([module, breakdown]) => (
                  <TableRow key={module}>
                    <TableCell className="text-sm font-medium text-foreground">{module}</TableCell>
                    <TableCell className="text-sm text-success">{breakdown.healthy}</TableCell>
                    <TableCell className="text-sm text-warning">{breakdown.degraded}</TableCell>
                    <TableCell className="text-sm text-danger">{breakdown.unhealthy}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="tenant">
          <div className="mb-3 flex items-end gap-2">
            <Select value={selectedModule} onChange={(e) => setSelectedModule(e.target.value as SaasHealthModuleKey)} options={MODULE_OPTIONS} className="h-9 w-56" />
            <Button variant="outline" size="sm" onClick={() => checkModule.mutate(selectedModule)} disabled={checkModule.isPending}>
              Check module
            </Button>
          </div>
          {tenantSummary.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : !tenantSummary.data || tenantSummary.data.modules.length === 0 ? (
            <EmptyState title="No module checks yet" description="Run a check to populate this list." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tenantSummary.data.modules.map((snap) => (
                <Card key={snap.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-sm">
                      <span>{snap.module}</span>
                      <StatusBadge status={snap.status} tone={HEALTH_TONE[snap.status]} />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm text-muted-foreground">
                    <p>Queue backlog: {snap.queueBacklog}</p>
                    <p>Failed jobs: {snap.queueFailedCount}</p>
                    <p>Audit failures: {snap.auditFailureCount}</p>
                    <p>Last checked: {formatDate(snap.lastCheckedAt)}</p>
                    {snap.safeSummary && <p className="text-xs">{snap.safeSummary}</p>}
                    {snap.issues.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {snap.issues.map((issue, i) => (
                          <li key={i} className="text-xs text-warning">{issue.tag}: {issue.message}</li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="incidents">
          <TenantIncidentsList />
        </TabsContent>

        <TabsContent value="platform-incidents">
          <PlatformIncidentsList />
        </TabsContent>

        <TabsContent value="check-logs">
          <CheckLogsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TenantIncidentsList() {
  const [status, setStatus] = useState<SaasHealthIncidentStatus | ''>('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useSaasMonitoringIncidents({ status: status || undefined, page, limit: 20 });
  return <IncidentsListView status={status} setStatus={setStatus} page={page} setPage={setPage} data={data} isLoading={isLoading} />;
}

function PlatformIncidentsList() {
  const [status, setStatus] = useState<SaasHealthIncidentStatus | ''>('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = usePlatformIncidents({ status: status || undefined, page, limit: 20 });
  return <IncidentsListView status={status} setStatus={setStatus} page={page} setPage={setPage} data={data} isLoading={isLoading} />;
}

function IncidentsListView({
  status,
  setStatus,
  page,
  setPage,
  data,
  isLoading,
}: {
  status: SaasHealthIncidentStatus | '';
  setStatus: (s: SaasHealthIncidentStatus | '') => void;
  page: number;
  setPage: (p: number) => void;
  data: ReturnType<typeof useSaasMonitoringIncidents>['data'];
  isLoading: boolean;
}) {
  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Select value={status} onChange={(e) => { setStatus(e.target.value as SaasHealthIncidentStatus | ''); setPage(1); }} placeholder="All statuses" options={INCIDENT_STATUS_OPTIONS} className="h-9 w-40" />
      </div>
      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No incidents" />
      ) : (
        <>
          <div className="space-y-2">
            {data.data.map((inc) => (
              <div key={inc.id} className="rounded-[var(--radius)] border border-border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{inc.module}</span>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={inc.severity} tone={HEALTH_TONE[inc.severity]} />
                    <StatusBadge status={inc.status} />
                  </div>
                </div>
                <p className="mt-1 text-muted-foreground">{inc.triggerSummary}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Opened {formatDate(inc.openedAt)}{inc.resolvedAt ? ` · Resolved ${formatDate(inc.resolvedAt)}` : ''}
                </p>
              </div>
            ))}
          </div>
          {data.total > 0 && <Pagination page={page} limit={20} total={data.total} totalPages={data.totalPages} onPageChange={setPage} onLimitChange={() => {}} />}
        </>
      )}
    </div>
  );
}

function CheckLogsTab() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useSaasHealthCheckLogs({ page, limit: 20 });

  return isLoading ? (
    <Skeleton className="h-64 w-full" />
  ) : !data || data.data.length === 0 ? (
    <EmptyState title="No check logs yet" />
  ) : (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Module</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Trigger</TableHead>
            <TableHead>Queue backlog</TableHead>
            <TableHead>Checked at</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.data.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="text-sm text-foreground">{log.module}</TableCell>
              <TableCell>
                <StatusBadge status={log.status} tone={HEALTH_TONE[log.status]} />
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{log.trigger}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{log.queueBacklog}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{formatDate(log.checkedAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {data.total > 0 && <Pagination page={page} limit={20} total={data.total} totalPages={data.totalPages} onPageChange={setPage} onLimitChange={() => {}} />}
    </>
  );
}
