'use client';

import { useState } from 'react';
import { Download, TrendingDown, TrendingUp, Users, Wallet } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KpiCard } from '@/components/ui/kpi-card';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { StatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/states';
import {
  useCohortRetention,
  useExportTenantAnalytics,
  usePlanComparison,
  useTenantChurn,
  useTenantGrowth,
  useTenantPaymentHealth,
  useTenantRevenue,
  useTenantSegments,
} from '@/hooks';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { ExportTenantAnalyticsParams, TenantRiskLevel } from '@/types';

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

const RISK_OPTIONS: { value: TenantRiskLevel; label: string }[] = [
  { value: 'HEALTHY', label: 'Healthy' },
  { value: 'AT_RISK', label: 'At risk' },
  { value: 'CRITICAL', label: 'Critical' },
];

const RISK_TONE: Record<TenantRiskLevel, 'success' | 'warning' | 'danger'> = {
  HEALTHY: 'success',
  AT_RISK: 'warning',
  CRITICAL: 'danger',
};

const EXPORT_REPORT_OPTIONS: { value: ExportTenantAnalyticsParams['report']; label: string }[] = [
  { value: 'growth', label: 'Growth' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'churn', label: 'Churn' },
  { value: 'payment-health', label: 'Payment health' },
  { value: 'segments', label: 'Segments' },
];

export default function TenantAnalyticsPage() {
  const [start, setStart] = useState(isoDaysAgo(30));
  const [end, setEnd] = useState(isoDaysAgo(0));
  const dateParams = { start, end };

  const growth = useTenantGrowth(dateParams);
  const revenue = useTenantRevenue(dateParams);
  const churn = useTenantChurn(dateParams);
  const paymentHealth = useTenantPaymentHealth(dateParams);

  return (
    <div>
      <PageHeader title="Tenant Analytics" description="MRR, ARR, ARPU, growth, churn, retention and payment health across all tenants." />

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <FormField label="Start date" htmlFor="ta-start">
          <Input id="ta-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} className="h-9" />
        </FormField>
        <FormField label="End date" htmlFor="ta-end">
          <Input id="ta-end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="h-9" />
        </FormField>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="MRR" value={revenue.data ? formatCurrency(revenue.data.mrr, revenue.data.currency) : '—'} icon={Wallet} loading={revenue.isLoading} />
        <KpiCard label="ARR" value={revenue.data ? formatCurrency(revenue.data.arr, revenue.data.currency) : '—'} icon={TrendingUp} loading={revenue.isLoading} />
        <KpiCard label="ARPU" value={revenue.data ? formatCurrency(revenue.data.arpu, revenue.data.currency) : '—'} loading={revenue.isLoading} />
        <KpiCard label="Active tenants" value={growth.data?.activeTenants ?? 0} icon={Users} loading={growth.isLoading} />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="New tenants" value={growth.data?.newTenants ?? 0} loading={growth.isLoading} />
        <KpiCard label="Churned tenants" value={growth.data?.churnedTenants ?? 0} icon={TrendingDown} loading={growth.isLoading} />
        <KpiCard label="Trial conversions" value={churn.data?.trialConversions ?? 0} loading={churn.isLoading} />
        <KpiCard label="Total users" value={growth.data?.totalUsers ?? 0} loading={growth.isLoading} />
      </div>

      <Tabs defaultValue="churn">
        <TabsList>
          <TabsTrigger value="churn">Upgrades & Churn</TabsTrigger>
          <TabsTrigger value="payment">Payment Health</TabsTrigger>
          <TabsTrigger value="segments">Segments</TabsTrigger>
          <TabsTrigger value="cohort">Cohort Retention</TabsTrigger>
          <TabsTrigger value="plans">Plan Comparison</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
        </TabsList>

        <TabsContent value="churn">
          <Card>
            <CardContent className="grid grid-cols-2 gap-4 pt-6 text-sm sm:grid-cols-3">
              <Field label="Upgrades" value={String(churn.data?.upgrades ?? 0)} />
              <Field label="Downgrades" value={String(churn.data?.downgrades ?? 0)} />
              <Field label="Cancellations" value={String(churn.data?.cancellations ?? 0)} />
              <Field label="Renewals" value={String(churn.data?.renewals ?? 0)} />
              <Field label="Trial conversions" value={String(churn.data?.trialConversions ?? 0)} />
              <Field label="Trial expirations" value={String(churn.data?.trialExpirations ?? 0)} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment">
          <Card>
            <CardContent className="grid grid-cols-2 gap-4 pt-6 text-sm sm:grid-cols-4">
              <Field label="Succeeded payments" value={String(paymentHealth.data?.succeededCount ?? 0)} />
              <Field label="Failed payments" value={String(paymentHealth.data?.failedCount ?? 0)} />
              <Field label="Overdue invoices" value={String(paymentHealth.data?.overdueInvoiceCount ?? 0)} />
              <Field label="Outstanding revenue" value={paymentHealth.data ? formatCurrency(paymentHealth.data.outstandingRevenue, revenue.data?.currency ?? 'USD') : '—'} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="segments">
          <SegmentsTab />
        </TabsContent>

        <TabsContent value="cohort">
          <CohortTab />
        </TabsContent>

        <TabsContent value="plans">
          <PlanComparisonTab />
        </TabsContent>

        <TabsContent value="export">
          <ExportTab start={start} end={end} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SegmentsTab() {
  const [riskLevel, setRiskLevel] = useState<TenantRiskLevel | ''>('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useTenantSegments({ riskLevel: riskLevel || undefined, page, limit: 20 });

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Select value={riskLevel} onChange={(e) => { setRiskLevel(e.target.value as TenantRiskLevel | ''); setPage(1); }} placeholder="All risk levels" options={RISK_OPTIONS} className="h-9 w-40" />
      </div>
      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No tenant segments" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workspace</TableHead>
                <TableHead>Health score</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Segments</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((row) => (
                <TableRow key={row.workspaceId}>
                  <TableCell className="text-sm text-foreground">{row.workspaceId}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{row.healthScore.toFixed(0)}</TableCell>
                  <TableCell>
                    <StatusBadge status={row.riskLevel} tone={RISK_TONE[row.riskLevel]} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{row.segments.join(', ') || '—'}</TableCell>
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

function CohortTab() {
  const [cohortMonth, setCohortMonth] = useState('');
  const { data, isLoading } = useCohortRetention(cohortMonth || undefined);

  return (
    <div>
      <div className="mb-4 flex items-end gap-2">
        <FormField label="Cohort month" htmlFor="cohort-month" hint="YYYY-MM">
          <Input id="cohort-month" placeholder="2026-01" value={cohortMonth} onChange={(e) => setCohortMonth(e.target.value)} className="h-9 w-36" />
        </FormField>
      </div>
      {!cohortMonth ? (
        <EmptyState title="Enter a cohort month" description="e.g. 2026-01" />
      ) : isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : !data ? (
        <EmptyState title="No cohort data" />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{data.cohortMonth} · {data.tenantsInCohort} tenants</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Object.entries(data.retentionByMonth).map(([month, rate]) => (
              <Field key={month} label={month} value={`${(rate * 100).toFixed(1)}%`} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PlanComparisonTab() {
  const { data, isLoading } = usePlanComparison();
  return isLoading ? (
    <Skeleton className="h-40 w-full" />
  ) : !data || data.length === 0 ? (
    <EmptyState title="No plan comparison data" />
  ) : (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Plan</TableHead>
          <TableHead>Tenants</TableHead>
          <TableHead>Average revenue</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => (
          <TableRow key={row.planKey}>
            <TableCell className="text-sm text-foreground">{row.planKey}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{row.tenantCount}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{formatCurrency(row.averageRevenue, 'USD')}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function ExportTab({ start, end }: { start: string; end: string }) {
  const [report, setReport] = useState<ExportTenantAnalyticsParams['report']>('growth');
  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const exportAnalytics = useExportTenantAnalytics();

  const handleExport = () => {
    exportAnalytics.mutate(
      { report, format, start, end },
      {
        onSuccess: (blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `tenant-analytics-${report}.${format}`;
          a.click();
          URL.revokeObjectURL(url);
        },
      },
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Export tenant analytics</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end gap-3">
        <FormField label="Report" htmlFor="export-report">
          <Select id="export-report" value={report} onChange={(e) => setReport(e.target.value as ExportTenantAnalyticsParams['report'])} options={EXPORT_REPORT_OPTIONS} className="h-9 w-40" />
        </FormField>
        <FormField label="Format" htmlFor="export-format">
          <Select id="export-format" value={format} onChange={(e) => setFormat(e.target.value as 'csv' | 'json')} options={[{ value: 'csv', label: 'CSV' }, { value: 'json', label: 'JSON' }]} className="h-9 w-32" />
        </FormField>
        <Button onClick={handleExport} disabled={exportAnalytics.isPending}>
          <Download className="h-4 w-4" />
          Export
        </Button>
      </CardContent>
    </Card>
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
