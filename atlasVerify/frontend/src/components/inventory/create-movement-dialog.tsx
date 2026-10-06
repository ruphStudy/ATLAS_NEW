'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { FormField } from '@/components/ui/form-field';
import { useCreateMovement, useInventoryItems, useWarehouseOptions } from '@/hooks';
import type { CreateMovementPayload, InventoryMovement, InventoryStockStatus } from '@/types';

const STOCK_STATUS_OPTIONS: { value: InventoryStockStatus; label: string }[] = [
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'RESERVED', label: 'Reserved' },
  { value: 'DAMAGED', label: 'Damaged' },
  { value: 'LOST', label: 'Lost' },
  { value: 'IN_TRANSIT', label: 'In transit' },
  { value: 'BLOCKED', label: 'Blocked' },
];

interface CreateMovementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (movement: InventoryMovement) => void;
  inventoryItemId?: string;
}

export function CreateMovementDialog({ open, onOpenChange, onCreated, inventoryItemId }: CreateMovementDialogProps) {
  const createMovement = useCreateMovement();
  const { data: items } = useInventoryItems({ limit: 100 });
  const { data: warehouses } = useWarehouseOptions();

  const [selectedItemId, setSelectedItemId] = useState(inventoryItemId ?? '');
  const [warehouseId, setWarehouseId] = useState('');
  const [fromStatus, setFromStatus] = useState<InventoryStockStatus>('AVAILABLE');
  const [toStatus, setToStatus] = useState<InventoryStockStatus>('BLOCKED');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');

  const itemOptions = (items?.items ?? []).map((i) => ({ value: i.id, label: `${i.name} (${i.sku})` }));
  const warehouseOptions = (warehouses?.data ?? []).map((w) => ({ value: w.id, label: w.name }));
  const canSubmit = !!selectedItemId && !!warehouseId && !!quantity && !!reason.trim();

  const handleSubmit = () => {
    if (!canSubmit) return;
    const payload: CreateMovementPayload = { inventoryItemId: selectedItemId, warehouseId, fromStatus, toStatus, quantity: Number(quantity), reason: reason.trim() };
    createMovement.mutate(payload, {
      onSuccess: (m) => {
        onOpenChange(false);
        setQuantity('');
        setReason('');
        onCreated?.(m);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>New movement</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <FormField label="Inventory item" htmlFor="mv-item" required>
            <Select id="mv-item" value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)} options={itemOptions} placeholder="Select an item" disabled={!!inventoryItemId} />
          </FormField>
          <FormField label="Warehouse" htmlFor="mv-warehouse" required>
            <Select id="mv-warehouse" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} options={warehouseOptions} placeholder="Select a warehouse" />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="From status" htmlFor="mv-from" required>
              <Select id="mv-from" value={fromStatus} onChange={(e) => setFromStatus(e.target.value as InventoryStockStatus)} options={STOCK_STATUS_OPTIONS} />
            </FormField>
            <FormField label="To status" htmlFor="mv-to" required>
              <Select id="mv-to" value={toStatus} onChange={(e) => setToStatus(e.target.value as InventoryStockStatus)} options={STOCK_STATUS_OPTIONS} />
            </FormField>
          </div>
          <FormField label="Quantity" htmlFor="mv-quantity" required>
            <Input id="mv-quantity" type="number" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </FormField>
          <FormField label="Reason" htmlFor="mv-reason" required>
            <Input id="mv-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          </FormField>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || createMovement.isPending}>
            {createMovement.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create movement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
