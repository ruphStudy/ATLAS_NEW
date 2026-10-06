'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/ui/form-field';
import { useCreateSupplier, useUpdateSupplier } from '@/hooks';
import type { CreateSupplierPayload, Supplier } from '@/types';

interface SupplierFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: Supplier;
  onCreated?: (supplier: Supplier) => void;
}

export function SupplierFormDialog({ open, onOpenChange, supplier, onCreated }: SupplierFormDialogProps) {
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier(supplier?.id ?? '');

  const [name, setName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [website, setWebsite] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [categories, setCategories] = useState('');
  const [minOrderQuantity, setMinOrderQuantity] = useState('');
  const [avgLeadTimeDays, setAvgLeadTimeDays] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      setName(supplier?.name ?? '');
      setLegalName(supplier?.legalName ?? '');
      setCountry(supplier?.country ?? '');
      setCity(supplier?.city ?? '');
      setWebsite(supplier?.website ?? '');
      setContactEmail(supplier?.contactEmail ?? '');
      setContactPhone(supplier?.contactPhone ?? '');
      setCategories((supplier?.categories ?? []).join(', '));
      setMinOrderQuantity(supplier?.minOrderQuantity?.toString() ?? '');
      setAvgLeadTimeDays(supplier?.avgLeadTimeDays?.toString() ?? '');
      setNotes(supplier?.notes ?? '');
    }
  }, [open, supplier]);

  const handleSubmit = () => {
    const payload: CreateSupplierPayload = {
      name,
      legalName: legalName || undefined,
      country: country || undefined,
      city: city || undefined,
      website: website || undefined,
      contactEmail: contactEmail || undefined,
      contactPhone: contactPhone || undefined,
      categories: categories.trim() ? categories.split(',').map((c) => c.trim()).filter(Boolean) : undefined,
      minOrderQuantity: minOrderQuantity ? Number(minOrderQuantity) : undefined,
      avgLeadTimeDays: avgLeadTimeDays ? Number(avgLeadTimeDays) : undefined,
      notes: notes || undefined,
    };

    if (supplier) {
      updateSupplier.mutate(payload, { onSuccess: () => onOpenChange(false) });
    } else {
      createSupplier.mutate(payload, {
        onSuccess: (created) => {
          onOpenChange(false);
          onCreated?.(created);
        },
      });
    }
  };

  const isPending = createSupplier.isPending || updateSupplier.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{supplier ? 'Edit supplier' : 'Add a supplier'}</DialogTitle>
        </DialogHeader>

        <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Supplier name" htmlFor="s-name" required className="sm:col-span-2">
              <Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} />
            </FormField>
            <FormField label="Legal name" htmlFor="s-legal">
              <Input id="s-legal" value={legalName} onChange={(e) => setLegalName(e.target.value)} />
            </FormField>
            <FormField label="Country" htmlFor="s-country" hint="ISO 3166-1 alpha-2">
              <Input id="s-country" value={country} onChange={(e) => setCountry(e.target.value.toUpperCase())} maxLength={5} />
            </FormField>
            <FormField label="City" htmlFor="s-city">
              <Input id="s-city" value={city} onChange={(e) => setCity(e.target.value)} />
            </FormField>
            <FormField label="Website" htmlFor="s-website">
              <Input id="s-website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" />
            </FormField>
            <FormField label="Contact email" htmlFor="s-email">
              <Input id="s-email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
            </FormField>
            <FormField label="Contact phone" htmlFor="s-phone">
              <Input id="s-phone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
            </FormField>
          </div>

          <FormField label="Categories" htmlFor="s-categories" hint="Comma-separated">
            <Input id="s-categories" value={categories} onChange={(e) => setCategories(e.target.value)} placeholder="Electronics, Consumer Goods" />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Min order quantity" htmlFor="s-moq">
              <Input id="s-moq" type="number" min="0" value={minOrderQuantity} onChange={(e) => setMinOrderQuantity(e.target.value)} />
            </FormField>
            <FormField label="Avg lead time (days)" htmlFor="s-leadtime">
              <Input id="s-leadtime" type="number" min="0" value={avgLeadTimeDays} onChange={(e) => setAvgLeadTimeDays(e.target.value)} />
            </FormField>
          </div>

          <FormField label="Notes" htmlFor="s-notes">
            <Textarea id="s-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </FormField>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name || isPending}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {supplier ? 'Save changes' : 'Create supplier'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
