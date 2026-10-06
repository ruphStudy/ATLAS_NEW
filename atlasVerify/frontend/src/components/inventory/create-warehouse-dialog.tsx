'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { FormField } from '@/components/ui/form-field';
import { useCreateWarehouse } from '@/hooks';
import type { CreateWarehousePayload, Warehouse, WarehouseType } from '@/types';

const TYPE_OPTIONS: { value: WarehouseType; label: string }[] = [
  { value: 'OWN', label: 'Own' },
  { value: 'RENTED', label: 'Rented' },
  { value: 'THIRD_PARTY', label: 'Third party' },
  { value: 'MARKETPLACE', label: 'Marketplace' },
  { value: 'VIRTUAL', label: 'Virtual' },
];

interface CreateWarehouseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (warehouse: Warehouse) => void;
}

export function CreateWarehouseDialog({ open, onOpenChange, onCreated }: CreateWarehouseDialogProps) {
  const createWarehouse = useCreateWarehouse();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<WarehouseType>('OWN');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [currency, setCurrency] = useState('');

  const canSubmit = !!code.trim() && !!name.trim();

  const handleSubmit = () => {
    if (!canSubmit) return;
    const payload: CreateWarehousePayload = { code: code.trim(), name: name.trim(), type, city: city || undefined, country: country || undefined, currency: currency || undefined };
    createWarehouse.mutate(payload, {
      onSuccess: (w) => {
        onOpenChange(false);
        setCode('');
        setName('');
        setCity('');
        setCountry('');
        setCurrency('');
        onCreated?.(w);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Add warehouse</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Code" htmlFor="wh-code" required>
              <Input id="wh-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
            </FormField>
            <FormField label="Type" htmlFor="wh-type" required>
              <Select id="wh-type" value={type} onChange={(e) => setType(e.target.value as WarehouseType)} options={TYPE_OPTIONS} />
            </FormField>
          </div>
          <FormField label="Name" htmlFor="wh-name" required>
            <Input id="wh-name" value={name} onChange={(e) => setName(e.target.value)} />
          </FormField>
          <div className="grid grid-cols-3 gap-4">
            <FormField label="City" htmlFor="wh-city">
              <Input id="wh-city" value={city} onChange={(e) => setCity(e.target.value)} />
            </FormField>
            <FormField label="Country" htmlFor="wh-country">
              <Input id="wh-country" value={country} onChange={(e) => setCountry(e.target.value.toUpperCase())} maxLength={5} />
            </FormField>
            <FormField label="Currency" htmlFor="wh-currency">
              <Input id="wh-currency" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} />
            </FormField>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || createWarehouse.isPending}>
            {createWarehouse.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create warehouse
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
