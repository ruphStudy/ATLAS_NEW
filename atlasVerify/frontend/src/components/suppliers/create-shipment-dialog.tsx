'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { FormField } from '@/components/ui/form-field';
import { useCreateShipment, useSuppliers } from '@/hooks';
import type { CreateShipmentPayload, Shipment } from '@/types';

interface CreateShipmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (shipment: Shipment) => void;
  supplierId?: string;
}

export function CreateShipmentDialog({ open, onOpenChange, onCreated, supplierId }: CreateShipmentDialogProps) {
  const createShipment = useCreateShipment();
  const { data: suppliers } = useSuppliers({ limit: 100 });

  const [selectedSupplierId, setSelectedSupplierId] = useState(supplierId ?? '');
  const [carrier, setCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [shipmentMethod, setShipmentMethod] = useState('');
  const [dispatchDate, setDispatchDate] = useState('');
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState('');

  const supplierOptions = (suppliers?.items ?? []).map((s) => ({ value: s.id, label: s.name }));

  const handleSubmit = () => {
    const payload: CreateShipmentPayload = {
      supplierId: selectedSupplierId || undefined,
      carrier: carrier || undefined,
      trackingNumber: trackingNumber || undefined,
      shipmentMethod: shipmentMethod || undefined,
      dispatchDate: dispatchDate || undefined,
      estimatedDeliveryDate: estimatedDeliveryDate || undefined,
    };
    createShipment.mutate(payload, {
      onSuccess: (s) => {
        onOpenChange(false);
        setCarrier('');
        setTrackingNumber('');
        onCreated?.(s);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>New shipment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <FormField label="Supplier" htmlFor="ship-supplier">
            <Select id="ship-supplier" value={selectedSupplierId} onChange={(e) => setSelectedSupplierId(e.target.value)} options={supplierOptions} placeholder="Select a supplier" />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Carrier" htmlFor="ship-carrier">
              <Input id="ship-carrier" value={carrier} onChange={(e) => setCarrier(e.target.value)} />
            </FormField>
            <FormField label="Tracking number" htmlFor="ship-tracking">
              <Input id="ship-tracking" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} />
            </FormField>
          </div>
          <FormField label="Shipment method" htmlFor="ship-method" hint="e.g. SEA, AIR, ROAD, COURIER">
            <Input id="ship-method" value={shipmentMethod} onChange={(e) => setShipmentMethod(e.target.value)} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Dispatch date" htmlFor="ship-dispatch">
              <Input id="ship-dispatch" type="date" value={dispatchDate} onChange={(e) => setDispatchDate(e.target.value)} />
            </FormField>
            <FormField label="Estimated delivery" htmlFor="ship-eta">
              <Input id="ship-eta" type="date" value={estimatedDeliveryDate} onChange={(e) => setEstimatedDeliveryDate(e.target.value)} />
            </FormField>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createShipment.isPending}>
            {createShipment.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create shipment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
