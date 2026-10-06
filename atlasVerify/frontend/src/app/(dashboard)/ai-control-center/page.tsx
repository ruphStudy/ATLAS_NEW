'use client';

import { useState } from 'react';
import { AlertTriangle, Bot, DollarSign, Gauge, ListChecks, Workflow as WorkflowIcon, Zap } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KpiCard } from '@/components/ui/kpi-card';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/states';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  useAgentStats,
  useAiRequests,
  useCostSummary,
  useGuardrailStats,
  useJobSchedulerStats,
  useOrchestratorStats,
  useUsageSummary,
  useWorkflowStats,
  useWorkspaceHealthSummary,
} from '@/hooks';
import { useAuthStore } from '@/stores';
import { formatCurrency, formatDate } from '@/lib/utils';

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default function AiControlCenterPage() {
  const workspaceId = useAuthStore((s) => s.user?.workspaceId);
  const [startDate, setStartDate] = useState(isoDaysAgo(30));
  const [endDate, setEndDate] = useState(isoDaysAgo(0));

  const orchestratorStats = useOrchestratorStats(workspaceId, startDate, endDate);
  const agentStats = useAgentStats(workspaceId, startDate, endDate);
  const workflowStats = useWorkflowStats(workspaceId, startDate, endDate);
  const jobStats = useJobSchedulerStats(workspaceId, startDate, endDate);
  const guardrailStats = useGuardrailStats(workspaceId, startDate, endDate);
  const healthSummary = useWorkspaceHealthSummary(workspaceId, startDate, endDate);
  const costSummary = useCostSummary({ workspaceId: workspaceId ?? '', startDate, endDate });
  const usageSummary = useUsageSummary({ workspaceId: workspaceId ?? '', startDate, endDate });
  const recentRequests = useAiRequests({ workspaceId, limit: 10 });

  const currency = 'USD';

  return (
    <div>
      <PageHeader title="AI Control Center" description="Provider/model health, requests, cost, token usage, failures and automation status." />

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <FormField label="Start date" htmlFor="cc-start">
          <Input id="cc-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9" />
        </FormField>
        <FormField label="End date" htmlFor="cc-end">
          <Input id="cc-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9" />
        </FormField>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Total requests" value={orchestratorStats.data?.totalRequests ?? 0} icon={Zap} loading={orchestratorStats.isLoading} />
        <KpiCard label="Failed requests" value={orchestratorStats.data?.failedRequests ?? 0} icon={AlertTriangle} loading={orchestratorStats.isLoading} />
        <KpiCard label="Total cost" value={costSummary.data ? formatCurrency(costSummary.data.totalCost, currency) : '—'} icon={DollarSign} loading={costSummary.isLoading} />
        <KpiCard label="Total tokens" value={usageSummary.data?.totalTokens ?? 0} icon={Gauge} loading={usageSummary.isLoading} />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Agent executions" value={agentStats.data?.totalExecutions ?? 0} icon={Bot} loading={agentStats.isLoading} />
        <KpiCard label="Workflow executions" value={workflowStats.data?.totalExecutions ?? 0} icon={WorkflowIcon} loading={workflowStats.isLoading} />
        <KpiCard label="Scheduled jobs" value={jobStats.data?.totalJobs ?? 0} icon={ListChecks} loading={jobStats.isLoading} />
        <KpiCard label="Active health incidents" value={healthSummary.data?.activeIncidents ?? 0} icon={AlertTriangle} loading={healthSummary.isLoading} />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Guardrail activity</CardTitle>
          </CardHeader>
          <CardContent>
            {guardrailStats.isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : !guardrailStats.data ? (
              <EmptyState title="No guardrail data" className="border-none py-6" />
            ) : (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <Field label="Total evaluations" value={String(guardrailStats.data.totalEvaluations)} />
                <Field label="Blocked" value={String(guardrailStats.data.blocked)} />
                <Field label="Require review" value={String(guardrailStats.data.requireReview)} />
                <Field label="Pending approvals" value={String(guardrailStats.data.pendingApprovals)} />
                <Field label="Open incidents" value={String(guardrailStats.data.openIncidents)} />
                <Field label="Avg risk score" value={guardrailStats.data.avgRiskScore.toFixed(1)} />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Retry / automation status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <Field label="Completed requests" value={String(orchestratorStats.data?.completedRequests ?? 0)} />
              <Field label="Avg latency (ms)" value={String(orchestratorStats.data?.averageLatency ?? 0)} />
              <Field label="Failed jobs" value={jobStats.isLoading ? '—' : 'See Scheduler'} />
              <Field label="Cost total" value={costSummary.data ? formatCurrency(costSummary.data.totalCost, currency) : '—'} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recent AI requests</CardTitle>
        </CardHeader>
        <CardContent>
          {recentRequests.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : !recentRequests.data || recentRequests.data.data.length === 0 ? (
            <EmptyState title="No recent requests" className="border-none py-8" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Use case</TableHead>
                  <TableHead>Capability</TableHead>
                  <TableHead>Provider / model</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentRequests.data.data.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm font-medium text-foreground">{r.useCase}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.capability}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.provider ?? '—'} / {r.modelId ?? '—'}</TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(r.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
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
