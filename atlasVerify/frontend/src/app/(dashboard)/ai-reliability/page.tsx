'use client';

import { useState } from 'react';
import { Database, Loader2, Plus, RefreshCw, Search, Sparkles, Trash2, TrendingDown, Zap } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { KpiCard } from '@/components/ui/kpi-card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState } from '@/components/ui/states';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  useCacheSavings,
  useCacheEntries,
  useCachePolicy,
  useCreateCachePolicy,
  useUpdateCachePolicy,
  useDeleteCachePolicy,
  useEvictExpiredCacheEntries,
  useMarkStaleCacheEntries,
  useRetryExecution,
  useRetryExecutions,
  useRetryStats,
  useRetryAttempts,
  useRetryFallbacks,
  useRetryPolicy,
  useCreateRetryPolicy,
  useUpdateRetryPolicy,
  useDeleteRetryPolicy,
  useFallbackConfig,
  useCreateFallbackConfig,
  useUpdateFallbackConfig,
  useDeleteFallbackConfig,
} from '@/hooks';
import { useAuthStore } from '@/stores';
import { formatCurrency, formatDate } from '@/lib/utils';
import type {
  AiBackoffStrategy,
  AiCacheScope,
  AiCacheStrategy,
  CreateCachePolicyPayload,
  CreateFallbackConfigPayload,
  CreateRetryPolicyPayload,
} from '@/types';

const CACHE_SCOPE_OPTIONS: { value: AiCacheScope; label: string }[] = [
  { value: 'GLOBAL', label: 'Global' },
  { value: 'WORKSPACE', label: 'Workspace' },
  { value: 'USER', label: 'User' },
  { value: 'WORKFLOW', label: 'Workflow' },
  { value: 'REQUEST', label: 'Request' },
];

const CACHE_STRATEGY_OPTIONS: { value: AiCacheStrategy; label: string }[] = [
  { value: 'EXACT_MATCH', label: 'Exact match' },
  { value: 'SEMANTIC', label: 'Semantic' },
  { value: 'PARTIAL_RESULT', label: 'Partial result' },
];

const BACKOFF_OPTIONS: { value: AiBackoffStrategy; label: string }[] = [
  { value: 'FIXED', label: 'Fixed' },
  { value: 'LINEAR', label: 'Linear' },
  { value: 'EXPONENTIAL', label: 'Exponential' },
  { value: 'EXPONENTIAL_JITTER', label: 'Exponential + jitter' },
];

const FAILURE_TYPE_OPTIONS = ['PROVIDER_ERROR', 'MODEL_ERROR', 'TIMEOUT', 'RATE_LIMIT', 'VALIDATION_ERROR', 'SAFETY_ERROR', 'UNAUTHORIZED', 'BUDGET_EXCEEDED', 'QUOTA_EXCEEDED', 'CIRCUIT_OPEN', 'NETWORK_ERROR', 'UNKNOWN'];

export default function AiReliabilityPage() {
  return (
    <div>
      <PageHeader title="AI Reliability" description="Retry/fallback execution history, retry & fallback policies, and cache hit/miss/savings/policies." />
      <Tabs defaultValue="retry">
        <TabsList>
          <TabsTrigger value="retry">Retry Executions</TabsTrigger>
          <TabsTrigger value="retry-policies">Retry Policies</TabsTrigger>
          <TabsTrigger value="fallback">Fallback Configs</TabsTrigger>
          <TabsTrigger value="cache">Cache</TabsTrigger>
        </TabsList>
        <TabsContent value="retry">
          <RetryTab />
        </TabsContent>
        <TabsContent value="retry-policies">
          <RetryPoliciesTab />
        </TabsContent>
        <TabsContent value="fallback">
          <FallbackConfigsTab />
        </TabsContent>
        <TabsContent value="cache">
          <CacheTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RetryTab() {
  const workspaceId = useAuthStore((s) => s.user?.workspaceId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data, isLoading, isError, refetch } = useRetryExecutions({ workspaceId: workspaceId ?? '', limit: 30 });
  const stats = useRetryStats(workspaceId);

  return (
    <div>
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Total executions" value={stats.data?.totalExecutions ?? 0} icon={Zap} loading={stats.isLoading} />
        <KpiCard label="Succeeded" value={stats.data?.succeededExecutions ?? 0} loading={stats.isLoading} />
        <KpiCard label="Success rate" value={stats.data ? `${(stats.data.successRate * 100).toFixed(0)}%` : '—'} loading={stats.isLoading} />
        <KpiCard label="Avg attempts" value={stats.data?.avgAttempts.toFixed(1) ?? '—'} loading={stats.isLoading} />
      </div>

      {isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load retry executions." />
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No retry executions yet" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Capability</TableHead>
              <TableHead>Original provider/model</TableHead>
              <TableHead>Final provider/model</TableHead>
              <TableHead>Attempts</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Started</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((r) => (
              <TableRow key={r.id} clickable onClick={() => setSelectedId(r.id)}>
                <TableCell className="text-sm font-medium text-foreground">{r.capability}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.originalProvider} / {r.originalModel}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.finalProvider ?? '—'} / {r.finalModel ?? '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.currentAttempt} / {r.maxAttempts}</TableCell>
                <TableCell>
                  <StatusBadge status={r.status} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.startTime ? formatDate(r.startTime) : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <RetryDetailDialog id={selectedId} workspaceId={workspaceId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function RetryDetailDialog({ id, workspaceId, onClose }: { id: string | null; workspaceId: string | undefined; onClose: () => void }) {
  const { data: execution, isLoading } = useRetryExecution(id ?? undefined, workspaceId);
  const { data: attempts } = useRetryAttempts(id ?? undefined, workspaceId);
  const { data: fallbacks } = useRetryFallbacks(id ?? undefined, workspaceId);

  return (
    <Dialog open={!!id} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Retry execution detail</DialogTitle>
        </DialogHeader>
        {isLoading || !execution ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <div className="space-y-5 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Original" value={`${execution.originalProvider} / ${execution.originalModel}`} />
              <Field label="Final" value={`${execution.finalProvider ?? '—'} / ${execution.finalModel ?? '—'}`} />
              <Field label="Last failure" value={execution.lastFailureType ?? '—'} />
              <Field label="Total cost / tokens" value={`$${execution.totalCost.toFixed(4)} / ${execution.totalTokensUsed}`} />
            </div>
            {execution.lastFailureMessage && (
              <div className="rounded-[var(--radius)] border border-danger/30 bg-danger/5 p-3 text-danger">{execution.lastFailureMessage}</div>
            )}

            {attempts && attempts.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Attempts</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Provider / Model</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead>Failure</TableHead>
                      <TableHead>Delay before</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attempts.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="text-sm text-foreground">{a.attemptNumber}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{a.provider} / {a.model}</TableCell>
                        <TableCell>
                          <StatusBadge status={a.succeeded ? 'SUCCEEDED' : 'FAILED'} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{a.failureType ?? '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{a.delayBeforeRetryMs != null ? `${a.delayBeforeRetryMs}ms` : '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {fallbacks && fallbacks.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fallback path</p>
                <ul className="space-y-2">
                  {fallbacks.map((f) => (
                    <li key={f.id} className="rounded-[var(--radius)] border border-border p-2 text-sm">
                      <p className="text-foreground">
                        {f.sourceProvider}/{f.sourceModel} → {f.fallbackProvider}/{f.fallbackModel}
                        <StatusBadge status={f.succeeded ? 'SUCCEEDED' : 'FAILED'} className="ml-2" />
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">Reason: {f.reason} (trigger: {f.triggerFailureType})</p>
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

function RetryPoliciesTab() {
  const workspaceId = useAuthStore((s) => s.user?.workspaceId);
  const [createOpen, setCreateOpen] = useState(false);
  const [lookupId, setLookupId] = useState('');
  const [activeId, setActiveId] = useState<string | undefined>(undefined);
  const { data: policy, isLoading, isError } = useRetryPolicy(activeId);
  const update = useUpdateRetryPolicy(activeId ?? '');
  const remove = useDeleteRetryPolicy();

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
          <FormField label="Retry policy ID" htmlFor="retry-lookup" hint="Retry policies have no list endpoint — look up an existing policy by its ID, or create a new one below." className="flex-1">
            <Input id="retry-lookup" value={lookupId} onChange={(e) => setLookupId(e.target.value)} placeholder="Paste a retry policy ID" />
          </FormField>
          <Button variant="outline" onClick={() => setActiveId(lookupId || undefined)} disabled={!lookupId}>
            <Search className="h-4 w-4" />
            Look up
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            New policy
          </Button>
        </CardContent>
      </Card>

      {!activeId ? (
        <EmptyState title="No policy loaded" description="Look up a retry policy by ID, or create a new one." />
      ) : isError ? (
        <EmptyState title="Policy not found" description="No retry policy exists with that ID." />
      ) : isLoading || !policy ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-sm">
              <span>{policy.name}</span>
              <div className="flex items-center gap-2">
                <StatusBadge status={policy.enabled ? 'ENABLED' : 'DISABLED'} />
                <Button variant="ghost" size="sm" onClick={() => remove.mutate(policy.id, { onSuccess: () => setActiveId(undefined) })} disabled={remove.isPending}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <Field label="Capability" value={policy.capability ?? 'Any'} />
              <Field label="Use case" value={policy.useCase ?? 'Any'} />
              <Field label="Provider" value={policy.modelProvider ?? 'Any'} />
              <Field label="Max retries" value={String(policy.maxRetries)} />
              <Field label="Backoff" value={policy.backoffStrategy} />
              <Field label="Priority" value={String(policy.priority)} />
              <Field label="Initial delay" value={policy.initialDelayMs != null ? `${policy.initialDelayMs}ms` : '—'} />
              <Field label="Max delay" value={policy.maxDelayMs != null ? `${policy.maxDelayMs}ms` : '—'} />
              <Field label="Backoff multiplier" value={policy.backoffMultiplier != null ? String(policy.backoffMultiplier) : '—'} />
              <Field label="Fallback enabled" value={policy.enableFallback ? 'Yes' : 'No'} />
            </div>
            <div className="flex items-center gap-2 border-t border-border pt-4">
              <Switch checked={policy.enabled} onChange={(e) => update.mutate({ enabled: e.target.checked })} />
              <span className="text-sm text-foreground">Enabled</span>
              <Switch checked={policy.enableFallback} onChange={(e) => update.mutate({ enableFallback: e.target.checked })} className="ml-4" />
              <span className="text-sm text-foreground">Allow fallback</span>
            </div>
          </CardContent>
        </Card>
      )}

      <CreateRetryPolicyDialog open={createOpen} onOpenChange={setCreateOpen} workspaceId={workspaceId} onCreated={(id) => { setLookupId(id); setActiveId(id); }} />
    </div>
  );
}

function CreateRetryPolicyDialog({ open, onOpenChange, workspaceId, onCreated }: { open: boolean; onOpenChange: (open: boolean) => void; workspaceId: string | undefined; onCreated: (id: string) => void }) {
  const create = useCreateRetryPolicy();
  const [form, setForm] = useState<CreateRetryPolicyPayload>({ name: '', maxRetries: 3, backoffStrategy: 'EXPONENTIAL_JITTER', enabled: true, enableFallback: true, priority: 0 });

  const reset = () => setForm({ name: '', maxRetries: 3, backoffStrategy: 'EXPONENTIAL_JITTER', enabled: true, enableFallback: true, priority: 0 });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>New retry policy</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Name" htmlFor="rp-name" required className="sm:col-span-2">
            <Input id="rp-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </FormField>
          <FormField label="Capability" htmlFor="rp-capability">
            <Input id="rp-capability" value={form.capability ?? ''} onChange={(e) => setForm((f) => ({ ...f, capability: e.target.value || undefined }))} />
          </FormField>
          <FormField label="Provider" htmlFor="rp-provider">
            <Input id="rp-provider" value={form.modelProvider ?? ''} onChange={(e) => setForm((f) => ({ ...f, modelProvider: e.target.value || undefined }))} />
          </FormField>
          <FormField label="Max retries" htmlFor="rp-max">
            <Input id="rp-max" type="number" min="0" value={form.maxRetries ?? ''} onChange={(e) => setForm((f) => ({ ...f, maxRetries: e.target.value ? Number(e.target.value) : undefined }))} />
          </FormField>
          <FormField label="Backoff strategy" htmlFor="rp-backoff">
            <Select id="rp-backoff" value={form.backoffStrategy} onChange={(e) => setForm((f) => ({ ...f, backoffStrategy: e.target.value as AiBackoffStrategy }))} options={BACKOFF_OPTIONS} />
          </FormField>
          <FormField label="Initial delay (ms)" htmlFor="rp-delay">
            <Input id="rp-delay" type="number" min="0" value={form.initialDelayMs ?? ''} onChange={(e) => setForm((f) => ({ ...f, initialDelayMs: e.target.value ? Number(e.target.value) : undefined }))} />
          </FormField>
          <FormField label="Max delay (ms)" htmlFor="rp-max-delay">
            <Input id="rp-max-delay" type="number" min="0" value={form.maxDelayMs ?? ''} onChange={(e) => setForm((f) => ({ ...f, maxDelayMs: e.target.value ? Number(e.target.value) : undefined }))} />
          </FormField>
          <FormField label="Priority" htmlFor="rp-priority">
            <Input id="rp-priority" type="number" value={form.priority ?? 0} onChange={(e) => setForm((f) => ({ ...f, priority: Number(e.target.value) }))} />
          </FormField>
          <div className="flex items-center gap-2">
            <Switch checked={form.enableFallback ?? true} onChange={(e) => setForm((f) => ({ ...f, enableFallback: e.target.checked }))} />
            <span className="text-sm text-foreground">Allow fallback</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => create.mutate({ ...form, workspaceId }, { onSuccess: (p) => { onOpenChange(false); reset(); onCreated(p.id); } })}
            disabled={!form.name || create.isPending}
          >
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FallbackConfigsTab() {
  const workspaceId = useAuthStore((s) => s.user?.workspaceId);
  const [createOpen, setCreateOpen] = useState(false);
  const [lookupId, setLookupId] = useState('');
  const [activeId, setActiveId] = useState<string | undefined>(undefined);
  const { data: config, isLoading, isError } = useFallbackConfig(activeId);
  const update = useUpdateFallbackConfig(activeId ?? '');
  const remove = useDeleteFallbackConfig();

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
          <FormField label="Fallback config ID" htmlFor="fb-lookup" hint="Fallback configs have no list endpoint — look up an existing config by its ID, or create a new one below." className="flex-1">
            <Input id="fb-lookup" value={lookupId} onChange={(e) => setLookupId(e.target.value)} placeholder="Paste a fallback config ID" />
          </FormField>
          <Button variant="outline" onClick={() => setActiveId(lookupId || undefined)} disabled={!lookupId}>
            <Search className="h-4 w-4" />
            Look up
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            New fallback chain
          </Button>
        </CardContent>
      </Card>

      {!activeId ? (
        <EmptyState title="No fallback config loaded" description="Look up a fallback config by ID, or create a new chain." />
      ) : isError ? (
        <EmptyState title="Config not found" description="No fallback config exists with that ID." />
      ) : isLoading || !config ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-sm">
              <span>{config.name}</span>
              <div className="flex items-center gap-2">
                <StatusBadge status={config.enabled ? 'ENABLED' : 'DISABLED'} />
                <Button variant="ghost" size="sm" onClick={() => remove.mutate(config.id, { onSuccess: () => setActiveId(undefined) })} disabled={remove.isPending}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <Field label="Capability" value={config.capability} />
              <Field label="Use case" value={config.useCase ?? 'Any'} />
              <Field label="Source" value={config.sourceProvider ? `${config.sourceProvider} / ${config.sourceModel ?? '—'}` : 'Any'} />
              <Field label="Fallback to" value={`${config.fallbackProvider} / ${config.fallbackModel}`} />
              <Field label="Priority" value={String(config.priority)} />
              <Field label="Require health check" value={config.requireHealthCheck ? 'Yes' : 'No'} />
              <Field label="Require budget" value={config.requireBudget ? 'Yes' : 'No'} />
            </div>
            {config.triggerFailureTypes.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Trigger failure types</p>
                <p className="text-sm text-foreground">{config.triggerFailureTypes.join(', ')}</p>
              </div>
            )}
            <div className="flex items-center gap-2 border-t border-border pt-4">
              <Switch checked={config.enabled} onChange={(e) => update.mutate({ enabled: e.target.checked })} />
              <span className="text-sm text-foreground">Enabled</span>
            </div>
          </CardContent>
        </Card>
      )}

      <CreateFallbackConfigDialog open={createOpen} onOpenChange={setCreateOpen} workspaceId={workspaceId} onCreated={(id) => { setLookupId(id); setActiveId(id); }} />
    </div>
  );
}

function CreateFallbackConfigDialog({ open, onOpenChange, workspaceId, onCreated }: { open: boolean; onOpenChange: (open: boolean) => void; workspaceId: string | undefined; onCreated: (id: string) => void }) {
  const create = useCreateFallbackConfig();
  const [form, setForm] = useState<CreateFallbackConfigPayload>({ name: '', capability: '', fallbackProvider: '', fallbackModel: '', priority: 0, enabled: true, requireHealthCheck: true, requireBudget: false, triggerFailureTypes: [] });

  const reset = () => setForm({ name: '', capability: '', fallbackProvider: '', fallbackModel: '', priority: 0, enabled: true, requireHealthCheck: true, requireBudget: false, triggerFailureTypes: [] });

  const toggleFailureType = (type: string) => {
    setForm((f) => {
      const has = (f.triggerFailureTypes ?? []).includes(type);
      return { ...f, triggerFailureTypes: has ? (f.triggerFailureTypes ?? []).filter((t) => t !== type) : [...(f.triggerFailureTypes ?? []), type] };
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>New fallback chain</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Name" htmlFor="fb-name" required className="sm:col-span-2">
            <Input id="fb-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </FormField>
          <FormField label="Capability" htmlFor="fb-capability" required>
            <Input id="fb-capability" value={form.capability} onChange={(e) => setForm((f) => ({ ...f, capability: e.target.value }))} />
          </FormField>
          <FormField label="Use case" htmlFor="fb-usecase">
            <Input id="fb-usecase" value={form.useCase ?? ''} onChange={(e) => setForm((f) => ({ ...f, useCase: e.target.value || undefined }))} />
          </FormField>
          <FormField label="Source provider" htmlFor="fb-src-provider">
            <Input id="fb-src-provider" value={form.sourceProvider ?? ''} onChange={(e) => setForm((f) => ({ ...f, sourceProvider: e.target.value || undefined }))} />
          </FormField>
          <FormField label="Source model" htmlFor="fb-src-model">
            <Input id="fb-src-model" value={form.sourceModel ?? ''} onChange={(e) => setForm((f) => ({ ...f, sourceModel: e.target.value || undefined }))} />
          </FormField>
          <FormField label="Fallback provider" htmlFor="fb-provider" required>
            <Input id="fb-provider" value={form.fallbackProvider} onChange={(e) => setForm((f) => ({ ...f, fallbackProvider: e.target.value }))} />
          </FormField>
          <FormField label="Fallback model" htmlFor="fb-model" required>
            <Input id="fb-model" value={form.fallbackModel} onChange={(e) => setForm((f) => ({ ...f, fallbackModel: e.target.value }))} />
          </FormField>
          <FormField label="Priority" htmlFor="fb-priority">
            <Input id="fb-priority" type="number" value={form.priority ?? 0} onChange={(e) => setForm((f) => ({ ...f, priority: Number(e.target.value) }))} />
          </FormField>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch checked={form.requireHealthCheck ?? true} onChange={(e) => setForm((f) => ({ ...f, requireHealthCheck: e.target.checked }))} />
              <span className="text-sm text-foreground">Require health check</span>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.requireBudget ?? false} onChange={(e) => setForm((f) => ({ ...f, requireBudget: e.target.checked }))} />
              <span className="text-sm text-foreground">Require budget</span>
            </div>
          </div>
          <div className="sm:col-span-2">
            <p className="mb-1.5 text-sm font-medium text-foreground">Trigger failure types</p>
            <div className="flex flex-wrap gap-2">
              {FAILURE_TYPE_OPTIONS.map((type) => {
                const active = (form.triggerFailureTypes ?? []).includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleFailureType(type)}
                    className={`rounded-full border px-2.5 py-1 text-xs ${active ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => create.mutate({ ...form, workspaceId }, { onSuccess: (c) => { onOpenChange(false); reset(); onCreated(c.id); } })}
            disabled={!form.name || !form.capability || !form.fallbackProvider || !form.fallbackModel || create.isPending}
          >
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CacheTab() {
  const workspaceId = useAuthStore((s) => s.user?.workspaceId);
  const savings = useCacheSavings(workspaceId);
  const entries = useCacheEntries({ workspaceId: workspaceId ?? '', limit: 30 });
  const evictExpired = useEvictExpiredCacheEntries();
  const markStale = useMarkStaleCacheEntries();
  const [createPolicyOpen, setCreatePolicyOpen] = useState(false);
  const [lookupId, setLookupId] = useState('');
  const [activePolicyId, setActivePolicyId] = useState<string | undefined>(undefined);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid flex-1 grid-cols-2 gap-4 sm:grid-cols-4">
          <KpiCard label="Hit rate" value={savings.data ? `${(savings.data.hitRate * 100).toFixed(0)}%` : '—'} icon={Database} loading={savings.isLoading} />
          <KpiCard label="Hits / Misses" value={savings.data ? `${savings.data.totalHits} / ${savings.data.totalMisses}` : '—'} loading={savings.isLoading} />
          <KpiCard label="Cost saved" value={savings.data ? formatCurrency(savings.data.costSaved, 'USD') : '—'} icon={TrendingDown} loading={savings.isLoading} />
          <KpiCard label="Tokens saved" value={savings.data?.tokensSaved ?? 0} loading={savings.isLoading} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => workspaceId && evictExpired.mutate(workspaceId)} disabled={!workspaceId || evictExpired.isPending}>
          {evictExpired.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Evict expired entries
        </Button>
        <Button variant="outline" size="sm" onClick={() => workspaceId && markStale.mutate(workspaceId)} disabled={!workspaceId || markStale.isPending}>
          {markStale.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Mark stale entries
        </Button>
      </div>

      {entries.isError ? (
        <QueryErrorState refetch={entries.refetch} description="We couldn't load cache entries." />
      ) : entries.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !entries.data || entries.data.data.length === 0 ? (
        <EmptyState title="No cache entries yet" description="Only EXACT_MATCH lookups are currently supported; SEMANTIC and PARTIAL_RESULT strategies always miss." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Capability</TableHead>
              <TableHead>Provider / Model</TableHead>
              <TableHead>Strategy</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Hits</TableHead>
              <TableHead>Expires</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.data.data.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="text-sm font-medium text-foreground">{e.capability}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{e.provider} / {e.model}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{e.strategy}</TableCell>
                <TableCell>
                  <StatusBadge status={e.status} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{e.hitCount}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(e.expiresAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Cache policies</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <FormField label="Cache policy ID" htmlFor="cache-lookup" hint="Cache policies have no list endpoint — look up an existing policy by its ID, or create a new one." className="flex-1">
              <Input id="cache-lookup" value={lookupId} onChange={(e) => setLookupId(e.target.value)} placeholder="Paste a cache policy ID" />
            </FormField>
            <Button variant="outline" onClick={() => setActivePolicyId(lookupId || undefined)} disabled={!lookupId}>
              <Search className="h-4 w-4" />
              Look up
            </Button>
            <Button onClick={() => setCreatePolicyOpen(true)}>
              <Plus className="h-4 w-4" />
              New policy
            </Button>
          </div>
          <CachePolicyPanel activeId={activePolicyId} onCleared={() => setActivePolicyId(undefined)} />
        </CardContent>
      </Card>

      <CreateCachePolicyDialog open={createPolicyOpen} onOpenChange={setCreatePolicyOpen} workspaceId={workspaceId} onCreated={(id) => { setLookupId(id); setActivePolicyId(id); }} />
    </div>
  );
}

function CachePolicyPanel({ activeId, onCleared }: { activeId: string | undefined; onCleared: () => void }) {
  const { data: policy, isLoading, isError } = useCachePolicy(activeId);
  const update = useUpdateCachePolicy(activeId ?? '');
  const remove = useDeleteCachePolicy();

  if (!activeId) {
    return <EmptyState title="No policy loaded" description="Look up a cache policy by ID, or create a new one." className="border-none py-8" />;
  }
  if (isError) {
    return <EmptyState title="Policy not found" description="No cache policy exists with that ID." className="border-none py-8" />;
  }
  if (isLoading || !policy) {
    return <Skeleton className="h-48 w-full" />;
  }

  return (
    <div className="rounded-[var(--radius)] border border-border p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{policy.name}</span>
        <div className="flex items-center gap-2">
          <StatusBadge status={policy.enabled ? 'ENABLED' : 'DISABLED'} />
          <Button variant="ghost" size="sm" onClick={() => remove.mutate(policy.id, { onSuccess: onCleared })} disabled={remove.isPending}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
        <Field label="Scope" value={policy.scope} />
        <Field label="Strategy" value={policy.strategy} />
        <Field label="Capability" value={policy.capability ?? 'Any'} />
        <Field label="Provider / Model" value={policy.provider ? `${policy.provider} / ${policy.model ?? '—'}` : 'Any'} />
        <Field label="Priority" value={String(policy.priority)} />
        <Field label="TTL" value={`${policy.ttlSeconds}s`} />
        <Field label="Stale TTL" value={policy.staleTtlSeconds != null ? `${policy.staleTtlSeconds}s` : '—'} />
        <Field label="Max cache size" value={policy.maxCacheSize != null ? String(policy.maxCacheSize) : '—'} />
      </div>
      {policy.tags.length > 0 && <p className="mt-2 text-xs text-muted-foreground">Tags: {policy.tags.join(', ')}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-border pt-4">
        <div className="flex items-center gap-2">
          <Switch checked={policy.enabled} onChange={(e) => update.mutate({ enabled: e.target.checked })} />
          <span className="text-sm text-foreground">Enabled</span>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={!!policy.enableSemanticCache} onChange={(e) => update.mutate({ enableSemanticCache: e.target.checked })} />
          <span className="text-sm text-foreground">Semantic cache</span>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={!!policy.enablePartialCache} onChange={(e) => update.mutate({ enablePartialCache: e.target.checked })} />
          <span className="text-sm text-foreground">Partial-result cache</span>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={!!policy.bypassOnSensitive} onChange={(e) => update.mutate({ bypassOnSensitive: e.target.checked })} />
          <span className="text-sm text-foreground">Bypass on sensitive data</span>
        </div>
      </div>
    </div>
  );
}

function CreateCachePolicyDialog({ open, onOpenChange, workspaceId, onCreated }: { open: boolean; onOpenChange: (open: boolean) => void; workspaceId: string | undefined; onCreated: (id: string) => void }) {
  const create = useCreateCachePolicy();
  const [form, setForm] = useState<CreateCachePolicyPayload>({ name: '', scope: 'WORKSPACE', strategy: 'EXACT_MATCH', ttlSeconds: 3600, enabled: true, priority: 0 });

  const reset = () => setForm({ name: '', scope: 'WORKSPACE', strategy: 'EXACT_MATCH', ttlSeconds: 3600, enabled: true, priority: 0 });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>New cache policy</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Name" htmlFor="cp-name" required className="sm:col-span-2">
            <Input id="cp-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </FormField>
          <FormField label="Scope" htmlFor="cp-scope" required>
            <Select id="cp-scope" value={form.scope} onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value as AiCacheScope }))} options={CACHE_SCOPE_OPTIONS} />
          </FormField>
          <FormField label="Strategy" htmlFor="cp-strategy" required>
            <Select id="cp-strategy" value={form.strategy} onChange={(e) => setForm((f) => ({ ...f, strategy: e.target.value as AiCacheStrategy }))} options={CACHE_STRATEGY_OPTIONS} />
          </FormField>
          <FormField label="Capability" htmlFor="cp-capability">
            <Input id="cp-capability" value={form.capability ?? ''} onChange={(e) => setForm((f) => ({ ...f, capability: e.target.value || undefined }))} />
          </FormField>
          <FormField label="Provider" htmlFor="cp-provider">
            <Input id="cp-provider" value={form.provider ?? ''} onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value || undefined }))} />
          </FormField>
          <FormField label="Model" htmlFor="cp-model">
            <Input id="cp-model" value={form.model ?? ''} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value || undefined }))} />
          </FormField>
          <FormField label="Priority" htmlFor="cp-priority">
            <Input id="cp-priority" type="number" value={form.priority ?? 0} onChange={(e) => setForm((f) => ({ ...f, priority: Number(e.target.value) }))} />
          </FormField>
          <FormField label="TTL (seconds)" htmlFor="cp-ttl" required>
            <Input id="cp-ttl" type="number" min="1" value={form.ttlSeconds} onChange={(e) => setForm((f) => ({ ...f, ttlSeconds: Number(e.target.value) }))} />
          </FormField>
          <FormField label="Stale TTL (seconds)" htmlFor="cp-stale-ttl" hint="Stale-while-revalidate window.">
            <Input id="cp-stale-ttl" type="number" min="0" value={form.staleTtlSeconds ?? ''} onChange={(e) => setForm((f) => ({ ...f, staleTtlSeconds: e.target.value ? Number(e.target.value) : undefined }))} />
          </FormField>
          <FormField label="Max cache size" htmlFor="cp-max-size">
            <Input id="cp-max-size" type="number" min="0" value={form.maxCacheSize ?? ''} onChange={(e) => setForm((f) => ({ ...f, maxCacheSize: e.target.value ? Number(e.target.value) : undefined }))} />
          </FormField>
          <div className="flex items-center gap-4 sm:col-span-2">
            <div className="flex items-center gap-2">
              <Switch checked={!!form.enableSemanticCache} onChange={(e) => setForm((f) => ({ ...f, enableSemanticCache: e.target.checked }))} />
              <span className="text-sm text-foreground">Semantic cache</span>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={!!form.enablePartialCache} onChange={(e) => setForm((f) => ({ ...f, enablePartialCache: e.target.checked }))} />
              <span className="text-sm text-foreground">Partial-result cache</span>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={!!form.bypassOnSensitive} onChange={(e) => setForm((f) => ({ ...f, bypassOnSensitive: e.target.checked }))} />
              <span className="text-sm text-foreground">Bypass on sensitive data</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => create.mutate({ ...form, workspaceId }, { onSuccess: (p) => { onOpenChange(false); reset(); onCreated(p.id); } })}
            disabled={!form.name || !form.ttlSeconds || create.isPending}
          >
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
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
