'use client';

import { useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { FormField } from '@/components/ui/form-field';
import { useCreateCycleCount, useInventoryItems, useWarehouseOptions } from '@/hooks';
import type { CycleCountLineInput, InventoryCycleCount, InventoryCycleCountType } from '@/types';

const TYPE_OPTIONS: { value: InventoryCycleCountType; label: string }[] = [
  { value: 'FULL', label: 'Full' },
  { value: 'PARTIAL', label: 'Partial' },
  { value: 'BLIND', label: 'Blind' },
  { value: 'SPOT', label: 'Spot' },
  { value: 'ABC', label: 'ABC' },
];

interface CreateCycleCountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (cycleCount: InventoryCycleCount) => void;
}

function emptyLine(warehouseId: string): CycleCountLineInput {
  return { inventoryItemId: '', warehouseId };
}

export function CreateCycleCountDialog({ open, onOpenChange, onCreated }: CreateCycleCountDialogProps) {
  const createCycleCount = useCreateCycleCount();
  const { data: items } = useInventoryItems({ limit: 100 });
  const { data: warehouses } = useWarehouseOptions();

  const [type, setType] = useState<InventoryCycleCountType>('SPOT');
  const [scopeWarehouseId, setScopeWarehouseId] = useState('');
  const [lines, setLines] = useState<CycleCountLineInput[]>([]);

  const itemOptions = (items?.items ?? []).map((i) => ({ value: i.id, label: `${i.name} (${i.sku})` }));
  const warehouseOptions = (warehouses?.data ?? []).map((w) => ({ value: w.id, label: w.name }));
  const canSubmit = !!scopeWarehouseId && lines.length > 0 && lines.every((l) => l.inventoryItemId);

  const updateLine = (index: number, patch: Partial<CycleCountLineInput>) => setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));

  const handleSubmit = () => {
    if (!canSubmit) return;
    createCycleCount.mutate(
      { type, scopeWarehouseId, lines },
      {
        onSuccess: (c) => {
          onOpenChange(false);
          setLines([]);
          onCreated?.(c);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>New cycle count</DialogTitle>
        </DialogHeader>

        <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Type" htmlFor="cc-type" required>
              <Select id="cc-type" value={type} onChange={(e) => setType(e.target.value as InventoryCycleCountType)} options={TYPE_OPTIONS} />
            </FormField>
            <FormField label="Warehouse" htmlFor="cc-warehouse" required>
              <Select id="cc-warehouse" value={scopeWarehouseId} onChange={(e) => setScopeWarehouseId(e.target.value)} options={warehouseOptions} placeholder="Select a warehouse" />
            </FormField>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">Items to count</p>
              <Button type="button" variant="ghost" size="sm" disabled={!scopeWarehouseId} onClick={() => setLines([...lines, emptyLine(scopeWarehouseId)])}>
                <Plus className="h-3.5 w-3.5" />
                Add item
              </Button>
            </div>
            <div className="space-y-2">
              {lines.map((line, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Select value={line.inventoryItemId} onChange={(e) => updateLine(i, { inventoryItemId: e.target.value })} options={itemOptions} placeholder="Select item" className="flex-1" />
                  <button onClick={() => setLines(lines.filter((_, idx) => idx !== i))} aria-label="Remove line" className="shrink-0 text-muted-foreground hover:text-danger">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {lines.length === 0 && <p className="text-xs text-muted-foreground">Select a warehouse, then add items to count.</p>}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || createCycleCount.isPending}>
            {createCycleCount.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create cycle count
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
