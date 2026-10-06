'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { FormField } from '@/components/ui/form-field';
import { useCreateAdjustment, useInventoryItems, useWarehouseOptions } from '@/hooks';
import type { CreateAdjustmentPayload, InventoryAdjustment, InventoryAdjustmentType } from '@/types';

const TYPE_OPTIONS: { value: InventoryAdjustmentType; label: string }[] = [
  { value: 'INCREASE', label: 'Increase' },
  { value: 'DECREASE', label: 'Decrease' },
  { value: 'DAMAGE', label: 'Damage' },
  { value: 'LOSS', label: 'Loss' },
  { value: 'EXPIRY', label: 'Expiry' },
  { value: 'COUNT_VARIANCE', label: 'Count variance' },
  { value: 'STATUS_CORRECTION', label: 'Status correction' },
];

interface CreateAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (adjustment: InventoryAdjustment) => void;
  inventoryItemId?: string;
}

export function CreateAdjustmentDialog({ open, onOpenChange, onCreated, inventoryItemId }: CreateAdjustmentDialogProps) {
  const createAdjustment = useCreateAdjustment();
  const { data: items } = useInventoryItems({ limit: 100 });
  const { data: warehouses } = useWarehouseOptions();

  const [selectedItemId, setSelectedItemId] = useState(inventoryItemId ?? '');
  const [type, setType] = useState<InventoryAdjustmentType>('INCREASE');
  const [warehouseId, setWarehouseId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [quantityDelta, setQuantityDelta] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  const itemOptions = (items?.items ?? []).map((i) => ({ value: i.id, label: `${i.name} (${i.sku})` }));
  const warehouseOptions = (warehouses?.data ?? []).map((w) => ({ value: w.id, label: w.name }));
  const isCountVariance = type === 'COUNT_VARIANCE';

  const canSubmit = !!selectedItemId && !!warehouseId && !!reason.trim() && (isCountVariance ? !!quantityDelta : !!quantity);

  const handleSubmit = () => {
    if (!canSubmit) return;
    const payload: CreateAdjustmentPayload = {
      inventoryItemId: selectedItemId,
      type,
      warehouseId,
      quantity: !isCountVariance && quantity ? Number(quantity) : undefined,
      quantityDelta: isCountVariance && quantityDelta ? Number(quantityDelta) : undefined,
      reason: reason.trim(),
      notes: notes || undefined,
    };
    createAdjustment.mutate(payload, {
      onSuccess: (adj) => {
        onOpenChange(false);
        setQuantity('');
        setQuantityDelta('');
        setReason('');
        setNotes('');
        onCreated?.(adj);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>New adjustment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <FormField label="Inventory item" htmlFor="adj-item" required>
            <Select id="adj-item" value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)} options={itemOptions} placeholder="Select an item" disabled={!!inventoryItemId} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Type" htmlFor="adj-type" required>
              <Select id="adj-type" value={type} onChange={(e) => setType(e.target.value as InventoryAdjustmentType)} options={TYPE_OPTIONS} />
            </FormField>
            <FormField label="Warehouse" htmlFor="adj-warehouse" required>
              <Select id="adj-warehouse" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} options={warehouseOptions} placeholder="Select a warehouse" />
            </FormField>
          </div>
          {isCountVariance ? (
            <FormField label="Quantity delta" htmlFor="adj-delta" required hint="Signed value, e.g. -5 or +3">
              <Input id="adj-delta" type="number" value={quantityDelta} onChange={(e) => setQuantityDelta(e.target.value)} />
            </FormField>
          ) : (
            <FormField label="Quantity" htmlFor="adj-quantity" required>
              <Input id="adj-quantity" type="number" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </FormField>
          )}
          <FormField label="Reason" htmlFor="adj-reason" required>
            <Input id="adj-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          </FormField>
          <FormField label="Notes" htmlFor="adj-notes">
            <Textarea id="adj-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </FormField>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || createAdjustment.isPending}>
            {createAdjustment.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create adjustment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
