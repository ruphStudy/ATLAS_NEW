'use client';

import { useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { FormField } from '@/components/ui/form-field';
import { useCreatePurchaseOrder, useSuppliers } from '@/hooks';
import type { CreatePurchaseOrderPayload, POLineItem, PurchaseOrder } from '@/types';

interface CreatePurchaseOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (po: PurchaseOrder) => void;
  supplierId?: string;
}

function emptyLineItem(): POLineItem {
  return { description: '', quantity: 1, unitPrice: 0 };
}

export function CreatePurchaseOrderDialog({ open, onOpenChange, onCreated, supplierId }: CreatePurchaseOrderDialogProps) {
  const createPO = useCreatePurchaseOrder();
  const { data: suppliers } = useSuppliers({ limit: 100 });

  const [selectedSupplierId, setSelectedSupplierId] = useState(supplierId ?? '');
  const [currency, setCurrency] = useState('USD');
  const [incoterms, setIncoterms] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [lineItems, setLineItems] = useState<POLineItem[]>([emptyLineItem()]);

  const supplierOptions = (suppliers?.items ?? []).map((s) => ({ value: s.id, label: s.name }));
  const canSubmit = lineItems.length > 0 && lineItems.every((li) => li.description.trim() && li.quantity > 0 && li.unitPrice >= 0);

  const updateLineItem = (index: number, patch: Partial<POLineItem>) => {
    setLineItems((prev) => prev.map((li, i) => (i === index ? { ...li, ...patch } : li)));
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    const payload: CreatePurchaseOrderPayload = {
      supplierId: selectedSupplierId || undefined,
      lineItems,
      currency,
      incoterms: incoterms || undefined,
      expectedDeliveryDate: expectedDeliveryDate || undefined,
    };
    createPO.mutate(payload, {
      onSuccess: (po) => {
        onOpenChange(false);
        setLineItems([emptyLineItem()]);
        onCreated?.(po);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle>New purchase order</DialogTitle>
        </DialogHeader>

        <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
          <div className="grid grid-cols-3 gap-4">
            <FormField label="Supplier" htmlFor="po-supplier" className="col-span-2">
              <Select id="po-supplier" value={selectedSupplierId} onChange={(e) => setSelectedSupplierId(e.target.value)} options={supplierOptions} placeholder="Select a supplier" />
            </FormField>
            <FormField label="Currency" htmlFor="po-currency">
              <Input id="po-currency" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Incoterms" htmlFor="po-incoterms">
              <Input id="po-incoterms" value={incoterms} onChange={(e) => setIncoterms(e.target.value)} placeholder="FOB, DDP, CIF…" />
            </FormField>
            <FormField label="Expected delivery date" htmlFor="po-delivery">
              <Input id="po-delivery" type="date" value={expectedDeliveryDate} onChange={(e) => setExpectedDeliveryDate(e.target.value)} />
            </FormField>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">Line items</p>
              <Button type="button" variant="ghost" size="sm" onClick={() => setLineItems([...lineItems, emptyLineItem()])}>
                <Plus className="h-3.5 w-3.5" />
                Add line
              </Button>
            </div>
            <div className="space-y-2">
              {lineItems.map((li, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input placeholder="Description" value={li.description} onChange={(e) => updateLineItem(i, { description: e.target.value })} className="flex-1" />
                  <Input placeholder="SKU" value={li.sku ?? ''} onChange={(e) => updateLineItem(i, { sku: e.target.value })} className="w-28" />
                  <Input type="number" min="1" placeholder="Qty" value={li.quantity || ''} onChange={(e) => updateLineItem(i, { quantity: Number(e.target.value) })} className="w-20" />
                  <Input type="number" min="0" step="0.01" placeholder="Unit price" value={li.unitPrice || ''} onChange={(e) => updateLineItem(i, { unitPrice: Number(e.target.value) })} className="w-28" />
                  <button
                    onClick={() => setLineItems(lineItems.filter((_, idx) => idx !== i))}
                    disabled={lineItems.length === 1}
                    aria-label="Remove line item"
                    className="shrink-0 text-muted-foreground hover:text-danger disabled:opacity-30"
                  >
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
          <Button onClick={handleSubmit} disabled={!canSubmit || createPO.isPending}>
            {createPO.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create purchase order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
