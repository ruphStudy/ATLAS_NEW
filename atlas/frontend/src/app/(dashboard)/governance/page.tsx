'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowRight, Ban, Clock3, ShieldAlert } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/states';
import { StatusBadge } from '@/components/ui/status-badge';
import { KpiCard } from '@/components/ui/kpi-card';
import { useApprovalRequests, useComplianceRecords, useEnterpriseWorkflowExecutions, useRuleExecutions } from '@/hooks';
import { formatDate } from '@/lib/utils';

export default function GovernancePage() {
  const pending = useApprovalRequests({ status: 'PENDING', limit: 1 });
  const expiredApprovals = useApprovalRequests({ status: 'EXPIRED', limit: 5 });
  const changesRequested = useApprovalRequests({ status: 'CHANGES_REQUESTED', limit: 1 });
  const recentRequests = useApprovalRequests({ sortBy: 'createdAt', sortOrder: 'desc', limit: 20 });
  const failedWorkflows = useEnterpriseWorkflowExecutions({ status: 'FAILED', limit: 5 });
  const blockedRules = useRuleExecutions({ status: 'BLOCKED', limit: 5 });
  const failedRules = useRuleExecutions({ status: 'FAILED', limit: 1 });
  const expiredCompliance = useComplianceRecords({ status: 'EXPIRED', limit: 5 });
  const rejectedCompliance = useComplianceRecords({ status: 'REJECTED', limit: 1 });

  const highRiskRequests = (recentRequests.data?.data ?? []).filter((r) => r.riskLevel === 'HIGH' || r.riskLevel === 'CRITICAL');

  return (
    <div>
      <PageHeader title="Governance Dashboard" description="Approvals, workflow failures, policy violations, compliance issues and high-risk actions across the organization." />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Pending approvals" value={pending.isLoading ? '—' : String(pending.data?.total ?? 0)} icon={Clock3} />
        <KpiCard label="High-risk requests (recent)" value={recentRequests.isLoading ? '—' : String(highRiskRequests.length)} icon={ShieldAlert} />
        <KpiCard label="Failed workflow executions" value={failedWorkflows.isLoading ? '—' : String(failedWorkflows.data?.total ?? 0)} icon={Ban} />
        <KpiCard label="Compliance issues" value={rejectedCompliance.isLoading ? '—' : String((rejectedCompliance.data?.total ?? 0) + (expiredCompliance.data?.total ?? 0))} icon={AlertTriangle} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <GovernanceCard title="High-risk approval requests" href="/approval-workflow" loading={recentRequests.isLoading} empty={highRiskRequests.length === 0} emptyLabel="No high-risk requests among recent activity">
          {highRiskRequests.slice(0, 5).map((r) => (
            <li key={r.id} className="flex items-center justify-between border-b border-border py-2 text-sm last:border-0">
              <div>
                <p className="text-foreground">{r.title}</p>
                <p className="text-xs text-muted-foreground">{r.module} · {r.riskLevel}</p>
              </div>
              <StatusBadge status={r.status} />
            </li>
          ))}
        </GovernanceCard>

        <GovernanceCard title="Expired approval requests" href="/approval-workflow" loading={expiredApprovals.isLoading} empty={(expiredApprovals.data?.data ?? []).length === 0} emptyLabel="No expired approvals">
          {(expiredApprovals.data?.data ?? []).map((r) => (
            <li key={r.id} className="flex items-center justify-between border-b border-border py-2 text-sm last:border-0">
              <div>
                <p className="text-foreground">{r.title}</p>
                <p className="text-xs text-muted-foreground">{r.module}</p>
              </div>
              <span className="text-xs text-muted-foreground">{r.slaDueAt ? formatDate(r.slaDueAt) : '—'}</span>
            </li>
          ))}
        </GovernanceCard>

        <GovernanceCard title="Failed workflow executions" href="/enterprise-workflow-engine" loading={failedWorkflows.isLoading} empty={(failedWorkflows.data?.data ?? []).length === 0} emptyLabel="No failed workflow executions">
          {(failedWorkflows.data?.data ?? []).map((e) => (
            <li key={e.id} className="flex items-center justify-between border-b border-border py-2 text-sm last:border-0">
              <div>
                <p className="text-foreground">{e.id}</p>
                <p className="text-xs text-muted-foreground">{e.errorMessage ?? 'No error message recorded'}</p>
              </div>
              <span className="text-xs text-muted-foreground">{formatDate(e.startTime)}</span>
            </li>
          ))}
        </GovernanceCard>

        <GovernanceCard
          title="Blocked / policy-violating rule executions"
          href="/business-rules"
          loading={blockedRules.isLoading}
          empty={(blockedRules.data?.data ?? []).length === 0 && (failedRules.data?.total ?? 0) === 0}
          emptyLabel="No policy violations recorded"
        >
          {(blockedRules.data?.data ?? []).map((e) => (
            <li key={e.id} className="flex items-center justify-between border-b border-border py-2 text-sm last:border-0">
              <div>
                <p className="text-foreground">{e.ruleId}</p>
                <p className="text-xs text-muted-foreground">{e.module} {e.entityType ? `· ${e.entityType}` : ''}</p>
              </div>
              <StatusBadge status={e.status} tone="warning" />
            </li>
          ))}
        </GovernanceCard>

        <GovernanceCard title="Expired compliance records" href="/compliance" loading={expiredCompliance.isLoading} empty={(expiredCompliance.data?.data ?? []).length === 0} emptyLabel="No expired compliance records">
          {(expiredCompliance.data?.data ?? []).map((rec) => (
            <li key={rec.id} className="flex items-center justify-between border-b border-border py-2 text-sm last:border-0">
              <div>
                <p className="text-foreground">{rec.ruleKey}</p>
                <p className="text-xs text-muted-foreground">{rec.subjectType} · {rec.subjectId}</p>
              </div>
              <span className="text-xs text-muted-foreground">{rec.expiresAt ? formatDate(rec.expiresAt) : '—'}</span>
            </li>
          ))}
        </GovernanceCard>

        <GovernanceCard title="Changes-requested approvals" href="/approval-workflow" loading={changesRequested.isLoading} empty={(changesRequested.data?.total ?? 0) === 0} emptyLabel="Nothing awaiting resubmission">
          <li className="py-2 text-sm text-muted-foreground">{changesRequested.data?.total ?? 0} request(s) awaiting resubmission after changes were requested.</li>
        </GovernanceCard>
      </div>
    </div>
  );
}

function GovernanceCard({
  title,
  href,
  loading,
  empty,
  emptyLabel,
  children,
}: {
  title: string;
  href: string;
  loading: boolean;
  empty: boolean;
  emptyLabel: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-sm">
          <span>{title}</span>
          <Link href={href} className="flex items-center gap-1 text-xs font-normal text-primary hover:underline">
            View all
            <ArrowRight className="h-3 w-3" />
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-24 w-full" /> : empty ? <EmptyState title={emptyLabel} className="border-none py-6" /> : <ul>{children}</ul>}
      </CardContent>
    </Card>
  );
}
