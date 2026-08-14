'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { FormField } from '@/components/ui/form-field';
import { useCreateUniversalListing, useProducts } from '@/hooks';
import type { UniversalListing } from '@/types';

interface CreateUniversalListingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (listing: UniversalListing) => void;
  catalogProductId?: string;
}

export function CreateUniversalListingDialog({ open, onOpenChange, onCreated, catalogProductId }: CreateUniversalListingDialogProps) {
  const createListing = useCreateUniversalListing();
  const { data: products } = useProducts({ limit: 100 });

  const [selectedProductId, setSelectedProductId] = useState(catalogProductId ?? '');

  const productOptions = (products?.data ?? []).map((p) => ({ value: p.id, label: `${p.productName} (${p.catalogSku})` }));

  const handleSubmit = () => {
    if (!selectedProductId) return;
    createListing.mutate(
      { catalogProductId: selectedProductId },
      {
        onSuccess: (listing) => {
          onOpenChange(false);
          setSelectedProductId(catalogProductId ?? '');
          onCreated?.(listing);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Create listing</DialogTitle>
        </DialogHeader>

        <FormField label="Catalog product" htmlFor="listing-product" required>
          <Select
            id="listing-product"
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            options={productOptions}
            placeholder={products ? 'Select a product' : 'Loading products…'}
            disabled={!!catalogProductId || !products}
          />
        </FormField>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedProductId || createListing.isPending}>
            {createListing.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
