'use client';

import { useState } from 'react';
import { DollarSign, Gauge, Loader2, Plus, Trash2, TrendingDown } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { Switch } from '@/components/ui/switch';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { KpiCard } from '@/components/ui/kpi-card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState } from '@/components/ui/states';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TrendChart } from '@/components/financial/trend-chart';
import {
  useCostBudget,
  useCostBudgetAlerts,
  useCostBudgets,
  useCostPricingConfig,
  useCostPricingConfigs,
  useCostSummary,
  useCreateCostBudget,
  useCreateCostPricingConfig,
  useCreateUsageQuota,
  useDeleteCostBudget,
  useDeleteCostPricingConfig,
  useDeleteUsageQuota,
  useUpdateCostBudget,
  useUpdateCostPricingConfig,
  useUpdateUsageQuota,
  useUsageBreakdown,
  useUsageQuota,
  useUsageQuotaAlerts,
  useUsageQuotas,
  useUsageSummary,
} from '@/hooks';
import { useAuthStore } from '@/stores';
import { formatCurrency } from '@/lib/utils';
import type {
  AiCostBudgetPeriod,
  AiCostBudgetScope,
  AiUsageQuotaPeriod,
  AiUsageQuotaScope,
  AiUsageQuotaUnit,
  CostSummaryGroupByField,
  CreateCostBudgetPayload,
  CreateCostPricingConfigPayload,
  CreateUsageQuotaPayload,
  UsageSummaryGroupByField,
} from '@/types';

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

const GROUP_OPTIONS: { value: CostSummaryGroupByField; label: string }[] = [
  { value: 'providerKey', label: 'Provider' },
  { value: 'modelKey', label: 'Model' },
  { value: 'capability', label: 'Capability' },
  { value: 'feature', label: 'Feature' },
  { value: 'agentId', label: 'Agent' },
  { value: 'workflowId', label: 'Workflow' },
  { value: 'userId', label: 'User' },
];

export default function AiCostPage() {
  const workspaceId = useAuthStore((s) => s.user?.workspaceId);
  const [startDate, setStartDate] = useState(isoDaysAgo(30));
  const [endDate, setEndDate] = useState(isoDaysAgo(0));

  return (
    <div>
      <PageHeader title="AI Cost & Usage" description="Cost breakdown by provider, model, agent, workflow, feature and user; token usage, quotas and thresholds." />

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <FormField label="Start date" htmlFor="cost-start">
          <Input id="cost-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9" />
        </FormField>
        <FormField label="End date" htmlFor="cost-end">
          <Input id="cost-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9" />
        </FormField>
      </div>

      <Tabs defaultValue="cost">
        <TabsList>
          <TabsTrigger value="cost">Cost</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="pricing">Pricing Configs</TabsTrigger>
          <TabsTrigger value="budgets">Budgets & Quotas</TabsTrigger>
        </TabsList>
        <TabsContent value="cost">
          <CostTab workspaceId={workspaceId} startDate={startDate} endDate={endDate} />
        </TabsContent>
        <TabsContent value="usage">
          <UsageTab workspaceId={workspaceId} startDate={startDate} endDate={endDate} />
        </TabsContent>
        <TabsContent value="pricing">
          <PricingConfigsTab workspaceId={workspaceId} />
        </TabsContent>
        <TabsContent value="budgets">
          <BudgetsTab workspaceId={workspaceId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CostTab({ workspaceId, startDate, endDate }: { workspaceId: string | undefined; startDate: string; endDate: string }) {
  const [groupBy, setGroupBy] = useState<CostSummaryGroupByField>('providerKey');
  const summary = useCostSummary({ workspaceId: workspaceId ?? '', startDate, endDate, groupBy });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Total cost" value={summary.data ? formatCurrency(summary.data.totalCost, 'USD') : '—'} icon={DollarSign} loading={summary.isLoading} />
        <KpiCard label="Estimated cost" value={summary.data ? formatCurrency(summary.data.totalEstimatedCost, 'USD') : '—'} loading={summary.isLoading} />
        <KpiCard label="Total requests" value={summary.data?.totalRequests ?? 0} loading={summary.isLoading} />
        <KpiCard label="Failed requests" value={summary.data?.failedRequests ?? 0} loading={summary.isLoading} />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Retried requests" value={summary.data?.retriedRequests ?? 0} loading={summary.isLoading} />
        <KpiCard label="Fallback requests" value={summary.data?.fallbackRequests ?? 0} loading={summary.isLoading} />
        <KpiCard label="Duplicate spend" value={summary.data ? formatCurrency(summary.data.duplicateSpend, 'USD') : '—'} icon={TrendingDown} loading={summary.isLoading} />
        <KpiCard label="Avg latency" value={summary.data ? `${summary.data.averageLatencyMs.toFixed(0)}ms` : '—'} loading={summary.isLoading} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-sm">
            <span>Cost breakdown</span>
            <Select value={groupBy} onChange={(e) => setGroupBy(e.target.value as CostSummaryGroupByField)} options={GROUP_OPTIONS} className="h-8 w-40" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {summary.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : !summary.data?.groups || summary.data.groups.length === 0 ? (
            <EmptyState title="No breakdown data yet" className="border-none py-6" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{GROUP_OPTIONS.find((g) => g.value === groupBy)?.label}</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Tokens</TableHead>
                  <TableHead>Requests</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.data.groups.map((g, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm font-medium text-foreground">{g.key ?? '—'}</TableCell>
                    <TableCell className="text-sm text-foreground">{formatCurrency(g.totalCost, 'USD')}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{g.totalTokens}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{g.requestCount}</TableCell>
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

function UsageTab({ workspaceId, startDate, endDate }: { workspaceId: string | undefined; startDate: string; endDate: string }) {
  const [groupBy, setGroupBy] = useState<UsageSummaryGroupByField>('providerKey');
  const summary = useUsageSummary({ workspaceId: workspaceId ?? '', startDate, endDate, groupBy });
  const breakdown = useUsageBreakdown(workspaceId ? { workspaceId, bucket: 'DAY', startDate, endDate } : undefined);
  const chartData = (breakdown.data ?? []).map((b) => ({ label: b.bucketKey, value: b.totalTokens }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Total tokens" value={summary.data?.totalTokens ?? 0} icon={Gauge} loading={summary.isLoading} />
        <KpiCard label="Input / Output" value={summary.data ? `${summary.data.totalInputTokens} / ${summary.data.totalOutputTokens}` : '—'} loading={summary.isLoading} />
        <KpiCard label="Total requests" value={summary.data?.totalRequests ?? 0} loading={summary.isLoading} />
        <KpiCard label="Failed requests" value={summary.data?.failedRequests ?? 0} loading={summary.isLoading} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Token usage trend</CardTitle>
        </CardHeader>
        <CardContent>
          {breakdown.isLoading ? <Skeleton className="h-64 w-full" /> : <TrendChart data={chartData} />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-sm">
            <span>Usage breakdown</span>
            <Select value={groupBy} onChange={(e) => setGroupBy(e.target.value as UsageSummaryGroupByField)} options={GROUP_OPTIONS} className="h-8 w-40" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {summary.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : !summary.data?.groups || summary.data.groups.length === 0 ? (
            <EmptyState title="No breakdown data yet" className="border-none py-6" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{GROUP_OPTIONS.find((g) => g.value === groupBy)?.label}</TableHead>
                  <TableHead>Tokens</TableHead>
                  <TableHead>Requests</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.data.groups.map((g, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm font-medium text-foreground">{g.key ?? '—'}</TableCell>
                    <TableCell className="text-sm text-foreground">{g.totalTokens}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{g.requestCount}</TableCell>
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

function PricingConfigsTab({ workspaceId }: { workspaceId: string | undefined }) {
  const configs = useCostPricingConfigs({ workspaceId: workspaceId ?? '', limit: 30 });
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          New pricing config
        </Button>
      </div>

      {configs.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : configs.isError ? (
        <QueryErrorState refetch={configs.refetch} description="We couldn't load pricing configs." />
      ) : !configs.data || configs.data.data.length === 0 ? (
        <EmptyState title="No pricing configs yet" description="Configure per-provider/model token pricing to power cost estimation." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Provider / Model</TableHead>
              <TableHead>Capability</TableHead>
              <TableHead>Input / Output per 1k</TableHead>
              <TableHead>Enabled</TableHead>
              <TableHead>Effective</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {configs.data.data.map((c) => (
              <TableRow key={c.id} clickable onClick={() => setSelectedId(c.id)}>
                <TableCell className="text-sm font-medium text-foreground">{c.providerKey} / {c.modelKey ?? 'Any'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.capability ?? 'Any'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {c.inputPricePer1k != null ? formatCurrency(c.inputPricePer1k, c.currency) : '—'} / {c.outputPricePer1k != null ? formatCurrency(c.outputPricePer1k, c.currency) : '—'}
                </TableCell>
                <TableCell>
                  <StatusBadge status={c.enabled ? 'ENABLED' : 'DISABLED'} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.effectiveFrom ? new Date(c.effectiveFrom).toLocaleDateString() : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <CreatePricingConfigDialog open={createOpen} onOpenChange={setCreateOpen} workspaceId={workspaceId} />
      <PricingConfigDetailDialog id={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function CreatePricingConfigDialog({ open, onOpenChange, workspaceId }: { open: boolean; onOpenChange: (open: boolean) => void; workspaceId: string | undefined }) {
  const create = useCreateCostPricingConfig();
  const [form, setForm] = useState<Omit<CreateCostPricingConfigPayload, 'workspaceId'>>({ providerKey: '', currency: 'USD', enabled: true, priority: 0 });

  const reset = () => setForm({ providerKey: '', currency: 'USD', enabled: true, priority: 0 });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>New pricing config</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Provider" htmlFor="pc-provider" required>
            <Input id="pc-provider" value={form.providerKey} onChange={(e) => setForm((f) => ({ ...f, providerKey: e.target.value }))} />
          </FormField>
          <FormField label="Model" htmlFor="pc-model">
            <Input id="pc-model" value={form.modelKey ?? ''} onChange={(e) => setForm((f) => ({ ...f, modelKey: e.target.value || undefined }))} />
          </FormField>
          <FormField label="Capability" htmlFor="pc-capability">
            <Input id="pc-capability" value={form.capability ?? ''} onChange={(e) => setForm((f) => ({ ...f, capability: e.target.value || undefined }))} />
          </FormField>
          <FormField label="Currency" htmlFor="pc-currency">
            <Input id="pc-currency" value={form.currency ?? 'USD'} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))} />
          </FormField>
          <FormField label="Input price / 1k tokens" htmlFor="pc-input">
            <Input id="pc-input" type="number" min="0" step="0.0001" value={form.inputPricePer1k ?? ''} onChange={(e) => setForm((f) => ({ ...f, inputPricePer1k: e.target.value ? Number(e.target.value) : undefined }))} />
          </FormField>
          <FormField label="Output price / 1k tokens" htmlFor="pc-output">
            <Input id="pc-output" type="number" min="0" step="0.0001" value={form.outputPricePer1k ?? ''} onChange={(e) => setForm((f) => ({ ...f, outputPricePer1k: e.target.value ? Number(e.target.value) : undefined }))} />
          </FormField>
          <FormField label="Cached input price / 1k" htmlFor="pc-cached">
            <Input id="pc-cached" type="number" min="0" step="0.0001" value={form.cachedInputPricePer1k ?? ''} onChange={(e) => setForm((f) => ({ ...f, cachedInputPricePer1k: e.target.value ? Number(e.target.value) : undefined }))} />
          </FormField>
          <FormField label="Priority" htmlFor="pc-priority">
            <Input id="pc-priority" type="number" value={form.priority ?? 0} onChange={(e) => setForm((f) => ({ ...f, priority: Number(e.target.value) }))} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => create.mutate({ ...form, workspaceId }, { onSuccess: () => { onOpenChange(false); reset(); } })}
            disabled={!form.providerKey || create.isPending}
          >
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PricingConfigDetailDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: config, isLoading } = useCostPricingConfig(id ?? undefined);
  const update = useUpdateCostPricingConfig(id ?? '');
  const remove = useDeleteCostPricingConfig();

  return (
    <Dialog open={!!id} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>Pricing config</span>
            {config && (
              <Button variant="ghost" size="sm" onClick={() => remove.mutate(config.id, { onSuccess: onClose })} disabled={remove.isPending}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>
        {isLoading || !config ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Field label="Provider" value={config.providerKey} />
              <Field label="Model" value={config.modelKey ?? 'Any'} />
              <Field label="Capability" value={config.capability ?? 'Any'} />
              <Field label="Currency" value={config.currency} />
              <Field label="Version" value={String(config.version)} />
              <Field label="Priority" value={String(config.priority)} />
              <Field label="Input / 1k" value={config.inputPricePer1k != null ? formatCurrency(config.inputPricePer1k, config.currency) : '—'} />
              <Field label="Output / 1k" value={config.outputPricePer1k != null ? formatCurrency(config.outputPricePer1k, config.currency) : '—'} />
              <Field label="Cached input / 1k" value={config.cachedInputPricePer1k != null ? formatCurrency(config.cachedInputPricePer1k, config.currency) : '—'} />
            </div>
            <div className="flex items-center gap-2 border-t border-border pt-4">
              <Switch checked={config.enabled} onChange={(e) => update.mutate({ enabled: e.target.checked })} />
              <span className="text-sm text-foreground">Enabled</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function BudgetsTab({ workspaceId }: { workspaceId: string | undefined }) {
  const budgets = useCostBudgets({ workspaceId: workspaceId ?? '', limit: 20 });
  const quotas = useUsageQuotas({ workspaceId: workspaceId ?? '', limit: 20 });
  const [createBudgetOpen, setCreateBudgetOpen] = useState(false);
  const [createQuotaOpen, setCreateQuotaOpen] = useState(false);
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);
  const [selectedQuotaId, setSelectedQuotaId] = useState<string | null>(null);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Cost budgets</p>
          <Button size="sm" onClick={() => setCreateBudgetOpen(true)}>
            <Plus className="h-4 w-4" />
            New budget
          </Button>
        </div>
        {budgets.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : budgets.isError ? (
          <QueryErrorState refetch={budgets.refetch} description="We couldn't load budgets." />
        ) : !budgets.data || budgets.data.data.length === 0 ? (
          <EmptyState title="No budgets configured" className="border-none py-8" />
        ) : (
          <div className="space-y-2">
            {budgets.data.data.map((b) => (
              <div key={b.id} className="cursor-pointer rounded-[var(--radius)] border border-border p-3 text-sm hover:bg-secondary" onClick={() => setSelectedBudgetId(b.id)}>
                <div className="flex items-center justify-between">
                  <p className="text-foreground">{b.name}</p>
                  <StatusBadge status={b.enabled ? 'ENABLED' : 'DISABLED'} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {b.scope} · {b.period} · limit {formatCurrency(b.limitAmount, b.currency)} · warn at {b.warningThresholdPercent}%
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Usage quotas</p>
          <Button size="sm" onClick={() => setCreateQuotaOpen(true)}>
            <Plus className="h-4 w-4" />
            New quota
          </Button>
        </div>
        {quotas.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : quotas.isError ? (
          <QueryErrorState refetch={quotas.refetch} description="We couldn't load quotas." />
        ) : !quotas.data || quotas.data.data.length === 0 ? (
          <EmptyState title="No quotas configured" className="border-none py-8" />
        ) : (
          <div className="space-y-2">
            {quotas.data.data.map((q) => (
              <div key={q.id} className="cursor-pointer rounded-[var(--radius)] border border-border p-3 text-sm hover:bg-secondary" onClick={() => setSelectedQuotaId(q.id)}>
                <div className="flex items-center justify-between">
                  <p className="text-foreground">{q.name}</p>
                  <StatusBadge status={q.enabled ? 'ENABLED' : 'DISABLED'} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {q.scope} · {q.period} · {q.unit} · limit {q.limitAmount} · warn at {q.warningThresholdPercent}%
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <CreateBudgetDialog open={createBudgetOpen} onOpenChange={setCreateBudgetOpen} workspaceId={workspaceId} />
      <CreateQuotaDialog open={createQuotaOpen} onOpenChange={setCreateQuotaOpen} workspaceId={workspaceId} />
      <BudgetDetailDialog id={selectedBudgetId} onClose={() => setSelectedBudgetId(null)} />
      <QuotaDetailDialog id={selectedQuotaId} onClose={() => setSelectedQuotaId(null)} />
    </div>
  );
}

function CreateBudgetDialog({ open, onOpenChange, workspaceId }: { open: boolean; onOpenChange: (open: boolean) => void; workspaceId: string | undefined }) {
  const create = useCreateCostBudget();
  const [form, setForm] = useState<Omit<CreateCostBudgetPayload, 'workspaceId'>>({ scope: 'WORKSPACE', period: 'MONTHLY', name: '', limitAmount: 0, currency: 'USD', warningThresholdPercent: 80, enabled: true });

  const reset = () => setForm({ scope: 'WORKSPACE', period: 'MONTHLY', name: '', limitAmount: 0, currency: 'USD', warningThresholdPercent: 80, enabled: true });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>New cost budget</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Name" htmlFor="cb-name" required className="sm:col-span-2">
            <Input id="cb-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </FormField>
          <FormField label="Scope" htmlFor="cb-scope" required>
            <Select id="cb-scope" value={form.scope} onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value as AiCostBudgetScope }))} options={[{ value: 'WORKSPACE', label: 'Workspace' }, { value: 'FEATURE', label: 'Feature' }, { value: 'PROJECT', label: 'Project' }]} />
          </FormField>
          <FormField label="Period" htmlFor="cb-period" required>
            <Select id="cb-period" value={form.period} onChange={(e) => setForm((f) => ({ ...f, period: e.target.value as AiCostBudgetPeriod }))} options={[{ value: 'DAILY', label: 'Daily' }, { value: 'MONTHLY', label: 'Monthly' }]} />
          </FormField>
          {form.scope === 'FEATURE' && (
            <FormField label="Feature" htmlFor="cb-feature">
              <Input id="cb-feature" value={form.feature ?? ''} onChange={(e) => setForm((f) => ({ ...f, feature: e.target.value || undefined }))} />
            </FormField>
          )}
          {form.scope === 'PROJECT' && (
            <FormField label="Project ID" htmlFor="cb-project">
              <Input id="cb-project" value={form.projectId ?? ''} onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value || undefined }))} />
            </FormField>
          )}
          <FormField label="Limit amount" htmlFor="cb-limit" required>
            <Input id="cb-limit" type="number" min="0" step="0.01" value={form.limitAmount} onChange={(e) => setForm((f) => ({ ...f, limitAmount: Number(e.target.value) }))} />
          </FormField>
          <FormField label="Currency" htmlFor="cb-currency">
            <Input id="cb-currency" value={form.currency ?? 'USD'} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))} />
          </FormField>
          <FormField label="Warning threshold %" htmlFor="cb-warn">
            <Input id="cb-warn" type="number" min="0" max="100" value={form.warningThresholdPercent ?? 80} onChange={(e) => setForm((f) => ({ ...f, warningThresholdPercent: Number(e.target.value) }))} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => workspaceId && create.mutate({ ...form, workspaceId }, { onSuccess: () => { onOpenChange(false); reset(); } })}
            disabled={!form.name || !form.limitAmount || !workspaceId || create.isPending}
          >
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BudgetDetailDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: budget, isLoading } = useCostBudget(id ?? undefined);
  const { data: alerts } = useCostBudgetAlerts(id ?? undefined);
  const update = useUpdateCostBudget(id ?? '');
  const remove = useDeleteCostBudget();

  return (
    <Dialog open={!!id} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>Cost budget</span>
            {budget && (
              <Button variant="ghost" size="sm" onClick={() => remove.mutate(budget.id, { onSuccess: onClose })} disabled={remove.isPending}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>
        {isLoading || !budget ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Field label="Name" value={budget.name} />
              <Field label="Scope" value={budget.scope} />
              <Field label="Period" value={budget.period} />
              <Field label="Limit" value={formatCurrency(budget.limitAmount, budget.currency)} />
              <Field label="Feature" value={budget.feature ?? '—'} />
              <Field label="Project" value={budget.projectId ?? '—'} />
            </div>
            <FormField label="Warning threshold %" htmlFor="bd-warn">
              <Input id="bd-warn" type="number" min="0" max="100" defaultValue={budget.warningThresholdPercent} onBlur={(e) => update.mutate({ warningThresholdPercent: Number(e.target.value) })} />
            </FormField>
            <div className="flex items-center gap-2 border-t border-border pt-4">
              <Switch checked={budget.enabled} onChange={(e) => update.mutate({ enabled: e.target.checked })} />
              <span className="text-sm text-foreground">Enabled</span>
            </div>
            {alerts && alerts.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent alerts</p>
                <ul className="space-y-1.5">
                  {alerts.map((a) => (
                    <li key={a.id} className="flex items-center justify-between rounded-[var(--radius)] border border-border p-2 text-xs">
                      <span className={a.type === 'EXCEEDED' ? 'text-danger' : 'text-warning'}>{a.type} — {a.periodKey}</span>
                      <span className="text-muted-foreground">{formatCurrency(a.spendAmount, a.currency)} / {formatCurrency(a.limitAmount, a.currency)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CreateQuotaDialog({ open, onOpenChange, workspaceId }: { open: boolean; onOpenChange: (open: boolean) => void; workspaceId: string | undefined }) {
  const create = useCreateUsageQuota();
  const [form, setForm] = useState<Omit<CreateUsageQuotaPayload, 'workspaceId'>>({ scope: 'WORKSPACE', period: 'MONTHLY', unit: 'TOKENS', name: '', limitAmount: 0, warningThresholdPercent: 80, enabled: true });

  const reset = () => setForm({ scope: 'WORKSPACE', period: 'MONTHLY', unit: 'TOKENS', name: '', limitAmount: 0, warningThresholdPercent: 80, enabled: true });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>New usage quota</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Name" htmlFor="uq-name" required className="sm:col-span-2">
            <Input id="uq-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </FormField>
          <FormField label="Scope" htmlFor="uq-scope" required>
            <Select id="uq-scope" value={form.scope} onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value as AiUsageQuotaScope }))} options={[{ value: 'WORKSPACE', label: 'Workspace' }, { value: 'FEATURE', label: 'Feature' }, { value: 'PROJECT', label: 'Project' }]} />
          </FormField>
          <FormField label="Period" htmlFor="uq-period" required>
            <Select id="uq-period" value={form.period} onChange={(e) => setForm((f) => ({ ...f, period: e.target.value as AiUsageQuotaPeriod }))} options={[{ value: 'HOURLY', label: 'Hourly' }, { value: 'DAILY', label: 'Daily' }, { value: 'MONTHLY', label: 'Monthly' }]} />
          </FormField>
          <FormField label="Unit" htmlFor="uq-unit" required>
            <Select id="uq-unit" value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value as AiUsageQuotaUnit }))} options={[{ value: 'REQUESTS', label: 'Requests' }, { value: 'TOKENS', label: 'Tokens' }, { value: 'IMAGES', label: 'Images' }, { value: 'EMBEDDINGS', label: 'Embeddings' }, { value: 'AUDIO', label: 'Audio' }, { value: 'TOOL_CALLS', label: 'Tool calls' }]} />
          </FormField>
          <FormField label="Limit amount" htmlFor="uq-limit" required>
            <Input id="uq-limit" type="number" min="0" value={form.limitAmount} onChange={(e) => setForm((f) => ({ ...f, limitAmount: Number(e.target.value) }))} />
          </FormField>
          {form.scope === 'FEATURE' && (
            <FormField label="Feature" htmlFor="uq-feature">
              <Input id="uq-feature" value={form.feature ?? ''} onChange={(e) => setForm((f) => ({ ...f, feature: e.target.value || undefined }))} />
            </FormField>
          )}
          {form.scope === 'PROJECT' && (
            <FormField label="Project ID" htmlFor="uq-project">
              <Input id="uq-project" value={form.projectId ?? ''} onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value || undefined }))} />
            </FormField>
          )}
          <FormField label="Warning threshold %" htmlFor="uq-warn">
            <Input id="uq-warn" type="number" min="0" max="100" value={form.warningThresholdPercent ?? 80} onChange={(e) => setForm((f) => ({ ...f, warningThresholdPercent: Number(e.target.value) }))} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => workspaceId && create.mutate({ ...form, workspaceId }, { onSuccess: () => { onOpenChange(false); reset(); } })}
            disabled={!form.name || !form.limitAmount || !workspaceId || create.isPending}
          >
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function QuotaDetailDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: quota, isLoading } = useUsageQuota(id ?? undefined);
  const { data: alerts } = useUsageQuotaAlerts(id ?? undefined);
  const update = useUpdateUsageQuota(id ?? '');
  const remove = useDeleteUsageQuota();

  return (
    <Dialog open={!!id} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>Usage quota</span>
            {quota && (
              <Button variant="ghost" size="sm" onClick={() => remove.mutate(quota.id, { onSuccess: onClose })} disabled={remove.isPending}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>
        {isLoading || !quota ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Field label="Name" value={quota.name} />
              <Field label="Scope" value={quota.scope} />
              <Field label="Period" value={quota.period} />
              <Field label="Unit" value={quota.unit} />
              <Field label="Limit" value={String(quota.limitAmount)} />
              <Field label="Threshold %" value={String(quota.thresholdPercent)} />
            </div>
            <FormField label="Warning threshold %" htmlFor="qd-warn">
              <Input id="qd-warn" type="number" min="0" max="100" defaultValue={quota.warningThresholdPercent} onBlur={(e) => update.mutate({ warningThresholdPercent: Number(e.target.value) })} />
            </FormField>
            <div className="flex items-center gap-2 border-t border-border pt-4">
              <Switch checked={quota.enabled} onChange={(e) => update.mutate({ enabled: e.target.checked })} />
              <span className="text-sm text-foreground">Enabled</span>
            </div>
            {alerts && alerts.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent alerts</p>
                <ul className="space-y-1.5">
                  {alerts.map((a) => (
                    <li key={a.id} className="flex items-center justify-between rounded-[var(--radius)] border border-border p-2 text-xs">
                      <span className="text-warning">{a.type} — {a.periodKey}</span>
                      <span className="text-muted-foreground">{a.usageAmount} / {a.limitAmount}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
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
