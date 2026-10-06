'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/ui/form-field';
import { Checkbox } from '@/components/ui/checkbox';
import { useCreateRfq, useSuppliers } from '@/hooks';
import type { CreateRfqPayload, Rfq } from '@/types';

interface CreateRfqDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (rfq: Rfq) => void;
  supplierId?: string;
}

export function CreateRfqDialog({ open, onOpenChange, onCreated, supplierId }: CreateRfqDialogProps) {
  const createRfq = useCreateRfq();
  const { data: suppliers } = useSuppliers({ limit: 100 });

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [supplierIds, setSupplierIds] = useState<string[]>(supplierId ? [supplierId] : []);
  const [quantity, setQuantity] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [requiredDeliveryDate, setRequiredDeliveryDate] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [notes, setNotes] = useState('');

  const toggleSupplier = (id: string) => setSupplierIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));

  const handleSubmit = () => {
    if (!title.trim() || supplierIds.length === 0 || !quantity) return;
    const payload: CreateRfqPayload = {
      title: title.trim(),
      description: description || undefined,
      supplierIds,
      quantity: Number(quantity),
      targetPrice: targetPrice ? Number(targetPrice) : undefined,
      currency: currency || undefined,
      requiredDeliveryDate: requiredDeliveryDate || undefined,
      expiresAt: expiresAt || undefined,
      notes: notes || undefined,
    };
    createRfq.mutate(payload, {
      onSuccess: (rfq) => {
        onOpenChange(false);
        setTitle('');
        setDescription('');
        setSupplierIds(supplierId ? [supplierId] : []);
        setQuantity('');
        setTargetPrice('');
        setNotes('');
        onCreated?.(rfq);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>New RFQ</DialogTitle>
        </DialogHeader>

        <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
          <FormField label="Title" htmlFor="rfq-title" required>
            <Input id="rfq-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="RFQ for Bluetooth Earphones – Q3" />
          </FormField>
          <FormField label="Description" htmlFor="rfq-description">
            <Textarea id="rfq-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </FormField>

          <FormField label="Suppliers" htmlFor="rfq-suppliers" required hint="Select who this RFQ will be sent to">
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-[var(--radius)] border border-border p-2">
              {!suppliers || suppliers.items.length === 0 ? (
                <p className="p-2 text-sm text-muted-foreground">No suppliers available.</p>
              ) : (
                suppliers.items.map((s) => (
                  <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-secondary">
                    <Checkbox checked={supplierIds.includes(s.id)} onChange={() => toggleSupplier(s.id)} />
                    <span className="text-foreground">{s.name}</span>
                  </label>
                ))
              )}
            </div>
          </FormField>

          <div className="grid grid-cols-3 gap-4">
            <FormField label="Quantity" htmlFor="rfq-quantity" required>
              <Input id="rfq-quantity" type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </FormField>
            <FormField label="Target price" htmlFor="rfq-target-price">
              <Input id="rfq-target-price" type="number" min="0" step="0.01" value={targetPrice} onChange={(e) => setTargetPrice(e.target.value)} />
            </FormField>
            <FormField label="Currency" htmlFor="rfq-currency">
              <Input id="rfq-currency" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Required delivery date" htmlFor="rfq-delivery">
              <Input id="rfq-delivery" type="date" value={requiredDeliveryDate} onChange={(e) => setRequiredDeliveryDate(e.target.value)} />
            </FormField>
            <FormField label="Expires" htmlFor="rfq-expires">
              <Input id="rfq-expires" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </FormField>
          </div>

          <FormField label="Notes" htmlFor="rfq-notes">
            <Textarea id="rfq-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </FormField>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || supplierIds.length === 0 || !quantity || createRfq.isPending}>
            {createRfq.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create RFQ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
