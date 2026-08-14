'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { FormField } from '@/components/ui/form-field';
import { useCreateProcurement, useSuppliers } from '@/hooks';
import type { CreateProcurementPayload, Procurement } from '@/types';

interface CreateProcurementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (procurement: Procurement) => void;
  supplierId?: string;
}

export function CreateProcurementDialog({ open, onOpenChange, onCreated, supplierId }: CreateProcurementDialogProps) {
  const createProcurement = useCreateProcurement();
  const { data: suppliers } = useSuppliers({ limit: 100 });

  const [selectedSupplierId, setSelectedSupplierId] = useState(supplierId ?? '');
  const [quantity, setQuantity] = useState('');
  const [agreedUnitCost, setAgreedUnitCost] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [deliveryTerms, setDeliveryTerms] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');

  const supplierOptions = (suppliers?.items ?? []).map((s) => ({ value: s.id, label: s.name }));

  const handleSubmit = () => {
    if (!quantity || !agreedUnitCost) return;
    const payload: CreateProcurementPayload = {
      supplierId: selectedSupplierId || undefined,
      quantity: Number(quantity),
      agreedUnitCost: Number(agreedUnitCost),
      currency: currency || undefined,
      paymentTerms: paymentTerms || undefined,
      deliveryTerms: deliveryTerms || undefined,
      expectedDeliveryDate: expectedDeliveryDate || undefined,
      notes: notes || undefined,
    };
    createProcurement.mutate(payload, {
      onSuccess: (p) => {
        onOpenChange(false);
        setQuantity('');
        setAgreedUnitCost('');
        setNotes('');
        onCreated?.(p);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>New procurement</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <FormField label="Supplier" htmlFor="proc-supplier">
            <Select id="proc-supplier" value={selectedSupplierId} onChange={(e) => setSelectedSupplierId(e.target.value)} options={supplierOptions} placeholder="Select a supplier" />
          </FormField>

          <div className="grid grid-cols-3 gap-4">
            <FormField label="Quantity" htmlFor="proc-quantity" required>
              <Input id="proc-quantity" type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </FormField>
            <FormField label="Agreed unit cost" htmlFor="proc-cost" required>
              <Input id="proc-cost" type="number" min="0" step="0.01" value={agreedUnitCost} onChange={(e) => setAgreedUnitCost(e.target.value)} />
            </FormField>
            <FormField label="Currency" htmlFor="proc-currency">
              <Input id="proc-currency" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Payment terms" htmlFor="proc-payment">
              <Input id="proc-payment" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="Net 30" />
            </FormField>
            <FormField label="Delivery terms" htmlFor="proc-delivery-terms">
              <Input id="proc-delivery-terms" value={deliveryTerms} onChange={(e) => setDeliveryTerms(e.target.value)} placeholder="FOB Shanghai" />
            </FormField>
          </div>

          <FormField label="Expected delivery date" htmlFor="proc-delivery-date">
            <Input id="proc-delivery-date" type="date" value={expectedDeliveryDate} onChange={(e) => setExpectedDeliveryDate(e.target.value)} />
          </FormField>

          <FormField label="Notes" htmlFor="proc-notes">
            <Textarea id="proc-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </FormField>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!quantity || !agreedUnitCost || createProcurement.isPending}>
            {createProcurement.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create procurement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
