'use client';

import { useState } from 'react';
import { Loader2, Plug } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { FilterBar } from '@/components/ui/filter-bar';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState } from '@/components/ui/states';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useMarketplaceConnectionTestHistory, useTestAllMarketplaceConnections, useTestMarketplaceConnection } from '@/hooks';
import { formatDate } from '@/lib/utils';
import type { MarketplaceConnectionTestRecord } from '@/types';

const CONNECTION_TONE: StatusTone = 'success';

export default function MarketplaceConnectionTestsPage() {
  const [providerKey, setProviderKey] = useState('');
  const [accountId, setAccountId] = useState('');
  const [success, setSuccess] = useState<'true' | 'false' | ''>('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<MarketplaceConnectionTestRecord | null>(null);
  const [testProviderKey, setTestProviderKey] = useState('');

  const { data, isLoading, isError, refetch } = useMarketplaceConnectionTestHistory({
    providerKey: providerKey || undefined,
    accountId: accountId || undefined,
    success: success === '' ? undefined : success === 'true',
    page,
    limit: 20,
  });
  const testAll = useTestAllMarketplaceConnections();
  const testOne = useTestMarketplaceConnection();

  return (
    <div>
      <PageHeader
        title="Connection Tests"
        description="Authentication, reachability and capability connection-test results for marketplace providers."
        actions={
          <Button variant="outline" onClick={() => testAll.mutate()} disabled={testAll.isPending}>
            {testAll.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Test all providers
          </Button>
        }
      />

      <div className="mb-4 flex items-end gap-2">
        <Input value={testProviderKey} onChange={(e) => setTestProviderKey(e.target.value)} placeholder="Provider key to test" className="h-9 w-56" />
        <Button
          variant="outline"
          onClick={() => testOne.mutate({ providerKey: testProviderKey }, { onSuccess: () => setTestProviderKey('') })}
          disabled={!testProviderKey || testOne.isPending}
        >
          {testOne.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
          Run test
        </Button>
      </div>

      <FilterBar hasActiveFilters={!!providerKey || !!accountId || !!success} onClearFilters={() => { setProviderKey(''); setAccountId(''); setSuccess(''); setPage(1); }} className="mb-4">
        <Input value={providerKey} onChange={(e) => { setProviderKey(e.target.value); setPage(1); }} placeholder="Provider key" className="h-9 w-40" />
        <Input value={accountId} onChange={(e) => { setAccountId(e.target.value); setPage(1); }} placeholder="Account ID" className="h-9 w-40" />
        <Select
          value={success}
          onChange={(e) => { setSuccess(e.target.value as 'true' | 'false' | ''); setPage(1); }}
          options={[{ value: '', label: 'All results' }, { value: 'true', label: 'Success' }, { value: 'false', label: 'Failed' }]}
          className="h-9 w-36"
        />
      </FilterBar>

      {isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load connection test history." />
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No connection tests recorded yet" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider / Account</TableHead>
                <TableHead>Connection</TableHead>
                <TableHead>Auth</TableHead>
                <TableHead>Response time</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Tested at</TableHead>
                <TableHead>Result</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((r) => (
                <TableRow key={r.id} clickable onClick={() => setSelected(r)}>
                  <TableCell className="text-sm font-medium text-foreground">{r.providerKey}{r.accountId ? ` · ${r.accountId}` : ''}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.connectionStatus}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.authStatus}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.responseTimeMs != null ? `${r.responseTimeMs}ms` : '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.triggeredBy ?? '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(r.testedAt)}</TableCell>
                  <TableCell>
                    <StatusBadge status={r.success ? 'SUCCESS' : 'FAILED'} tone={r.success ? CONNECTION_TONE : 'danger'} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.total > 0 && <Pagination page={page} limit={20} total={data.total} totalPages={data.totalPages} onPageChange={setPage} onLimitChange={() => {}} />}
        </>
      )}

      <ResultDetailDialog result={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function ResultDetailDialog({ result, onClose }: { result: MarketplaceConnectionTestRecord | null; onClose: () => void }) {
  if (!result) return null;

  return (
    <Dialog open={!!result} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{result.providerKey}{result.accountId ? ` · ${result.accountId}` : ''}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <Field label="Connection status" value={result.connectionStatus} />
          <Field label="Auth status" value={result.authStatus} />
          <Field label="Capability status" value={result.capabilityStatus ?? '—'} />
          <Field label="Response time" value={result.responseTimeMs != null ? `${result.responseTimeMs}ms` : '—'} />
          <Field label="Retryable" value={result.retryable ? 'Yes' : 'No'} />
          <Field label="Triggered by" value={result.triggeredBy ?? '—'} />
          <Field label="Tested at" value={formatDate(result.testedAt)} />
          <Field label="Correlation ID" value={result.correlationId} />
        </div>
        {result.errorMessage && (
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Error</p>
            <p className="text-sm text-danger">{result.errorCode ? `${result.errorCode}: ` : ''}{result.errorMessage}</p>
            {result.errorCategory && <p className="mt-1 text-xs text-muted-foreground">Category: {result.errorCategory}</p>}
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
