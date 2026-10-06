'use client';

import { useState } from 'react';
import { Loader2, Plus, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FilterBar } from '@/components/ui/filter-bar';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/states';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/action-menu';
import { ReasonDialog } from '@/components/suppliers/reason-dialog';
import {
  useApproveRate,
  useArchiveCurrency,
  useArchiveRateRecord,
  useCreateCurrency,
  useCurrencies,
  useCurrencyById,
  useCurrencyHistory,
  useDisableCurrency,
  useEnableCurrency,
  useExchangeRateProviderPriorities,
  useExchangeRates,
  usePublishRate,
  useRecordManualRate,
  useRefreshRateFromProvider,
  useRejectRate,
  useRestoreCurrency,
  useUpdateCurrency,
} from '@/hooks';
import { formatDate } from '@/lib/utils';
import type { CreateCurrencyPayload, CurrencyStatus, RateStatus, RecordRatePayload } from '@/types';

const STATUS_OPTIONS: { value: CurrencyStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DISABLED', label: 'Disabled' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const RATE_STATUS_TONE: Record<RateStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  DRAFT: 'neutral',
  PENDING_APPROVAL: 'warning',
  APPROVED: 'neutral',
  PUBLISHED: 'success',
  REJECTED: 'danger',
  ARCHIVED: 'neutral',
};

export default function CurrenciesPage() {
  return (
    <div>
      <PageHeader title="Currencies & Exchange Rates" description="Manage currencies, ISO codes, rounding rules and exchange-rate history, sync and approvals." />
      <Tabs defaultValue="currencies">
        <TabsList>
          <TabsTrigger value="currencies">Currencies</TabsTrigger>
          <TabsTrigger value="rates">Exchange Rates</TabsTrigger>
          <TabsTrigger value="providers">Provider Priority</TabsTrigger>
        </TabsList>
        <TabsContent value="currencies">
          <CurrenciesTab />
        </TabsContent>
        <TabsContent value="rates">
          <RatesTab />
        </TabsContent>
        <TabsContent value="providers">
          <ProvidersTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CurrenciesTab() {
  const [status, setStatus] = useState<CurrencyStatus | ''>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading } = useCurrencies({ status: status || undefined, search: search || undefined, page, limit: 20 });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <FilterBar
          hasActiveFilters={!!status || !!search}
          onClearFilters={() => { setStatus(''); setSearch(''); setPage(1); }}
          searchValue={search}
          onSearchChange={(v) => { setSearch(v); setPage(1); }}
        >
          <Select value={status} onChange={(e) => { setStatus(e.target.value as CurrencyStatus | ''); setPage(1); }} placeholder="All statuses" options={STATUS_OPTIONS} className="h-9 w-40" />
        </FilterBar>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Register currency
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No currencies found" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead>Decimals</TableHead>
                <TableHead>Rounding</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((c) => (
                <TableRow key={c.id} clickable onClick={() => setSelectedId(c.id)}>
                  <TableCell className="text-sm font-medium text-foreground">{c.code}</TableCell>
                  <TableCell className="text-sm text-foreground">{c.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.symbol}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.decimals}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.roundingMode}</TableCell>
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

      <CreateCurrencyDialog open={createOpen} onOpenChange={setCreateOpen} />
      <CurrencyDetailDialog id={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function CreateCurrencyDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const create = useCreateCurrency();
  const [form, setForm] = useState<CreateCurrencyPayload>({ code: '', name: '', symbol: '' });
  const reset = () => setForm({ code: '', name: '', symbol: '' });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Register currency</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="ISO code" htmlFor="cur-code" required>
            <Input id="cur-code" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="USD" />
          </FormField>
          <FormField label="Symbol" htmlFor="cur-symbol" required>
            <Input id="cur-symbol" value={form.symbol} onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value }))} placeholder="$" />
          </FormField>
          <div className="col-span-2">
            <FormField label="Name" htmlFor="cur-name" required>
              <Input id="cur-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </FormField>
          </div>
          <FormField label="Decimals" htmlFor="cur-decimals">
            <Input id="cur-decimals" type="number" value={form.decimals ?? ''} onChange={(e) => setForm((f) => ({ ...f, decimals: e.target.value ? Number(e.target.value) : undefined }))} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => create.mutate(form, { onSuccess: () => { onOpenChange(false); reset(); } })} disabled={!form.code || !form.name || !form.symbol || create.isPending}>
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Register
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CurrencyDetailDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: currency, isLoading } = useCurrencyById(id ?? undefined);
  const { data: history } = useCurrencyHistory(id ?? undefined);
  const enable = useEnableCurrency(id ?? '');
  const disable = useDisableCurrency(id ?? '');
  const archive = useArchiveCurrency(id ?? '');
  const restore = useRestoreCurrency(id ?? '');
  const update = useUpdateCurrency(id ?? '');
  const [decimals, setDecimals] = useState('');

  const actions: ActionMenuItem[] = [];
  if (currency) {
    if (currency.status === 'DRAFT' || currency.status === 'DISABLED') actions.push({ label: 'Enable', onSelect: () => enable.mutate() });
    if (currency.status === 'ACTIVE') actions.push({ label: 'Disable', onSelect: () => disable.mutate() });
    if (currency.status !== 'ARCHIVED') actions.push({ label: 'Archive', onSelect: () => archive.mutate(), destructive: true, separatorBefore: true });
    if (currency.status === 'ARCHIVED') actions.push({ label: 'Restore', onSelect: () => restore.mutate() });
  }

  return (
    <Dialog open={!!id} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>{currency?.name ?? 'Currency'}</span>
            {currency && <ActionMenu items={actions} />}
          </DialogTitle>
        </DialogHeader>
        {isLoading || !currency ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <Field label="Code" value={currency.code} />
              <Field label="Symbol" value={currency.symbol} />
              <Field label="Decimals" value={String(currency.decimals)} />
              <Field label="Rounding mode" value={currency.roundingMode} />
              <Field label="Status" value={currency.status} />
              <Field label="Version" value={String(currency.version)} />
            </div>
            <div className="flex items-end gap-2">
              <FormField label="Update decimals" htmlFor="cur-update-decimals">
                <Input id="cur-update-decimals" type="number" value={decimals} onChange={(e) => setDecimals(e.target.value)} className="h-9 w-32" />
              </FormField>
              <Button size="sm" onClick={() => update.mutate({ decimals: Number(decimals) }, { onSuccess: () => setDecimals('') })} disabled={!decimals || update.isPending}>
                Save
              </Button>
            </div>
            {history && history.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">History</p>
                <ul className="space-y-2">
                  {history.map((h) => (
                    <li key={h.id} className="rounded-[var(--radius)] border border-border p-2 text-sm">
                      <span className="font-medium text-foreground">v{h.version} · {h.status}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{formatDate(h.createdAt)}</span>
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

function RatesTab() {
  const [baseCurrency, setBaseCurrency] = useState('');
  const [quoteCurrency, setQuoteCurrency] = useState('');
  const [page, setPage] = useState(1);
  const [recordOpen, setRecordOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const { data, isLoading } = useExchangeRates({ baseCurrency: baseCurrency || undefined, quoteCurrency: quoteCurrency || undefined, page, limit: 20 });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <FilterBar hasActiveFilters={!!baseCurrency || !!quoteCurrency} onClearFilters={() => { setBaseCurrency(''); setQuoteCurrency(''); setPage(1); }}>
          <Input value={baseCurrency} onChange={(e) => { setBaseCurrency(e.target.value.toUpperCase()); setPage(1); }} placeholder="Base currency" className="h-9 w-36" />
          <Input value={quoteCurrency} onChange={(e) => { setQuoteCurrency(e.target.value.toUpperCase()); setPage(1); }} placeholder="Quote currency" className="h-9 w-36" />
        </FilterBar>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setSyncOpen(true)}>
            <RefreshCw className="h-4 w-4" />
            Sync from provider
          </Button>
          <Button onClick={() => setRecordOpen(true)}>
            <Plus className="h-4 w-4" />
            Record rate
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No exchange rates recorded" />
      ) : (
        <>
          <div className="space-y-2">
            {data.items.map((r) => (
              <RateRow key={r.id} rate={r} />
            ))}
          </div>
          {data.total > 0 && <Pagination page={page} limit={20} total={data.total} totalPages={Math.ceil(data.total / 20)} onPageChange={setPage} onLimitChange={() => {}} />}
        </>
      )}

      <RecordRateDialog open={recordOpen} onOpenChange={setRecordOpen} />
      <SyncRateDialog open={syncOpen} onOpenChange={setSyncOpen} />
    </div>
  );
}

function RateRow({ rate }: { rate: { id: string; baseCurrency: string; quoteCurrency: string; rate: number; rateType: string; source: string; status: RateStatus; effectiveAt: string; isAbnormal: boolean; version: number } }) {
  const approve = useApproveRate(rate.id);
  const publish = usePublishRate(rate.id);
  const archive = useArchiveRateRecord(rate.id);
  const reject = useRejectRate(rate.id);
  const [rejectOpen, setRejectOpen] = useState(false);

  const isStale = new Date(rate.effectiveAt).getTime() < Date.now() - 24 * 60 * 60 * 1000;

  const actions: ActionMenuItem[] = [];
  if (rate.status === 'PENDING_APPROVAL') {
    actions.push({ label: 'Approve', onSelect: () => approve.mutate() });
    actions.push({ label: 'Reject', onSelect: () => setRejectOpen(true), destructive: true });
  }
  if (rate.status === 'APPROVED') actions.push({ label: 'Publish', onSelect: () => publish.mutate() });
  if (rate.status !== 'ARCHIVED') actions.push({ label: 'Archive', onSelect: () => archive.mutate(), destructive: true, separatorBefore: true });

  return (
    <div className="rounded-[var(--radius)] border border-border p-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-medium text-foreground">
          {rate.baseCurrency} → {rate.quoteCurrency} = {rate.rate}
        </span>
        <div className="flex items-center gap-2">
          {rate.isAbnormal && <StatusBadge status="Abnormal" tone="danger" />}
          {isStale && <StatusBadge status="Stale" tone="warning" />}
          <StatusBadge status={rate.status} tone={RATE_STATUS_TONE[rate.status]} />
          {actions.length > 0 && <ActionMenu items={actions} />}
        </div>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {rate.rateType} · source {rate.source} · v{rate.version} · effective {formatDate(rate.effectiveAt)}
      </p>
      <ReasonDialog open={rejectOpen} onOpenChange={setRejectOpen} title="Reject this rate" confirmLabel="Reject" variant="danger" pending={reject.isPending} onSubmit={(reason) => reject.mutate({ reason }, { onSuccess: () => setRejectOpen(false) })} />
    </div>
  );
}

function RecordRateDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const record = useRecordManualRate();
  const [form, setForm] = useState<RecordRatePayload>({ baseCurrency: '', quoteCurrency: '', rate: 0 });
  const reset = () => setForm({ baseCurrency: '', quoteCurrency: '', rate: 0 });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Record manual rate</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Base currency" htmlFor="rr-base" required>
            <Input id="rr-base" value={form.baseCurrency} onChange={(e) => setForm((f) => ({ ...f, baseCurrency: e.target.value.toUpperCase() }))} />
          </FormField>
          <FormField label="Quote currency" htmlFor="rr-quote" required>
            <Input id="rr-quote" value={form.quoteCurrency} onChange={(e) => setForm((f) => ({ ...f, quoteCurrency: e.target.value.toUpperCase() }))} />
          </FormField>
          <div className="col-span-2">
            <FormField label="Rate" htmlFor="rr-rate" required>
              <Input id="rr-rate" type="number" step="any" value={form.rate || ''} onChange={(e) => setForm((f) => ({ ...f, rate: Number(e.target.value) }))} />
            </FormField>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => record.mutate(form, { onSuccess: () => { onOpenChange(false); reset(); } })}
            disabled={!form.baseCurrency || !form.quoteCurrency || !form.rate || record.isPending}
          >
            {record.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SyncRateDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const refresh = useRefreshRateFromProvider();
  const [providerKey, setProviderKey] = useState('');
  const [baseCurrency, setBaseCurrency] = useState('');
  const [quoteCurrency, setQuoteCurrency] = useState('');
  const reset = () => { setProviderKey(''); setBaseCurrency(''); setQuoteCurrency(''); };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Sync rate from provider</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <FormField label="Provider key" htmlFor="sr-provider" required>
            <Input id="sr-provider" value={providerKey} onChange={(e) => setProviderKey(e.target.value)} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Base currency" htmlFor="sr-base" required>
              <Input id="sr-base" value={baseCurrency} onChange={(e) => setBaseCurrency(e.target.value.toUpperCase())} />
            </FormField>
            <FormField label="Quote currency" htmlFor="sr-quote" required>
              <Input id="sr-quote" value={quoteCurrency} onChange={(e) => setQuoteCurrency(e.target.value.toUpperCase())} />
            </FormField>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => refresh.mutate({ providerKey, baseCurrency, quoteCurrency }, { onSuccess: () => { onOpenChange(false); reset(); } })}
            disabled={!providerKey || !baseCurrency || !quoteCurrency || refresh.isPending}
          >
            {refresh.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Sync
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProvidersTab() {
  const { data, isLoading } = useExchangeRateProviderPriorities();

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!data || data.length === 0) return <EmptyState title="No provider priorities configured" />;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Provider</TableHead>
          <TableHead>Enabled</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>Scope</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((p) => (
          <TableRow key={p.id}>
            <TableCell className="text-sm font-medium text-foreground">{p.providerKey}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{p.isEnabled ? 'Yes' : 'No'}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{p.priority}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{p.workspaceId ?? 'Global'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
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
