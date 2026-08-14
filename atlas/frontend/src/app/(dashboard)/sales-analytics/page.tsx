'use client';

import { useMemo, useState } from 'react';
import { DollarSign, Package, Receipt, ShoppingCart, Plus, Download } from 'lucide-react';
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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TrendChart } from '@/components/financial/trend-chart';
import {
  useCreateSalesSavedView,
  useCreateSalesTarget,
  useDeleteSalesSavedView,
  useDeleteSalesTarget,
  useExportSalesData,
  useProductPerformance,
  useSalesBreakdown,
  useSalesComparison,
  useSalesDrillDown,
  useSalesSavedViews,
  useSalesSummary,
  useSalesTargets,
  useSalesTrends,
} from '@/hooks';
import { useAuthStore } from '@/stores';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { SalesBreakdownDimension, SalesMetricType } from '@/types';

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

const DIMENSION_OPTIONS: { value: SalesBreakdownDimension; label: string }[] = [
  { value: 'product', label: 'Product' },
  { value: 'sku', label: 'SKU' },
  { value: 'category', label: 'Category' },
  { value: 'brand', label: 'Brand' },
  { value: 'marketplace', label: 'Marketplace' },
  { value: 'account', label: 'Account' },
  { value: 'country', label: 'Country' },
  { value: 'region', label: 'Region' },
];

export default function SalesAnalyticsPage() {
  const workspaceId = useAuthStore((s) => s.user?.workspaceId);
  const [startDate, setStartDate] = useState(isoDaysAgo(30));
  const [endDate, setEndDate] = useState(isoDaysAgo(0));

  const baseParams = useMemo(
    () => (workspaceId ? { workspaceId, startDate, endDate } : undefined),
    [workspaceId, startDate, endDate],
  );

  return (
    <div>
      <PageHeader title="Sales Analytics" description="Revenue, units, AOV, growth and marketplace/channel comparison." />

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <FormField label="Start date" htmlFor="sa-start">
          <Input id="sa-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9" />
        </FormField>
        <FormField label="End date" htmlFor="sa-end">
          <Input id="sa-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9" />
        </FormField>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
          <TabsTrigger value="products">Product Performance</TabsTrigger>
          <TabsTrigger value="targets">Targets & Views</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab params={baseParams} />
        </TabsContent>
        <TabsContent value="breakdown">
          <BreakdownTab params={baseParams} />
        </TabsContent>
        <TabsContent value="products">
          <ProductsTab params={baseParams} />
        </TabsContent>
        <TabsContent value="targets">
          <TargetsTab workspaceId={workspaceId} />
        </TabsContent>
        <TabsContent value="orders">
          <OrdersTab params={baseParams} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

type BaseParams = { workspaceId: string; startDate: string; endDate: string } | undefined;

function OverviewTab({ params }: { params: BaseParams }) {
  const summary = useSalesSummary(params ?? { workspaceId: '', startDate: '', endDate: '' });
  const trends = useSalesTrends({
    ...(params ?? { workspaceId: '', startDate: '', endDate: '' }),
    metricType: 'revenue' as SalesMetricType,
    period: 'day',
  });
  const comparison = useSalesComparison(
    params ? { workspaceId: params.workspaceId, currentStartDate: params.startDate, currentEndDate: params.endDate, comparisonType: 'previous_period' } : undefined,
  );

  const currency = summary.data?.currency ?? 'USD';
  const chartData = (trends.data ?? []).map((t) => ({ label: formatDate(t.periodStart), value: t.value }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Revenue" value={summary.data ? formatCurrency(summary.data.revenue, currency) : '—'} icon={DollarSign} loading={summary.isLoading} />
        <KpiCard label="Units sold" value={summary.data?.unitsSold ?? 0} icon={Package} loading={summary.isLoading} />
        <KpiCard label="Orders" value={summary.data?.orderCount ?? 0} icon={ShoppingCart} loading={summary.isLoading} />
        <KpiCard label="Avg order value" value={summary.data ? formatCurrency(summary.data.averageOrderValue, currency) : '—'} icon={Receipt} loading={summary.isLoading} />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Discounts" value={summary.data ? formatCurrency(summary.data.discountAmount, currency) : '—'} loading={summary.isLoading} />
        <KpiCard label="Refunds" value={summary.data ? formatCurrency(summary.data.refundAmount, currency) : '—'} loading={summary.isLoading} />
        <KpiCard label="Returns" value={summary.data ? formatCurrency(summary.data.returnAmount, currency) : '—'} loading={summary.isLoading} />
        <KpiCard label="Marketplace fees" value={summary.data ? formatCurrency(summary.data.feeAmount, currency) : '—'} loading={summary.isLoading} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Revenue trend</CardTitle>
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
              <VarianceField label="Revenue" amount={comparison.data.variance.revenueAmount} percent={comparison.data.variance.revenuePercent} currency={comparison.data.currency} />
              <VarianceField label="Net sales" amount={comparison.data.variance.netSalesAmount} percent={comparison.data.variance.netSalesPercent} currency={comparison.data.currency} />
              <VarianceField label="Units sold" amount={comparison.data.variance.unitsSoldAmount} percent={comparison.data.variance.unitsSoldPercent} currency={null} />
              <VarianceField label="Orders" amount={comparison.data.variance.orderCountAmount} percent={comparison.data.variance.orderCountPercent} currency={null} />
              <VarianceField label="AOV" amount={comparison.data.variance.aovAmount} percent={comparison.data.variance.aovPercent} currency={comparison.data.currency} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function VarianceField({ label, amount, percent, currency }: { label: string; amount: number; percent: number; currency: string | null }) {
  const positive = amount >= 0;
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={positive ? 'text-success' : 'text-danger'}>
        {currency ? formatCurrency(amount, currency) : amount} ({percent.toFixed(1)}%)
      </p>
    </div>
  );
}

function BreakdownTab({ params }: { params: BaseParams }) {
  const [dimension, setDimension] = useState<SalesBreakdownDimension>('marketplace');
  const breakdown = useSalesBreakdown({ ...(params ?? { workspaceId: '', startDate: '', endDate: '' }), dimension, limit: 20 });

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Select value={dimension} onChange={(e) => setDimension(e.target.value as SalesBreakdownDimension)} options={DIMENSION_OPTIONS} className="h-9 w-48" />
      </div>
      {breakdown.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !breakdown.data || breakdown.data.length === 0 ? (
        <EmptyState title="No breakdown data" description="Try a different dimension or date range." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{dimension}</TableHead>
              <TableHead>Revenue</TableHead>
              <TableHead>Units sold</TableHead>
              <TableHead>Orders</TableHead>
              <TableHead>AOV</TableHead>
              <TableHead>Share</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {breakdown.data.map((row, i) => (
              <TableRow key={i}>
                <TableCell className="text-sm font-medium text-foreground">{row.dimensionLabel ?? row.dimensionValue}</TableCell>
                <TableCell className="text-sm text-foreground">{formatCurrency(row.revenue, row.currency)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{row.unitsSold}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{row.orderCount}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatCurrency(row.averageOrderValue, row.currency)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{row.sharePercent != null ? `${row.sharePercent.toFixed(1)}%` : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function ProductsTab({ params }: { params: BaseParams }) {
  const performance = useProductPerformance({ ...(params ?? { workspaceId: '', startDate: '', endDate: '' }), performanceCategory: 'top_performing', limit: 20 });

  return performance.isLoading ? (
    <Skeleton className="h-64 w-full" />
  ) : !performance.data || performance.data.length === 0 ? (
    <EmptyState title="No product performance data" />
  ) : (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Product</TableHead>
          <TableHead>SKU</TableHead>
          <TableHead>Revenue</TableHead>
          <TableHead>Units</TableHead>
          <TableHead>Avg price</TableHead>
          <TableHead>Growth</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {performance.data.map((p) => (
          <TableRow key={p.productId}>
            <TableCell className="text-sm font-medium text-foreground">{p.productName}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{p.sku}</TableCell>
            <TableCell className="text-sm text-foreground">{formatCurrency(p.revenue, p.currency)}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{p.unitsSold}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{formatCurrency(p.averagePrice, p.currency)}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{p.growthPercent != null ? `${p.growthPercent.toFixed(1)}%` : '—'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function TargetsTab({ workspaceId }: { workspaceId: string | undefined }) {
  const targets = useSalesTargets(workspaceId);
  const savedViews = useSalesSavedViews(workspaceId);
  const deleteTarget = useDeleteSalesTarget(workspaceId ?? '');
  const deleteView = useDeleteSalesSavedView(workspaceId ?? '');
  const [targetOpen, setTargetOpen] = useState(false);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Sales targets</p>
          <Button variant="outline" size="sm" onClick={() => setTargetOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            New target
          </Button>
        </div>
        {targets.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : !targets.data || targets.data.length === 0 ? (
          <EmptyState title="No sales targets yet" className="border-none py-8" />
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
      </div>

      <div>
        <p className="mb-3 text-sm font-semibold text-foreground">Saved views</p>
        {savedViews.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : !savedViews.data || savedViews.data.length === 0 ? (
          <EmptyState title="No saved views yet" className="border-none py-8" />
        ) : (
          <div className="space-y-2">
            {savedViews.data.map((v) => (
              <div key={v.id} className="flex items-center justify-between rounded-[var(--radius)] border border-border p-3 text-sm">
                <div>
                  <p className="text-foreground">{v.name}</p>
                  <p className="text-xs text-muted-foreground">{v.dimensions.join(', ')}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => deleteView.mutate(v.id)} disabled={deleteView.isPending}>
                  Delete
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <CreateTargetDialog open={targetOpen} onOpenChange={setTargetOpen} workspaceId={workspaceId} />
    </div>
  );
}

function CreateTargetDialog({ open, onOpenChange, workspaceId }: { open: boolean; onOpenChange: (o: boolean) => void; workspaceId: string | undefined }) {
  const createTarget = useCreateSalesTarget();
  const [name, setName] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [startDate, setStartDate] = useState(isoDaysAgo(0));
  const [endDate, setEndDate] = useState(isoDaysAgo(-30));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>New sales target</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <FormField label="Name" htmlFor="target-name" required>
            <Input id="target-name" value={name} onChange={(e) => setName(e.target.value)} />
          </FormField>
          <FormField label="Target value (revenue)" htmlFor="target-value" required>
            <Input id="target-value" type="number" min="0" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Start date" htmlFor="target-start">
              <Input id="target-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </FormField>
            <FormField label="End date" htmlFor="target-end">
              <Input id="target-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
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
                {
                  workspaceId,
                  targetKey: `target_${Date.now()}`,
                  name,
                  metricType: 'revenue',
                  targetValue: Number(targetValue),
                  period: 'month',
                  startDate,
                  endDate,
                  createdBy: workspaceId,
                },
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

function OrdersTab({ params }: { params: BaseParams }) {
  const [page, setPage] = useState(1);
  const drillDown = useSalesDrillDown({ ...(params ?? { workspaceId: '', startDate: '', endDate: '' }), page, limit: 20 });
  const exportData = useExportSalesData();

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button
          variant="outline"
          onClick={() => params && exportData.mutate({ workspaceId: params.workspaceId, startDate: params.startDate, endDate: params.endDate, format: 'csv' })}
          disabled={!params || exportData.isPending}
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>
      {exportData.data && (
        <div className="mb-4 rounded-[var(--radius)] border border-border p-3 text-sm">
          Export ready — <a href={exportData.data.url} className="text-primary underline" target="_blank" rel="noreferrer">download link</a> (expires {formatDate(exportData.data.expiresAt)})
        </div>
      )}
      {drillDown.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !drillDown.data || drillDown.data.orders.length === 0 ? (
        <EmptyState title="No order data yet" description="Order-level drill-down from sales analytics appears here once backend data is available." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {drillDown.data.orders.map((o, i) => (
              <TableRow key={i}>
                <TableCell className="text-sm text-foreground">{JSON.stringify(o)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
