'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Loader2,
  PlayCircle,
  ShieldAlert,
  X,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FilterBar } from '@/components/ui/filter-bar';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState } from '@/components/ui/states';
import { KpiCard } from '@/components/ui/kpi-card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  useCancelNotificationDelivery,
  useNotificationDeliveries,
  useNotificationProviderConfigs,
  useNotificationProviderCredentials,
  useNotificationProviderRegistry,
  useProcessScheduledNotificationDeliveries,
} from '@/hooks';
import { cancelNotificationDelivery as cancelNotificationDeliveryRequest } from '@/services/notification-provider.service';
import { useAuthStore } from '@/stores';
import { useQueryClient } from '@tanstack/react-query';
import { formatDate } from '@/lib/utils';
import type { NotificationDelivery, NotificationProviderRegistryEntry } from '@/types';

const KNOWN_STATUSES = ['QUEUED', 'SENT', 'DELIVERED', 'READ', 'OPENED', 'UNDELIVERED', 'REJECTED', 'FAILED', 'CANCELLED'];
const STATUS_LABEL: Record<string, string> = { UNDELIVERED: 'Bounced / Undelivered' };
const STATUS_TONE: Record<string, StatusTone> = {
  QUEUED: 'info',
  SENT: 'info',
  DELIVERED: 'success',
  READ: 'success',
  OPENED: 'success',
  UNDELIVERED: 'danger',
  REJECTED: 'danger',
  FAILED: 'danger',
  CANCELLED: 'neutral',
};
const CANCELLABLE_STATUSES = ['QUEUED', 'SENT'];

function maskRecipient(address: string, channel: string): string {
  const isPhoneChannel = /sms|whatsapp/i.test(channel);
  if (isPhoneChannel) {
    const digits = address.replace(/[^\d+]/g, '');
    if (digits.length <= 4) return '••••';
    return `${digits.slice(0, digits.startsWith('+') ? 3 : 0)}••••${digits.slice(-4)}`;
  }
  if (address.includes('@')) return address;
  return address.length > 24 ? `${address.slice(0, 10)}…${address.slice(-6)}` : address;
}

function statusLabel(status: string) {
  return STATUS_LABEL[status] ?? status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' ');
}

export default function NotificationOperationsPage() {
  return (
    <div>
      <PageHeader title="Communication Operations" description="Unified delivery logs, queue status, provider health and alerts across email, SMS, WhatsApp and push." />
      <Tabs defaultValue="log">
        <TabsList>
          <TabsTrigger value="log">Delivery Log</TabsTrigger>
          <TabsTrigger value="queue">Queue & Scheduled</TabsTrigger>
          <TabsTrigger value="health">Provider Health</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>
        <TabsContent value="log">
          <DeliveryLogTab />
        </TabsContent>
        <TabsContent value="queue">
          <QueueTab />
        </TabsContent>
        <TabsContent value="health">
          <ProviderHealthTab />
        </TabsContent>
        <TabsContent value="alerts">
          <AlertsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ───────────────────────── Delivery Log ───────────────────────── */

function DeliveryLogTab() {
  const [channel, setChannel] = useState('');
  const [providerKey, setProviderKey] = useState('');
  const [status, setStatus] = useState('');
  const [batchId, setBatchId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [detail, setDetail] = useState<NotificationDelivery | null>(null);
  const [bulkCancelling, setBulkCancelling] = useState(false);

  const { data: registry } = useNotificationProviderRegistry({ limit: 100 });
  const channels = useMemo(() => Array.from(new Set((registry?.data ?? []).map((r) => r.channel))).sort(), [registry]);

  const { data, isLoading, isError, refetch } = useNotificationDeliveries({
    channel: channel || undefined,
    providerKey: providerKey || undefined,
    status: status || undefined,
    batchId: batchId || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    page,
    limit: 20,
  });

  const workspaceId = useAuthStore((s) => s.user?.workspaceId);
  const queryClient = useQueryClient();

  const toggleSelect = (id: string) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const cancellableRows = (data?.data ?? []).filter((d) => CANCELLABLE_STATUSES.includes(d.status));
  const toggleSelectAll = () => setSelected(selected.length === cancellableRows.length ? [] : cancellableRows.map((d) => d.id));

  const bulkCancel = async () => {
    if (!workspaceId || selected.length === 0) return;
    setBulkCancelling(true);
    try {
      await Promise.allSettled(selected.map((id) => cancelNotificationDeliveryRequest(id, workspaceId)));
      await queryClient.invalidateQueries({ queryKey: ['notification-provider', 'deliveries'] });
      setSelected([]);
    } finally {
      setBulkCancelling(false);
    }
  };

  const exportCsv = () => {
    const rows = data?.data ?? [];
    if (rows.length === 0) return;
    const headers = ['id', 'channel', 'providerKey', 'status', 'recipientAddress', 'attemptNumber', 'latencyMs', 'createdAt', 'sentAt', 'deliveredAt', 'errorCode'];
    const csv = [
      headers.join(','),
      ...rows.map((r) =>
        headers
          .map((h) => {
            const v = (r as unknown as Record<string, unknown>)[h];
            const s = v == null ? '' : String(v);
            return `"${s.replace(/"/g, '""')}"`;
          })
          .join(','),
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `delivery-log-page-${page}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasFilters = !!channel || !!providerKey || !!status || !!batchId || !!startDate || !!endDate;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <FilterBar
          hasActiveFilters={hasFilters}
          onClearFilters={() => { setChannel(''); setProviderKey(''); setStatus(''); setBatchId(''); setStartDate(''); setEndDate(''); setPage(1); }}
        >
          <Select value={channel} onChange={(e) => { setChannel(e.target.value); setPage(1); }} placeholder="All channels" options={channels.map((c) => ({ value: c, label: c }))} className="h-9 w-36" />
          <Input value={providerKey} onChange={(e) => { setProviderKey(e.target.value); setPage(1); }} placeholder="Provider key" className="h-9 w-36" />
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} placeholder="All statuses" options={KNOWN_STATUSES.map((s) => ({ value: s, label: statusLabel(s) }))} className="h-9 w-44" />
          <Input value={batchId} onChange={(e) => { setBatchId(e.target.value); setPage(1); }} placeholder="Batch ID" className="h-9 w-36" />
          <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} className="h-9 w-36" />
          <Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} className="h-9 w-36" />
        </FilterBar>
        <div className="flex items-center gap-2">
          {selected.length > 0 && (
            <Button variant="danger" size="sm" onClick={bulkCancel} disabled={bulkCancelling}>
              {bulkCancelling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
              Cancel {selected.length} selected
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!data || data.data.length === 0}>
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load delivery logs." />
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No deliveries found" description="Try adjusting your filters." />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">
                  <Checkbox checked={cancellableRows.length > 0 && selected.length === cancellableRows.length} onChange={toggleSelectAll} />
                </TableHead>
                <TableHead>Channel / Provider</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Attempts</TableHead>
                <TableHead>Latency</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((d) => (
                <TableRow key={d.id} clickable onClick={() => setDetail(d)}>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {CANCELLABLE_STATUSES.includes(d.status) && <Checkbox checked={selected.includes(d.id)} onChange={() => toggleSelect(d.id)} />}
                  </TableCell>
                  <TableCell className="text-sm text-foreground">
                    {d.channel}
                    {d.providerKey && <span className="text-xs text-muted-foreground"> · {d.providerKey}</span>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{maskRecipient(d.recipientAddress, d.channel)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{d.templateId ?? '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {d.attemptNumber}
                    {d.isRetry && <Badge variant="secondary" className="ml-1.5 text-[9px]">retry</Badge>}
                    {d.isFallback && <Badge variant="secondary" className="ml-1.5 text-[9px]">fallback</Badge>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{d.latencyMs != null ? `${d.latencyMs}ms` : '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(d.createdAt)}</TableCell>
                  <TableCell>
                    <StatusBadge status={statusLabel(d.status)} tone={STATUS_TONE[d.status]} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.total > 0 && <Pagination page={page} limit={20} total={data.total} totalPages={data.totalPages} onPageChange={setPage} onLimitChange={() => {}} />}
        </>
      )}

      <DeliveryDetailDialog delivery={detail} onClose={() => setDetail(null)} />
    </div>
  );
}

function DeliveryDetailDialog({ delivery, onClose }: { delivery: NotificationDelivery | null; onClose: () => void }) {
  const cancel = useCancelNotificationDelivery(delivery?.id ?? '');
  if (!delivery) return null;

  const canCancel = CANCELLABLE_STATUSES.includes(delivery.status);

  return (
    <Dialog open={!!delivery} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {delivery.channel} delivery
            <StatusBadge status={statusLabel(delivery.status)} tone={STATUS_TONE[delivery.status]} />
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <Field label="Provider" value={delivery.providerKey ?? '—'} />
            <Field label="Recipient" value={maskRecipient(delivery.recipientAddress, delivery.channel)} />
            <Field label="Recipient name" value={delivery.recipientName ?? '—'} />
            <Field label="Subject" value={delivery.subject ?? '—'} />
            <Field label="Template" value={delivery.templateId ?? '—'} />
            <Field label="Attempt" value={String(delivery.attemptNumber)} />
            <Field label="Retry / Fallback" value={`${delivery.isRetry ? 'retry' : '—'} / ${delivery.isFallback ? 'fallback' : '—'}`} />
            <Field label="Batch ID" value={delivery.batchId ?? '—'} />
            <Field label="Idempotency key" value={delivery.idempotencyKey ?? '—'} />
            <Field label="Provider reference" value={delivery.providerRef ?? '—'} />
            <Field label="Latency" value={delivery.latencyMs != null ? `${delivery.latencyMs}ms` : '—'} />
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <Field label="Scheduled" value={delivery.scheduledAt ? formatDate(delivery.scheduledAt) : '—'} />
            <Field label="Queued" value={delivery.queuedAt ? formatDate(delivery.queuedAt) : '—'} />
            <Field label="Sent" value={delivery.sentAt ? formatDate(delivery.sentAt) : '—'} />
            <Field label="Delivered" value={delivery.deliveredAt ? formatDate(delivery.deliveredAt) : '—'} />
            <Field label="Read / Opened" value={delivery.readAt ? formatDate(delivery.readAt) : delivery.openedAt ? formatDate(delivery.openedAt) : '—'} />
            <Field label="Failed" value={delivery.failedAt ? formatDate(delivery.failedAt) : '—'} />
            <Field label="Cancelled" value={delivery.cancelledAt ? formatDate(delivery.cancelledAt) : '—'} />
          </div>

          {delivery.messagePreview && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Message preview</p>
              <p className="rounded-[var(--radius)] border border-border bg-secondary/30 p-2.5 text-sm text-foreground">{delivery.messagePreview}</p>
            </div>
          )}

          {(delivery.errorCode || delivery.errorMessage) && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Normalized error</p>
              <p className="text-sm text-danger">{delivery.errorCode ? `${delivery.errorCode}: ` : ''}{delivery.errorMessage}</p>
            </div>
          )}

          {delivery.metadata != null && Object.keys(delivery.metadata as Record<string, unknown>).length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Metadata</p>
              <pre className="max-h-40 overflow-auto rounded-[var(--radius)] border border-border bg-secondary/30 p-2.5 text-xs text-muted-foreground">{JSON.stringify(delivery.metadata, null, 2)}</pre>
            </div>
          )}

          {canCancel && (
            <div className="flex justify-end border-t border-border pt-3">
              <Button variant="danger" size="sm" onClick={() => cancel.mutate(undefined, { onSuccess: onClose })} disabled={cancel.isPending}>
                {cancel.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                Cancel delivery
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ───────────────────────── Queue & Scheduled ───────────────────────── */

function useStatusCount(status: string) {
  const { data } = useNotificationDeliveries({ status, limit: 1 });
  return data?.total ?? 0;
}

function QueueTab() {
  const queuedCount = useStatusCount('QUEUED');
  const sentCount = useStatusCount('SENT');
  const deliveredCount = useStatusCount('DELIVERED');
  const readCount = useStatusCount('READ');
  const openedCount = useStatusCount('OPENED');
  const undeliveredCount = useStatusCount('UNDELIVERED');
  const rejectedCount = useStatusCount('REJECTED');
  const failedCount = useStatusCount('FAILED');
  const cancelledCount = useStatusCount('CANCELLED');
  const counts = [
    { status: 'QUEUED', count: queuedCount },
    { status: 'SENT', count: sentCount },
    { status: 'DELIVERED', count: deliveredCount },
    { status: 'READ', count: readCount },
    { status: 'OPENED', count: openedCount },
    { status: 'UNDELIVERED', count: undeliveredCount },
    { status: 'REJECTED', count: rejectedCount },
    { status: 'FAILED', count: failedCount },
    { status: 'CANCELLED', count: cancelledCount },
  ];
  const { data: queued, isLoading } = useNotificationDeliveries({ status: 'QUEUED', limit: 20 });
  const processScheduled = useProcessScheduledNotificationDeliveries();

  return (
    <div>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {counts.map((c) => (
          <KpiCard key={c.status} label={statusLabel(c.status)} value={c.count} gradient={c.status === 'FAILED' || c.status === 'UNDELIVERED' || c.status === 'REJECTED' ? 'from-danger to-warning' : undefined} />
        ))}
      </div>

      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Deliveries currently queued for send.</p>
        <Button variant="outline" size="sm" onClick={() => processScheduled.mutate()} disabled={processScheduled.isPending}>
          {processScheduled.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlayCircle className="h-3.5 w-3.5" />}
          Process due scheduled deliveries
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : !queued || queued.data.length === 0 ? (
        <EmptyState title="Nothing queued right now" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Channel / Provider</TableHead>
              <TableHead>Recipient</TableHead>
              <TableHead>Scheduled</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {queued.data.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="text-sm text-foreground">{d.channel}{d.providerKey ? ` · ${d.providerKey}` : ''}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{maskRecipient(d.recipientAddress, d.channel)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{d.scheduledAt ? formatDate(d.scheduledAt) : '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(d.createdAt)}</TableCell>
                <TableCell>
                  <StatusBadge status={statusLabel(d.status)} tone={STATUS_TONE[d.status]} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

/* ───────────────────────── Provider Health ───────────────────────── */

function ProviderHealthTab() {
  const { data: registry, isLoading } = useNotificationProviderRegistry({ limit: 100 });

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!registry || registry.data.length === 0) return <EmptyState title="No notification providers registered yet" />;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {registry.data.map((entry) => (
        <ProviderHealthCard key={entry.id} entry={entry} />
      ))}
    </div>
  );
}

function ProviderHealthCard({ entry }: { entry: NotificationProviderRegistryEntry }) {
  const { data: configs } = useNotificationProviderConfigs({ providerKey: entry.providerKey, channel: entry.channel, limit: 5 });
  const { data: credentials } = useNotificationProviderCredentials({ providerKey: entry.providerKey, channel: entry.channel, limit: 5 });
  const { data: recentDeliveries } = useNotificationDeliveries({ providerKey: entry.providerKey, channel: entry.channel, limit: 50 });

  const config = configs?.data?.[0];
  const credential = credentials?.data?.[0];
  const deliveries = recentDeliveries?.data ?? [];
  const failed = deliveries.filter((d) => ['FAILED', 'UNDELIVERED', 'REJECTED'].includes(d.status)).length;
  const errorRate = deliveries.length > 0 ? Math.round((failed / deliveries.length) * 100) : null;
  const latencies = deliveries.filter((d) => d.latencyMs != null).map((d) => d.latencyMs as number);
  const avgLatency = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-sm">
          <span>{entry.displayName} <span className="text-xs font-normal text-muted-foreground">({entry.channel})</span></span>
          <StatusBadge status={entry.status} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniStat label="Priority" value={entry.priority} />
          <MiniStat label="Default" value={entry.isDefault ? 'Yes' : 'No'} />
          <MiniStat label="Avg latency" value={avgLatency != null ? `${avgLatency}ms` : '—'} />
          <MiniStat label="Error rate" value={errorRate != null ? `${errorRate}%` : '—'} />
        </div>

        {credential ? (
          <div className="flex items-center justify-between rounded-[var(--radius)] border border-border p-2 text-xs">
            <span className="text-muted-foreground">Credential: {credential.credentialSetName}</span>
            <StatusBadge status={credential.status} />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No credentials configured for this provider/channel.</p>
        )}

        {config ? (
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <span>Rate limit: {config.maxRequestsPerMinute ? `${config.maxRequestsPerMinute}/min` : 'unset'}</span>
            <span>Timeout: {config.timeoutMs ? `${config.timeoutMs}ms` : 'unset'}</span>
            <span>Max retries: {config.maxRetryAttempts ?? 'unset'}</span>
            <span>Retry backoff: {config.retryBackoffMs ? `${config.retryBackoffMs}ms` : 'unset'}</span>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No active configuration found.</p>
        )}
      </CardContent>
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[var(--radius)] bg-secondary/50 p-2 text-center">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

/* ───────────────────────── Alerts ───────────────────────── */

function AlertsTab() {
  const { data: registry } = useNotificationProviderRegistry({ limit: 100 });
  const { data: recent, isLoading } = useNotificationDeliveries({ limit: 100 });
  const { data: credentials } = useNotificationProviderCredentials({ limit: 100 });

  const providerStats = useMemo(() => {
    const byKey = new Map<string, { channel: string; providerKey: string; total: number; failed: number }>();
    for (const d of recent?.data ?? []) {
      if (!d.providerKey) continue;
      const key = `${d.providerKey}:${d.channel}`;
      const entry = byKey.get(key) ?? { channel: d.channel, providerKey: d.providerKey, total: 0, failed: 0 };
      entry.total += 1;
      if (['FAILED', 'UNDELIVERED', 'REJECTED'].includes(d.status)) entry.failed += 1;
      byKey.set(key, entry);
    }
    return Array.from(byKey.values())
      .map((e) => ({ ...e, rate: e.total > 0 ? e.failed / e.total : 0 }))
      .filter((e) => e.total >= 5 && e.rate >= 0.2)
      .sort((a, b) => b.rate - a.rate);
  }, [recent]);

  const degradedProviders = (registry?.data ?? []).filter((r) => r.status === 'DISABLED');

  const expiringCredentials = useMemo(() => {
    const soon = Date.now() + 7 * 24 * 60 * 60 * 1000;
    return (credentials?.data ?? []).filter((c) => c.expiresAt && new Date(c.expiresAt).getTime() < soon && c.status !== 'REVOKED');
  }, [credentials]);

  const queuedBacklog = useStatusCount('QUEUED');

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  const noAlerts = providerStats.length === 0 && degradedProviders.length === 0 && expiringCredentials.length === 0 && queuedBacklog < 50;

  return (
    <div className="space-y-4">
      {noAlerts ? (
        <EmptyState title="No active alerts" description="Failure rates, provider status and credential expiry all look healthy." icon={CheckCircle2} />
      ) : (
        <>
          {queuedBacklog >= 50 && (
            <AlertCard icon={ShieldAlert} tone="warning" title="Queue backlog" description={`${queuedBacklog} deliveries are currently queued — this may indicate a processing slowdown.`} />
          )}
          {degradedProviders.map((p) => (
            <AlertCard key={p.id} icon={AlertTriangle} tone="danger" title={`${p.displayName} is disabled`} description={`${p.channel} deliveries via this provider will not be attempted until it is re-enabled.`} />
          ))}
          {providerStats.map((s) => (
            <AlertCard
              key={`${s.providerKey}-${s.channel}`}
              icon={AlertTriangle}
              tone="danger"
              title={`High failure rate — ${s.providerKey} (${s.channel})`}
              description={`${Math.round(s.rate * 100)}% of the last ${s.total} deliveries failed or bounced.`}
            />
          ))}
          {expiringCredentials.map((c) => (
            <AlertCard
              key={c.id}
              icon={AlertTriangle}
              tone="warning"
              title={`Credential expiring soon — ${c.credentialSetName}`}
              description={`${c.providerKey} (${c.channel}) credentials expire ${c.expiresAt ? formatDate(c.expiresAt) : 'soon'}.`}
            />
          ))}
        </>
      )}
    </div>
  );
}

function AlertCard({ icon: Icon, tone, title, description }: { icon: React.ElementType; tone: 'danger' | 'warning'; title: string; description: string }) {
  return (
    <div className={`flex items-start gap-3 rounded-[var(--radius)] border p-3 text-sm ${tone === 'danger' ? 'border-danger/20 bg-danger/5' : 'border-warning/20 bg-warning/5'}`}>
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone === 'danger' ? 'text-danger' : 'text-warning'}`} />
      <div>
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
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
