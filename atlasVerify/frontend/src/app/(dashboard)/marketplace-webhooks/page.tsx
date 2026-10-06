'use client';

import { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FilterBar } from '@/components/ui/filter-bar';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { FormField } from '@/components/ui/form-field';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState } from '@/components/ui/states';
import { KpiCard } from '@/components/ui/kpi-card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/action-menu';
import { SecretRevealDialog } from '@/components/developer/secret-reveal-dialog';
import {
  useDeleteMarketplaceWebhook,
  useDisableMarketplaceWebhook,
  useEnableMarketplaceWebhook,
  useMarketplaceAccounts,
  useMarketplaceWebhookConfig,
  useMarketplaceWebhookConfigs,
  useMarketplaceWebhookDeliveries,
  useMarketplaceWebhookMetrics,
  useRegisterMarketplaceWebhook,
  useRotateMarketplaceWebhookSecret,
  useUpdateMarketplaceWebhook,
} from '@/hooks';
import { formatDate } from '@/lib/utils';
import type { MarketplaceWebhookConfigStatus, MarketplaceWebhookDeliveryStatus, MarketplaceWebhookEvent, RegisterMarketplaceWebhookPayload } from '@/types';

const WEBHOOK_EVENTS: MarketplaceWebhookEvent[] = [
  'ORDER_CREATED', 'ORDER_UPDATED', 'ORDER_CANCELLED', 'ORDER_SHIPPED', 'ORDER_DELIVERED',
  'LISTING_CREATED', 'LISTING_UPDATED', 'LISTING_DELETED',
  'INVENTORY_UPDATED', 'PRICE_UPDATED',
  'RETURN_REQUESTED', 'RETURN_APPROVED', 'RETURN_REJECTED',
  'SHIPMENT_CREATED', 'SHIPMENT_UPDATED',
  'PAYMENT_RECEIVED', 'REFUND_ISSUED',
  'DISPUTE_OPENED', 'DISPUTE_RESOLVED',
  'ACCOUNT_SUSPENDED', 'ACCOUNT_ACTIVATED', 'CUSTOM',
];
const CONFIG_STATUSES: MarketplaceWebhookConfigStatus[] = ['ACTIVE', 'INACTIVE', 'DISABLED', 'ERROR', 'EXPIRED'];
const DELIVERY_STATUSES: MarketplaceWebhookDeliveryStatus[] = ['PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'REJECTED', 'DUPLICATE'];

export default function MarketplaceWebhooksPage() {
  return (
    <div>
      <PageHeader title="Marketplace Webhooks" description="Inbound webhook subscriptions with marketplace providers, delivery history and signature validation status." />
      <Tabs defaultValue="subscriptions">
        <TabsList>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="deliveries">Deliveries</TabsTrigger>
        </TabsList>
        <TabsContent value="subscriptions">
          <SubscriptionsTab />
        </TabsContent>
        <TabsContent value="deliveries">
          <DeliveriesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SubscriptionsTab() {
  const [accountId, setAccountId] = useState('');
  const [providerKey, setProviderKey] = useState('');
  const [status, setStatus] = useState<MarketplaceWebhookConfigStatus | ''>('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useMarketplaceWebhookConfigs({
    accountId: accountId || undefined,
    providerKey: providerKey || undefined,
    status: status || undefined,
    page,
    limit: 20,
  });
  const { data: metrics } = useMarketplaceWebhookMetrics(accountId || undefined);

  return (
    <div>
      {metrics && (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <KpiCard label="Subscriptions" value={metrics.totalWebhooks} />
          <KpiCard label="Active" value={metrics.activeWebhooks} />
          <KpiCard label="Total deliveries" value={metrics.totalDeliveries} />
          <KpiCard label="Successful" value={metrics.successfulDeliveries} />
          <KpiCard label="Failed" value={metrics.failedDeliveries} gradient="from-danger to-warning" />
        </div>
      )}

      <div className="mb-4 flex items-center justify-between gap-3">
        <FilterBar hasActiveFilters={!!accountId || !!providerKey || !!status} onClearFilters={() => { setAccountId(''); setProviderKey(''); setStatus(''); setPage(1); }}>
          <Input value={accountId} onChange={(e) => { setAccountId(e.target.value); setPage(1); }} placeholder="Account ID" className="h-9 w-40" />
          <Input value={providerKey} onChange={(e) => { setProviderKey(e.target.value); setPage(1); }} placeholder="Provider key" className="h-9 w-40" />
          <Select value={status} onChange={(e) => { setStatus(e.target.value as MarketplaceWebhookConfigStatus | ''); setPage(1); }} placeholder="All statuses" options={CONFIG_STATUSES.map((s) => ({ value: s, label: s }))} className="h-9 w-36" />
        </FilterBar>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Register webhook
        </Button>
      </div>

      {isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load webhook subscriptions." />
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No webhook subscriptions yet" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider / Marketplace</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Events</TableHead>
                <TableHead>Last delivery</TableHead>
                <TableHead>Failures</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((c) => (
                <TableRow key={c.id} clickable onClick={() => setSelectedId(c.id)}>
                  <TableCell className="text-sm font-medium text-foreground">{c.providerKey} · {c.marketplaceKey}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.accountId}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{c.events.slice(0, 2).join(', ')}{c.events.length > 2 ? ` +${c.events.length - 2}` : ''}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.lastDeliveryAt ? formatDate(c.lastDeliveryAt) : '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.failureCount}</TableCell>
                  <TableCell>
                    <StatusBadge status={c.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.total > 0 && <Pagination page={page} limit={20} total={data.total} totalPages={data.totalPages} onPageChange={setPage} onLimitChange={() => {}} />}
        </>
      )}

      <RegisterWebhookDialog open={createOpen} onOpenChange={setCreateOpen} />
      <WebhookDetailDialog id={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function RegisterWebhookDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const register = useRegisterMarketplaceWebhook();
  const [form, setForm] = useState<Omit<RegisterMarketplaceWebhookPayload, 'workspaceId' | 'events'>>({ accountId: '', providerKey: '', marketplaceKey: '', callbackUrl: '' });
  const [events, setEvents] = useState<MarketplaceWebhookEvent[]>([]);
  const reset = () => { setForm({ accountId: '', providerKey: '', marketplaceKey: '', callbackUrl: '' }); setEvents([]); };

  const toggleEvent = (event: MarketplaceWebhookEvent) => {
    setEvents((prev) => (prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]));
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Register webhook subscription</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Account ID" htmlFor="wh-account" required>
            <Input id="wh-account" value={form.accountId} onChange={(e) => setForm((f) => ({ ...f, accountId: e.target.value }))} />
          </FormField>
          <FormField label="Provider key" htmlFor="wh-provider" required>
            <Input id="wh-provider" value={form.providerKey} onChange={(e) => setForm((f) => ({ ...f, providerKey: e.target.value }))} />
          </FormField>
          <FormField label="Marketplace key" htmlFor="wh-marketplace" required>
            <Input id="wh-marketplace" value={form.marketplaceKey} onChange={(e) => setForm((f) => ({ ...f, marketplaceKey: e.target.value }))} />
          </FormField>
          <FormField label="Callback URL" htmlFor="wh-callback" required>
            <Input id="wh-callback" value={form.callbackUrl} onChange={(e) => setForm((f) => ({ ...f, callbackUrl: e.target.value }))} placeholder="https://..." />
          </FormField>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Events</p>
          <div className="grid max-h-48 grid-cols-2 gap-2 overflow-y-auto rounded-[var(--radius)] border border-border p-3 sm:grid-cols-3">
            {WEBHOOK_EVENTS.map((event) => (
              <label key={event} className="flex items-center gap-2 text-xs text-foreground">
                <Checkbox checked={events.includes(event)} onChange={() => toggleEvent(event)} />
                {event.replace(/_/g, ' ')}
              </label>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => register.mutate({ ...form, events }, { onSuccess: () => { onOpenChange(false); reset(); } })}
            disabled={!form.accountId || !form.providerKey || !form.marketplaceKey || !form.callbackUrl || events.length === 0 || register.isPending}
          >
            {register.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Register
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WebhookDetailDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: config, isLoading } = useMarketplaceWebhookConfig(id ?? undefined);
  const update = useUpdateMarketplaceWebhook(id ?? '');
  const enable = useEnableMarketplaceWebhook(id ?? '');
  const disable = useDisableMarketplaceWebhook(id ?? '');
  const remove = useDeleteMarketplaceWebhook();
  const rotate = useRotateMarketplaceWebhookSecret(id ?? '');
  const [callbackUrl, setCallbackUrl] = useState('');
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);

  const actions: ActionMenuItem[] = [];
  if (config) {
    if (config.status !== 'ACTIVE') actions.push({ label: 'Enable', onSelect: () => enable.mutate() });
    if (config.status === 'ACTIVE') actions.push({ label: 'Disable', onSelect: () => disable.mutate() });
    actions.push({ label: 'Rotate secret', onSelect: () => rotate.mutate(undefined, { onSuccess: (r) => setRevealedSecret(r.secret) }) });
    actions.push({
      label: 'Delete',
      onSelect: () => remove.mutate(config.id, { onSuccess: onClose }),
      destructive: true,
      separatorBefore: true,
    });
  }

  return (
    <Dialog open={!!id} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>Webhook subscription</span>
            {config && <ActionMenu items={actions} />}
          </DialogTitle>
        </DialogHeader>
        {isLoading || !config ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <Field label="Provider" value={config.providerKey} />
              <Field label="Marketplace" value={config.marketplaceKey} />
              <Field label="Account" value={config.accountId} />
              <Field label="Status" value={config.status} />
              <Field label="Failure count" value={String(config.failureCount)} />
              <Field label="Last delivery" value={config.lastDeliveryAt ? formatDate(config.lastDeliveryAt) : '—'} />
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Events</p>
              <div className="flex flex-wrap gap-1.5">
                {config.events.map((e) => (
                  <Badge key={e} variant="secondary" className="text-[10px]">{e.replace(/_/g, ' ')}</Badge>
                ))}
              </div>
            </div>
            <div className="flex items-end gap-2">
              <FormField label="Callback URL" htmlFor="wh-edit-callback" hint={`Currently: ${config.callbackUrl}`}>
                <Input id="wh-edit-callback" value={callbackUrl} onChange={(e) => setCallbackUrl(e.target.value)} placeholder="New callback URL" className="w-80" />
              </FormField>
              <Button size="sm" onClick={() => update.mutate({ callbackUrl }, { onSuccess: () => setCallbackUrl('') })} disabled={!callbackUrl || update.isPending}>
                Save
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
      <SecretRevealDialog title="Webhook secret rotated" label="Signing secret" secret={revealedSecret} onClose={() => setRevealedSecret(null)} />
    </Dialog>
  );
}

function DeliveriesTab() {
  const { data: accounts } = useMarketplaceAccounts({ limit: 100 });
  const [accountId, setAccountId] = useState('');
  const [webhookConfigId, setWebhookConfigId] = useState('');
  const [status, setStatus] = useState<MarketplaceWebhookDeliveryStatus | ''>('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useMarketplaceWebhookDeliveries(accountId || undefined, {
    webhookConfigId: webhookConfigId || undefined,
    status: status || undefined,
    page,
    limit: 20,
  });

  return (
    <div>
      <FilterBar hasActiveFilters={!!webhookConfigId || !!status} onClearFilters={() => { setWebhookConfigId(''); setStatus(''); setPage(1); }} className="mb-4">
        <Select
          value={accountId}
          onChange={(e) => { setAccountId(e.target.value); setPage(1); }}
          placeholder="Select an account"
          options={(accounts?.items ?? []).map((a) => ({ value: a.id, label: `${a.accountName} (${a.providerKey})` }))}
          className="h-9 w-64"
        />
        <Input value={webhookConfigId} onChange={(e) => { setWebhookConfigId(e.target.value); setPage(1); }} placeholder="Webhook config ID" className="h-9 w-48" />
        <Select value={status} onChange={(e) => { setStatus(e.target.value as MarketplaceWebhookDeliveryStatus | ''); setPage(1); }} placeholder="All statuses" options={DELIVERY_STATUSES.map((s) => ({ value: s, label: s }))} className="h-9 w-36" />
      </FilterBar>

      {!accountId ? (
        <EmptyState title="Select an account to view its webhook deliveries" />
      ) : isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load webhook deliveries." />
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No deliveries recorded for this account" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>External event ID</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Processed</TableHead>
                <TableHead>Attempts</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="text-sm text-foreground">{d.event.replace(/_/g, ' ')}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{d.externalEventId}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(d.receivedAt)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{d.processedAt ? formatDate(d.processedAt) : '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{d.attemptCount}</TableCell>
                  <TableCell>
                    <StatusBadge status={d.status} />
                    {d.errorMessage && <p className="mt-1 text-xs text-danger">{d.errorMessage}</p>}
                  </TableCell>
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-foreground">{value}</p>
    </div>
  );
}
