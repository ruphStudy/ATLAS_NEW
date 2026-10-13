'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { isAxiosError } from 'axios';
import { CheckCircle2, Loader2, Plug, PlugZap, RotateCcw, Star, Trash2, X } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/action-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { QueryErrorState, UnauthorizedState } from '@/components/ui/states';
import { CapabilityMatrix } from '@/components/marketplace/capability-matrix';
import {
  useArchiveMarketplaceAccount,
  useConfirm,
  useConnectAmazon,
  useDeleteMarketplaceAccount,
  useDisableMarketplaceAccount,
  useEnableMarketplaceAccount,
  useMarketplaceAccount,
  useMarketplaceAccountHistory,
  useMarketplaceProvider,
  useRestoreMarketplaceAccount,
  useSetDefaultMarketplaceAccount,
  useSetMarketplaceAccountPriority,
  useTestMarketplaceAccountConnection,
} from '@/hooks';
import { formatDate } from '@/lib/utils';

export default function MarketplaceAccountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const confirm = useConfirm();
  const { data: account, isLoading, isError, error, refetch } = useMarketplaceAccount(id);
  const { data: provider } = useMarketplaceProvider(account?.providerKey);
  const historyRaw = useMarketplaceAccountHistory(id).data;
  const history = Array.isArray(historyRaw) ? historyRaw : historyRaw?.items;
  const enable = useEnableMarketplaceAccount(id);
  const disable = useDisableMarketplaceAccount(id);
  const archive = useArchiveMarketplaceAccount(id);
  const restore = useRestoreMarketplaceAccount(id);
  const deleteAccount = useDeleteMarketplaceAccount();
  const testConnection = useTestMarketplaceAccountConnection(id);
  const setDefault = useSetDefaultMarketplaceAccount(id);
  const setPriority = useSetMarketplaceAccountPriority(id);
  const connectAmazon = useConnectAmazon();
  const [priorityInput, setPriorityInput] = useState('');

  const isForbidden = isAxiosError(error) && error.response?.status === 403;

  if (isForbidden) return <UnauthorizedState />;
  if (isError) return <QueryErrorState refetch={refetch} description="We couldn't load this marketplace account." />;
  if (isLoading || !account) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const handleDelete = async () => {
    const ok = await confirm({ title: 'Delete this marketplace account?', description: 'This cannot be undone.', confirmLabel: 'Delete', variant: 'danger' });
    if (ok) deleteAccount.mutate(account.id, { onSuccess: () => router.push('/marketplace-accounts') });
  };

  const actions: ActionMenuItem[] = [];
  if (account.status !== 'ACTIVE' && account.status !== 'ARCHIVED') {
    actions.push({ label: 'Enable', icon: CheckCircle2, onSelect: () => enable.mutate(undefined) });
  }
  if (account.status === 'ACTIVE') {
    actions.push({ label: 'Disable', icon: X, onSelect: () => disable.mutate(undefined) });
  }
  if (!account.isDefault && account.status === 'ACTIVE') {
    actions.push({ label: 'Set as default', icon: Star, onSelect: () => setDefault.mutate() });
  }
  if (account.status !== 'ARCHIVED') {
    actions.push({ label: 'Archive', icon: Trash2, onSelect: () => archive.mutate(undefined), destructive: true, separatorBefore: true });
  } else {
    actions.push({ label: 'Restore', icon: RotateCcw, onSelect: () => restore.mutate() });
  }
  actions.push({ label: 'Delete permanently', icon: Trash2, onSelect: handleDelete, destructive: true });

  return (
    <div>
      <PageHeader
        title={account.accountName}
        breadcrumbs={[{ label: 'Marketplace Accounts', href: '/marketplace-accounts' }, { label: account.accountName }]}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={account.status} />
            {account.providerKey === 'AMAZON' && (account.status === 'EXPIRED' || account.status === 'INVALID') && (
              <Button
                variant="outline"
                onClick={() => connectAmazon.mutate({ country: account.country ?? 'US', accountId: account.id })}
                disabled={connectAmazon.isPending}
              >
                {connectAmazon.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
                Reconnect Amazon
              </Button>
            )}
            <Button variant="outline" onClick={() => testConnection.mutate()} disabled={testConnection.isPending}>
              {testConnection.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlugZap className="h-4 w-4" />}
              Test connection
            </Button>
            <ActionMenu items={actions} />
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 text-sm">
            <Field label="Provider" value={account.providerKey} />
            <Field label="Marketplace" value={account.marketplaceKey} />
            <Field label="External account ID" value={account.externalAccountId} />
            <Field label="Seller ID" value={account.sellerId ?? '—'} />
            <Field label="Merchant ID" value={account.merchantId ?? '—'} />
            <Field label="Country" value={account.country ?? '—'} />
            <Field label="Region" value={account.region ?? '—'} />
            <Field label="Currency" value={account.currency ?? '—'} />
            <Field label="Locale" value={account.locale ?? '—'} />
            <Field label="Last tested" value={account.lastTestedAt ? formatDate(account.lastTestedAt) : '—'} />
            <Field label="Last test result" value={account.lastTestedAt ? (account.lastTestSuccess ? 'Success' : 'Failed') : '—'} />
            <Field label="Version" value={String(account.version)} />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Priority</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2">
              <Input
                type="number"
                min="1"
                placeholder={String(account.priority)}
                value={priorityInput}
                onChange={(e) => setPriorityInput(e.target.value)}
                className="h-9"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => { if (priorityInput) setPriority.mutate(Number(priorityInput), { onSuccess: () => setPriorityInput('') }); }}
                disabled={!priorityInput || setPriority.isPending}
              >
                Save
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">History</CardTitle>
            </CardHeader>
            <CardContent>
              {!history || history.length === 0 ? (
                <p className="text-sm text-muted-foreground">No history yet.</p>
              ) : (
                <ul className="space-y-2">
                  {history.map((h) => (
                    <li key={h.id} className="text-xs">
                      <span className="text-foreground">{h.fromStatus ?? 'Created'} → {h.toStatus}</span>
                      <span className="ml-2 text-muted-foreground">{formatDate(h.createdAt)}</span>
                      {h.reason && <p className="text-muted-foreground">{h.reason}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {provider && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-sm">Provider capabilities</CardTitle>
          </CardHeader>
          <CardContent>
            <CapabilityMatrix provider={provider} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm capitalize text-foreground">{value}</p>
    </div>
  );
}
