'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { FormField } from '@/components/ui/form-field';
import { useCreateReceiving, useWarehouseOptions } from '@/hooks';
import type { CreateReceivingPayload, Receiving, ReceiptType } from '@/types';

const TYPE_OPTIONS: { value: ReceiptType; label: string }[] = [
  { value: 'PURCHASE_ORDER', label: 'Purchase order' },
  { value: 'TRANSFER', label: 'Transfer' },
  { value: 'RETURN', label: 'Return' },
  { value: 'MANUAL', label: 'Manual' },
];

interface CreateReceivingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (receiving: Receiving) => void;
  purchaseOrderId?: string;
  shipmentId?: string;
  supplierId?: string;
}

export function CreateReceivingDialog({ open, onOpenChange, onCreated, purchaseOrderId, shipmentId, supplierId }: CreateReceivingDialogProps) {
  const createReceiving = useCreateReceiving();
  const { data: warehouses } = useWarehouseOptions();

  const [type, setType] = useState<ReceiptType>(purchaseOrderId ? 'PURCHASE_ORDER' : 'MANUAL');
  const [warehouseId, setWarehouseId] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [expectedQuantity, setExpectedQuantity] = useState('');
  const [notes, setNotes] = useState('');

  const warehouseOptions = (warehouses?.data ?? []).map((w) => ({ value: w.id, label: `${w.name} (${w.code})` }));

  const handleSubmit = () => {
    if (!warehouseId) return;
    const payload: CreateReceivingPayload = {
      type,
      warehouseId,
      purchaseOrderId,
      shipmentId,
      supplierId,
      scheduledDate: scheduledDate || undefined,
      expectedQuantity: expectedQuantity ? Number(expectedQuantity) : undefined,
      notes: notes || undefined,
    };
    createReceiving.mutate(payload, {
      onSuccess: (r) => {
        onOpenChange(false);
        setWarehouseId('');
        setScheduledDate('');
        setExpectedQuantity('');
        setNotes('');
        onCreated?.(r);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>New receiving record</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Type" htmlFor="recv-type" required>
              <Select id="recv-type" value={type} onChange={(e) => setType(e.target.value as ReceiptType)} options={TYPE_OPTIONS} />
            </FormField>
            <FormField label="Warehouse" htmlFor="recv-warehouse" required>
              <Select id="recv-warehouse" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} options={warehouseOptions} placeholder={warehouses ? 'Select a warehouse' : 'Loading…'} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Scheduled date" htmlFor="recv-scheduled">
              <Input id="recv-scheduled" type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
            </FormField>
            <FormField label="Expected quantity" htmlFor="recv-expected-qty">
              <Input id="recv-expected-qty" type="number" min="0" value={expectedQuantity} onChange={(e) => setExpectedQuantity(e.target.value)} />
            </FormField>
          </div>
          <FormField label="Notes" htmlFor="recv-notes">
            <Input id="recv-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </FormField>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!warehouseId || createReceiving.isPending}>
            {createReceiving.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create receiving
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
