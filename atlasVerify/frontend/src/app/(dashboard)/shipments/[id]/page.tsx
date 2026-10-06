'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { isAxiosError } from 'axios';
import { CheckCircle2, Loader2, PackageCheck, Send, X } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { FormField } from '@/components/ui/form-field';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/action-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { QueryErrorState, UnauthorizedState } from '@/components/ui/states';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ReasonDialog } from '@/components/suppliers/reason-dialog';
import { AttachmentsList } from '@/components/suppliers/attachments-list';
import { LinkedReceivings } from '@/components/suppliers/linked-receivings';
import {
  useCancelShipment,
  useDeliverShipment,
  useDispatchShipment,
  useShipment,
  useShipmentTrackingHistory,
  useUpdateShipmentTracking,
} from '@/hooks';
import { formatDate } from '@/lib/utils';
import type { ShipmentStatus } from '@/types';

const TRACKING_STATUS_OPTIONS: { value: ShipmentStatus; label: string }[] = [
  { value: 'IN_TRANSIT', label: 'In transit' },
  { value: 'CUSTOMS_CLEARANCE', label: 'Customs clearance' },
  { value: 'OUT_FOR_DELIVERY', label: 'Out for delivery' },
  { value: 'DELAYED', label: 'Delayed' },
];

export default function ShipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: shipment, isLoading, isError, error, refetch } = useShipment(id);
  const { data: history } = useShipmentTrackingHistory(id);
  const dispatch = useDispatchShipment(id);
  const deliver = useDeliverShipment(id);
  const cancel = useCancelShipment(id);
  const updateTracking = useUpdateShipmentTracking(id);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [trackingOpen, setTrackingOpen] = useState(false);
  const [trackingStatus, setTrackingStatus] = useState<ShipmentStatus>('IN_TRANSIT');
  const [trackingLocation, setTrackingLocation] = useState('');
  const [trackingDescription, setTrackingDescription] = useState('');

  const isForbidden = isAxiosError(error) && error.response?.status === 403;

  if (isForbidden) return <UnauthorizedState />;
  if (isError) return <QueryErrorState refetch={refetch} description="We couldn't load this shipment." />;
  if (isLoading || !shipment) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const actions: ActionMenuItem[] = [];
  if (shipment.status === 'PENDING' || shipment.status === 'READY') {
    actions.push({ label: 'Dispatch', icon: Send, onSelect: () => dispatch.mutate({}) });
  }
  if (!['DELIVERED', 'CANCELLED', 'LOST'].includes(shipment.status)) {
    actions.push({ label: 'Add tracking update', icon: PackageCheck, onSelect: () => setTrackingOpen(true) });
    actions.push({ label: 'Mark delivered', icon: CheckCircle2, onSelect: () => deliver.mutate({}) });
    actions.push({ label: 'Cancel', icon: X, onSelect: () => setCancelOpen(true), destructive: true, separatorBefore: true });
  }

  return (
    <div>
      <PageHeader
        title={shipment.shipmentNumber}
        breadcrumbs={[{ label: 'Shipments', href: '/dashboard/shipments' }, { label: shipment.shipmentNumber }]}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={shipment.status} />
            <ActionMenu items={actions} />
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 text-sm">
              <Field label="Carrier" value={shipment.carrier ?? '—'} />
              <Field label="Tracking number" value={shipment.trackingNumber ?? '—'} />
              <Field label="Method" value={shipment.shipmentMethod ?? '—'} />
              <Field label="Partial shipment" value={shipment.isPartial ? 'Yes' : 'No'} />
              <Field label="Dispatch date" value={shipment.dispatchDate ? formatDate(shipment.dispatchDate) : '—'} />
              <Field label="Estimated delivery" value={shipment.estimatedDeliveryDate ? formatDate(shipment.estimatedDeliveryDate) : '—'} />
              <Field label="Actual delivery" value={shipment.actualDeliveryDate ? formatDate(shipment.actualDeliveryDate) : '—'} />
              <Field label="Total weight" value={shipment.totalWeight != null ? `${shipment.totalWeight} ${shipment.weightUnit ?? ''}` : '—'} />
              {shipment.notes && <div className="sm:col-span-2"><Field label="Notes" value={shipment.notes} /></div>}
              {shipment.cancelReason && <div className="sm:col-span-2"><Field label="Cancel reason" value={shipment.cancelReason} /></div>}
              <AttachmentsList attachments={shipment.attachments} />
            </CardContent>
          </Card>

          {shipment.packages && shipment.packages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Packages</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {shipment.packages.map((p) => (
                  <div key={p.packageNumber} className="rounded-[var(--radius)] border border-border p-2 text-sm">
                    <p className="font-medium text-foreground">Package #{p.packageNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.weight != null && `${p.weight} ${p.weightUnit ?? ''} · `}
                      {p.trackingNumber && `Tracking: ${p.trackingNumber}`}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Tracking timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {!history || history.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tracking updates yet.</p>
              ) : (
                <ul className="space-y-3">
                  {history.map((h) => (
                    <li key={h.id} className="border-l-2 border-border pl-3">
                      <StatusBadge status={h.toStatus} />
                      <p className="mt-1 text-sm text-foreground">{h.description}</p>
                      {h.location && <p className="text-xs text-muted-foreground">{h.location}</p>}
                      <p className="text-xs text-muted-foreground">{formatDate(h.createdAt)} · {h.source}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Receiving</CardTitle>
            </CardHeader>
            <CardContent>
              <LinkedReceivings shipmentId={shipment.id} supplierId={shipment.supplierId ?? undefined} />
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={trackingOpen} onOpenChange={setTrackingOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Add tracking update</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <FormField label="Status" htmlFor="track-status" required>
              <Select id="track-status" value={trackingStatus} onChange={(e) => setTrackingStatus(e.target.value as ShipmentStatus)} options={TRACKING_STATUS_OPTIONS} />
            </FormField>
            <FormField label="Location" htmlFor="track-location">
              <Input id="track-location" value={trackingLocation} onChange={(e) => setTrackingLocation(e.target.value)} />
            </FormField>
            <FormField label="Description" htmlFor="track-description" required>
              <Input id="track-description" value={trackingDescription} onChange={(e) => setTrackingDescription(e.target.value)} />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTrackingOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                updateTracking.mutate(
                  { status: trackingStatus, location: trackingLocation || undefined, description: trackingDescription },
                  { onSuccess: () => { setTrackingOpen(false); setTrackingDescription(''); setTrackingLocation(''); } },
                )
              }
              disabled={!trackingDescription.trim() || updateTracking.isPending}
            >
              {updateTracking.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReasonDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel this shipment"
        confirmLabel="Cancel shipment"
        variant="danger"
        pending={cancel.isPending}
        onSubmit={(reason) => cancel.mutate(reason, { onSuccess: () => setCancelOpen(false) })}
      />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm text-foreground">{value}</p>
    </div>
  );
}
