'use client';

import { useState } from 'react';
import { isAxiosError } from 'axios';
import { Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FilterBar } from '@/components/ui/filter-bar';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState, UnauthorizedState } from '@/components/ui/states';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/action-menu';
import { ReasonDialog } from '@/components/suppliers/reason-dialog';
import {
  useApprovePricingRecord,
  useArchivePricingRecord,
  useBulkCalculatePricing,
  useCalculatePricing,
  useCancelPriceSync,
  useCreatePricingConfig,
  useCurrentUser,
  useCreatePriceSyncSchedule,
  useDeletePricingConfig,
  useDeletePriceSyncSchedule,
  useMarketplaceAccounts,
  usePriceConflicts,
  usePricingComparison,
  usePricingConfigs,
  usePricingRecord,
  usePricingRecordHistory,
  usePricingRecords,
  usePriceSyncItemResults,
  usePriceSyncJob,
  usePriceSyncJobs,
  usePriceSyncMetrics,
  usePriceSyncSchedules,
  useResolvePriceConflict,
  useRetryFailedPriceItems,
  useSimulatePricing,
  useStartPriceSync,
} from '@/hooks';
import { formatCurrency, formatDate } from '@/lib/utils';
import type {
  CalculatePricingPayload,
  CreatePriceSyncSchedulePayload,
  CreatePricingConfigPayload,
  PriceConflictResolutionStrategy,
  PriceSyncDirection,
  PriceSyncItemType,
  PriceSyncJobStatus,
  PriceSyncMode,
  PricingStatus,
  PricingStrategy,
  StartPriceSyncPayload,
} from '@/types';

const STRATEGY_OPTIONS: { value: PricingStrategy; label: string }[] = [
  { value: 'FIXED', label: 'Fixed' },
  { value: 'MARGIN_BASED', label: 'Margin based' },
  { value: 'ROI_BASED', label: 'ROI based' },
  { value: 'COMPETITIVE', label: 'Competitive' },
  { value: 'RULE_BASED', label: 'Rule based' },
  { value: 'COST_PLUS', label: 'Cost plus' },
  { value: 'MARKETPLACE_SPECIFIC', label: 'Marketplace specific' },
  { value: 'REGIONAL', label: 'Regional' },
];

const STATUS_OPTIONS: { value: PricingStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'CALCULATING', label: 'Calculating' },
  { value: 'CALCULATED', label: 'Calculated' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ARCHIVED', label: 'Archived' },
  { value: 'FAILED', label: 'Failed' },
];

const DIRECTION_OPTIONS: { value: PriceSyncDirection; label: string }[] = [
  { value: 'INBOUND', label: 'Inbound' },
  { value: 'OUTBOUND', label: 'Outbound' },
  { value: 'BIDIRECTIONAL', label: 'Bidirectional' },
];

const MODE_OPTIONS: { value: PriceSyncMode; label: string }[] = [
  { value: 'FULL', label: 'Full' },
  { value: 'INCREMENTAL', label: 'Incremental' },
  { value: 'MANUAL', label: 'Manual' },
];

const ITEM_TYPE_OPTIONS: { value: PriceSyncItemType; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'BASE', label: 'Base' },
  { value: 'SALE', label: 'Sale' },
  { value: 'LIST', label: 'List' },
  { value: 'PROMOTION', label: 'Promotion' },
  { value: 'SCHEDULED', label: 'Scheduled' },
];

const CONFLICT_STRATEGY_OPTIONS: { value: PriceConflictResolutionStrategy; label: string }[] = [
  { value: 'MARKETPLACE_WINS', label: 'Marketplace wins' },
  { value: 'ATLAS_WINS', label: 'ATLAS wins' },
  { value: 'NEWEST_WINS', label: 'Newest wins' },
  { value: 'HIGHEST_PRICE_WINS', label: 'Highest price wins' },
  { value: 'LOWEST_PRICE_WINS', label: 'Lowest price wins' },
  { value: 'SKIP', label: 'Skip' },
  { value: 'FLAG', label: 'Flag for review' },
];

const SYNC_STATUS_OPTIONS: { value: PriceSyncJobStatus; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'RUNNING', label: 'Running' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'PARTIAL', label: 'Partial' },
];

export default function PricingPage() {
  return (
    <div>
      <PageHeader title="Pricing" description="Base cost, marketplace price, fees, margin, ROI, scheduled prices and marketplace synchronization." />
      <Tabs defaultValue="records">
        <TabsList>
          <TabsTrigger value="records">Pricing Records</TabsTrigger>
          <TabsTrigger value="configs">Pricing Configs</TabsTrigger>
          <TabsTrigger value="calculator">Calculator & Bulk Update</TabsTrigger>
          <TabsTrigger value="compare">Marketplace Compare</TabsTrigger>
          <TabsTrigger value="sync">Marketplace Sync</TabsTrigger>
        </TabsList>
        <TabsContent value="records">
          <RecordsTab />
        </TabsContent>
        <TabsContent value="configs">
          <ConfigsTab />
        </TabsContent>
        <TabsContent value="calculator">
          <CalculatorTab />
        </TabsContent>
        <TabsContent value="compare">
          <CompareTab />
        </TabsContent>
        <TabsContent value="sync">
          <MarketplaceSyncTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PricingKpiStrip() {
  const active = usePricingRecords({ status: ['ACTIVE'], limit: 1 });
  const pending = usePricingRecords({ status: ['CALCULATED'], limit: 1 });
  const failed = usePricingRecords({ status: ['FAILED'], limit: 1 });
  const draft = usePricingRecords({ status: ['DRAFT'], limit: 1 });

  const cards = [
    { key: 'active', label: 'Active', total: active.data?.total, isLoading: active.isLoading },
    { key: 'pending', label: 'Pending approval', total: pending.data?.total, isLoading: pending.isLoading },
    { key: 'failed', label: 'Failed / invalid', total: failed.data?.total, isLoading: failed.isLoading },
    { key: 'draft', label: 'Draft', total: draft.data?.total, isLoading: draft.isLoading },
  ];

  return (
    <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.key}>
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{c.label}</p>
            {c.isLoading ? <Skeleton className="mt-1 h-7 w-14" /> : <p className="mt-1 text-2xl font-bold text-foreground">{c.total ?? 0}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function RecordsTab() {
  const [catalogProductId, setCatalogProductId] = useState('');
  const [marketplaceKey, setMarketplaceKey] = useState('');
  const [country, setCountry] = useState('');
  const [strategy, setStrategy] = useState<PricingStrategy | ''>('');
  const [status, setStatus] = useState<PricingStatus | ''>('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = usePricingRecords({
    catalogProductId: catalogProductId || undefined,
    marketplaceKey: marketplaceKey || undefined,
    country: country || undefined,
    strategy: strategy || undefined,
    status: status ? [status] : undefined,
    page,
    limit,
  });
  const isForbidden = isAxiosError(error) && error.response?.status === 403;
  const hasActiveFilters = !!catalogProductId || !!marketplaceKey || !!country || !!strategy || !!status;

  return (
    <div>
      <PricingKpiStrip />
      <FilterBar
        hasActiveFilters={hasActiveFilters}
        onClearFilters={() => { setCatalogProductId(''); setMarketplaceKey(''); setCountry(''); setStrategy(''); setStatus(''); setPage(1); }}
        searchValue={catalogProductId}
        onSearchChange={(v) => { setCatalogProductId(v); setPage(1); }}
        searchPlaceholder="Search by product / SKU…"
        className="mb-4"
      >
        <Input value={marketplaceKey} onChange={(e) => { setMarketplaceKey(e.target.value); setPage(1); }} placeholder="Marketplace key…" className="h-9 w-40" />
        <Input value={country} onChange={(e) => { setCountry(e.target.value); setPage(1); }} placeholder="Country…" className="h-9 w-28" />
        <Select value={strategy} onChange={(e) => { setStrategy(e.target.value as PricingStrategy | ''); setPage(1); }} placeholder="All strategies" options={STRATEGY_OPTIONS} className="h-9 w-40" />
        <Select value={status} onChange={(e) => { setStatus(e.target.value as PricingStatus | ''); setPage(1); }} placeholder="All statuses" options={STATUS_OPTIONS} className="h-9 w-40" />
      </FilterBar>

      {isForbidden ? (
        <UnauthorizedState />
      ) : isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load pricing records." />
      ) : isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No pricing records yet" description="Records appear here once pricing is calculated for a product." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Marketplace</TableHead>
              <TableHead>Strategy</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Selling price</TableHead>
              <TableHead>Margin</TableHead>
              <TableHead>ROI</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((r) => (
              <TableRow key={r.id} clickable onClick={() => setSelectedId(r.id)}>
                <TableCell className="text-sm font-medium text-foreground">{r.catalogProductId}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.marketplaceKey} · {r.country}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.strategy}</TableCell>
                <TableCell>
                  <StatusBadge status={r.status} />
                </TableCell>
                <TableCell className="text-sm text-foreground">
                  {r.marketplaceSellingPrice != null ? formatCurrency(r.marketplaceSellingPrice, r.currency) : '—'}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.estimatedMarginPct != null ? `${r.estimatedMarginPct.toFixed(1)}%` : '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.estimatedRoi != null ? `${r.estimatedRoi.toFixed(1)}%` : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {data && data.total > 0 && (
        <Pagination page={page} limit={limit} total={data.total} totalPages={data.totalPages} onPageChange={setPage} onLimitChange={(l) => { setLimit(l); setPage(1); }} />
      )}

      <RecordDetailDialog id={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function RecordDetailDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: record, isLoading } = usePricingRecord(id ?? undefined);
  const { data: history } = usePricingRecordHistory(id ?? undefined);
  const approve = useApprovePricingRecord(id ?? '');
  const archive = useArchivePricingRecord(id ?? '');
  const [archiveOpen, setArchiveOpen] = useState(false);

  const actions: ActionMenuItem[] = [];
  if (record && (record.status === 'CALCULATED' || record.status === 'ACTIVE')) {
    actions.push({ label: 'Approve', onSelect: () => approve.mutate(undefined) });
  }
  if (record && record.status !== 'ARCHIVED') {
    actions.push({ label: 'Archive', onSelect: () => setArchiveOpen(true), destructive: true, separatorBefore: true });
  }

  return (
    <Dialog open={!!id} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>Pricing Record</span>
            {record && <ActionMenu items={actions} />}
          </DialogTitle>
        </DialogHeader>
        {isLoading || !record ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <Field label="Product" value={record.catalogProductId} />
              <Field label="Marketplace" value={`${record.marketplaceKey} · ${record.country}`} />
              <Field label="Strategy" value={record.strategy} />
              <Field label="Status" value={record.status} />
              <Field label="Version" value={String(record.version)} />
              <Field label="Valid" value={record.isValid ? 'Yes' : 'No'} />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <Field label="Base cost" value={record.baseCost != null ? formatCurrency(record.baseCost, record.currency) : '—'} />
              <Field label="Landed cost" value={record.landedCost != null ? formatCurrency(record.landedCost, record.currency) : '—'} />
              <Field label="Total cost" value={record.totalCost != null ? formatCurrency(record.totalCost, record.currency) : '—'} />
              <Field label="Suggested price" value={record.suggestedSellingPrice != null ? formatCurrency(record.suggestedSellingPrice, record.currency) : '—'} />
              <Field label="Marketplace price" value={record.marketplaceSellingPrice != null ? formatCurrency(record.marketplaceSellingPrice, record.currency) : '—'} />
              <Field label="Compare-at price" value={record.compareAtPrice != null ? formatCurrency(record.compareAtPrice, record.currency) : '—'} />
              <Field label="Manual override" value={record.manualOverridePrice != null ? formatCurrency(record.manualOverridePrice, record.currency) : '—'} />
              <Field label="Scheduled price" value={record.scheduledPrice != null ? formatCurrency(record.scheduledPrice, record.currency) : '—'} />
              <Field label="Scheduled at" value={record.scheduledAt ? formatDate(record.scheduledAt) : '—'} />
              <Field label="Estimated profit" value={record.estimatedProfit != null ? formatCurrency(record.estimatedProfit, record.currency) : '—'} />
              <Field label="Estimated margin" value={record.estimatedMarginPct != null ? `${record.estimatedMarginPct.toFixed(1)}%` : '—'} />
              <Field label="Estimated ROI" value={record.estimatedRoi != null ? `${record.estimatedRoi.toFixed(1)}%` : '—'} />
            </div>

            {record.validationErrors && record.validationErrors.length > 0 && (
              <div className="rounded-[var(--radius)] border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
                {record.validationErrors.join(', ')}
              </div>
            )}
            {record.errorMessage && (
              <div className="rounded-[var(--radius)] border border-danger/30 bg-danger/5 p-3 text-sm text-danger">{record.errorMessage}</div>
            )}

            {history && history.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">History</p>
                <ul className="space-y-2">
                  {history.map((h) => (
                    <li key={h.id} className="flex items-center justify-between rounded-[var(--radius)] border border-border p-2 text-sm">
                      <span className="text-foreground">v{h.version} · {h.status}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(h.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </DialogContent>
      <ReasonDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title="Archive this pricing record"
        label="Reason"
        confirmLabel="Archive"
        variant="danger"
        pending={archive.isPending}
        onSubmit={(reason) => archive.mutate(reason, { onSuccess: () => { setArchiveOpen(false); onClose(); } })}
      />
    </Dialog>
  );
}

function ConfigsTab() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, refetch } = usePricingConfigs({ page, limit: 20 });
  const deleteConfig = useDeletePricingConfig();
  const [createOpen, setCreateOpen] = useState(false);
  const isForbidden = isAxiosError(error) && error.response?.status === 403;

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          New config
        </Button>
      </div>

      {isForbidden ? (
        <UnauthorizedState />
      ) : isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load pricing configs." />
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No pricing configs yet" description="Create a config to define default fee components and thresholds per marketplace." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.data.map((c) => (
            <Card key={c.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-sm">
                  <span>{c.marketplaceKey} · {c.country}</span>
                  {c.isDefault && <StatusBadge status="DEFAULT" tone="info" />}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Field label="Strategy" value={c.strategy} />
                <Field label="Currency" value={c.currency} />
                <Field label="Status" value={c.isActive ? 'Active' : 'Inactive'} />
                <div className="pt-2">
                  <Button variant="ghost" size="sm" onClick={() => deleteConfig.mutate(c.id)} disabled={deleteConfig.isPending}>
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {data && data.total > 0 && (
        <Pagination page={page} limit={20} total={data.total} totalPages={data.totalPages} onPageChange={setPage} onLimitChange={() => {}} />
      )}

      <CreateConfigDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function CreateConfigDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const createConfig = useCreatePricingConfig();
  const [form, setForm] = useState<CreatePricingConfigPayload>({ marketplaceKey: '', strategy: 'MARGIN_BASED' });

  const reset = () => setForm({ marketplaceKey: '', strategy: 'MARGIN_BASED' });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>New pricing config</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <FormField label="Marketplace key" htmlFor="cfg-marketplace" required>
            <Input id="cfg-marketplace" value={form.marketplaceKey} onChange={(e) => setForm((f) => ({ ...f, marketplaceKey: e.target.value }))} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Country" htmlFor="cfg-country">
              <Input id="cfg-country" value={form.country ?? ''} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} />
            </FormField>
            <FormField label="Currency" htmlFor="cfg-currency">
              <Input id="cfg-currency" value={form.currency ?? ''} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))} />
            </FormField>
          </div>
          <FormField label="Strategy" htmlFor="cfg-strategy" required>
            <Select id="cfg-strategy" value={form.strategy} onChange={(e) => setForm((f) => ({ ...f, strategy: e.target.value as PricingStrategy }))} options={STRATEGY_OPTIONS} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Commission %" htmlFor="cfg-commission">
              <Input id="cfg-commission" type="number" min="0" max="100" value={form.commissionPct ?? ''} onChange={(e) => setForm((f) => ({ ...f, commissionPct: e.target.value ? Number(e.target.value) : undefined }))} />
            </FormField>
            <FormField label="Target margin %" htmlFor="cfg-margin">
              <Input id="cfg-margin" type="number" value={form.targetMarginPct ?? ''} onChange={(e) => setForm((f) => ({ ...f, targetMarginPct: e.target.value ? Number(e.target.value) : undefined }))} />
            </FormField>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => createConfig.mutate(form, { onSuccess: () => { onOpenChange(false); reset(); } })}
            disabled={!form.marketplaceKey || createConfig.isPending}
          >
            {createConfig.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CalculatorTab() {
  const [catalogProductId, setCatalogProductId] = useState('');
  const [marketplaceKey, setMarketplaceKey] = useState('');
  const [strategy, setStrategy] = useState<PricingStrategy>('MARGIN_BASED');
  const [baseCost, setBaseCost] = useState('');
  const [landedCost, setLandedCost] = useState('');

  const calculate = useCalculatePricing();
  const simulate = useSimulatePricing();

  const result = calculate.data ?? simulate.data;
  const currency = 'USD';

  return (
    <div className="space-y-6">
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Calculate / Simulate</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField label="Catalog product ID" htmlFor="calc-product" hint="Required to save as a pricing record; leave blank to only simulate.">
            <Input id="calc-product" value={catalogProductId} onChange={(e) => setCatalogProductId(e.target.value)} />
          </FormField>
          <FormField label="Marketplace key" htmlFor="calc-marketplace" required>
            <Input id="calc-marketplace" value={marketplaceKey} onChange={(e) => setMarketplaceKey(e.target.value)} />
          </FormField>
          <FormField label="Strategy" htmlFor="calc-strategy" required>
            <Select id="calc-strategy" value={strategy} onChange={(e) => setStrategy(e.target.value as PricingStrategy)} options={STRATEGY_OPTIONS} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Base cost" htmlFor="calc-base-cost" required>
              <Input id="calc-base-cost" type="number" min="0" step="0.01" value={baseCost} onChange={(e) => setBaseCost(e.target.value)} />
            </FormField>
            <FormField label="Landed cost" htmlFor="calc-landed-cost">
              <Input id="calc-landed-cost" type="number" min="0" step="0.01" value={landedCost} onChange={(e) => setLandedCost(e.target.value)} />
            </FormField>
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() =>
                simulate.mutate({ baseCost: Number(baseCost), landedCost: landedCost ? Number(landedCost) : undefined, strategy, marketplaceKey })
              }
              disabled={!baseCost || !marketplaceKey || simulate.isPending}
            >
              {simulate.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Simulate
            </Button>
            <Button
              onClick={() =>
                calculate.mutate({
                  catalogProductId: catalogProductId || `sim_${Date.now()}`,
                  marketplaceKey,
                  strategy,
                  baseCost: baseCost ? Number(baseCost) : undefined,
                  landedCost: landedCost ? Number(landedCost) : undefined,
                })
              }
              disabled={!baseCost || !marketplaceKey || !catalogProductId || calculate.isPending}
            >
              {calculate.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Calculate & save
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Result</CardTitle>
        </CardHeader>
        <CardContent>
          {!result ? (
            <EmptyState title="No calculation yet" description="Run a simulation or calculation to see the pricing breakdown." className="border-none py-8" />
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <Field label="Total cost" value={formatCurrency(result.totalCost, currency)} />
                <Field label="Suggested price" value={formatCurrency(result.suggestedSellingPrice, currency)} />
                <Field label="Marketplace price" value={formatCurrency(result.marketplaceSellingPrice, currency)} />
                <Field label="Estimated profit" value={formatCurrency(result.estimatedProfit, currency)} />
                <Field label="Margin" value={`${result.estimatedMarginPct.toFixed(1)}%`} />
                <Field label="ROI" value={`${result.estimatedRoi.toFixed(1)}%`} />
              </div>
              {result.warnings.length > 0 && (
                <div className="rounded-[var(--radius)] border border-warning/30 bg-warning/5 p-3 text-sm text-warning">{result.warnings.join(', ')}</div>
              )}
              {result.breakdown.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Breakdown</p>
                  <ul className="space-y-1.5">
                    {result.breakdown.map((b, i) => (
                      <li key={i} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{b.component}</span>
                        <span className="text-foreground">{formatCurrency(b.computedAmount, currency)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    <BulkUpdatePanel />
    </div>
  );
}

interface BulkRow {
  catalogProductId: string;
  marketplaceKey: string;
  baseCost: string;
  strategy: PricingStrategy;
}

function BulkUpdatePanel() {
  const bulkCalculate = useBulkCalculatePricing();
  const [rows, setRows] = useState<BulkRow[]>([{ catalogProductId: '', marketplaceKey: '', baseCost: '', strategy: 'MARGIN_BASED' }]);

  const updateRow = (index: number, patch: Partial<BulkRow>) => {
    setRows((r) => r.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };
  const addRow = () => setRows((r) => [...r, { catalogProductId: '', marketplaceKey: '', baseCost: '', strategy: 'MARGIN_BASED' }]);
  const removeRow = (index: number) => setRows((r) => r.filter((_, i) => i !== index));

  const canSubmit = rows.length > 0 && rows.every((r) => r.catalogProductId && r.marketplaceKey && r.baseCost);

  const handleSubmit = () => {
    const items: CalculatePricingPayload[] = rows.map((r) => ({
      catalogProductId: r.catalogProductId,
      marketplaceKey: r.marketplaceKey,
      strategy: r.strategy,
      baseCost: Number(r.baseCost),
    }));
    bulkCalculate.mutate(items, { onSuccess: () => setRows([{ catalogProductId: '', marketplaceKey: '', baseCost: '', strategy: 'MARGIN_BASED' }]) });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Bulk price update</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          {rows.map((row, i) => (
            <div key={i} className="grid grid-cols-1 gap-2 rounded-[var(--radius)] border border-border p-3 sm:grid-cols-[1fr_1fr_140px_160px_auto] sm:items-end">
              <FormField label="Catalog product ID" htmlFor={`bulk-product-${i}`}>
                <Input id={`bulk-product-${i}`} value={row.catalogProductId} onChange={(e) => updateRow(i, { catalogProductId: e.target.value })} />
              </FormField>
              <FormField label="Marketplace key" htmlFor={`bulk-marketplace-${i}`}>
                <Input id={`bulk-marketplace-${i}`} value={row.marketplaceKey} onChange={(e) => updateRow(i, { marketplaceKey: e.target.value })} />
              </FormField>
              <FormField label="Base cost" htmlFor={`bulk-cost-${i}`}>
                <Input id={`bulk-cost-${i}`} type="number" min="0" step="0.01" value={row.baseCost} onChange={(e) => updateRow(i, { baseCost: e.target.value })} />
              </FormField>
              <FormField label="Strategy" htmlFor={`bulk-strategy-${i}`}>
                <Select id={`bulk-strategy-${i}`} value={row.strategy} onChange={(e) => updateRow(i, { strategy: e.target.value as PricingStrategy })} options={STRATEGY_OPTIONS} />
              </FormField>
              <Button variant="ghost" size="sm" onClick={() => removeRow(i)} disabled={rows.length === 1}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between pt-1">
          <Button variant="outline" size="sm" onClick={addRow}>
            <Plus className="h-4 w-4" />
            Add row
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || bulkCalculate.isPending}>
            {bulkCalculate.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Calculate {rows.length} price{rows.length > 1 ? 's' : ''}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CompareTab() {
  const [catalogProductId, setCatalogProductId] = useState('');
  const [submittedId, setSubmittedId] = useState<string | undefined>(undefined);

  const { data, isLoading, isError, error, refetch } = usePricingComparison(submittedId);
  const isForbidden = isAxiosError(error) && error.response?.status === 403;

  return (
    <div>
      <Card className="mb-4">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
          <FormField label="Catalog product ID" htmlFor="compare-product" className="flex-1">
            <Input id="compare-product" value={catalogProductId} onChange={(e) => setCatalogProductId(e.target.value)} placeholder="Enter a catalog product ID to compare across marketplaces" />
          </FormField>
          <Button onClick={() => setSubmittedId(catalogProductId || undefined)} disabled={!catalogProductId}>
            Compare
          </Button>
        </CardContent>
      </Card>

      {!submittedId ? (
        <EmptyState title="No product selected" description="Enter a catalog product ID above to compare marketplace prices." />
      ) : isForbidden ? (
        <UnauthorizedState />
      ) : isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load the price comparison." />
      ) : isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : !data || data.comparisons.length === 0 ? (
        <EmptyState title="No comparison data" description="No marketplace pricing records were found for this product." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.comparisons.map((c, i) => {
            const isBest = data.bestValue && JSON.stringify(c) === JSON.stringify(data.bestValue);
            return (
              <Card key={i} className={isBest ? 'border-success' : undefined}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-sm">
                    <span>{String((c as Record<string, unknown>)['marketplaceKey'] ?? (c as Record<string, unknown>)['accountId'] ?? `Entry ${i + 1}`)}</span>
                    {isBest && <Badge variant="success">Best value</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5 text-sm">
                  {Object.entries(c as Record<string, unknown>).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between gap-2">
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">{k}</span>
                      <span className="text-foreground">{typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v ?? '—')}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MarketplaceSyncTab() {
  return (
    <Tabs defaultValue="jobs">
      <TabsList>
        <TabsTrigger value="jobs">Sync Jobs</TabsTrigger>
        <TabsTrigger value="conflicts">Conflicts</TabsTrigger>
        <TabsTrigger value="schedules">Schedules</TabsTrigger>
      </TabsList>
      <TabsContent value="jobs">
        <SyncJobsTab />
      </TabsContent>
      <TabsContent value="conflicts">
        <SyncConflictsTab />
      </TabsContent>
      <TabsContent value="schedules">
        <SyncSchedulesTab />
      </TabsContent>
    </Tabs>
  );
}

function SyncMetricsStrip() {
  const { data, isLoading } = usePriceSyncMetrics();
  const cards = [
    { key: 'total', label: 'Total jobs', value: data?.totalJobs },
    { key: 'completed', label: 'Completed', value: data?.completedJobs },
    { key: 'failed', label: 'Failed', value: data?.failedJobs },
    { key: 'active', label: 'Active', value: data?.activeJobs },
    { key: 'conflicts', label: 'Unresolved conflicts', value: data?.unresolvedConflicts },
  ];
  return (
    <div className="mb-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((c) => (
        <Card key={c.key}>
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{c.label}</p>
            {isLoading ? <Skeleton className="mt-1 h-7 w-12" /> : <p className="mt-1 text-2xl font-bold text-foreground">{c.value ?? 0}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SyncJobsTab() {
  const [status, setStatus] = useState<PriceSyncJobStatus | ''>('');
  const [page, setPage] = useState(1);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [startOpen, setStartOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = usePriceSyncJobs({ status: status || undefined, page, limit: 20 });
  const isForbidden = isAxiosError(error) && error.response?.status === 403;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <Select value={status} onChange={(e) => { setStatus(e.target.value as PriceSyncJobStatus | ''); setPage(1); }} placeholder="All statuses" options={SYNC_STATUS_OPTIONS} className="h-9 w-44" />
        <Button onClick={() => setStartOpen(true)}>
          <Plus className="h-4 w-4" />
          Start sync
        </Button>
      </div>

      <SyncMetricsStrip />

      {isForbidden ? (
        <UnauthorizedState />
      ) : isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load sync jobs." />
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No sync jobs yet" description="Start a price sync to see jobs here." />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Marketplace</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Conflicts</TableHead>
                <TableHead>Started</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((job) => (
                <TableRow key={job.id} clickable onClick={() => setSelectedJobId(job.id)}>
                  <TableCell className="text-sm font-medium text-foreground">{job.marketplaceKey} · {job.accountId}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{job.direction}</TableCell>
                  <TableCell>
                    <StatusBadge status={job.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {job.processedItems}/{job.totalItems} ({job.successCount} ok, {job.failedCount} failed)
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{job.conflictCount}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{job.startedAt ? formatDate(job.startedAt) : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.total > 0 && <Pagination page={page} limit={20} total={data.total} totalPages={data.totalPages} onPageChange={setPage} onLimitChange={() => {}} />}
        </>
      )}

      <StartSyncDialog open={startOpen} onOpenChange={setStartOpen} />
      <SyncJobDetailDialog jobId={selectedJobId} onClose={() => setSelectedJobId(null)} />
    </div>
  );
}

function StartSyncDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const startSync = useStartPriceSync();
  const { data: accounts } = useMarketplaceAccounts({ limit: 100 });
  const [form, setForm] = useState<Omit<StartPriceSyncPayload, 'workspaceId'>>({
    accountId: '', providerKey: '', marketplaceKey: '', direction: 'OUTBOUND', mode: 'INCREMENTAL', itemType: 'ALL', conflictStrategy: 'FLAG',
  });

  const reset = () => setForm({ accountId: '', providerKey: '', marketplaceKey: '', direction: 'OUTBOUND', mode: 'INCREMENTAL', itemType: 'ALL', conflictStrategy: 'FLAG' });

  const handleAccountChange = (accountId: string) => {
    const account = accounts?.items.find((a) => a.id === accountId);
    setForm((f) => ({ ...f, accountId, providerKey: account?.providerKey ?? f.providerKey, marketplaceKey: account?.marketplaceKey ?? f.marketplaceKey }));
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Start marketplace price sync</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Marketplace account" htmlFor="sync-account" required className="sm:col-span-2">
            <Select id="sync-account" value={form.accountId} onChange={(e) => handleAccountChange(e.target.value)} placeholder="Select an account" options={(accounts?.items ?? []).map((a) => ({ value: a.id, label: `${a.accountName} · ${a.marketplaceKey}` }))} />
          </FormField>
          <FormField label="Direction" htmlFor="sync-direction" required>
            <Select id="sync-direction" value={form.direction} onChange={(e) => setForm((f) => ({ ...f, direction: e.target.value as PriceSyncDirection }))} options={DIRECTION_OPTIONS} />
          </FormField>
          <FormField label="Mode" htmlFor="sync-mode" required>
            <Select id="sync-mode" value={form.mode} onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value as PriceSyncMode }))} options={MODE_OPTIONS} />
          </FormField>
          <FormField label="Item type" htmlFor="sync-item-type" required>
            <Select id="sync-item-type" value={form.itemType} onChange={(e) => setForm((f) => ({ ...f, itemType: e.target.value as PriceSyncItemType }))} options={ITEM_TYPE_OPTIONS} />
          </FormField>
          <FormField label="Conflict strategy" htmlFor="sync-conflict" required>
            <Select id="sync-conflict" value={form.conflictStrategy} onChange={(e) => setForm((f) => ({ ...f, conflictStrategy: e.target.value as PriceConflictResolutionStrategy }))} options={CONFLICT_STRATEGY_OPTIONS} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => startSync.mutate(form, { onSuccess: () => { onOpenChange(false); reset(); } })}
            disabled={!form.accountId || !form.providerKey || !form.marketplaceKey || startSync.isPending}
          >
            {startSync.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Start sync
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SyncJobDetailDialog({ jobId, onClose }: { jobId: string | null; onClose: () => void }) {
  const { data: job, isLoading } = usePriceSyncJob(jobId ?? undefined);
  const { data: items } = usePriceSyncItemResults(jobId ?? undefined, { limit: 20 });
  const cancelSync = useCancelPriceSync();
  const retry = useRetryFailedPriceItems();

  const actions: ActionMenuItem[] = [];
  if (job && (job.status === 'PENDING' || job.status === 'RUNNING')) {
    actions.push({ label: 'Cancel sync', onSelect: () => cancelSync.mutate(job.id), destructive: true });
  }
  if (job && (job.status === 'FAILED' || job.status === 'PARTIAL') && job.failedCount > 0) {
    actions.push({ label: 'Retry failed items', icon: RefreshCw, onSelect: () => retry.mutate({ originalJobId: job.id }) });
  }

  return (
    <Dialog open={!!jobId} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>Sync job</span>
            {job && <ActionMenu items={actions} />}
          </DialogTitle>
        </DialogHeader>
        {isLoading || !job ? (
          <Skeleton className="h-56 w-full" />
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <Field label="Marketplace" value={job.marketplaceKey} />
              <Field label="Account" value={job.accountId} />
              <Field label="Provider" value={job.providerKey} />
              <Field label="Direction" value={job.direction} />
              <Field label="Mode" value={job.mode} />
              <Field label="Item type" value={job.itemType} />
              <Field label="Status" value={job.status} />
              <Field label="Started" value={job.startedAt ? formatDate(job.startedAt) : '—'} />
              <Field label="Completed" value={job.completedAt ? formatDate(job.completedAt) : '—'} />
              <Field label="Total items" value={String(job.totalItems)} />
              <Field label="Processed" value={String(job.processedItems)} />
              <Field label="Success" value={String(job.successCount)} />
              <Field label="Failed" value={String(job.failedCount)} />
              <Field label="Skipped" value={String(job.skippedCount)} />
              <Field label="Conflicts" value={String(job.conflictCount)} />
            </div>
            {job.errorMessage && (
              <div className="rounded-[var(--radius)] border border-danger/30 bg-danger/5 p-3 text-sm text-danger">{job.errorMessage}</div>
            )}
            {items && items.items.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Item results</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Operation</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.items.map((it) => (
                      <TableRow key={it.id}>
                        <TableCell className="text-sm text-foreground">{it.sku ?? it.externalPriceId}</TableCell>
                        <TableCell>
                          <StatusBadge status={it.status} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{it.operation ?? '—'}</TableCell>
                        <TableCell className="text-sm text-danger">{it.errorMessage ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SyncConflictsTab() {
  const [isResolved, setIsResolved] = useState<'unresolved' | 'resolved' | ''>('unresolved');
  const [page, setPage] = useState(1);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = usePriceConflicts({
    isResolved: isResolved === '' ? undefined : isResolved === 'resolved',
    page,
    limit: 20,
  });
  const isForbidden = isAxiosError(error) && error.response?.status === 403;

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Select
          value={isResolved}
          onChange={(e) => { setIsResolved(e.target.value as 'unresolved' | 'resolved' | ''); setPage(1); }}
          placeholder="All conflicts"
          options={[{ value: 'unresolved', label: 'Unresolved' }, { value: 'resolved', label: 'Resolved' }]}
          className="h-9 w-40"
        />
      </div>

      {isForbidden ? (
        <UnauthorizedState />
      ) : isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load pricing conflicts." />
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No conflicts found" description="Price conflicts detected during marketplace sync will appear here." />
      ) : (
        <>
          <div className="space-y-2">
            {data.items.map((c) => (
              <div key={c.id} className="rounded-[var(--radius)] border border-border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{c.sku ?? c.externalPriceId}</span>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={c.isResolved ? 'RESOLVED' : 'UNRESOLVED'} tone={c.isResolved ? 'success' : 'warning'} />
                    {!c.isResolved && (
                      <Button size="sm" variant="outline" onClick={() => setResolvingId(c.id)}>
                        Resolve
                      </Button>
                    )}
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{c.conflictType}</p>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="rounded-[var(--radius)] border border-border p-2">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Marketplace data</p>
                    <pre className="max-h-24 overflow-auto text-xs text-foreground">{JSON.stringify(c.marketplaceData, null, 2)}</pre>
                  </div>
                  <div className="rounded-[var(--radius)] border border-border p-2">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">ATLAS data</p>
                    <pre className="max-h-24 overflow-auto text-xs text-foreground">{JSON.stringify(c.atlasData, null, 2)}</pre>
                  </div>
                </div>
                {c.isResolved && c.resolution && (
                  <p className="mt-2 text-xs text-success">Resolved: {c.resolution}{c.notes ? ` — ${c.notes}` : ''}</p>
                )}
              </div>
            ))}
          </div>
          {data.total > 0 && <Pagination page={page} limit={20} total={data.total} totalPages={data.totalPages} onPageChange={setPage} onLimitChange={() => {}} />}
        </>
      )}

      <ResolveConflictDialog conflictId={resolvingId} onClose={() => setResolvingId(null)} />
    </div>
  );
}

function ResolveConflictDialog({ conflictId, onClose }: { conflictId: string | null; onClose: () => void }) {
  const resolve = useResolvePriceConflict();
  const currentUser = useCurrentUser();
  const [resolution, setResolution] = useState<PriceConflictResolutionStrategy>('ATLAS_WINS');
  const [notes, setNotes] = useState('');

  return (
    <Dialog open={!!conflictId} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Resolve pricing conflict</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <FormField label="Resolution" htmlFor="resolve-strategy" required>
            <Select id="resolve-strategy" value={resolution} onChange={(e) => setResolution(e.target.value as PriceConflictResolutionStrategy)} options={CONFLICT_STRATEGY_OPTIONS} />
          </FormField>
          <FormField label="Notes" htmlFor="resolve-notes">
            <Input id="resolve-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional context for this resolution" />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => conflictId && currentUser && resolve.mutate({ conflictId, resolution, resolvedBy: currentUser.id, notes: notes || undefined }, { onSuccess: onClose })}
            disabled={resolve.isPending}
          >
            {resolve.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Resolve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SyncSchedulesTab() {
  const { data: schedules, isLoading, isError, error, refetch } = usePriceSyncSchedules();
  const deleteSchedule = useDeletePriceSyncSchedule();
  const [createOpen, setCreateOpen] = useState(false);
  const isForbidden = isAxiosError(error) && error.response?.status === 403;

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          New schedule
        </Button>
      </div>

      {isForbidden ? (
        <UnauthorizedState />
      ) : isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load sync schedules." />
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !schedules || schedules.length === 0 ? (
        <EmptyState title="No sync schedules yet" description="Create a schedule to automatically sync prices on a recurring basis." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {schedules.map((s) => (
            <Card key={s.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-sm">
                  <span>{s.marketplaceKey} · {s.accountId}</span>
                  <StatusBadge status={s.isActive ? 'ACTIVE' : 'INACTIVE'} />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Field label="Cron expression" value={s.cronExpression} />
                <Field label="Direction / Mode" value={`${s.direction} · ${s.mode}`} />
                <Field label="Last run" value={s.lastRunAt ? formatDate(s.lastRunAt) : 'Never'} />
                <Field label="Next run" value={s.nextRunAt ? formatDate(s.nextRunAt) : '—'} />
                <div className="pt-2">
                  <Button variant="ghost" size="sm" onClick={() => deleteSchedule.mutate(s.id)} disabled={deleteSchedule.isPending}>
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateScheduleDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function CreateScheduleDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const createSchedule = useCreatePriceSyncSchedule();
  const { data: accounts } = useMarketplaceAccounts({ limit: 100 });
  const [form, setForm] = useState<Omit<CreatePriceSyncSchedulePayload, 'workspaceId'>>({
    accountId: '', providerKey: '', marketplaceKey: '', direction: 'OUTBOUND', mode: 'INCREMENTAL', itemType: 'ALL', conflictStrategy: 'FLAG', cronExpression: '0 */6 * * *', isActive: true,
  });

  const reset = () => setForm({ accountId: '', providerKey: '', marketplaceKey: '', direction: 'OUTBOUND', mode: 'INCREMENTAL', itemType: 'ALL', conflictStrategy: 'FLAG', cronExpression: '0 */6 * * *', isActive: true });

  const handleAccountChange = (accountId: string) => {
    const account = accounts?.items.find((a) => a.id === accountId);
    setForm((f) => ({ ...f, accountId, providerKey: account?.providerKey ?? f.providerKey, marketplaceKey: account?.marketplaceKey ?? f.marketplaceKey }));
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>New sync schedule</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Marketplace account" htmlFor="sched-account" required className="sm:col-span-2">
            <Select id="sched-account" value={form.accountId} onChange={(e) => handleAccountChange(e.target.value)} placeholder="Select an account" options={(accounts?.items ?? []).map((a) => ({ value: a.id, label: `${a.accountName} · ${a.marketplaceKey}` }))} />
          </FormField>
          <FormField label="Cron expression" htmlFor="sched-cron" required>
            <Input id="sched-cron" value={form.cronExpression} onChange={(e) => setForm((f) => ({ ...f, cronExpression: e.target.value }))} />
          </FormField>
          <FormField label="Direction" htmlFor="sched-direction" required>
            <Select id="sched-direction" value={form.direction} onChange={(e) => setForm((f) => ({ ...f, direction: e.target.value as PriceSyncDirection }))} options={DIRECTION_OPTIONS} />
          </FormField>
          <FormField label="Mode" htmlFor="sched-mode" required>
            <Select id="sched-mode" value={form.mode} onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value as PriceSyncMode }))} options={MODE_OPTIONS} />
          </FormField>
          <FormField label="Item type" htmlFor="sched-item-type" required>
            <Select id="sched-item-type" value={form.itemType} onChange={(e) => setForm((f) => ({ ...f, itemType: e.target.value as PriceSyncItemType }))} options={ITEM_TYPE_OPTIONS} />
          </FormField>
          <FormField label="Conflict strategy" htmlFor="sched-conflict" required>
            <Select id="sched-conflict" value={form.conflictStrategy} onChange={(e) => setForm((f) => ({ ...f, conflictStrategy: e.target.value as PriceConflictResolutionStrategy }))} options={CONFLICT_STRATEGY_OPTIONS} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => createSchedule.mutate(form, { onSuccess: () => { onOpenChange(false); reset(); } })}
            disabled={!form.accountId || !form.cronExpression || createSchedule.isPending}
          >
            {createSchedule.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create schedule
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
