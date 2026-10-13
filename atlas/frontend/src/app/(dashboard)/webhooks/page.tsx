'use client';

import { useState } from 'react';
import { isAxiosError } from 'axios';
import { Loader2, Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FilterBar } from '@/components/ui/filter-bar';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/ui/form-field';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState, UnauthorizedState } from '@/components/ui/states';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/action-menu';
import { ReasonDialog } from '@/components/suppliers/reason-dialog';
import { SecretRevealDialog } from '@/components/developer/secret-reveal-dialog';
import {
  useCancelWebhookDelivery,
  useCreateWebhook,
  useDeleteWebhook,
  useDisableWebhook,
  useEnableWebhook,
  useRedeliverWebhookDelivery,
  useRotateWebhookSecret,
  useTestWebhook,
  useUpdateWebhook,
  useWebhook,
  useWebhookDeliveries,
  useWebhookHistory,
  useWebhooks,
} from '@/hooks';
import { formatDate } from '@/lib/utils';
import type { CreateWebhookPayload, WebhookDeliveryStatus, WebhookEndpointStatus, WebhookHealthStatus, WebhookScopeType } from '@/types';

const SCOPE_OPTIONS: { value: WebhookScopeType; label: string }[] = [
  { value: 'ORGANIZATION', label: 'Organization' },
  { value: 'WORKSPACE', label: 'Workspace' },
];

const STATUS_OPTIONS: { value: WebhookEndpointStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DISABLED', label: 'Disabled' },
];

const HEALTH_OPTIONS: { value: WebhookHealthStatus; label: string }[] = [
  { value: 'HEALTHY', label: 'Healthy' },
  { value: 'DEGRADED', label: 'Degraded' },
  { value: 'UNHEALTHY', label: 'Unhealthy' },
];

const HEALTH_TONE: Record<WebhookHealthStatus, 'success' | 'warning' | 'danger'> = {
  HEALTHY: 'success',
  DEGRADED: 'warning',
  UNHEALTHY: 'danger',
};

function splitList(value: string): string[] {
  return value.split(/[\n,]/).map((v) => v.trim()).filter(Boolean);
}

export default function WebhooksPage() {
  const [scopeType, setScopeType] = useState<WebhookScopeType | ''>('');
  const [status, setStatus] = useState<WebhookEndpointStatus | ''>('');
  const [healthStatus, setHealthStatus] = useState<WebhookHealthStatus | ''>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useWebhooks({
    scopeType: scopeType || undefined,
    status: status || undefined,
    healthStatus: healthStatus || undefined,
    search: search || undefined,
    page,
    limit,
  });
  const isForbidden = isAxiosError(error) && error.response?.status === 403;

  return (
    <div>
      <PageHeader
        title="Webhooks"
        description="Subscribe endpoints to ATLAS events, monitor delivery health and manage retries."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            New webhook
          </Button>
        }
      />

      <FilterBar
        hasActiveFilters={!!scopeType || !!status || !!healthStatus || !!search}
        onClearFilters={() => { setScopeType(''); setStatus(''); setHealthStatus(''); setSearch(''); setPage(1); }}
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        className="mb-4"
      >
        <Select value={scopeType} onChange={(e) => { setScopeType(e.target.value as WebhookScopeType | ''); setPage(1); }} placeholder="All scopes" options={SCOPE_OPTIONS} className="h-9 w-40" />
        <Select value={status} onChange={(e) => { setStatus(e.target.value as WebhookEndpointStatus | ''); setPage(1); }} placeholder="All statuses" options={STATUS_OPTIONS} className="h-9 w-36" />
        <Select value={healthStatus} onChange={(e) => { setHealthStatus(e.target.value as WebhookHealthStatus | ''); setPage(1); }} placeholder="All health" options={HEALTH_OPTIONS} className="h-9 w-36" />
      </FilterBar>

      {isForbidden ? (
        <UnauthorizedState />
      ) : isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load webhooks." />
      ) : isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No webhooks yet" description="Create a webhook endpoint to receive ATLAS event notifications." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>URL</TableHead>
              <TableHead>Events</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Health</TableHead>
              <TableHead>Last delivery</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((w) => (
              <TableRow key={w.id} clickable onClick={() => setSelectedId(w.id)}>
                <TableCell className="text-sm font-medium text-foreground">{w.name}</TableCell>
                <TableCell className="max-w-xs truncate text-sm text-muted-foreground">{w.url}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{w.eventTypes.length}</TableCell>
                <TableCell>
                  <StatusBadge status={w.status} />
                </TableCell>
                <TableCell>
                  <StatusBadge status={w.healthStatus} tone={HEALTH_TONE[w.healthStatus]} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{w.lastDeliveryAt ? formatDate(w.lastDeliveryAt) : 'Never'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {data && data.total > 0 && (
        <Pagination page={page} limit={limit} total={data.total} totalPages={data.totalPages} onPageChange={setPage} onLimitChange={(l) => { setLimit(l); setPage(1); }} />
      )}

      <CreateWebhookDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={(secret) => { setCreateOpen(false); setCreatedSecret(secret); }} />
      <SecretRevealDialog title="Webhook created" label="Signing Secret" secret={createdSecret} onClose={() => setCreatedSecret(null)} />
      <WebhookDetailDialog id={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function CreateWebhookDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: (secret: string) => void }) {
  const createWebhook = useCreateWebhook();
  const [form, setForm] = useState<{ name: string; url: string; scopeType: WebhookScopeType; organizationId?: string }>({ name: '', url: '', scopeType: 'WORKSPACE' });
  const [eventsText, setEventsText] = useState('');

  const reset = () => { setForm({ name: '', url: '', scopeType: 'WORKSPACE' }); setEventsText(''); };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>New webhook</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <FormField label="Name" htmlFor="wh-name" required>
            <Input id="wh-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </FormField>
          <FormField label="Endpoint URL" htmlFor="wh-url" required>
            <Input id="wh-url" value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} placeholder="https://…" />
          </FormField>
          <FormField label="Scope" htmlFor="wh-scope" required>
            <Select id="wh-scope" value={form.scopeType} onChange={(e) => setForm((f) => ({ ...f, scopeType: e.target.value as WebhookScopeType }))} options={SCOPE_OPTIONS} />
          </FormField>
          {form.scopeType === 'ORGANIZATION' && (
            <FormField label="Organization ID" htmlFor="wh-org" required>
              <Input id="wh-org" value={form.organizationId ?? ''} onChange={(e) => setForm((f) => ({ ...f, organizationId: e.target.value }))} />
            </FormField>
          )}
          <FormField label="Event types" htmlFor="wh-events" required hint="Comma or newline separated, e.g. order.created, inventory.updated">
            <Textarea id="wh-events" rows={3} value={eventsText} onChange={(e) => setEventsText(e.target.value)} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              const payload: CreateWebhookPayload = { ...form, eventTypes: splitList(eventsText) };
              createWebhook.mutate(payload, { onSuccess: (result) => { onCreated(result.plaintextSecret); reset(); } });
            }}
            disabled={!form.name || !form.url || splitList(eventsText).length === 0 || createWebhook.isPending}
          >
            {createWebhook.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const DELIVERY_STATUS_OPTIONS: { value: WebhookDeliveryStatus; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'SUCCEEDED', label: 'Succeeded' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'RETRYING', label: 'Retrying' },
  { value: 'DEAD_LETTERED', label: 'Dead lettered' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

function WebhookDetailDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: webhook, isLoading } = useWebhook(id ?? undefined);
  const { data: history } = useWebhookHistory(id ?? undefined);
  const [deliveryStatus, setDeliveryStatus] = useState<WebhookDeliveryStatus | ''>('');
  const { data: deliveries } = useWebhookDeliveries(id ?? undefined, { status: deliveryStatus || undefined });

  const enable = useEnableWebhook(id ?? '');
  const disable = useDisableWebhook(id ?? '');
  const rotateSecret = useRotateWebhookSecret(id ?? '');
  const testWebhook = useTestWebhook(id ?? '');
  const deleteWebhook = useDeleteWebhook();
  const redeliver = useRedeliverWebhookDelivery(id ?? undefined);
  const cancelDelivery = useCancelWebhookDelivery(id ?? undefined);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [rotatedSecret, setRotatedSecret] = useState<string | null>(null);

  const actions: ActionMenuItem[] = [];
  if (webhook) {
    actions.push({ label: 'Send test event', onSelect: () => testWebhook.mutate({}) });
    actions.push({ label: 'Rotate secret', onSelect: () => rotateSecret.mutate(undefined, { onSuccess: (r) => setRotatedSecret(r.plaintextSecret) }) });
    if (webhook.status === 'ACTIVE') {
      actions.push({ label: 'Disable', onSelect: () => disable.mutate() });
    } else {
      actions.push({ label: 'Enable', onSelect: () => enable.mutate() });
    }
    actions.push({ label: 'Delete', onSelect: () => setDeleteOpen(true), destructive: true, separatorBefore: true });
  }

  return (
    <Dialog open={!!id} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>Webhook</span>
            {webhook && <ActionMenu items={actions} />}
          </DialogTitle>
        </DialogHeader>
        {isLoading || !webhook ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="deliveries">Deliveries</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                <Field label="Name" value={webhook.name} />
                <Field label="URL" value={webhook.url} />
                <Field label="Status" value={webhook.status} />
                <Field label="Health" value={webhook.healthStatus} />
                <Field label="Payload version" value={webhook.payloadVersion} />
                <Field label="Consecutive failures" value={String(webhook.consecutiveFailures)} />
                <Field label="Retry max attempts" value={String(webhook.retryMaxAttempts)} />
                <Field label="Retry backoff (ms)" value={String(webhook.retryBackoffMs)} />
                <Field label="Last delivery" value={webhook.lastDeliveryAt ? formatDate(webhook.lastDeliveryAt) : '—'} />
                <Field label="Last success" value={webhook.lastSuccessAt ? formatDate(webhook.lastSuccessAt) : '—'} />
                <Field label="Last failure" value={webhook.lastFailureAt ? formatDate(webhook.lastFailureAt) : '—'} />
              </div>
              <div className="mt-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Event types</p>
                <p className="text-sm text-foreground">{webhook.eventTypes.join(', ')}</p>
              </div>
            </TabsContent>

            <TabsContent value="deliveries">
              <div className="mb-3 flex justify-end">
                <Select value={deliveryStatus} onChange={(e) => setDeliveryStatus(e.target.value as WebhookDeliveryStatus | '')} placeholder="All statuses" options={DELIVERY_STATUS_OPTIONS} className="h-9 w-44" />
              </div>
              {!deliveries || deliveries.data.length === 0 ? (
                <EmptyState title="No deliveries yet" className="border-none py-8" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Attempts</TableHead>
                      <TableHead>Response</TableHead>
                      <TableHead>Latency</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deliveries.data.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="text-sm text-foreground">{d.eventType}</TableCell>
                        <TableCell>
                          <StatusBadge status={d.status} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{d.attemptCount}/{d.maxAttempts}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{d.responseStatus ?? '—'}{d.errorMessage ? ` · ${d.errorMessage}` : ''}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{d.latencyMs != null ? `${d.latencyMs}ms` : '—'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {(d.status === 'FAILED' || d.status === 'DEAD_LETTERED') && (
                              <Button variant="ghost" size="sm" onClick={() => redeliver.mutate(d.id)} disabled={redeliver.isPending}>
                                Redeliver
                              </Button>
                            )}
                            {(d.status === 'PENDING' || d.status === 'RETRYING') && (
                              <Button variant="ghost" size="sm" onClick={() => cancelDelivery.mutate(d.id)} disabled={cancelDelivery.isPending}>
                                Cancel
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="history">
              {!history || history.length === 0 ? (
                <EmptyState title="No history yet" className="border-none py-8" />
              ) : (
                <ul className="space-y-2">
                  {history.map((h) => (
                    <li key={h.id} className="flex items-center justify-between rounded-[var(--radius)] border border-border p-2 text-sm">
                      <span className="text-foreground">{h.changeType}{h.reason ? ` · ${h.reason}` : ''}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(h.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
      <ReasonDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this webhook"
        confirmLabel="Delete"
        variant="danger"
        pending={deleteWebhook.isPending}
        onSubmit={() => id && deleteWebhook.mutate(id, { onSuccess: () => { setDeleteOpen(false); onClose(); } })}
      />
      <SecretRevealDialog title="Webhook secret rotated" label="New Signing Secret" secret={rotatedSecret} onClose={() => setRotatedSecret(null)} />
    </Dialog>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="break-all text-foreground">{value}</p>
    </div>
  );
}
