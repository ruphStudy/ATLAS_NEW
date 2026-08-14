'use client';

import { useMemo, useState } from 'react';
import { TrendingUp, Percent, Target, AlertTriangle, Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KpiCard } from '@/components/ui/kpi-card';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/states';
import { StatusBadge } from '@/components/ui/status-badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TrendChart } from '@/components/financial/trend-chart';
import {
  useCreateProfitTarget,
  useDeleteProfitTarget,
  useProfitBreakdown,
  useProfitComparison,
  useProfitLeakage,
  useProfitSummary,
  useProfitTargets,
  useProfitTrends,
  useProfitabilityAnalysis,
} from '@/hooks';
import { useAuthStore } from '@/stores';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { ProfitDimension, ProfitabilityCategory } from '@/types';

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

const DIMENSION_OPTIONS: { value: ProfitDimension; label: string }[] = [
  { value: 'product', label: 'Product' },
  { value: 'sku', label: 'SKU' },
  { value: 'category', label: 'Category' },
  { value: 'marketplace', label: 'Marketplace' },
  { value: 'account', label: 'Account' },
  { value: 'country', label: 'Country' },
  { value: 'supplier', label: 'Supplier' },
  { value: 'warehouse', label: 'Warehouse' },
];

const PROFITABILITY_OPTIONS: { value: ProfitabilityCategory; label: string }[] = [
  { value: 'profitable', label: 'Profitable' },
  { value: 'high_margin', label: 'High margin' },
  { value: 'low_margin', label: 'Low margin' },
  { value: 'break_even', label: 'Break even' },
  { value: 'loss_making', label: 'Loss making' },
];

type BaseParams = { workspaceId: string; startDate: string; endDate: string } | undefined;

export default function ProfitAnalyticsPage() {
  const workspaceId = useAuthStore((s) => s.user?.workspaceId);
  const [startDate, setStartDate] = useState(isoDaysAgo(30));
  const [endDate, setEndDate] = useState(isoDaysAgo(0));

  const baseParams = useMemo(() => (workspaceId ? { workspaceId, startDate, endDate } : undefined), [workspaceId, startDate, endDate]);

  return (
    <div>
      <PageHeader title="Profit Analytics" description="Profitability by product, SKU, marketplace, account, country and period." />

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <FormField label="Start date" htmlFor="pa-start">
          <Input id="pa-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9" />
        </FormField>
        <FormField label="End date" htmlFor="pa-end">
          <Input id="pa-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9" />
        </FormField>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
          <TabsTrigger value="profitability">Profitability</TabsTrigger>
          <TabsTrigger value="leakage">Leakage</TabsTrigger>
          <TabsTrigger value="targets">Targets</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab params={baseParams} />
        </TabsContent>
        <TabsContent value="breakdown">
          <BreakdownTab params={baseParams} />
        </TabsContent>
        <TabsContent value="profitability">
          <ProfitabilityTab params={baseParams} />
        </TabsContent>
        <TabsContent value="leakage">
          <LeakageTab params={baseParams} />
        </TabsContent>
        <TabsContent value="targets">
          <TargetsTab workspaceId={workspaceId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OverviewTab({ params }: { params: BaseParams }) {
  const summary = useProfitSummary(params ?? { workspaceId: '', startDate: '', endDate: '' });
  const trends = useProfitTrends({ ...(params ?? { workspaceId: '', startDate: '', endDate: '' }), metricType: 'net_profit', period: 'day' });
  const comparison = useProfitComparison(
    params ? { workspaceId: params.workspaceId, currentStartDate: params.startDate, currentEndDate: params.endDate, comparisonType: 'previous_period' } : undefined,
  );

  const currency = summary.data?.currency ?? 'USD';
  const chartData = (trends.data ?? []).map((t) => ({ label: formatDate(t.periodStart), value: t.value }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Gross profit" value={summary.data ? formatCurrency(summary.data.grossProfit, currency) : '—'} icon={TrendingUp} loading={summary.isLoading} />
        <KpiCard label="Net profit" value={summary.data ? formatCurrency(summary.data.netProfit, currency) : '—'} icon={TrendingUp} loading={summary.isLoading} />
        <KpiCard label="Gross margin" value={summary.data ? `${summary.data.grossMargin.toFixed(1)}%` : '—'} icon={Percent} loading={summary.isLoading} />
        <KpiCard label="Net margin" value={summary.data ? `${summary.data.netMargin.toFixed(1)}%` : '—'} icon={Percent} loading={summary.isLoading} />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="ROI" value={summary.data ? `${summary.data.roi.toFixed(1)}%` : '—'} loading={summary.isLoading} />
        <KpiCard label="Contribution margin" value={summary.data ? `${summary.data.contributionMargin.toFixed(1)}%` : '—'} loading={summary.isLoading} />
        <KpiCard label="Profit / unit" value={summary.data ? formatCurrency(summary.data.profitPerUnit, currency) : '—'} loading={summary.isLoading} />
        <KpiCard label="Profit / order" value={summary.data ? formatCurrency(summary.data.profitPerOrder, currency) : '—'} loading={summary.isLoading} />
      </div>

      {summary.data && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Cost components</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <Field label="Product cost" value={formatCurrency(summary.data.components.productCost, currency)} />
            <Field label="Landed cost" value={formatCurrency(summary.data.components.landedCost, currency)} />
            <Field label="Marketplace fees" value={formatCurrency(summary.data.components.marketplaceFees, currency)} />
            <Field label="Fulfillment fees" value={formatCurrency(summary.data.components.fulfillmentFees, currency)} />
            <Field label="Shipping cost" value={formatCurrency(summary.data.components.shippingCost, currency)} />
            <Field label="Tax" value={formatCurrency(summary.data.components.taxAmount, currency)} />
            <Field label="Advertising" value={formatCurrency(summary.data.components.advertisingCost, currency)} />
            <Field label="Discounts" value={formatCurrency(summary.data.components.discounts, currency)} />
            <Field label="Returns" value={formatCurrency(summary.data.components.returns, currency)} />
            <Field label="Refunds" value={formatCurrency(summary.data.components.refunds, currency)} />
            <Field label="Other costs" value={formatCurrency(summary.data.components.otherCosts, currency)} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Net profit trend</CardTitle>
        </CardHeader>
        <CardContent>
          {trends.isLoading ? <Skeleton className="h-64 w-full" /> : <TrendChart data={chartData} valueFormatter={(v) => formatCurrency(v, currency)} />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Vs. previous period</CardTitle>
        </CardHeader>
        <CardContent>
          {comparison.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : !comparison.data ? (
            <EmptyState title="No comparison data" className="border-none py-6" />
          ) : (
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <VarianceField label="Gross profit" amount={comparison.data.variance.grossProfitAmount} percent={comparison.data.variance.grossProfitPercent} currency={comparison.data.currency} />
              <VarianceField label="Net profit" amount={comparison.data.variance.netProfitAmount} percent={comparison.data.variance.netProfitPercent} currency={comparison.data.currency} />
              <VarianceField label="Revenue" amount={comparison.data.variance.revenueAmount} percent={comparison.data.variance.revenuePercent} currency={comparison.data.currency} />
              <VarianceFieldPoints label="Gross margin" points={comparison.data.variance.grossMarginPoints} />
              <VarianceFieldPoints label="Net margin" points={comparison.data.variance.netMarginPoints} />
              <VarianceFieldPoints label="ROI" points={comparison.data.variance.roiPoints} />
            </div>
          )}
        </CardContent>
      </Card>
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

function BreakdownTab({ params }: { params: BaseParams }) {
  const [dimension, setDimension] = useState<ProfitDimension>('marketplace');
  const breakdown = useProfitBreakdown({ ...(params ?? { workspaceId: '', startDate: '', endDate: '' }), dimension, limit: 20 });

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Select value={dimension} onChange={(e) => setDimension(e.target.value as ProfitDimension)} options={DIMENSION_OPTIONS} className="h-9 w-48" />
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
              <TableHead>Gross profit</TableHead>
              <TableHead>Net profit</TableHead>
              <TableHead>Margin</TableHead>
              <TableHead>ROI</TableHead>
              <TableHead>Share</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {breakdown.data.map((row, i) => (
              <TableRow key={i}>
                <TableCell className="text-sm font-medium text-foreground">{row.dimensionLabel ?? row.dimensionValue}</TableCell>
                <TableCell className="text-sm text-foreground">{formatCurrency(row.grossProfit, row.currency)}</TableCell>
                <TableCell className="text-sm text-foreground">{formatCurrency(row.netProfit, row.currency)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{row.netMargin.toFixed(1)}%</TableCell>
                <TableCell className="text-sm text-muted-foreground">{row.roi.toFixed(1)}%</TableCell>
                <TableCell className="text-sm text-muted-foreground">{row.sharePercent != null ? `${row.sharePercent.toFixed(1)}%` : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function ProfitabilityTab({ params }: { params: BaseParams }) {
  const [category, setCategory] = useState<ProfitabilityCategory>('profitable');
  const analysis = useProfitabilityAnalysis({ ...(params ?? { workspaceId: '', startDate: '', endDate: '' }), profitabilityCategory: category, limit: 20 });

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Select value={category} onChange={(e) => setCategory(e.target.value as ProfitabilityCategory)} options={PROFITABILITY_OPTIONS} className="h-9 w-48" />
      </div>
      {analysis.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !analysis.data || analysis.data.length === 0 ? (
        <EmptyState title="No profitability data" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Marketplace</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Net profit</TableHead>
              <TableHead>Margin</TableHead>
              <TableHead>ROI</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {analysis.data.map((row) => (
              <TableRow key={row.productId}>
                <TableCell className="text-sm font-medium text-foreground">{row.productName}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{row.marketplace ?? '—'}</TableCell>
                <TableCell>
                  <StatusBadge status={row.profitabilityCategory} />
                </TableCell>
                <TableCell className="text-sm text-foreground">{formatCurrency(row.netProfit, row.currency)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{row.netMargin.toFixed(1)}%</TableCell>
                <TableCell className="text-sm text-muted-foreground">{row.roi.toFixed(1)}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function LeakageTab({ params }: { params: BaseParams }) {
  const leakage = useProfitLeakage(params ?? { workspaceId: '', startDate: '', endDate: '' });

  return leakage.isLoading ? (
    <Skeleton className="h-64 w-full" />
  ) : !leakage.data || leakage.data.length === 0 ? (
    <EmptyState title="No profit leakage detected" description="Leakage from excessive fees, returns, refunds, discounts or shipping will appear here." icon={AlertTriangle} />
  ) : (
    <div className="space-y-2">
      {leakage.data.map((row, i) => (
        <div key={i} className="flex items-center justify-between rounded-[var(--radius)] border border-border p-3 text-sm">
          <div>
            <StatusBadge status={row.leakageType} tone="warning" />
            <p className="mt-1 text-muted-foreground">{row.dimensionLabel ?? row.dimensionValue} · impact on margin {row.impactOnMargin.toFixed(1)} pts</p>
          </div>
          <div className="text-right">
            <p className="text-foreground">{formatCurrency(row.leakageAmount, row.currency)}</p>
            <p className="text-xs text-muted-foreground">{row.leakagePercent.toFixed(1)}%</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function TargetsTab({ workspaceId }: { workspaceId: string | undefined }) {
  const targets = useProfitTargets(workspaceId);
  const deleteTarget = useDeleteProfitTarget(workspaceId ?? '');
  const [open, setOpen] = useState(false);

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          New target
        </Button>
      </div>
      {targets.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : !targets.data || targets.data.length === 0 ? (
        <EmptyState title="No profit targets yet" icon={Target} />
      ) : (
        <div className="space-y-2">
          {targets.data.map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-[var(--radius)] border border-border p-3 text-sm">
              <div>
                <p className="text-foreground">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.metricType} · target {t.targetValue}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => deleteTarget.mutate(t.id)} disabled={deleteTarget.isPending}>
                Delete
              </Button>
            </div>
          ))}
        </div>
      )}
      <CreateProfitTargetDialog open={open} onOpenChange={setOpen} workspaceId={workspaceId} />
    </div>
  );
}

function CreateProfitTargetDialog({ open, onOpenChange, workspaceId }: { open: boolean; onOpenChange: (o: boolean) => void; workspaceId: string | undefined }) {
  const createTarget = useCreateProfitTarget();
  const [name, setName] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [startDate, setStartDate] = useState(isoDaysAgo(0));
  const [endDate, setEndDate] = useState(isoDaysAgo(-30));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>New profit target</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <FormField label="Name" htmlFor="ptarget-name" required>
            <Input id="ptarget-name" value={name} onChange={(e) => setName(e.target.value)} />
          </FormField>
          <FormField label="Target value (net margin %)" htmlFor="ptarget-value" required>
            <Input id="ptarget-value" type="number" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Start date" htmlFor="ptarget-start">
              <Input id="ptarget-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </FormField>
            <FormField label="End date" htmlFor="ptarget-end">
              <Input id="ptarget-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </FormField>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              workspaceId &&
              createTarget.mutate(
                { workspaceId, targetKey: `target_${Date.now()}`, name, metricType: 'net_margin', targetValue: Number(targetValue), period: 'month', startDate, endDate, createdBy: workspaceId },
                { onSuccess: () => onOpenChange(false) },
              )
            }
            disabled={!name || !targetValue || createTarget.isPending}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
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
