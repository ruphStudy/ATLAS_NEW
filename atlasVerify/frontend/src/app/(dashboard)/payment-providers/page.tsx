'use client';

import { useState } from 'react';
import { Loader2, Plug, Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FilterBar } from '@/components/ui/filter-bar';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState } from '@/components/ui/states';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/action-menu';
import {
  useCheckAllPaymentProviderHealth,
  useConfigurePaymentCredentials,
  usePaymentProviderAccount,
  usePaymentProviderAccounts,
  usePaymentTransactions,
  useRegisterPaymentProviderAccount,
  useTestPaymentProviderConnection,
  useUpdatePaymentProviderAccount,
} from '@/hooks';
import { formatDate } from '@/lib/utils';
import type { PaymentHealthResult, PaymentTransactionStatus, RegisterPaymentProviderAccountPayload } from '@/types';

const HEALTH_TONE: Record<string, StatusTone> = { HEALTHY: 'success', DEGRADED: 'warning', DOWN: 'danger', UNKNOWN: 'neutral' };
const TXN_STATUS_OPTIONS: { value: PaymentTransactionStatus; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'AUTHORIZED', label: 'Authorized' },
  { value: 'CAPTURED', label: 'Captured' },
  { value: 'SUCCEEDED', label: 'Succeeded' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'REFUNDED', label: 'Refunded' },
  { value: 'PARTIALLY_REFUNDED', label: 'Partially refunded' },
];

export default function PaymentProvidersPage() {
  return (
    <div>
      <PageHeader title="Payment Providers" description="Payment provider accounts, credential status, connection health and transactions." />
      <Tabs defaultValue="accounts">
        <TabsList>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>
        <TabsContent value="accounts">
          <AccountsTab />
        </TabsContent>
        <TabsContent value="health">
          <HealthTab />
        </TabsContent>
        <TabsContent value="transactions">
          <TransactionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AccountsTab() {
  const [providerKey, setProviderKey] = useState('');
  const { data: accounts, isLoading, isError, refetch } = usePaymentProviderAccounts(providerKey || undefined);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <FilterBar hasActiveFilters={!!providerKey} onClearFilters={() => setProviderKey('')}>
          <Input value={providerKey} onChange={(e) => setProviderKey(e.target.value)} placeholder="Filter by provider key" className="h-9 w-56" />
        </FilterBar>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Register account
        </Button>
      </div>

      {isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load payment provider accounts." />
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !accounts || accounts.length === 0 ? (
        <EmptyState title="No payment provider accounts registered" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Country / Currency</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Default</TableHead>
              <TableHead>Health</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((a) => (
              <TableRow key={a.id} clickable onClick={() => setSelectedId(a.id)}>
                <TableCell className="text-sm font-medium text-foreground">{a.displayName ?? a.accountHandle}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{a.providerKey}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{a.country ?? '—'} / {a.currency ?? '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{a.priority}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{a.isDefault ? 'Yes' : 'No'}</TableCell>
                <TableCell>
                  <StatusBadge status={a.healthState} tone={HEALTH_TONE[a.healthState]} />
                </TableCell>
                <TableCell>
                  <StatusBadge status={a.status} />
                </TableCell>
                <TableCell />
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <RegisterAccountDialog open={createOpen} onOpenChange={setCreateOpen} />
      <AccountDetailDialog id={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function RegisterAccountDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const register = useRegisterPaymentProviderAccount();
  const [form, setForm] = useState<RegisterPaymentProviderAccountPayload>({ providerKey: '', accountHandle: '' });
  const reset = () => setForm({ providerKey: '', accountHandle: '' });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Register payment provider account</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Provider key" htmlFor="pp-key" required>
            <Input id="pp-key" value={form.providerKey} onChange={(e) => setForm((f) => ({ ...f, providerKey: e.target.value }))} />
          </FormField>
          <FormField label="Account handle" htmlFor="pp-handle" required>
            <Input id="pp-handle" value={form.accountHandle} onChange={(e) => setForm((f) => ({ ...f, accountHandle: e.target.value }))} />
          </FormField>
          <FormField label="Display name" htmlFor="pp-display">
            <Input id="pp-display" value={form.displayName ?? ''} onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))} />
          </FormField>
          <FormField label="Country" htmlFor="pp-country">
            <Input id="pp-country" value={form.country ?? ''} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value.toUpperCase() }))} />
          </FormField>
          <FormField label="Currency" htmlFor="pp-currency">
            <Input id="pp-currency" value={form.currency ?? ''} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => register.mutate(form, { onSuccess: () => { onOpenChange(false); reset(); } })} disabled={!form.providerKey || !form.accountHandle || register.isPending}>
            {register.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Register
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AccountDetailDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: account, isLoading } = usePaymentProviderAccount(id ?? undefined);
  const update = useUpdatePaymentProviderAccount(id ?? '');
  const configureCredentials = useConfigurePaymentCredentials(id ?? '');
  const testConnection = useTestPaymentProviderConnection(id ?? '');
  const [priority, setPriority] = useState('');
  const [credFields, setCredFields] = useState('{}');

  const actions: ActionMenuItem[] = [];
  if (account) {
    if (account.status === 'ACTIVE') actions.push({ label: 'Disable', onSelect: () => update.mutate({ status: 'DISABLED' }) });
    if (account.status === 'DISABLED' || account.status === 'PENDING') actions.push({ label: 'Activate', onSelect: () => update.mutate({ status: 'ACTIVE' }) });
    if (!account.isDefault) actions.push({ label: 'Set as default', onSelect: () => update.mutate({ isDefault: true }) });
  }

  return (
    <Dialog open={!!id} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>{account?.displayName ?? account?.accountHandle ?? 'Account'}</span>
            {account && <ActionMenu items={actions} />}
          </DialogTitle>
        </DialogHeader>
        {isLoading || !account ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <Field label="Provider" value={account.providerKey} />
              <Field label="Handle" value={account.accountHandle} />
              <Field label="Country" value={account.country ?? '—'} />
              <Field label="Currency" value={account.currency ?? '—'} />
              <Field label="Status" value={account.status} />
              <Field label="Health" value={account.healthState} />
              <Field label="Priority" value={String(account.priority)} />
              <Field label="Default" value={account.isDefault ? 'Yes' : 'No'} />
              <Field label="Last tested" value={account.lastTestedAt ? formatDate(account.lastTestedAt) : 'Never'} />
              <Field label="Last test result" value={account.lastTestSuccess == null ? '—' : account.lastTestSuccess ? 'Success' : 'Failed'} />
            </div>
            {account.capabilities.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Capabilities</p>
                <p className="text-sm text-foreground">{account.capabilities.join(', ')}</p>
              </div>
            )}
            {account.supportedCountries.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Supported countries</p>
                <p className="text-sm text-foreground">{account.supportedCountries.join(', ')}</p>
              </div>
            )}
            <div className="flex items-end gap-2">
              <FormField label="Priority" htmlFor="pp-detail-priority">
                <Input id="pp-detail-priority" type="number" value={priority} onChange={(e) => setPriority(e.target.value)} className="h-9 w-28" />
              </FormField>
              <Button size="sm" onClick={() => update.mutate({ priority: Number(priority) }, { onSuccess: () => setPriority('') })} disabled={!priority || update.isPending}>
                Save priority
              </Button>
              <Button size="sm" variant="outline" onClick={() => testConnection.mutate()} disabled={testConnection.isPending}>
                <Plug className="h-3.5 w-3.5" />
                Test connection
              </Button>
            </div>
            {testConnection.data && (
              <div className="rounded-[var(--radius)] border border-border p-3 text-sm">
                <p className="font-medium text-foreground">{testConnection.data.success ? 'Connection succeeded' : 'Connection failed'}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {testConnection.data.connectionStatus} · {testConnection.data.responseTimeMs}ms · {formatDate(testConnection.data.testedAt)}
                </p>
                {testConnection.data.errorMessage && <p className="mt-1 text-xs text-danger">{testConnection.data.errorMessage}</p>}
              </div>
            )}
            <div className="border-t border-border pt-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Configure credentials (write-only — never displayed again)</p>
              <div className="flex items-end gap-2">
                <FormField label="Fields (JSON)" htmlFor="pp-cred-fields">
                  <Input id="pp-cred-fields" value={credFields} onChange={(e) => setCredFields(e.target.value)} placeholder='{"apiKey":"..."}' className="h-9 w-72 font-mono text-xs" />
                </FormField>
                <Button
                  size="sm"
                  onClick={() => {
                    try {
                      configureCredentials.mutate({ fields: JSON.parse(credFields) }, { onSuccess: () => setCredFields('{}') });
                    } catch {
                      // invalid JSON — no-op
                    }
                  }}
                  disabled={configureCredentials.isPending}
                >
                  {configureCredentials.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save credentials
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function HealthTab() {
  const checkAll = useCheckAllPaymentProviderHealth();

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => checkAll.mutate()} disabled={checkAll.isPending}>
          {checkAll.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Check all providers
        </Button>
      </div>
      {!checkAll.data ? (
        <EmptyState title="No health check run yet" description="Run a health check to see live provider status." />
      ) : checkAll.data.length === 0 ? (
        <EmptyState title="No providers to check" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {checkAll.data.map((h: PaymentHealthResult, i: number) => (
            <div key={`${h.providerKey}-${i}`} className="rounded-[var(--radius)] border border-border p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">{h.providerKey}</span>
                <StatusBadge status={h.state} tone={HEALTH_TONE[h.state]} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {h.connectionStatus} {h.responseTimeMs != null ? `· ${h.responseTimeMs}ms` : ''} · checked {formatDate(h.checkedAt)}
              </p>
              {h.errorMessage && <p className="mt-1 text-xs text-danger">{h.errorMessage}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TransactionsTab() {
  const [status, setStatus] = useState<PaymentTransactionStatus | ''>('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = usePaymentTransactions({ status: status || undefined, page, limit: 20 });

  return (
    <div>
      <div className="mb-4">
        <FilterBar hasActiveFilters={!!status} onClearFilters={() => { setStatus(''); setPage(1); }}>
          <Select value={status} onChange={(e) => { setStatus(e.target.value as PaymentTransactionStatus | ''); setPage(1); }} placeholder="All statuses" options={TXN_STATUS_OPTIONS} className="h-9 w-44" />
        </FilterBar>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No transactions found" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Transaction</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="text-sm font-medium text-foreground">{t.id}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{t.providerKey}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{t.type}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{t.amount} {t.currency}</TableCell>
                <TableCell>
                  <StatusBadge status={t.status} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(t.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
