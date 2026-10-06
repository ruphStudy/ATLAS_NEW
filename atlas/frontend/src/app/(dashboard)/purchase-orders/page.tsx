'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAxiosError } from 'axios';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { FilterBar } from '@/components/ui/filter-bar';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState, UnauthorizedState } from '@/components/ui/states';
import { CreatePurchaseOrderDialog } from '@/components/suppliers/create-purchase-order-dialog';
import { usePurchaseOrders } from '@/hooks';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { PurchaseOrderStatus } from '@/types';

const STATUS_OPTIONS: { value: PurchaseOrderStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PENDING_APPROVAL', label: 'Pending approval' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'ISSUED', label: 'Issued' },
  { value: 'ACKNOWLEDGED', label: 'Acknowledged' },
  { value: 'PARTIALLY_FULFILLED', label: 'Partially fulfilled' },
  { value: 'FULFILLED', label: 'Fulfilled' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const [status, setStatus] = useState<PurchaseOrderStatus | ''>('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = usePurchaseOrders({ status: status || undefined, page, limit });
  const isForbidden = isAxiosError(error) && error.response?.status === 403;

  return (
    <div>
      <PageHeader
        title="Purchase Orders"
        description="Issue and track purchase orders with suppliers."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            New purchase order
          </Button>
        }
      />

      <FilterBar hasActiveFilters={!!status} onClearFilters={() => { setStatus(''); setPage(1); }} className="mb-4">
        <Select value={status} onChange={(e) => { setStatus(e.target.value as PurchaseOrderStatus | ''); setPage(1); }} placeholder="All statuses" options={STATUS_OPTIONS} className="h-9 w-52" />
      </FilterBar>

      {isForbidden ? (
        <UnauthorizedState />
      ) : isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load purchase orders." />
      ) : isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No purchase orders yet" description="Create a purchase order to formalize an order with a supplier." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PO</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Incoterms</TableHead>
              <TableHead>Expected delivery</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((po) => (
              <TableRow key={po.id} clickable onClick={() => router.push(`/purchase-orders/${po.id}`)}>
                <TableCell>
                  <p className="text-sm font-medium text-foreground">{po.poNumber}</p>
                  <p className="text-xs text-muted-foreground">v{po.version}</p>
                </TableCell>
                <TableCell>
                  <StatusBadge status={po.status} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatCurrency(po.totalAmount, po.currency)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{po.incoterms ?? '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{po.expectedDeliveryDate ? formatDate(po.expectedDeliveryDate) : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {data && data.total > 0 && (
        <Pagination page={page} limit={limit} total={data.total} totalPages={Math.ceil(data.total / limit)} onPageChange={setPage} onLimitChange={(l) => { setLimit(l); setPage(1); }} />
      )}

      <CreatePurchaseOrderDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={(po) => router.push(`/purchase-orders/${po.id}`)} />
    </div>
  );
}
