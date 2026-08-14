'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, DollarSign, Percent, TrendingDown, TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KpiCard } from '@/components/ui/kpi-card';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/states';
import { StatusBadge } from '@/components/ui/status-badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TrendChart } from '@/components/financial/trend-chart';
import { useFinancialAlerts, useFinancialBreakdown, useFinancialComparison, useFinancialPerformance, useFinancialTrends } from '@/hooks';
import { useAuthStore } from '@/stores';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { FinancialComparisonType, FinancialDimension, FinancialMetricType, FinancialPerformance } from '@/types';

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

const DIMENSION_OPTIONS: { value: FinancialDimension; label: string }[] = [
  { value: 'product', label: 'Product' },
  { value: 'sku', label: 'SKU' },
  { value: 'category', label: 'Category' },
  { value: 'marketplace', label: 'Marketplace' },
  { value: 'account', label: 'Account' },
  { value: 'supplier', label: 'Supplier' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'country', label: 'Country' },
];

const METRIC_OPTIONS: { value: FinancialMetricType; label: string }[] = [
  { value: 'revenue', label: 'Revenue' },
  { value: 'gross_profit', label: 'Gross profit' },
  { value: 'net_profit', label: 'Net profit' },
  { value: 'margin', label: 'Margin' },
  { value: 'marketplace_fees', label: 'Marketplace fees' },
  { value: 'cash_inflow', label: 'Cash inflow' },
  { value: 'cash_outflow', label: 'Cash outflow' },
];

const COMPARISON_OPTIONS: { value: FinancialComparisonType; label: string }[] = [
  { value: 'period_over_period', label: 'Period over period' },
  { value: 'year_over_year', label: 'Year over year' },
  { value: 'expected_vs_actual', label: 'Expected vs actual' },
  { value: 'budget_vs_actual', label: 'Budget vs actual' },
];

const HEALTH_TONE: Record<string, 'success' | 'warning' | 'danger'> = {
  healthy: 'success',
  warning: 'warning',
  critical: 'danger',
  loss_making: 'danger',
};

type BaseParams = { workspaceId: string; startDate: string; endDate: string } | undefined;

export default function FinancialAnalyticsPage() {
  const workspaceId = useAuthStore((s) => s.user?.workspaceId);
  const [startDate, setStartDate] = useState(isoDaysAgo(30));
  const [endDate, setEndDate] = useState(isoDaysAgo(0));

  const baseParams = useMemo(() => (workspaceId ? { workspaceId, startDate, endDate } : undefined), [workspaceId, startDate, endDate]);

  return (
    <div>
      <PageHeader title="Financial Analytics" description="Revenue, profit, cash flow, settlements and financial-risk indicators." />

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <FormField label="Start date" htmlFor="fa-start">
          <Input id="fa-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9" />
        </FormField>
        <FormField label="End date" htmlFor="fa-end">
          <Input id="fa-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9" />
        </FormField>
      </div>

      <Tabs defaultValue="performance">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
          <TabsTrigger value="comparison">Comparison</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="performance">
          <PerformanceTab params={baseParams} />
        </TabsContent>
        <TabsContent value="trends">
          <TrendsTab params={baseParams} />
        </TabsContent>
        <TabsContent value="breakdown">
          <BreakdownTab params={baseParams} />
        </TabsContent>
        <TabsContent value="comparison">
          <ComparisonTab params={baseParams} />
        </TabsContent>
        <TabsContent value="alerts">
          <AlertsTab workspaceId={workspaceId} startDate={startDate} endDate={endDate} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PerformanceTab({ params }: { params: BaseParams }) {
  const performance = useFinancialPerformance(params ?? { workspaceId: '', startDate: '', endDate: '' });
  const [selected, setSelected] = useState<FinancialPerformance | null>(null);

  const rows = performance.data ?? [];
  const totals = useMemo(() => {
    if (rows.length === 0) return null;
    return rows.reduce(
      (acc, r) => ({
        revenue: acc.revenue + r.revenueMetrics.totalRevenue,
        grossProfit: acc.grossProfit + r.profitMetrics.grossProfit,
        netProfit: acc.netProfit + r.profitMetrics.netProfit,
        pendingSettlements: acc.pendingSettlements + r.cashFlowMetrics.pendingSettlements,
        receivables: acc.receivables + r.cashFlowMetrics.receivables,
        payables: acc.payables + r.cashFlowMetrics.payables,
      }),
      { revenue: 0, grossProfit: 0, netProfit: 0, pendingSettlements: 0, receivables: 0, payables: 0 },
    );
  }, [rows]);
  const currency = rows[0]?.currency ?? 'USD';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Revenue" value={totals ? formatCurrency(totals.revenue, currency) : '—'} icon={DollarSign} loading={performance.isLoading} />
        <KpiCard label="Gross profit" value={totals ? formatCurrency(totals.grossProfit, currency) : '—'} icon={TrendingUp} loading={performance.isLoading} />
        <KpiCard label="Net profit" value={totals ? formatCurrency(totals.netProfit, currency) : '—'} icon={TrendingUp} loading={performance.isLoading} />
        <KpiCard label="Pending settlements" value={totals ? formatCurrency(totals.pendingSettlements, currency) : '—'} icon={Percent} loading={performance.isLoading} />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Receivables" value={totals ? formatCurrency(totals.receivables, currency) : '—'} loading={performance.isLoading} />
        <KpiCard label="Payables" value={totals ? formatCurrency(totals.payables, currency) : '—'} loading={performance.isLoading} />
      </div>

      {performance.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : rows.length === 0 ? (
        <EmptyState title="No financial performance data yet" description="Performance rows appear here once financial data is available for the selected range." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Scope</TableHead>
              <TableHead>Revenue</TableHead>
              <TableHead>Net profit</TableHead>
              <TableHead>Margin</TableHead>
              <TableHead>Health</TableHead>
              <TableHead>Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i} clickable onClick={() => setSelected(r)}>
                <TableCell className="text-sm font-medium text-foreground">
                  {r.marketplaceId ?? r.accountId ?? r.productSku ?? r.country ?? 'All'}
                </TableCell>
                <TableCell className="text-sm text-foreground">{formatCurrency(r.revenueMetrics.totalRevenue, r.currency)}</TableCell>
                <TableCell className="text-sm text-foreground">{formatCurrency(r.profitMetrics.netProfit, r.currency)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.profitMetrics.netMargin.toFixed(1)}%</TableCell>
                <TableCell>
                  <StatusBadge status={r.healthStatus} tone={HEALTH_TONE[r.healthStatus]} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.overallScore.toFixed(0)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <PerformanceDetailDialog performance={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function PerformanceDetailDialog({ performance, onClose }: { performance: FinancialPerformance | null; onClose: () => void }) {
  return (
    <Dialog open={!!performance} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Financial performance detail</DialogTitle>
        </DialogHeader>
        {performance && (
          <div className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Revenue & Profit</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                <Field label="Expected revenue" value={formatCurrency(performance.revenueMetrics.expectedRevenue, performance.currency)} />
                <Field label="Actual revenue" value={formatCurrency(performance.revenueMetrics.actualRevenue, performance.currency)} />
                <Field label="Revenue variance" value={`${formatCurrency(performance.revenueMetrics.revenueVariance, performance.currency)} (${performance.revenueMetrics.revenueVariancePercent.toFixed(1)}%)`} />
                <Field label="Gross profit" value={formatCurrency(performance.profitMetrics.grossProfit, performance.currency)} />
                <Field label="Net profit" value={formatCurrency(performance.profitMetrics.netProfit, performance.currency)} />
                <Field label="ROI" value={`${performance.profitMetrics.roi.toFixed(1)}%`} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Cost breakdown</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                <Field label="Supplier cost" value={formatCurrency(performance.costBreakdown.supplierCost, performance.currency)} />
                <Field label="Marketplace fees" value={formatCurrency(performance.costBreakdown.marketplaceFees, performance.currency)} />
                <Field label="Fulfillment fees" value={formatCurrency(performance.costBreakdown.fulfillmentFees, performance.currency)} />
                <Field label="Shipping" value={formatCurrency(performance.costBreakdown.shippingCost, performance.currency)} />
                <Field label="Tax" value={formatCurrency(performance.costBreakdown.tax, performance.currency)} />
                <Field label="Advertising" value={formatCurrency(performance.costBreakdown.advertisingCost, performance.currency)} />
                <Field label="Refunds" value={formatCurrency(performance.costBreakdown.refunds, performance.currency)} />
                <Field label="Returns" value={formatCurrency(performance.costBreakdown.returnsCost, performance.currency)} />
                <Field label="Total cost" value={formatCurrency(performance.costBreakdown.totalCost, performance.currency)} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Cash flow & Settlement</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                <Field label="Receivables" value={formatCurrency(performance.cashFlowMetrics.receivables, performance.currency)} />
                <Field label="Payables" value={formatCurrency(performance.cashFlowMetrics.payables, performance.currency)} />
                <Field label="Pending settlements" value={formatCurrency(performance.cashFlowMetrics.pendingSettlements, performance.currency)} />
                <Field label="Expected settlement" value={formatCurrency(performance.settlementMetrics.expectedSettlement, performance.currency)} />
                <Field label="Actual settlement" value={formatCurrency(performance.settlementMetrics.actualSettlement, performance.currency)} />
                <Field label="Deductions" value={formatCurrency(performance.settlementMetrics.deductions, performance.currency)} />
                <Field label="Reconciliation diff" value={formatCurrency(performance.settlementMetrics.reconciliationDifferences, performance.currency)} />
                <Field label="Avg settlement days" value={performance.settlementMetrics.averageSettlementDays.toFixed(1)} />
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TrendsTab({ params }: { params: BaseParams }) {
  const [metricType, setMetricType] = useState<FinancialMetricType>('revenue');
  const trends = useFinancialTrends({ ...(params ?? { workspaceId: '', startDate: '', endDate: '' }), metricType, period: 'day' });
  const currency = trends.data?.[0]?.currency ?? 'USD';
  const chartData = (trends.data ?? []).map((t) => ({ label: formatDate(t.period), value: t.metricValue }));

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Select value={metricType} onChange={(e) => setMetricType(e.target.value as FinancialMetricType)} options={METRIC_OPTIONS} className="h-9 w-52" />
      </div>
      <Card>
        <CardContent className="pt-6">
          {trends.isLoading ? <Skeleton className="h-64 w-full" /> : <TrendChart data={chartData} valueFormatter={(v) => formatCurrency(v, currency)} />}
        </CardContent>
      </Card>
    </div>
  );
}

function BreakdownTab({ params }: { params: BaseParams }) {
  const [dimension, setDimension] = useState<FinancialDimension>('marketplace');
  const breakdown = useFinancialBreakdown({ ...(params ?? { workspaceId: '', startDate: '', endDate: '' }), dimension });

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Select value={dimension} onChange={(e) => setDimension(e.target.value as FinancialDimension)} options={DIMENSION_OPTIONS} className="h-9 w-48" />
      </div>
      {breakdown.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !breakdown.data || breakdown.data.length === 0 ? (
        <EmptyState title="No breakdown data" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{dimension}</TableHead>
              <TableHead>Revenue</TableHead>
              <TableHead>Net profit</TableHead>
              <TableHead>Margin</TableHead>
              <TableHead>Contribution</TableHead>
              <TableHead>Health</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {breakdown.data.map((row, i) => (
              <TableRow key={i}>
                <TableCell className="text-sm font-medium text-foreground">{row.dimensionLabel ?? row.dimensionValue}</TableCell>
                <TableCell className="text-sm text-foreground">{formatCurrency(row.revenue, 'USD')}</TableCell>
                <TableCell className="text-sm text-foreground">{formatCurrency(row.netProfit, 'USD')}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{row.margin.toFixed(1)}%</TableCell>
                <TableCell className="text-sm text-muted-foreground">{row.contributionPercent.toFixed(1)}%</TableCell>
                <TableCell>
                  <StatusBadge status={row.healthStatus} tone={HEALTH_TONE[row.healthStatus]} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function ComparisonTab({ params }: { params: BaseParams }) {
  const [comparisonType, setComparisonType] = useState<FinancialComparisonType>('period_over_period');
  const comparison = useFinancialComparison(params ? { ...params, comparisonType } : undefined);

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Select value={comparisonType} onChange={(e) => setComparisonType(e.target.value as FinancialComparisonType)} options={COMPARISON_OPTIONS} className="h-9 w-56" />
      </div>
      {comparison.isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : !comparison.data ? (
        <EmptyState title="No comparison data yet" description="Expected vs actual and period comparisons appear here once financial data is available." />
      ) : (
        <Card>
          <CardContent className="grid grid-cols-2 gap-4 pt-6 text-sm sm:grid-cols-4">
            <VarianceField label="Revenue" amount={comparison.data.variance.revenueVariance} percent={comparison.data.variance.revenueVariancePercent} currency={comparison.data.currency} />
            <VarianceField label="Profit" amount={comparison.data.variance.profitVariance} percent={comparison.data.variance.profitVariancePercent} currency={comparison.data.currency} />
            <VarianceFieldPoints label="Margin" points={comparison.data.variance.marginPoints} />
            <VarianceFieldPoints label="Overall score" points={comparison.data.variance.overallScorePoints} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function VarianceField({ label, amount, percent, currency }: { label: string; amount: number; percent: number; currency: string }) {
  const positive = amount >= 0;
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={positive ? 'text-success' : 'text-danger'}>
        {formatCurrency(amount, currency)} ({percent.toFixed(1)}%)
      </p>
    </div>
  );
}

function VarianceFieldPoints({ label, points }: { label: string; points: number }) {
  const positive = points >= 0;
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={positive ? 'text-success' : 'text-danger'}>{points.toFixed(1)} pts</p>
    </div>
  );
}

const SEVERITY_TONE: Record<string, 'danger' | 'warning' | 'info'> = {
  critical: 'danger',
  high: 'danger',
  medium: 'warning',
  low: 'info',
};

function AlertsTab({ workspaceId, startDate, endDate }: { workspaceId: string | undefined; startDate: string; endDate: string }) {
  const alerts = useFinancialAlerts({ workspaceId, startDate, endDate, limit: 50 });

  return alerts.isLoading ? (
    <Skeleton className="h-64 w-full" />
  ) : !alerts.data || alerts.data.length === 0 ? (
    <EmptyState title="No financial alerts" description="Fee anomalies, settlement delays, profit leakage and cash-flow risks will appear here." icon={AlertTriangle} />
  ) : (
    <div className="space-y-2">
      {alerts.data.map((a) => (
        <div key={a.id} className="flex items-start justify-between rounded-[var(--radius)] border border-border p-3 text-sm">
          <div className="flex items-start gap-3">
            {a.severity === 'critical' || a.severity === 'high' ? <TrendingDown className="mt-0.5 h-4 w-4 text-danger" /> : <TrendingUp className="mt-0.5 h-4 w-4 text-muted-foreground" />}
            <div>
              <p className="text-foreground">{a.message}</p>
              <p className="text-xs text-muted-foreground">
                {a.alertType.replace(/_/g, ' ')} · {formatDate(a.detectedAt)}
                {a.marketplaceId ? ` · ${a.marketplaceId}` : ''}
                {a.productSku ? ` · ${a.productSku}` : ''}
              </p>
            </div>
          </div>
          <div className="text-right">
            <StatusBadge status={a.severity} tone={SEVERITY_TONE[a.severity]} />
            {a.amount != null && <p className="mt-1 text-xs text-muted-foreground">{formatCurrency(a.amount, a.currency ?? 'USD')}</p>}
          </div>
        </div>
      ))}
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
