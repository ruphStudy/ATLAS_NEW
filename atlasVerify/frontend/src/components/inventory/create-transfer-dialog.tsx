'use client';

import { useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { FormField } from '@/components/ui/form-field';
import { useCreateInventoryTransfer, useInventoryItems, useWarehouseOptions } from '@/hooks';
import type { CreateTransferLineInput, InventoryTransfer } from '@/types';

interface CreateTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (transfer: InventoryTransfer) => void;
}

function emptyLine(): CreateTransferLineInput {
  return { inventoryItemId: '', quantity: 1 };
}

export function CreateTransferDialog({ open, onOpenChange, onCreated }: CreateTransferDialogProps) {
  const createTransfer = useCreateInventoryTransfer();
  const { data: items } = useInventoryItems({ limit: 100 });
  const { data: warehouses } = useWarehouseOptions();

  const [sourceWarehouseId, setSourceWarehouseId] = useState('');
  const [destinationWarehouseId, setDestinationWarehouseId] = useState('');
  const [reason, setReason] = useState('');
  const [lines, setLines] = useState<CreateTransferLineInput[]>([emptyLine()]);

  const itemOptions = (items?.items ?? []).map((i) => ({ value: i.id, label: `${i.name} (${i.sku})` }));
  const warehouseOptions = (warehouses?.data ?? []).map((w) => ({ value: w.id, label: w.name }));
  const canSubmit = !!sourceWarehouseId && !!destinationWarehouseId && sourceWarehouseId !== destinationWarehouseId && !!reason.trim() && lines.every((l) => l.inventoryItemId && l.quantity > 0);

  const updateLine = (index: number, patch: Partial<CreateTransferLineInput>) => setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));

  const handleSubmit = () => {
    if (!canSubmit) return;
    createTransfer.mutate(
      { sourceWarehouseId, destinationWarehouseId, lines, reason: reason.trim() },
      {
        onSuccess: (t) => {
          onOpenChange(false);
          setReason('');
          setLines([emptyLine()]);
          onCreated?.(t);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>New transfer</DialogTitle>
        </DialogHeader>

        <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Source warehouse" htmlFor="tr-source" required>
              <Select id="tr-source" value={sourceWarehouseId} onChange={(e) => setSourceWarehouseId(e.target.value)} options={warehouseOptions} placeholder="Select a warehouse" />
            </FormField>
            <FormField label="Destination warehouse" htmlFor="tr-dest" required>
              <Select id="tr-dest" value={destinationWarehouseId} onChange={(e) => setDestinationWarehouseId(e.target.value)} options={warehouseOptions} placeholder="Select a warehouse" />
            </FormField>
          </div>
          <FormField label="Reason" htmlFor="tr-reason" required>
            <Input id="tr-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          </FormField>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">Lines</p>
              <Button type="button" variant="ghost" size="sm" onClick={() => setLines([...lines, emptyLine()])}>
                <Plus className="h-3.5 w-3.5" />
                Add line
              </Button>
            </div>
            <div className="space-y-2">
              {lines.map((line, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Select value={line.inventoryItemId} onChange={(e) => updateLine(i, { inventoryItemId: e.target.value })} options={itemOptions} placeholder="Select item" className="flex-1" />
                  <Input type="number" min="1" placeholder="Qty" value={line.quantity || ''} onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })} className="w-24" />
                  <button onClick={() => setLines(lines.filter((_, idx) => idx !== i))} disabled={lines.length === 1} aria-label="Remove line" className="shrink-0 text-muted-foreground hover:text-danger disabled:opacity-30">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || createTransfer.isPending}>
            {createTransfer.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create transfer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
