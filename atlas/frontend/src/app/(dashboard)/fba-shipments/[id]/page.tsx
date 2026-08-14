'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { isAxiosError } from 'axios';
import { CheckCircle2, ClipboardList, PackageCheck, Truck, X } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/action-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState, UnauthorizedState } from '@/components/ui/states';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ReasonDialog } from '@/components/suppliers/reason-dialog';
import {
  useApproveFBAShipment,
  useCancelFBAShipment,
  useCloseFBAShipment,
  useCreateFBAShipmentBox,
  useDispatchFBAShipment,
  useFBAShipment,
  useFBAShipmentBoxes,
  useFBAShipmentDiscrepancies,
  useFBAShipmentItems,
  usePlanFBAShipment,
  usePrepareFBAShipment,
  useReconcileFBAShipment,
  useTrackFBAShipment,
} from '@/hooks';
import { formatDate } from '@/lib/utils';

export default function FBAShipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: shipment, isLoading, isError, error, refetch } = useFBAShipment(id);
  const { data: items } = useFBAShipmentItems(id);
  const { data: boxes } = useFBAShipmentBoxes(id);
  const { data: discrepancies } = useFBAShipmentDiscrepancies(id);

  const plan = usePlanFBAShipment(id);
  const approve = useApproveFBAShipment(id);
  const prepare = usePrepareFBAShipment(id);
  const dispatch = useDispatchFBAShipment(id);
  const track = useTrackFBAShipment(id);
  const reconcile = useReconcileFBAShipment(id);
  const close = useCloseFBAShipment(id);
  const cancel = useCancelFBAShipment(id);
  const createBox = useCreateFBAShipmentBox(id);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [trackOpen, setTrackOpen] = useState(false);
  const [trackingReference, setTrackingReference] = useState('');
  const [boxOpen, setBoxOpen] = useState(false);
  const [boxWeight, setBoxWeight] = useState('');

  const isForbidden = isAxiosError(error) && error.response?.status === 403;

  if (isForbidden) return <UnauthorizedState />;
  if (isError) return <QueryErrorState refetch={refetch} description="We couldn't load this FBA shipment." />;
  if (isLoading || !shipment) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const actions: ActionMenuItem[] = [];
  if (shipment.status === 'DRAFT') {
    actions.push({ label: 'Plan', icon: ClipboardList, onSelect: () => plan.mutate() });
  }
  if (shipment.status === 'PLANNED') {
    actions.push({ label: 'Approve', icon: CheckCircle2, onSelect: () => approve.mutate() });
  }
  if (shipment.status === 'APPROVED') {
    actions.push({ label: 'Prepare', icon: PackageCheck, onSelect: () => prepare.mutate() });
  }
  if (shipment.status === 'PREPARING') {
    actions.push({ label: 'Dispatch', icon: Truck, onSelect: () => dispatch.mutate() });
  }
  if (['DISPATCHED', 'SHIPPED', 'IN_TRANSIT'].includes(shipment.status)) {
    actions.push({ label: 'Update tracking', icon: Truck, onSelect: () => setTrackOpen(true) });
  }
  if (['CHECKED_IN', 'RECEIVING', 'RECEIVED'].includes(shipment.status)) {
    actions.push({ label: 'Reconcile', icon: CheckCircle2, onSelect: () => reconcile.mutate() });
  }
  if (shipment.status === 'RECEIVED') {
    actions.push({ label: 'Close', icon: CheckCircle2, onSelect: () => close.mutate() });
  }
  if (!['CLOSED', 'CANCELLED'].includes(shipment.status)) {
    actions.push({ label: 'Cancel', icon: X, onSelect: () => setCancelOpen(true), destructive: true, separatorBefore: true });
  }

  return (
    <div>
      <PageHeader
        title={shipment.shipmentNumber}
        breadcrumbs={[{ label: 'FBA Shipments', href: '/dashboard/fba-shipments' }, { label: shipment.shipmentNumber }]}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={shipment.status} />
            <ActionMenu items={actions} />
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Destination FC" value={shipment.destinationFCName ?? shipment.destinationFCId ?? '—'} />
        <Stat label="Carrier" value={shipment.carrierName ?? '—'} />
        <Stat label="Units" value={`${shipment.shippedUnits}/${shipment.totalUnits}`} />
        <Stat label="Boxes" value={`${shipment.shippedBoxes}/${shipment.totalBoxes}`} />
      </div>

      <Tabs defaultValue="items">
        <TabsList>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="boxes">Boxes</TabsTrigger>
          <TabsTrigger value="discrepancies">Discrepancies</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="items">
          {!items || items.length === 0 ? (
            <EmptyState title="No items yet" className="border-none py-8" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>FNSKU / ASIN</TableHead>
                  <TableHead>Prep</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Shipped</TableHead>
                  <TableHead>Received</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell className="text-sm font-medium text-foreground">{it.sku}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{it.fnsku ?? '—'} / {it.asin ?? '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{it.prepRequired ? (it.prepType ?? 'Required') : 'None'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{it.requestedQuantity}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{it.shippedQuantity}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{it.receivedQuantity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="boxes">
          <div className="mb-3 flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setBoxOpen(true)}>
              Add box
            </Button>
          </div>
          {!boxes || boxes.length === 0 ? (
            <EmptyState title="No boxes yet" className="border-none py-8" />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {boxes.map((b) => (
                <Card key={b.id}>
                  <CardHeader>
                    <CardTitle className="text-sm">{b.boxNumber}</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-2 text-sm">
                    <Field label="Units" value={String(b.totalUnits)} />
                    <Field label="Weight" value={b.weight != null ? `${b.weight} ${b.weightUnit}` : '—'} />
                    <Field label="Tracking" value={b.trackingNumber ?? '—'} />
                    <Field label="Shipped" value={b.shipped ? 'Yes' : 'No'} />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="discrepancies">
          {!discrepancies || discrepancies.length === 0 ? (
            <EmptyState title="No discrepancies" className="border-none py-8" />
          ) : (
            <ul className="space-y-2">
              {discrepancies.map((d) => (
                <li key={d.id} className="rounded-[var(--radius)] border border-border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <StatusBadge status={d.discrepancyType} />
                    {d.reconciled ? <StatusBadge status="RECONCILED" tone="success" /> : <StatusBadge status="OPEN" tone="warning" />}
                  </div>
                  <p className="mt-1 text-muted-foreground">{d.description}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Expected {d.expectedQuantity ?? '—'} · Shipped {d.shippedQuantity ?? '—'} · Received {d.receivedQuantity ?? '—'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="overview">
          <Card>
            <CardContent className="grid grid-cols-2 gap-4 pt-6 text-sm sm:grid-cols-3">
              <Field label="Shipment type" value={shipment.shipmentType} />
              <Field label="Case packed" value={shipment.isCasePacked ? 'Yes' : 'No'} />
              <Field label="Partial" value={shipment.isPartial ? 'Yes' : 'No'} />
              <Field label="Planned" value={shipment.plannedAt ? formatDate(shipment.plannedAt) : '—'} />
              <Field label="Approved" value={shipment.approvedAt ? formatDate(shipment.approvedAt) : '—'} />
              <Field label="Prepared" value={shipment.preparedAt ? formatDate(shipment.preparedAt) : '—'} />
              <Field label="Dispatched" value={shipment.dispatchedAt ? formatDate(shipment.dispatchedAt) : '—'} />
              <Field label="Shipped" value={shipment.shippedAt ? formatDate(shipment.shippedAt) : '—'} />
              <Field label="Delivered" value={shipment.deliveredAt ? formatDate(shipment.deliveredAt) : '—'} />
              <Field label="Received" value={shipment.receivedAt ? formatDate(shipment.receivedAt) : '—'} />
              <Field label="Closed" value={shipment.closedAt ? formatDate(shipment.closedAt) : '—'} />
              {shipment.notes && <Field label="Notes" value={shipment.notes} />}
              {shipment.cancelReason && <Field label="Cancel reason" value={shipment.cancelReason} />}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={boxOpen} onOpenChange={setBoxOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Add box</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <FormField label="Weight" htmlFor="box-weight">
              <Input id="box-weight" type="number" min="0" step="0.01" value={boxWeight} onChange={(e) => setBoxWeight(e.target.value)} />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBoxOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createBox.mutate({ weight: boxWeight ? Number(boxWeight) : undefined }, { onSuccess: () => { setBoxOpen(false); setBoxWeight(''); } })}
              disabled={createBox.isPending}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={trackOpen} onOpenChange={setTrackOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Update tracking</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <FormField label="Tracking reference" htmlFor="track-ref">
              <Input id="track-ref" value={trackingReference} onChange={(e) => setTrackingReference(e.target.value)} />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTrackOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => track.mutate(trackingReference || undefined, { onSuccess: () => { setTrackOpen(false); setTrackingReference(''); } })}
              disabled={track.isPending}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReasonDialog open={cancelOpen} onOpenChange={setCancelOpen} title="Cancel this shipment" confirmLabel="Cancel" variant="danger" pending={cancel.isPending} onSubmit={(reason) => cancel.mutate(reason, { onSuccess: () => setCancelOpen(false) })} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius)] border border-border bg-card p-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="capitalize text-foreground">{value}</p>
    </div>
  );
}
