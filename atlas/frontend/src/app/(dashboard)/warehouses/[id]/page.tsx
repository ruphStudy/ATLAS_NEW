'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { isAxiosError } from 'axios';
import { CheckCircle2, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { FormField } from '@/components/ui/form-field';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/action-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState, UnauthorizedState } from '@/components/ui/states';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ReasonDialog } from '@/components/suppliers/reason-dialog';
import {
  useActivateWarehouse,
  useArchiveWarehouse,
  useCloseWarehouse,
  useConfirm,
  useCreateWarehouseBin,
  useCreateWarehouseLocation,
  useCreateWarehouseZone,
  useDeactivateWarehouse,
  useDeleteWarehouse,
  useRestoreWarehouse,
  useSuspendWarehouse,
  useWarehouse,
  useWarehouseBinAction,
  useWarehouseBins,
  useWarehouseCapacity,
  useWarehouseHistory,
  useWarehouseLocationAction,
  useWarehouseLocations,
  useWarehouseZoneAction,
  useWarehouseZones,
} from '@/hooks';
import { formatDate } from '@/lib/utils';
import type { BinType, WarehouseLocationType, ZoneType } from '@/types';

export default function WarehouseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const confirm = useConfirm();
  const { data: warehouse, isLoading, isError, error, refetch } = useWarehouse(id);
  const { data: history } = useWarehouseHistory(id);
  const activate = useActivateWarehouse(id);
  const deactivate = useDeactivateWarehouse(id);
  const suspend = useSuspendWarehouse(id);
  const close = useCloseWarehouse(id);
  const archive = useArchiveWarehouse(id);
  const restore = useRestoreWarehouse(id);
  const deleteWarehouse = useDeleteWarehouse();

  const isForbidden = isAxiosError(error) && error.response?.status === 403;

  if (isForbidden) return <UnauthorizedState />;
  if (isError) return <QueryErrorState refetch={refetch} description="We couldn't load this warehouse." />;
  if (isLoading || !warehouse) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const handleDelete = async () => {
    const ok = await confirm({ title: 'Delete this warehouse?', description: 'This cannot be undone.', confirmLabel: 'Delete', variant: 'danger' });
    if (ok) deleteWarehouse.mutate(warehouse.id, { onSuccess: () => router.push('/dashboard/warehouses') });
  };

  const actions: ActionMenuItem[] = [];
  if (warehouse.status !== 'ACTIVE' && warehouse.status !== 'ARCHIVED' && warehouse.status !== 'CLOSED') {
    actions.push({ label: 'Activate', icon: CheckCircle2, onSelect: () => activate.mutate(undefined) });
  }
  if (warehouse.status === 'ACTIVE') {
    actions.push({ label: 'Deactivate', icon: X, onSelect: () => deactivate.mutate(undefined) });
    actions.push({ label: 'Suspend', icon: X, onSelect: () => suspend.mutate(undefined) });
  }
  if (!['CLOSED', 'ARCHIVED'].includes(warehouse.status)) {
    actions.push({ label: 'Close', icon: X, onSelect: () => close.mutate(undefined) });
  }
  if (warehouse.status !== 'ARCHIVED') {
    actions.push({ label: 'Archive', icon: Trash2, onSelect: () => archive.mutate(undefined), destructive: true, separatorBefore: true });
  } else {
    actions.push({ label: 'Restore', icon: RotateCcw, onSelect: () => restore.mutate(undefined) });
  }
  actions.push({ label: 'Delete permanently', icon: Trash2, onSelect: handleDelete, destructive: true });

  return (
    <div>
      <PageHeader
        title={warehouse.name}
        breadcrumbs={[{ label: 'Warehouses', href: '/dashboard/warehouses' }, { label: warehouse.name }]}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={warehouse.status} />
            <ActionMenu items={actions} />
          </div>
        }
      />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="zones">Zones</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="bins">Bins</TabsTrigger>
          <TabsTrigger value="capacity">Capacity</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 text-sm">
              <Field label="Code" value={warehouse.code} />
              <Field label="Type" value={warehouse.type.replace(/_/g, ' ')} />
              <Field label="Address" value={[warehouse.addressLine1, warehouse.city, warehouse.state, warehouse.country].filter(Boolean).join(', ') || '—'} />
              <Field label="Timezone" value={warehouse.timezone} />
              <Field label="Currency" value={warehouse.currency ?? '—'} />
              <Field label="Contact" value={warehouse.contactName ?? '—'} />
              <Field label="Contact email" value={warehouse.contactEmail ?? '—'} />
              <Field label="Contact phone" value={warehouse.contactPhone ?? '—'} />
              <Field label="Default" value={warehouse.isDefault ? 'Yes' : 'No'} />
              <Field label="Priority" value={warehouse.isPriority ? 'Yes' : 'No'} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="zones">
          <ZonesTab warehouseId={warehouse.id} />
        </TabsContent>
        <TabsContent value="locations">
          <LocationsTab warehouseId={warehouse.id} />
        </TabsContent>
        <TabsContent value="bins">
          <BinsTab warehouseId={warehouse.id} />
        </TabsContent>
        <TabsContent value="capacity">
          <CapacityTab warehouseId={warehouse.id} />
        </TabsContent>
        <TabsContent value="history">
          <Card>
            <CardContent className="pt-6">
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
        </TabsContent>
      </Tabs>
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

const ZONE_TYPE_OPTIONS: { value: ZoneType; label: string }[] = [
  { value: 'RECEIVING', label: 'Receiving' },
  { value: 'STORAGE', label: 'Storage' },
  { value: 'PICKING', label: 'Picking' },
  { value: 'PACKING', label: 'Packing' },
  { value: 'DISPATCH', label: 'Dispatch' },
  { value: 'RETURNS', label: 'Returns' },
  { value: 'QUARANTINE', label: 'Quarantine' },
  { value: 'DAMAGED', label: 'Damaged' },
  { value: 'COLD_STORAGE', label: 'Cold storage' },
  { value: 'VIRTUAL', label: 'Virtual' },
];

function ZonesTab({ warehouseId }: { warehouseId: string }) {
  const { data, isLoading } = useWarehouseZones(warehouseId);
  const createZone = useCreateWarehouseZone(warehouseId);
  const zoneActions = useWarehouseZoneAction(warehouseId);
  const [createOpen, setCreateOpen] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<ZoneType>('STORAGE');

  const zones = Array.isArray(data) ? data : data?.items ?? [];

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          Add zone
        </Button>
      </div>
      {zones.length === 0 ? (
        <EmptyState title="No zones yet" className="border-none py-8" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Zone</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {zones.map((z) => (
              <TableRow key={z.id}>
                <TableCell className="text-sm text-foreground">{z.name ?? z.code}</TableCell>
                <TableCell className="text-sm capitalize text-muted-foreground">{z.type.toLowerCase().replace(/_/g, ' ')}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{z.occupiedCapacity}{z.capacity != null && ` / ${z.capacity}`}</TableCell>
                <TableCell>
                  <StatusBadge status={z.status} />
                </TableCell>
                <TableCell className="text-right">
                  {z.status === 'ACTIVE' ? (
                    <Button variant="ghost" size="sm" onClick={() => zoneActions.deactivate.mutate(z.id)}>
                      Deactivate
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => zoneActions.activate.mutate(z.id)}>
                      Activate
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Add zone</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <FormField label="Code" htmlFor="zone-code" required>
              <Input id="zone-code" value={code} onChange={(e) => setCode(e.target.value)} />
            </FormField>
            <FormField label="Name" htmlFor="zone-name">
              <Input id="zone-name" value={name} onChange={(e) => setName(e.target.value)} />
            </FormField>
            <FormField label="Type" htmlFor="zone-type" required>
              <Select id="zone-type" value={type} onChange={(e) => setType(e.target.value as ZoneType)} options={ZONE_TYPE_OPTIONS} />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createZone.mutate({ code, name: name || undefined, type }, { onSuccess: () => { setCreateOpen(false); setCode(''); setName(''); } })}
              disabled={!code || createZone.isPending}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const LOCATION_TYPE_OPTIONS: { value: WarehouseLocationType; label: string }[] = [
  { value: 'RECEIVING', label: 'Receiving' },
  { value: 'STORAGE', label: 'Storage' },
  { value: 'PICKING', label: 'Picking' },
  { value: 'PACKING', label: 'Packing' },
  { value: 'DISPATCH', label: 'Dispatch' },
  { value: 'RETURNS', label: 'Returns' },
  { value: 'QUARANTINE', label: 'Quarantine' },
  { value: 'DAMAGED', label: 'Damaged' },
  { value: 'AISLE', label: 'Aisle' },
  { value: 'RACK', label: 'Rack' },
  { value: 'SHELF', label: 'Shelf' },
  { value: 'STAGING', label: 'Staging' },
  { value: 'DOCK', label: 'Dock' },
];

function LocationsTab({ warehouseId }: { warehouseId: string }) {
  const { data, isLoading } = useWarehouseLocations(warehouseId);
  const createLocation = useCreateWarehouseLocation(warehouseId);
  const locationActions = useWarehouseLocationAction(warehouseId);
  const [createOpen, setCreateOpen] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<WarehouseLocationType>('STORAGE');

  const locations = Array.isArray(data) ? data : data?.items ?? [];

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          Add location
        </Button>
      </div>
      {locations.length === 0 ? (
        <EmptyState title="No locations yet" className="border-none py-8" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Location</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {locations.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="text-sm text-foreground">{l.name ?? l.code}</TableCell>
                <TableCell className="text-sm capitalize text-muted-foreground">{l.type.toLowerCase().replace(/_/g, ' ')}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{l.occupiedCapacity ?? 0}{l.capacity != null && ` / ${l.capacity}`}</TableCell>
                <TableCell>
                  <StatusBadge status={l.status} />
                </TableCell>
                <TableCell className="text-right">
                  {l.status === 'ACTIVE' ? (
                    <Button variant="ghost" size="sm" onClick={() => locationActions.deactivate.mutate(l.id)}>
                      Deactivate
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => locationActions.activate.mutate(l.id)}>
                      Activate
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Add location</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <FormField label="Code" htmlFor="loc-code" required>
              <Input id="loc-code" value={code} onChange={(e) => setCode(e.target.value)} />
            </FormField>
            <FormField label="Name" htmlFor="loc-name">
              <Input id="loc-name" value={name} onChange={(e) => setName(e.target.value)} />
            </FormField>
            <FormField label="Type" htmlFor="loc-type" required>
              <Select id="loc-type" value={type} onChange={(e) => setType(e.target.value as WarehouseLocationType)} options={LOCATION_TYPE_OPTIONS} />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createLocation.mutate({ code, name: name || undefined, type }, { onSuccess: () => { setCreateOpen(false); setCode(''); setName(''); } })}
              disabled={!code || createLocation.isPending}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const BIN_TYPE_OPTIONS: { value: BinType; label: string }[] = [
  { value: 'STORAGE', label: 'Storage' },
  { value: 'PICKING', label: 'Picking' },
  { value: 'RECEIVING', label: 'Receiving' },
  { value: 'QUARANTINE', label: 'Quarantine' },
  { value: 'DAMAGED', label: 'Damaged' },
  { value: 'RETURNS', label: 'Returns' },
  { value: 'VIRTUAL', label: 'Virtual' },
];

function BinsTab({ warehouseId }: { warehouseId: string }) {
  const { data, isLoading } = useWarehouseBins(warehouseId);
  const createBin = useCreateWarehouseBin(warehouseId);
  const binActions = useWarehouseBinAction(warehouseId);
  const [createOpen, setCreateOpen] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<BinType>('STORAGE');

  const bins = Array.isArray(data) ? data : data?.items ?? [];

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          Add bin
        </Button>
      </div>
      {bins.length === 0 ? (
        <EmptyState title="No bins yet" className="border-none py-8" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bin</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {bins.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="text-sm text-foreground">{b.name ?? b.code}</TableCell>
                <TableCell className="text-sm capitalize text-muted-foreground">{b.type.toLowerCase()}</TableCell>
                <TableCell className="text-sm capitalize text-muted-foreground">{b.mode.toLowerCase()}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{b.occupiedCapacity}{b.capacity != null && ` / ${b.capacity}`}</TableCell>
                <TableCell>
                  <StatusBadge status={b.status} />
                </TableCell>
                <TableCell className="text-right">
                  {b.status === 'ACTIVE' ? (
                    <Button variant="ghost" size="sm" onClick={() => binActions.deactivate.mutate(b.id)}>
                      Deactivate
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => binActions.activate.mutate(b.id)}>
                      Activate
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Add bin</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <FormField label="Code" htmlFor="bin-code" required>
              <Input id="bin-code" value={code} onChange={(e) => setCode(e.target.value)} />
            </FormField>
            <FormField label="Name" htmlFor="bin-name">
              <Input id="bin-name" value={name} onChange={(e) => setName(e.target.value)} />
            </FormField>
            <FormField label="Type" htmlFor="bin-type" required>
              <Select id="bin-type" value={type} onChange={(e) => setType(e.target.value as BinType)} options={BIN_TYPE_OPTIONS} />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createBin.mutate({ code, name: name || undefined, type }, { onSuccess: () => { setCreateOpen(false); setCode(''); setName(''); } })}
              disabled={!code || createBin.isPending}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CapacityTab({ warehouseId }: { warehouseId: string }) {
  const { data: capacity, isLoading } = useWarehouseCapacity(warehouseId);
  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (!capacity) return <EmptyState title="No capacity data" className="border-none py-8" />;

  return (
    <Card>
      <CardContent className="grid gap-4 pt-6 sm:grid-cols-3">
        <Field label="Total" value={capacity.total != null ? String(capacity.total) : '—'} />
        <Field label="Occupied" value={String(capacity.occupied)} />
        <Field label="Reserved" value={String(capacity.reserved)} />
        <Field label="Available" value={String(capacity.available)} />
        <Field label="Blocked" value={String(capacity.blocked)} />
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</p>
          <div className="mt-1">
            <StatusBadge status={capacity.status} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
