'use client';

import { useMemo, useState } from 'react';
import { Activity, KeyRound, Plug, Plus, RefreshCw, RotateCcw, Trash2, XCircle } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { FilterBar } from '@/components/ui/filter-bar';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState } from '@/components/ui/states';
import { Pagination } from '@/components/ui/pagination';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/action-menu';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerBody, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import {
  useCancelPayment,
  useCapturePayment,
  useCheckAllPaymentProviderHealth,
  useConfigurePaymentCredentials,
  useConfirm,
  usePaymentProviderAccounts,
  usePaymentTransactions,
  useRefundPayment,
  useRegisterPaymentProviderAccount,
  useTestPaymentProviderConnection,
  useUpdatePaymentProviderAccount,
} from '@/hooks';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { PaymentTransaction, PaymentTransactionStatus, PaymentTransactionType, RegisterPaymentProviderAccountPayload, TransactionFilterParams } from '@/types';

export default function PaymentsPage() {
  return (
    <div>
      <PageHeader title="Payment Providers" description="Connected payment accounts, health, transactions, refunds and provider-driven visibility." />
      <Tabs defaultValue="accounts">
        <TabsList>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>
        <TabsContent value="accounts">
          <AccountsTab />
        </TabsContent>
        <TabsContent value="transactions">
          <TransactionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AccountsTab() {
  const accounts = usePaymentProviderAccounts();
  const checkAllHealth = useCheckAllPaymentProviderHealth();
  const [registerOpen, setRegisterOpen] = useState(false);
  const [credentialsAccountId, setCredentialsAccountId] = useState<string | null>(null);
  const rows = accounts.data ?? [];

  return (
    <div>
      <div className="mb-4 flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={() => checkAllHealth.mutate()} disabled={checkAllHealth.isPending}>
          <Activity className="h-3.5 w-3.5" />
          Check all health
        </Button>
        <Button size="sm" onClick={() => setRegisterOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          Register account
        </Button>
      </div>

      {accounts.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : accounts.isError ? (
        <QueryErrorState refetch={accounts.refetch} />
      ) : rows.length === 0 ? (
        <EmptyState title="No payment provider accounts yet" description="Register a Stripe, Razorpay or other provider account to accept payments." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((acc) => (
            <AccountCard key={acc.id} account={acc} onConfigureCredentials={() => setCredentialsAccountId(acc.id)} />
          ))}
        </div>
      )}

      <RegisterAccountDialog open={registerOpen} onOpenChange={setRegisterOpen} />
      <ConfigureCredentialsDialog accountId={credentialsAccountId} onClose={() => setCredentialsAccountId(null)} />
    </div>
  );
}

function AccountCard({ account, onConfigureCredentials }: { account: import('@/types').PaymentProviderAccount; onConfigureCredentials: () => void }) {
  const updateAccount = useUpdatePaymentProviderAccount(account.id);
  const testConnection = useTestPaymentProviderConnection(account.id);

  const actions: ActionMenuItem[] = [
    { label: 'Configure credentials', icon: KeyRound, onSelect: onConfigureCredentials },
    { label: 'Test connection', icon: Plug, onSelect: () => testConnection.mutate() },
    ...(account.isDefault ? [] : [{ label: 'Set as default', icon: RefreshCw, onSelect: () => updateAccount.mutate({ isDefault: true }) }]),
    account.status === 'ACTIVE'
      ? { label: 'Disable', icon: XCircle, onSelect: () => updateAccount.mutate({ status: 'DISABLED' }), destructive: true, separatorBefore: true }
      : { label: 'Enable', icon: RefreshCw, onSelect: () => updateAccount.mutate({ status: 'ACTIVE' }), separatorBefore: true },
  ];

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">{account.displayName || account.accountHandle}</p>
          <p className="font-mono text-xs text-muted-foreground">
            {account.providerKey} · {account.accountHandle}
          </p>
        </div>
        <ActionMenu items={actions} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <StatusBadge status={account.status} />
        <StatusBadge status={account.healthState} />
        {account.isDefault && (
          <Badge variant="info" className="text-[10px]">
            Default
          </Badge>
        )}
      </div>
      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
        {account.country && <p>Country: {account.country}</p>}
        {account.currency && <p>Currency: {account.currency}</p>}
        {account.capabilities.length > 0 && <p>Capabilities: {account.capabilities.join(', ')}</p>}
        {account.lastTestedAt && (
          <p>
            Last tested {formatDate(account.lastTestedAt)} — {account.lastTestSuccess ? 'success' : 'failed'}
          </p>
        )}
      </div>
      {testConnection.data && (
        <div className="mt-2 rounded-[var(--radius)] border border-border p-2 text-xs">
          <p className={testConnection.data.success ? 'text-success' : 'text-danger'}>
            {testConnection.data.success ? 'Connection OK' : 'Connection failed'} ({testConnection.data.responseTimeMs}ms)
          </p>
          {testConnection.data.errorMessage && <p className="text-muted-foreground">{testConnection.data.errorMessage}</p>}
        </div>
      )}
    </Card>
  );
}

function RegisterAccountDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const register = useRegisterPaymentProviderAccount();
  const [providerKey, setProviderKey] = useState('');
  const [accountHandle, setAccountHandle] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [country, setCountry] = useState('');
  const [currency, setCurrency] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  const submit = () => {
    const payload: RegisterPaymentProviderAccountPayload = {
      providerKey,
      accountHandle,
      displayName: displayName || undefined,
      country: country || undefined,
      currency: currency || undefined,
      isDefault,
    };
    register.mutate(payload, {
      onSuccess: () => {
        onOpenChange(false);
        setProviderKey('');
        setAccountHandle('');
        setDisplayName('');
        setCountry('');
        setCurrency('');
        setIsDefault(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Register payment provider account</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <FormField label="Provider key" htmlFor="pp-provider" required hint="e.g. stripe, razorpay — matches the adapter key registered on the backend.">
            <Input id="pp-provider" value={providerKey} onChange={(e) => setProviderKey(e.target.value)} placeholder="e.g. stripe" />
          </FormField>
          <FormField label="Account handle" htmlFor="pp-handle" required hint="Lowercase, hyphen-separated (e.g. primary).">
            <Input id="pp-handle" value={accountHandle} onChange={(e) => setAccountHandle(e.target.value)} placeholder="e.g. primary" />
          </FormField>
          <FormField label="Display name" htmlFor="pp-display">
            <Input id="pp-display" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Country" htmlFor="pp-country">
              <Input id="pp-country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. US" />
            </FormField>
            <FormField label="Currency" htmlFor="pp-currency">
              <Input id="pp-currency" value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="e.g. USD" />
            </FormField>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!providerKey || !accountHandle || register.isPending}>
            Register
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Fields are provider-defined and open-vocabulary (never hardcoded) — plain-text values are sent once and never echoed back by the backend. */
function ConfigureCredentialsDialog({ accountId, onClose }: { accountId: string | null; onClose: () => void }) {
  const configure = useConfigurePaymentCredentials(accountId ?? '');
  const [fields, setFields] = useState<Array<{ key: string; value: string }>>([{ key: '', value: '' }]);

  const submit = () => {
    const record: Record<string, string> = {};
    fields.forEach((f) => {
      if (f.key.trim()) record[f.key.trim()] = f.value;
    });
    configure.mutate(
      { fields: record },
      {
        onSuccess: () => {
          onClose();
          setFields([{ key: '', value: '' }]);
        },
      },
    );
  };

  return (
    <Dialog open={!!accountId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Configure credentials</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Enter the field names required by this provider (e.g. secret key, publishable key, webhook secret). Values are encrypted immediately and never displayed again.
        </p>
        <div className="space-y-2">
          {fields.map((f, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input placeholder="Field name" value={f.key} onChange={(e) => setFields(fields.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)))} className="w-1/3" />
              <Input
                placeholder="Value"
                type="password"
                value={f.value}
                onChange={(e) => setFields(fields.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
                className="flex-1"
              />
              <Button variant="ghost" size="sm" onClick={() => setFields(fields.filter((_, j) => j !== i))} disabled={fields.length === 1}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setFields([...fields, { key: '', value: '' }])}>
            <Plus className="h-3.5 w-3.5" />
            Add field
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!fields.some((f) => f.key.trim()) || configure.isPending}>
            Save credentials
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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

const TXN_TYPE_OPTIONS: { value: PaymentTransactionType; label: string }[] = [
  { value: 'PAYMENT', label: 'Payment' },
  { value: 'REFUND', label: 'Refund' },
  { value: 'CAPTURE', label: 'Capture' },
  { value: 'AUTHORIZATION', label: 'Authorization' },
];

function TransactionsTab() {
  const [status, setStatus] = useState<PaymentTransactionStatus | ''>('');
  const [type, setType] = useState<PaymentTransactionType | ''>('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selected, setSelected] = useState<PaymentTransaction | null>(null);

  const params = useMemo<TransactionFilterParams>(() => ({ status: status || undefined, type: type || undefined, page, limit }), [status, type, page, limit]);
  const txns = usePaymentTransactions(params);
  const rows = txns.data?.data ?? [];

  return (
    <div>
      <FilterBar
        hasActiveFilters={!!(status || type)}
        onClearFilters={() => {
          setStatus('');
          setType('');
          setPage(1);
        }}
        className="mb-4"
      >
        <Select value={status} onChange={(e) => setStatus(e.target.value as PaymentTransactionStatus | '')} options={[{ value: '', label: 'All statuses' }, ...TXN_STATUS_OPTIONS]} className="h-9 w-44" />
        <Select value={type} onChange={(e) => setType(e.target.value as PaymentTransactionType | '')} options={[{ value: '', label: 'All types' }, ...TXN_TYPE_OPTIONS]} className="h-9 w-40" />
      </FilterBar>

      {txns.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : txns.isError ? (
        <QueryErrorState refetch={txns.refetch} />
      ) : rows.length === 0 ? (
        <EmptyState title="No transactions yet" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((t) => (
                <TableRow key={t.id} className="cursor-pointer" onClick={() => setSelected(t)}>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px]">
                      {t.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatCurrency(t.amount, t.currency)}</TableCell>
                  <TableCell>
                    <StatusBadge status={t.status} />
                    {t.retryable && (
                      <Badge variant="warning" className="ml-1 text-[9px]">
                        Retryable
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{t.providerKey}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(t.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination
            page={txns.data?.page ?? page}
            limit={txns.data?.limit ?? limit}
            total={txns.data?.total ?? 0}
            totalPages={txns.data?.totalPages ?? 0}
            onPageChange={setPage}
            onLimitChange={(l) => {
              setLimit(l);
              setPage(1);
            }}
          />
        </>
      )}

      <TransactionDrawer txn={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function TransactionDrawer({ txn, onClose }: { txn: PaymentTransaction | null; onClose: () => void }) {
  const confirm = useConfirm();
  const capture = useCapturePayment(txn?.id ?? '');
  const cancel = useCancelPayment(txn?.id ?? '');
  const refund = useRefundPayment(txn?.id ?? '');

  if (!txn) return null;

  const handleRefund = async () => {
    const ok = await confirm({ title: 'Refund this payment?', description: 'This cannot be undone.', confirmLabel: 'Refund', variant: 'danger' });
    if (ok) refund.mutate({ idempotencyKey: `refund-${txn.id}-${Date.now()}` });
  };

  const actions: ActionMenuItem[] = [
    ...(txn.status === 'AUTHORIZED' ? [{ label: 'Capture', icon: RefreshCw, onSelect: () => capture.mutate({}) }] : []),
    ...(txn.status === 'PENDING' || txn.status === 'AUTHORIZED' ? [{ label: 'Cancel', icon: XCircle, onSelect: () => cancel.mutate(), destructive: true }] : []),
    ...(txn.status === 'SUCCEEDED' || txn.status === 'CAPTURED' ? [{ label: 'Refund', icon: RotateCcw, onSelect: handleRefund, destructive: true }] : []),
  ];

  return (
    <Drawer open={!!txn} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent size="md">
        <DrawerHeader>
          <DrawerTitle className="flex items-center justify-between">
            <span>Transaction</span>
            <ActionMenu items={actions} />
          </DrawerTitle>
        </DrawerHeader>
        <DrawerBody>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <StatusBadge status={txn.status} />
              <Badge variant="secondary" className="text-[10px]">
                {txn.type}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <Field label="Amount" value={formatCurrency(txn.amount, txn.currency)} />
              <Field label="Captured" value={txn.capturedAmount !== null ? formatCurrency(txn.capturedAmount, txn.currency) : '—'} />
              <Field label="Refunded" value={formatCurrency(txn.refundedAmount, txn.currency)} />
              <Field label="Provider" value={txn.providerKey} />
              <Field label="External transaction ID" value={txn.externalTransactionId ?? '—'} />
              <Field label="Created" value={formatDate(txn.createdAt)} />
            </div>
            {txn.errorMessage && (
              <Card>
                <CardContent className="pt-4 text-sm text-danger">
                  {txn.errorCode && <p className="font-mono text-xs">{txn.errorCode}</p>}
                  <p>{txn.errorMessage}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
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
