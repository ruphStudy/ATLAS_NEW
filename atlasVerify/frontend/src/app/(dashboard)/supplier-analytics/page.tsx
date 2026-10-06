'use client';

import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/states';
import { StatusBadge } from '@/components/ui/status-badge';
import { TrendChart } from '@/components/financial/trend-chart';
import {
  useSupplierBreakdown,
  useSupplierComparison,
  useSupplierPerformanceList,
  useSupplierRanking,
  useSupplierTrends,
  useSuppliers,
} from '@/hooks';
import { useAuthStore } from '@/stores';
import { formatDate } from '@/lib/utils';
import type { SupplierAnalyticsDimension, SupplierAnalyticsMetricType, SupplierAnalyticsPeriod, SupplierComparisonType, SupplierPerformanceCategory } from '@/types';

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

const CATEGORY_OPTIONS: { value: SupplierPerformanceCategory; label: string }[] = [
  { value: 'preferred', label: 'Preferred' },
  { value: 'improving', label: 'Improving' },
  { value: 'declining', label: 'Declining' },
  { value: 'risky', label: 'Risky' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'average', label: 'Average' },
  { value: 'new', label: 'New' },
];

const DIMENSION_OPTIONS: { value: SupplierAnalyticsDimension; label: string }[] = [
  { value: 'provider', label: 'Provider' },
  { value: 'category', label: 'Category' },
  { value: 'product', label: 'Product' },
  { value: 'country', label: 'Country' },
  { value: 'region', label: 'Region' },
  { value: 'currency', label: 'Currency' },
];

const METRIC_OPTIONS: { value: SupplierAnalyticsMetricType; label: string }[] = [
  { value: 'quotation_response_rate', label: 'Quotation response rate' },
  { value: 'price_competitiveness', label: 'Price competitiveness' },
  { value: 'purchase_order_value', label: 'Purchase order value' },
  { value: 'fulfillment_rate', label: 'Fulfillment rate' },
  { value: 'on_time_dispatch_rate', label: 'On-time dispatch rate' },
  { value: 'on_time_delivery_rate', label: 'On-time delivery rate' },
  { value: 'quality_score', label: 'Quality score' },
  { value: 'defect_rate', label: 'Defect rate' },
  { value: 'rejection_rate', label: 'Rejection rate' },
  { value: 'return_rate', label: 'Return rate' },
  { value: 'average_lead_time', label: 'Average lead time' },
  { value: 'average_moq', label: 'Average MOQ' },
];

const PERIOD_OPTIONS: { value: SupplierAnalyticsPeriod; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'year', label: 'Year' },
];

const COMPARISON_OPTIONS: { value: SupplierComparisonType; label: string }[] = [
  { value: 'previous_period', label: 'Previous period' },
  { value: 'same_period_last_year', label: 'Same period last year' },
  { value: 'verification_score', label: 'Verification score' },
  { value: 'risk_score', label: 'Risk score' },
  { value: 'expected_performance', label: 'Expected performance' },
];

const PERCENT_METRICS = new Set<SupplierAnalyticsMetricType>([
  'quotation_response_rate',
  'price_competitiveness',
  'fulfillment_rate',
  'on_time_dispatch_rate',
  'on_time_delivery_rate',
  'defect_rate',
  'rejection_rate',
  'return_rate',
]);

type BaseParams = { workspaceId: string; startDate: string; endDate: string } | undefined;

export default function SupplierAnalyticsPage() {
  const workspaceId = useAuthStore((s) => s.user?.workspaceId);
  const [startDate, setStartDate] = useState(isoDaysAgo(90));
  const [endDate, setEndDate] = useState(isoDaysAgo(0));

  const baseParams = useMemo(() => (workspaceId ? { workspaceId, startDate, endDate } : undefined), [workspaceId, startDate, endDate]);

  return (
    <div>
      <PageHeader title="Supplier Analytics" description="Quotation, procurement and quality performance by supplier, provider, category and country." />

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <FormField label="Start date" htmlFor="sa-start">
          <Input id="sa-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9" />
        </FormField>
        <FormField label="End date" htmlFor="sa-end">
          <Input id="sa-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9" />
        </FormField>
      </div>

      <Tabs defaultValue="performance">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="ranking">Ranking</TabsTrigger>
          <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="comparison">Comparison</TabsTrigger>
        </TabsList>

        <TabsContent value="performance">
          <PerformanceTab params={baseParams} />
        </TabsContent>
        <TabsContent value="ranking">
          <RankingTab params={baseParams} />
        </TabsContent>
        <TabsContent value="breakdown">
          <BreakdownTab params={baseParams} />
        </TabsContent>
        <TabsContent value="trends">
          <TrendsTab params={baseParams} />
        </TabsContent>
        <TabsContent value="comparison">
          <ComparisonTab params={baseParams} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PerformanceTab({ params }: { params: BaseParams }) {
  const [category, setCategory] = useState<SupplierPerformanceCategory | ''>('');
  const performance = useSupplierPerformanceList(
    params ? { ...params, performanceCategory: category || undefined, limit: 50, sortBy: 'overallScore', sortOrder: 'desc' } : undefined,
  );

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Select
          value={category}
          onChange={(e) => setCategory(e.target.value as SupplierPerformanceCategory | '')}
          options={[{ value: '', label: 'All categories' }, ...CATEGORY_OPTIONS]}
          className="h-9 w-52"
        />
      </div>
      {performance.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !performance.data || performance.data.length === 0 ? (
        <EmptyState title="No supplier performance data" description="No suppliers had enough activity in this period to compute performance scores." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Supplier</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Response rate</TableHead>
              <TableHead>Fulfillment rate</TableHead>
              <TableHead>Quality score</TableHead>
              <TableHead>Overall score</TableHead>
              <TableHead>Rank</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {performance.data.map((row) => (
              <TableRow key={row.supplierId}>
                <TableCell className="text-sm font-medium text-foreground">
                  {row.supplierName}
                  {row.country && <span className="ml-1 text-xs text-muted-foreground">({row.country})</span>}
                </TableCell>
                <TableCell>
                  <StatusBadge status={row.performanceCategory} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{row.quotationMetrics.responseRate.toFixed(1)}%</TableCell>
                <TableCell className="text-sm text-muted-foreground">{row.procurementMetrics.fulfillmentRate.toFixed(1)}%</TableCell>
                <TableCell className="text-sm text-muted-foreground">{row.qualityMetrics.qualityScore.toFixed(1)}</TableCell>
                <TableCell className="text-sm text-foreground">{row.overallScore.toFixed(1)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{row.rank ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function RankingTab({ params }: { params: BaseParams }) {
  const ranking = useSupplierRanking(params ? { ...params, limit: 50 } : undefined);

  return ranking.isLoading ? (
    <Skeleton className="h-64 w-full" />
  ) : !ranking.data || ranking.data.length === 0 ? (
    <EmptyState title="No ranking data" description="Not enough supplier activity in this period to compute a ranking." />
  ) : (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Rank</TableHead>
          <TableHead>Supplier</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Quotation score</TableHead>
          <TableHead>Procurement score</TableHead>
          <TableHead>Quality score</TableHead>
          <TableHead>Overall score</TableHead>
          <TableHead>Risk score</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ranking.data.map((row) => (
          <TableRow key={row.supplierId}>
            <TableCell className="text-sm font-medium text-foreground">#{row.rank}</TableCell>
            <TableCell className="text-sm text-foreground">{row.supplierName}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{row.category ?? '—'}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{row.quotationScore.toFixed(1)}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{row.procurementScore.toFixed(1)}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{row.qualityScore.toFixed(1)}</TableCell>
            <TableCell className="text-sm text-foreground">{row.overallScore.toFixed(1)}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{row.riskScore != null ? row.riskScore.toFixed(1) : '—'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function BreakdownTab({ params }: { params: BaseParams }) {
  const [dimension, setDimension] = useState<SupplierAnalyticsDimension>('category');
  const breakdown = useSupplierBreakdown(params ? { ...params, dimension, limit: 20 } : undefined);

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Select value={dimension} onChange={(e) => setDimension(e.target.value as SupplierAnalyticsDimension)} options={DIMENSION_OPTIONS} className="h-9 w-48" />
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
              <TableHead>Response rate</TableHead>
              <TableHead>Fulfillment rate</TableHead>
              <TableHead>Quality score</TableHead>
              <TableHead>Overall score</TableHead>
              <TableHead>Rank</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {breakdown.data.map((row, i) => (
              <TableRow key={i}>
                <TableCell className="text-sm font-medium text-foreground">{row.dimensionLabel ?? row.dimensionValue}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{row.quotationMetrics.responseRate.toFixed(1)}%</TableCell>
                <TableCell className="text-sm text-muted-foreground">{row.procurementMetrics.fulfillmentRate.toFixed(1)}%</TableCell>
                <TableCell className="text-sm text-muted-foreground">{row.qualityMetrics.qualityScore.toFixed(1)}</TableCell>
                <TableCell className="text-sm text-foreground">{row.overallScore.toFixed(1)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{row.rank ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function useSupplierOptions(workspaceId: string | undefined) {
  const suppliers = useSuppliers(workspaceId ? { limit: 100 } : undefined);
  return (suppliers.data?.items ?? []).map((s) => ({ value: s.id, label: s.name }));
}

function TrendsTab({ params }: { params: BaseParams }) {
  const [supplierId, setSupplierId] = useState('');
  const [metricType, setMetricType] = useState<SupplierAnalyticsMetricType>('fulfillment_rate');
  const [period, setPeriod] = useState<SupplierAnalyticsPeriod>('week');
  const supplierOptions = useSupplierOptions(params?.workspaceId);

  const trends = useSupplierTrends(params && supplierId ? { ...params, supplierId, metricType, period } : undefined);
  const isPercent = PERCENT_METRICS.has(metricType);
  const chartData = (trends.data ?? []).map((t) => ({ label: formatDate(t.periodStart), value: t.value }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <FormField label="Supplier" htmlFor="sa-trend-supplier">
          <Select
            id="sa-trend-supplier"
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            options={supplierOptions}
            placeholder="Select a supplier"
            className="h-9 w-64"
          />
        </FormField>
        <FormField label="Metric" htmlFor="sa-trend-metric">
          <Select id="sa-trend-metric" value={metricType} onChange={(e) => setMetricType(e.target.value as SupplierAnalyticsMetricType)} options={METRIC_OPTIONS} className="h-9 w-56" />
        </FormField>
        <FormField label="Period" htmlFor="sa-trend-period">
          <Select id="sa-trend-period" value={period} onChange={(e) => setPeriod(e.target.value as SupplierAnalyticsPeriod)} options={PERIOD_OPTIONS} className="h-9 w-36" />
        </FormField>
      </div>

      {!supplierId ? (
        <EmptyState title="Select a supplier" description="Choose a supplier above to view its metric trend." className="border-none py-10" />
      ) : trends.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <TrendChart data={chartData} valueFormatter={(v) => (isPercent ? `${v.toFixed(1)}%` : v.toFixed(2))} />
      )}
    </div>
  );
}

function ComparisonTab({ params }: { params: BaseParams }) {
  const [supplierId, setSupplierId] = useState('');
  const [comparisonType, setComparisonType] = useState<SupplierComparisonType>('previous_period');
  const supplierOptions = useSupplierOptions(params?.workspaceId);

  const comparison = useSupplierComparison(params && supplierId ? { ...params, supplierId, comparisonType } : undefined);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <FormField label="Supplier" htmlFor="sa-cmp-supplier">
          <Select
            id="sa-cmp-supplier"
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            options={supplierOptions}
            placeholder="Select a supplier"
            className="h-9 w-64"
          />
        </FormField>
        <FormField label="Compare against" htmlFor="sa-cmp-type">
          <Select id="sa-cmp-type" value={comparisonType} onChange={(e) => setComparisonType(e.target.value as SupplierComparisonType)} options={COMPARISON_OPTIONS} className="h-9 w-56" />
        </FormField>
      </div>

      {!supplierId ? (
        <EmptyState title="Select a supplier" description="Choose a supplier above to compare its performance." className="border-none py-10" />
      ) : comparison.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : !comparison.data ? (
        <EmptyState title="No comparison data" className="border-none py-10" />
      ) : (
        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <VarianceField label="Response rate" points={comparison.data.variance.responseRatePoints} />
          <VarianceField label="Price competitiveness" points={comparison.data.variance.priceCompetitivenessPoints} />
          <VarianceField label="Fulfillment rate" points={comparison.data.variance.fulfillmentRatePoints} />
          <VarianceField label="On-time delivery" points={comparison.data.variance.onTimeDeliveryRatePoints} />
          <VarianceField label="Quality score" points={comparison.data.variance.qualityScorePoints} />
          <VarianceField label="Defect rate" points={comparison.data.variance.defectRatePoints} />
          <VarianceField label="Overall score" points={comparison.data.variance.overallScorePoints} />
        </div>
      )}
    </div>
  );
}

function VarianceField({ label, points }: { label: string; points: number }) {
  const positive = points >= 0;
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={positive ? 'text-success' : 'text-danger'}>
        {positive ? '+' : ''}
        {points.toFixed(1)} pts
      </p>
    </div>
  );
}
