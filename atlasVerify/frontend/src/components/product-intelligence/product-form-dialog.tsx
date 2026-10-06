'use client';

import { useEffect, useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { FormField } from '@/components/ui/form-field';
import { useCreateProduct, useUpdateProduct } from '@/hooks';
import type { CatalogProduct, CreateCatalogProductPayload, ProductAttribute, ProductSpecification, ProductType } from '@/types';

const PRODUCT_TYPE_OPTIONS: { value: ProductType; label: string }[] = [
  { value: 'PHYSICAL', label: 'Physical' },
  { value: 'DIGITAL', label: 'Digital' },
  { value: 'BUNDLE', label: 'Bundle' },
  { value: 'SUBSCRIPTION', label: 'Subscription' },
];

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: CatalogProduct;
  onCreated?: (product: CatalogProduct) => void;
}

export function ProductFormDialog({ open, onOpenChange, product, onCreated }: ProductFormDialogProps) {
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct(product?.id ?? '');

  const [productName, setProductName] = useState('');
  const [productType, setProductType] = useState<ProductType>('PHYSICAL');
  const [brand, setBrand] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [countryOfOrigin, setCountryOfOrigin] = useState('');
  const [hsCode, setHsCode] = useState('');
  const [purchaseCost, setPurchaseCost] = useState('');
  const [landedCost, setLandedCost] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [images, setImages] = useState<string[]>([]);
  const [imageInput, setImageInput] = useState('');
  const [specifications, setSpecifications] = useState<ProductSpecification[]>([]);
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);

  useEffect(() => {
    if (open) {
      setProductName(product?.productName ?? '');
      setProductType(product?.productType ?? 'PHYSICAL');
      setBrand(product?.brand ?? '');
      setCategoryId(product?.categoryId ?? '');
      setDescription(product?.description ?? '');
      setShortDescription(product?.shortDescription ?? '');
      setSupplierId(product?.supplierId ?? '');
      setCountryOfOrigin(product?.countryOfOrigin ?? '');
      setHsCode(product?.hsCode ?? '');
      setPurchaseCost(product?.purchaseCost?.toString() ?? '');
      setLandedCost(product?.landedCost?.toString() ?? '');
      setSellingPrice(product?.suggestedSellingPrice?.toString() ?? '');
      setCurrency(product?.currency ?? 'USD');
      setImages(product?.images ?? []);
      setSpecifications(product?.specifications ?? []);
      setAttributes(product?.attributes ?? []);
    }
  }, [open, product]);

  const handleSubmit = () => {
    const payload: CreateCatalogProductPayload = {
      productName,
      productType,
      brand: brand || undefined,
      categoryId: categoryId || undefined,
      description: description || undefined,
      shortDescription: shortDescription || undefined,
      supplierId: supplierId || undefined,
      countryOfOrigin: countryOfOrigin || undefined,
      hsCode: hsCode || undefined,
      purchaseCost: purchaseCost ? Number(purchaseCost) : undefined,
      landedCost: landedCost ? Number(landedCost) : undefined,
      suggestedSellingPrice: sellingPrice ? Number(sellingPrice) : undefined,
      currency: currency || undefined,
      images: images.length > 0 ? images : undefined,
      specifications: specifications.length > 0 ? specifications : undefined,
      attributes: attributes.length > 0 ? attributes : undefined,
    };

    if (product) {
      updateProduct.mutate(payload, { onSuccess: () => onOpenChange(false) });
    } else {
      createProduct.mutate(payload, {
        onSuccess: (created) => {
          onOpenChange(false);
          onCreated?.(created);
        },
      });
    }
  };

  const isPending = createProduct.isPending || updateProduct.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{product ? 'Edit product' : 'Add a product'}</DialogTitle>
        </DialogHeader>

        <div className="max-h-[65vh] space-y-5 overflow-y-auto pr-1">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Product name" htmlFor="p-name" required className="sm:col-span-2">
              <Input id="p-name" value={productName} onChange={(e) => setProductName(e.target.value)} />
            </FormField>
            <FormField label="Type" htmlFor="p-type" required>
              <Select id="p-type" value={productType} onChange={(e) => setProductType(e.target.value as ProductType)} options={PRODUCT_TYPE_OPTIONS} />
            </FormField>
            <FormField label="Brand" htmlFor="p-brand">
              <Input id="p-brand" value={brand} onChange={(e) => setBrand(e.target.value)} />
            </FormField>
            <FormField label="Category" htmlFor="p-category">
              <Input id="p-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} />
            </FormField>
            <FormField label="Supplier ID" htmlFor="p-supplier">
              <Input id="p-supplier" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} />
            </FormField>
            <FormField label="Country of origin" htmlFor="p-origin">
              <Input id="p-origin" value={countryOfOrigin} onChange={(e) => setCountryOfOrigin(e.target.value.toUpperCase())} maxLength={5} />
            </FormField>
            <FormField label="HS code" htmlFor="p-hscode">
              <Input id="p-hscode" value={hsCode} onChange={(e) => setHsCode(e.target.value)} />
            </FormField>
          </div>

          <FormField label="Short description" htmlFor="p-short-desc">
            <Input id="p-short-desc" value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} />
          </FormField>
          <FormField label="Description" htmlFor="p-desc">
            <Textarea id="p-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-4">
            <FormField label="Purchase cost" htmlFor="p-purchase-cost">
              <Input id="p-purchase-cost" type="number" min="0" step="0.01" value={purchaseCost} onChange={(e) => setPurchaseCost(e.target.value)} />
            </FormField>
            <FormField label="Landed cost" htmlFor="p-landed-cost">
              <Input id="p-landed-cost" type="number" min="0" step="0.01" value={landedCost} onChange={(e) => setLandedCost(e.target.value)} />
            </FormField>
            <FormField label="Selling price" htmlFor="p-selling-price">
              <Input id="p-selling-price" type="number" min="0" step="0.01" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} />
            </FormField>
            <FormField label="Currency" htmlFor="p-currency">
              <Input id="p-currency" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} />
            </FormField>
          </div>

          <FormField label="Images" htmlFor="p-image-input">
            <div className="flex gap-2">
              <Input id="p-image-input" value={imageInput} onChange={(e) => setImageInput(e.target.value)} placeholder="https://…" />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (imageInput.trim()) {
                    setImages([...images, imageInput.trim()]);
                    setImageInput('');
                  }
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {images.length > 0 && (
              <ul className="mt-2 space-y-1">
                {images.map((img, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 rounded bg-secondary px-2 py-1 text-xs text-foreground">
                    <span className="truncate">{img}</span>
                    <button onClick={() => setImages(images.filter((_, idx) => idx !== i))} aria-label="Remove image">
                      <X className="h-3 w-3 shrink-0" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </FormField>

          <RepeatableRows
            label="Specifications"
            rows={specifications}
            onChange={setSpecifications}
            fields={['key', 'value', 'unit']}
            makeEmpty={() => ({ key: '', value: '', unit: '' })}
          />

          <RepeatableRows label="Attributes" rows={attributes} onChange={setAttributes} fields={['key', 'value']} makeEmpty={() => ({ key: '', value: '' })} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!productName || isPending}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {product ? 'Save changes' : 'Create product'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RepeatableRows<T extends object>({
  label,
  rows,
  onChange,
  fields,
  makeEmpty,
}: {
  label: string;
  rows: T[];
  onChange: (rows: T[]) => void;
  fields: (keyof T & string)[];
  makeEmpty: () => T;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange([...rows, makeEmpty()])}>
          <Plus className="h-3.5 w-3.5" />
          Add row
        </Button>
      </div>
      {rows.map((row, i) => (
        <div key={i} className="flex items-center gap-2">
          {fields.map((field) => (
            <Input
              key={field}
              placeholder={field}
              value={(row[field] as string | undefined) ?? ''}
              onChange={(e) => {
                const next = [...rows];
                next[i] = { ...next[i], [field]: e.target.value };
                onChange(next);
              }}
            />
          ))}
          <button onClick={() => onChange(rows.filter((_, idx) => idx !== i))} aria-label="Remove row" className="shrink-0 text-muted-foreground hover:text-danger">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
