'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { useCalculateProductCost } from '@/hooks';
import { formatCurrency } from '@/lib/utils';
import type { CalculateProductCostPayload } from '@/types';

interface LandedCostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rfqId?: string;
  rfqSupplierId?: string;
  supplierId?: string;
  productId?: string;
  initialUnitPrice?: number;
  initialQuantity?: number;
  initialMoq?: number;
  initialCurrency?: string;
}

export function LandedCostDialog({
  open,
  onOpenChange,
  rfqId,
  rfqSupplierId,
  supplierId,
  productId,
  initialUnitPrice,
  initialQuantity,
  initialMoq,
  initialCurrency,
}: LandedCostDialogProps) {
  const calculate = useCalculateProductCost();

  const [supplierUnitPrice, setSupplierUnitPrice] = useState(initialUnitPrice?.toString() ?? '');
  const [quantity, setQuantity] = useState(initialQuantity?.toString() ?? '');
  const [moq, setMoq] = useState(initialMoq?.toString() ?? '');
  const [shippingCost, setShippingCost] = useState('');
  const [freightCost, setFreightCost] = useState('');
  const [customsDutyPercent, setCustomsDutyPercent] = useState('');
  const [importCharges, setImportCharges] = useState('');
  const [packagingCostPerUnit, setPackagingCostPerUnit] = useState('');
  const [labelingCostPerUnit, setLabelingCostPerUnit] = useState('');
  const [inspectionCost, setInspectionCost] = useState('');
  const [miscCharges, setMiscCharges] = useState('');
  const [sourceCurrency, setSourceCurrency] = useState(initialCurrency ?? 'USD');
  const [targetCurrency, setTargetCurrency] = useState(initialCurrency ?? 'USD');
  const [exchangeRate, setExchangeRate] = useState('1');
  const [taxPercent, setTaxPercent] = useState('');

  const canSubmit = !!supplierUnitPrice && !!quantity;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const payload: CalculateProductCostPayload = {
      rfqId,
      rfqSupplierId,
      supplierId,
      productId,
      supplierUnitPrice: Number(supplierUnitPrice),
      quantity: Number(quantity),
      moq: moq ? Number(moq) : undefined,
      shippingCost: shippingCost ? Number(shippingCost) : undefined,
      freightCost: freightCost ? Number(freightCost) : undefined,
      customsDutyPercent: customsDutyPercent ? Number(customsDutyPercent) : undefined,
      importCharges: importCharges ? Number(importCharges) : undefined,
      packagingCostPerUnit: packagingCostPerUnit ? Number(packagingCostPerUnit) : undefined,
      labelingCostPerUnit: labelingCostPerUnit ? Number(labelingCostPerUnit) : undefined,
      inspectionCost: inspectionCost ? Number(inspectionCost) : undefined,
      miscCharges: miscCharges ? Number(miscCharges) : undefined,
      sourceCurrency: sourceCurrency || undefined,
      targetCurrency: targetCurrency || undefined,
      exchangeRate: exchangeRate ? Number(exchangeRate) : undefined,
      taxPercent: taxPercent ? Number(taxPercent) : undefined,
    };
    calculate.mutate(payload, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Calculate landed cost</DialogTitle>
        </DialogHeader>

        <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
          <div className="grid grid-cols-3 gap-4">
            <FormField label="Unit price" htmlFor="cost-unit-price" required>
              <Input id="cost-unit-price" type="number" min="0" step="0.01" value={supplierUnitPrice} onChange={(e) => setSupplierUnitPrice(e.target.value)} />
            </FormField>
            <FormField label="Quantity" htmlFor="cost-quantity" required>
              <Input id="cost-quantity" type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </FormField>
            <FormField label="MOQ" htmlFor="cost-moq">
              <Input id="cost-moq" type="number" min="0" value={moq} onChange={(e) => setMoq(e.target.value)} />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Shipping cost" htmlFor="cost-shipping">
              <Input id="cost-shipping" type="number" min="0" step="0.01" value={shippingCost} onChange={(e) => setShippingCost(e.target.value)} />
            </FormField>
            <FormField label="Freight cost" htmlFor="cost-freight">
              <Input id="cost-freight" type="number" min="0" step="0.01" value={freightCost} onChange={(e) => setFreightCost(e.target.value)} />
            </FormField>
            <FormField label="Customs duty %" htmlFor="cost-duty">
              <Input id="cost-duty" type="number" min="0" max="100" step="0.1" value={customsDutyPercent} onChange={(e) => setCustomsDutyPercent(e.target.value)} />
            </FormField>
            <FormField label="Import charges" htmlFor="cost-import">
              <Input id="cost-import" type="number" min="0" step="0.01" value={importCharges} onChange={(e) => setImportCharges(e.target.value)} />
            </FormField>
            <FormField label="Packaging cost / unit" htmlFor="cost-packaging">
              <Input id="cost-packaging" type="number" min="0" step="0.01" value={packagingCostPerUnit} onChange={(e) => setPackagingCostPerUnit(e.target.value)} />
            </FormField>
            <FormField label="Labeling cost / unit" htmlFor="cost-labeling">
              <Input id="cost-labeling" type="number" min="0" step="0.01" value={labelingCostPerUnit} onChange={(e) => setLabelingCostPerUnit(e.target.value)} />
            </FormField>
            <FormField label="Inspection cost" htmlFor="cost-inspection">
              <Input id="cost-inspection" type="number" min="0" step="0.01" value={inspectionCost} onChange={(e) => setInspectionCost(e.target.value)} />
            </FormField>
            <FormField label="Misc charges" htmlFor="cost-misc">
              <Input id="cost-misc" type="number" min="0" step="0.01" value={miscCharges} onChange={(e) => setMiscCharges(e.target.value)} />
            </FormField>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <FormField label="Source currency" htmlFor="cost-source-currency">
              <Input id="cost-source-currency" value={sourceCurrency} onChange={(e) => setSourceCurrency(e.target.value.toUpperCase())} maxLength={3} />
            </FormField>
            <FormField label="Target currency" htmlFor="cost-target-currency">
              <Input id="cost-target-currency" value={targetCurrency} onChange={(e) => setTargetCurrency(e.target.value.toUpperCase())} maxLength={3} />
            </FormField>
            <FormField label="Exchange rate" htmlFor="cost-fx">
              <Input id="cost-fx" type="number" min="0" step="0.0001" value={exchangeRate} onChange={(e) => setExchangeRate(e.target.value)} />
            </FormField>
            <FormField label="Tax %" htmlFor="cost-tax">
              <Input id="cost-tax" type="number" min="0" max="100" step="0.1" value={taxPercent} onChange={(e) => setTaxPercent(e.target.value)} />
            </FormField>
          </div>

          {calculate.data && (
            <div className="rounded-[var(--radius)] border border-border bg-secondary/50 p-3 text-sm">
              <p className="font-medium text-foreground">
                Total landed cost: {formatCurrency(calculate.data.totalLandedCost, calculate.data.targetCurrency)}
              </p>
              <p className="text-muted-foreground">Cost per unit: {formatCurrency(calculate.data.costPerUnit, calculate.data.targetCurrency)}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || calculate.isPending}>
            {calculate.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Calculate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
