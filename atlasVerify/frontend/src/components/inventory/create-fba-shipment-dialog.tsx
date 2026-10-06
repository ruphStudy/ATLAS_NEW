'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useCreateFBAShipment, useMarketplaceAccounts, useWarehouseOptions } from '@/hooks';
import type { FBAShipmentType } from '@/types';

const SHIPMENT_TYPE_OPTIONS: { value: FBAShipmentType; label: string }[] = [
  { value: 'SINGLE_DESTINATION', label: 'Single destination' },
  { value: 'MULTI_DESTINATION', label: 'Multi destination' },
];

interface CreateFBAShipmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateFBAShipmentDialog({ open, onOpenChange }: CreateFBAShipmentDialogProps) {
  const [marketplaceAccountId, setMarketplaceAccountId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [shipmentType, setShipmentType] = useState<FBAShipmentType>('SINGLE_DESTINATION');
  const [destinationFCId, setDestinationFCId] = useState('');
  const [notes, setNotes] = useState('');

  const { data: accounts } = useMarketplaceAccounts({ limit: 100 });
  const { data: warehouses } = useWarehouseOptions();
  const createShipment = useCreateFBAShipment();

  const reset = () => {
    setMarketplaceAccountId('');
    setWarehouseId('');
    setShipmentType('SINGLE_DESTINATION');
    setDestinationFCId('');
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>New FBA shipment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <FormField label="Marketplace account" htmlFor="fba-account" required>
            <Select
              id="fba-account"
              value={marketplaceAccountId}
              onChange={(e) => setMarketplaceAccountId(e.target.value)}
              placeholder="Select account"
              options={(accounts?.items ?? []).map((a) => ({ value: a.id, label: a.accountName }))}
            />
          </FormField>
          <FormField label="Source warehouse" htmlFor="fba-warehouse" required>
            <Select
              id="fba-warehouse"
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              placeholder="Select warehouse"
              options={(warehouses?.data ?? []).map((w) => ({ value: w.id, label: w.name }))}
            />
          </FormField>
          <FormField label="Shipment type" htmlFor="fba-type">
            <Select id="fba-type" value={shipmentType} onChange={(e) => setShipmentType(e.target.value as FBAShipmentType)} options={SHIPMENT_TYPE_OPTIONS} />
          </FormField>
          <FormField label="Destination FC ID" htmlFor="fba-dest">
            <Input id="fba-dest" value={destinationFCId} onChange={(e) => setDestinationFCId(e.target.value)} placeholder="e.g. ONT8" />
          </FormField>
          <FormField label="Notes" htmlFor="fba-notes">
            <Textarea id="fba-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              createShipment.mutate(
                { marketplaceAccountId, warehouseId, shipmentType, destinationFCId: destinationFCId || undefined, notes: notes || undefined },
                { onSuccess: () => { onOpenChange(false); reset(); } },
              )
            }
            disabled={!marketplaceAccountId || !warehouseId || createShipment.isPending}
          >
            {createShipment.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
