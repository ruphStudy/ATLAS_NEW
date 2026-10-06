'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { FormField } from '@/components/ui/form-field';
import { useCreateInventoryItem } from '@/hooks';
import type { CreateInventoryItemPayload, InventoryItem, InventoryTrackingType } from '@/types';

const TRACKING_OPTIONS: { value: InventoryTrackingType; label: string }[] = [
  { value: 'NONE', label: 'None' },
  { value: 'BATCH', label: 'Batch' },
  { value: 'SERIAL', label: 'Serial' },
];

interface CreateInventoryItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (item: InventoryItem) => void;
  catalogProductId?: string;
}

export function CreateInventoryItemDialog({ open, onOpenChange, onCreated, catalogProductId }: CreateInventoryItemDialogProps) {
  const createItem = useCreateInventoryItem();
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [trackingType, setTrackingType] = useState<InventoryTrackingType>('NONE');
  const [baseUom, setBaseUom] = useState('unit');
  const [reorderPoint, setReorderPoint] = useState('');
  const [safetyStock, setSafetyStock] = useState('');
  const [reorderQuantity, setReorderQuantity] = useState('');

  const canSubmit = !!sku.trim() && !!name.trim();

  const handleSubmit = () => {
    if (!canSubmit) return;
    const payload: CreateInventoryItemPayload = {
      sku: sku.trim(),
      name: name.trim(),
      catalogProductId,
      trackingType,
      baseUom: baseUom || undefined,
      reorderPoint: reorderPoint ? Number(reorderPoint) : undefined,
      safetyStock: safetyStock ? Number(safetyStock) : undefined,
      reorderQuantity: reorderQuantity ? Number(reorderQuantity) : undefined,
    };
    createItem.mutate(payload, {
      onSuccess: (item) => {
        onOpenChange(false);
        setSku('');
        setName('');
        onCreated?.(item);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Add inventory item</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="SKU" htmlFor="item-sku" required>
              <Input id="item-sku" value={sku} onChange={(e) => setSku(e.target.value)} />
            </FormField>
            <FormField label="Tracking type" htmlFor="item-tracking" required>
              <Select id="item-tracking" value={trackingType} onChange={(e) => setTrackingType(e.target.value as InventoryTrackingType)} options={TRACKING_OPTIONS} />
            </FormField>
          </div>
          <FormField label="Name" htmlFor="item-name" required>
            <Input id="item-name" value={name} onChange={(e) => setName(e.target.value)} />
          </FormField>
          <div className="grid grid-cols-4 gap-4">
            <FormField label="Base UOM" htmlFor="item-uom">
              <Input id="item-uom" value={baseUom} onChange={(e) => setBaseUom(e.target.value)} />
            </FormField>
            <FormField label="Reorder point" htmlFor="item-reorder-point">
              <Input id="item-reorder-point" type="number" min="0" value={reorderPoint} onChange={(e) => setReorderPoint(e.target.value)} />
            </FormField>
            <FormField label="Safety stock" htmlFor="item-safety">
              <Input id="item-safety" type="number" min="0" value={safetyStock} onChange={(e) => setSafetyStock(e.target.value)} />
            </FormField>
            <FormField label="Reorder qty" htmlFor="item-reorder-qty">
              <Input id="item-reorder-qty" type="number" min="0" value={reorderQuantity} onChange={(e) => setReorderQuantity(e.target.value)} />
            </FormField>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || createItem.isPending}>
            {createItem.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
