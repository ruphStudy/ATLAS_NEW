'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { isAxiosError } from 'axios';
import { CheckCircle2, RotateCcw, Trash2, X } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/action-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState, UnauthorizedState } from '@/components/ui/states';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ReasonDialog } from '@/components/suppliers/reason-dialog';
import { CreateAdjustmentDialog } from '@/components/inventory/create-adjustment-dialog';
import { CreateMovementDialog } from '@/components/inventory/create-movement-dialog';
import { Button } from '@/components/ui/button';
import {
  useActivateInventoryItem,
  useArchiveInventoryItem,
  useDeactivateInventoryItem,
  useDeleteInventoryItem,
  useDiscontinueInventoryItem,
  useInventoryAllocations,
  useInventoryBatches,
  useInventoryItem,
  useInventoryItemConfig,
  useInventoryItemHistory,
  useInventoryReservations,
  useInventorySerials,
  useInventoryStock,
  useInventoryTransactions,
  useOnHandSummary,
  useReactivateInventoryItem,
} from '@/hooks';
import { formatDate } from '@/lib/utils';

export default function InventoryItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: item, isLoading, isError, error, refetch } = useInventoryItem(id);
  const activate = useActivateInventoryItem(id);
  const deactivate = useDeactivateInventoryItem(id);
  const reactivate = useReactivateInventoryItem(id);
  const discontinue = useDiscontinueInventoryItem(id);
  const archive = useArchiveInventoryItem(id);
  const deleteItem = useDeleteInventoryItem();
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);

  const isForbidden = isAxiosError(error) && error.response?.status === 403;

  if (isForbidden) return <UnauthorizedState />;
  if (isError) return <QueryErrorState refetch={refetch} description="We couldn't load this inventory item." />;
  if (isLoading || !item) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const actions: ActionMenuItem[] = [];
  if (item.status === 'DRAFT' || item.status === 'INACTIVE') {
    actions.push({ label: 'Activate', icon: CheckCircle2, onSelect: () => activate.mutate(undefined) });
  }
  if (item.status === 'ACTIVE') {
    actions.push({ label: 'Deactivate', icon: X, onSelect: () => deactivate.mutate(undefined) });
    actions.push({ label: 'Discontinue', icon: X, onSelect: () => discontinue.mutate(undefined) });
  }
  if (item.status === 'DISCONTINUED' || item.status === 'INACTIVE') {
    actions.push({ label: 'Reactivate', icon: RotateCcw, onSelect: () => reactivate.mutate(undefined) });
  }
  if (item.status !== 'ARCHIVED') {
    actions.push({ label: 'Archive', icon: Trash2, onSelect: () => archive.mutate(undefined), destructive: true, separatorBefore: true });
  }
  actions.push({
    label: 'Delete permanently',
    icon: Trash2,
    onSelect: () => deleteItem.mutate(item.id, { onSuccess: () => router.push('/dashboard/inventory-items') }),
    destructive: true,
  });

  return (
    <div>
      <PageHeader
        title={item.name}
        breadcrumbs={[{ label: 'Inventory Items', href: '/dashboard/inventory-items' }, { label: item.name }]}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={item.status} />
            <Button variant="outline" onClick={() => setMoveOpen(true)}>
              Move stock
            </Button>
            <Button variant="outline" onClick={() => setAdjustOpen(true)}>
              Adjust
            </Button>
            <ActionMenu items={actions} />
          </div>
        }
      />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="stock">Stock</TabsTrigger>
          <TabsTrigger value="batches">Batches / Serials</TabsTrigger>
          <TabsTrigger value="reservations">Reservations</TabsTrigger>
          <TabsTrigger value="allocations">Allocations</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab itemId={item.id} />
        </TabsContent>
        <TabsContent value="stock">
          <StockTab itemId={item.id} />
        </TabsContent>
        <TabsContent value="batches">
          <BatchesSerialsTab itemId={item.id} trackingType={item.trackingType} />
        </TabsContent>
        <TabsContent value="reservations">
          <ReservationsTab itemId={item.id} />
        </TabsContent>
        <TabsContent value="allocations">
          <AllocationsTab itemId={item.id} />
        </TabsContent>
        <TabsContent value="transactions">
          <TransactionsTab itemId={item.id} />
        </TabsContent>
        <TabsContent value="history">
          <HistoryTab itemId={item.id} />
        </TabsContent>
      </Tabs>

      <CreateAdjustmentDialog open={adjustOpen} onOpenChange={setAdjustOpen} inventoryItemId={item.id} />
      <CreateMovementDialog open={moveOpen} onOpenChange={setMoveOpen} inventoryItemId={item.id} />
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

function OverviewTab({ itemId }: { itemId: string }) {
  const { data: item } = useInventoryItem(itemId);
  const { data: summary } = useOnHandSummary(itemId);
  const { data: config } = useInventoryItemConfig(itemId);
  if (!item) return null;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 text-sm">
          <Field label="SKU" value={item.sku} />
          <Field label="Tracking type" value={item.trackingType.toLowerCase()} />
          <Field label="Base UOM" value={item.baseUom} />
          <Field label="Reorder point" value={String(item.reorderPoint)} />
          <Field label="Safety stock" value={String(item.safetyStock)} />
          <Field label="Reorder quantity" value={String(item.reorderQuantity)} />
          <Field label="Expiry tracked" value={item.isExpiryTracked ? 'Yes' : 'No'} />
          <Field label="Shelf life" value={item.shelfLifeDays != null ? `${item.shelfLifeDays} days` : '—'} />
          {config && (
            <>
              <Field label="Valuation method" value={config.valuationMethod} />
              <Field label="Allow negative stock" value={config.allowNegativeStock ? 'Yes' : 'No'} />
              <Field label="Auto reorder" value={config.autoReorderEnabled ? 'Enabled' : 'Disabled'} />
              <Field label="Expiry alert days" value={String(config.expiryAlertDays)} />
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">On-hand summary</CardTitle>
        </CardHeader>
        <CardContent>
          {!summary ? (
            <p className="text-sm text-muted-foreground">No stock recorded yet.</p>
          ) : (
            <div className="space-y-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{summary.totalQuantity}</p>
                <p className="text-xs text-muted-foreground">Total quantity</p>
              </div>
              {Object.entries(summary.byStatus ?? {}).map(([status, qty]) => (
                <div key={status} className="flex items-center justify-between text-sm">
                  <StatusBadge status={status} />
                  <span className="text-foreground">{qty}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StockTab({ itemId }: { itemId: string }) {
  const { data: stock, isLoading } = useInventoryStock(itemId);
  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (!stock || stock.length === 0) return <EmptyState title="No stock records" className="border-none py-8" />;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Warehouse</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Ownership</TableHead>
          <TableHead>Quantity</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {stock.map((s) => (
          <TableRow key={s.id}>
            <TableCell className="text-sm text-foreground">{s.warehouseId}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{s.locationId ?? '—'}</TableCell>
            <TableCell>
              <StatusBadge status={s.status} />
            </TableCell>
            <TableCell className="text-sm capitalize text-muted-foreground">{s.ownershipType.toLowerCase().replace(/_/g, ' ')}</TableCell>
            <TableCell className="text-sm text-foreground">{s.quantity} {s.uom}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function BatchesSerialsTab({ itemId, trackingType }: { itemId: string; trackingType: string }) {
  const { data: batches, isLoading: batchesLoading } = useInventoryBatches(itemId);
  const { data: serialsRaw, isLoading: serialsLoading } = useInventorySerials(itemId);
  const batchList = Array.isArray(batches) ? batches : batches?.items ?? [];
  const serials = Array.isArray(serialsRaw) ? serialsRaw : (serialsRaw as { items?: unknown[] })?.items ?? [];

  if (trackingType === 'NONE') {
    return <EmptyState title="Not batch or serial tracked" description="This item does not track batches or serial numbers." className="border-none py-8" />;
  }

  if (trackingType === 'BATCH') {
    if (batchesLoading) return <Skeleton className="h-40 w-full" />;
    if (batchList.length === 0) return <EmptyState title="No batches recorded" className="border-none py-8" />;
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Batch</TableHead>
            <TableHead>Manufactured</TableHead>
            <TableHead>Expiry</TableHead>
            <TableHead>Quantity</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {batchList.map((b) => (
            <TableRow key={b.id}>
              <TableCell className="text-sm text-foreground">{b.batchNumber}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{b.manufactureDate ? formatDate(b.manufactureDate) : '—'}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{b.expiryDate ? formatDate(b.expiryDate) : '—'}</TableCell>
              <TableCell className="text-sm text-foreground">{b.quantity}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  if (serialsLoading) return <Skeleton className="h-40 w-full" />;
  if (serials.length === 0) return <EmptyState title="No serials recorded" className="border-none py-8" />;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Serial number</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Warehouse</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {(serials as { id: string; serialNumber: string; status: string; warehouseId?: string | null }[]).map((s) => (
          <TableRow key={s.id}>
            <TableCell className="text-sm text-foreground">{s.serialNumber}</TableCell>
            <TableCell>
              <StatusBadge status={s.status} />
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">{s.warehouseId ?? '—'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function ReservationsTab({ itemId }: { itemId: string }) {
  const { data, isLoading } = useInventoryReservations({ limit: 50 });
  const filtered = (data?.data ?? []).filter((r) => r.inventoryItemId === itemId);
  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (filtered.length === 0) return <EmptyState title="No reservations" className="border-none py-8" />;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Source</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Requested</TableHead>
          <TableHead>Reserved</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filtered.map((r) => (
          <TableRow key={r.id}>
            <TableCell className="text-sm capitalize text-foreground">{r.source.toLowerCase()}</TableCell>
            <TableCell>
              <StatusBadge status={r.status} />
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">{r.requestedQuantity}</TableCell>
            <TableCell className="text-sm text-foreground">{r.reservedQuantity}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function AllocationsTab({ itemId }: { itemId: string }) {
  const { data, isLoading } = useInventoryAllocations({ limit: 50 });
  const filtered = (data?.data ?? []).filter((a) => a.inventoryItemId === itemId);
  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (filtered.length === 0) return <EmptyState title="No allocations" className="border-none py-8" />;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Source</TableHead>
          <TableHead>Strategy</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Requested</TableHead>
          <TableHead>Allocated</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filtered.map((a) => (
          <TableRow key={a.id}>
            <TableCell className="text-sm capitalize text-foreground">{a.source.toLowerCase()}</TableCell>
            <TableCell className="text-sm capitalize text-muted-foreground">{a.strategy.toLowerCase().replace(/_/g, ' ')}</TableCell>
            <TableCell>
              <StatusBadge status={a.status} />
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">{a.requestedQuantity}</TableCell>
            <TableCell className="text-sm text-foreground">{a.allocatedQuantity}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function TransactionsTab({ itemId }: { itemId: string }) {
  const { data, isLoading } = useInventoryTransactions(itemId, { limit: 50 });
  const transactions = Array.isArray(data) ? data : (data as { items?: unknown[] })?.items ?? [];
  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (transactions.length === 0) return <EmptyState title="No transactions" className="border-none py-8" />;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Quantity</TableHead>
          <TableHead>Before → After</TableHead>
          <TableHead>Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {(transactions as { id: string; type: string; status: string; quantity: number; quantityBefore?: number | null; quantityAfter?: number | null; createdAt: string }[]).map((t) => (
          <TableRow key={t.id}>
            <TableCell className="text-sm capitalize text-foreground">{t.type.toLowerCase().replace(/_/g, ' ')}</TableCell>
            <TableCell>
              <StatusBadge status={t.status} />
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">{t.quantity}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{t.quantityBefore != null ? `${t.quantityBefore} → ${t.quantityAfter}` : '—'}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{formatDate(t.createdAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function HistoryTab({ itemId }: { itemId: string }) {
  const { data: history, isLoading } = useInventoryItemHistory(itemId);
  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (!history || history.length === 0) return <EmptyState title="No history yet" className="border-none py-8" />;

  return (
    <ul className="space-y-2">
      {history.map((h) => (
        <li key={h.id} className="rounded-[var(--radius)] border border-border p-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-foreground">{h.fromStatus} → {h.toStatus}</span>
            <span className="text-xs text-muted-foreground">{formatDate(h.createdAt)}</span>
          </div>
          {h.reason && <p className="mt-1 text-xs text-muted-foreground">{h.reason}</p>}
        </li>
      ))}
    </ul>
  );
}
