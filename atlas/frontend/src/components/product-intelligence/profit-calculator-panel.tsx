'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import { useCreateProfitCalculation, useLatestProfitCalculation } from '@/hooks';
import type { ProfitProvider } from '@/types';

const PROVIDER_OPTIONS: { value: ProfitProvider; label: string }[] = [
  { value: 'AMAZON_FBA', label: 'Amazon FBA' },
  { value: 'AMAZON_FBM', label: 'Amazon FBM' },
  { value: 'MANUAL', label: 'Manual' },
];

export function ProfitCalculatorPanel({ opportunityId }: { opportunityId: string }) {
  const { data: latest, isLoading } = useLatestProfitCalculation(opportunityId);
  const createCalculation = useCreateProfitCalculation(opportunityId);

  const [provider, setProvider] = useState<ProfitProvider>('AMAZON_FBA');
  const [productCost, setProductCost] = useState('');
  const [shippingCost, setShippingCost] = useState('');
  const [packagingCost, setPackagingCost] = useState('');
  const [advertisingCost, setAdvertisingCost] = useState('');
  const [taxRate, setTaxRate] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');

  useEffect(() => {
    if (latest) {
      setProvider(latest.provider);
      setProductCost(latest.productCost?.toString() ?? '');
      setShippingCost(latest.shippingCost?.toString() ?? '');
      setPackagingCost(latest.packagingCost?.toString() ?? '');
      setAdvertisingCost(latest.advertisingCost?.toString() ?? '');
      setSellingPrice(latest.sellingPrice?.toString() ?? '');
    }
  }, [latest]);

  const handleCalculate = () => {
    createCalculation.mutate({
      provider,
      productCost: productCost ? Number(productCost) : undefined,
      shippingCost: shippingCost ? Number(shippingCost) : undefined,
      packagingCost: packagingCost ? Number(packagingCost) : undefined,
      advertisingCost: advertisingCost ? Number(advertisingCost) : undefined,
      taxRate: taxRate ? Number(taxRate) : undefined,
      sellingPrice: sellingPrice ? Number(sellingPrice) : undefined,
    });
  };

  if (isLoading) return <Skeleton className="h-80 w-full" />;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Inputs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField label="Provider" htmlFor="pc-provider">
            <Select id="pc-provider" value={provider} onChange={(e) => setProvider(e.target.value as ProfitProvider)} options={PROVIDER_OPTIONS} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Product cost" htmlFor="pc-product-cost">
              <Input id="pc-product-cost" type="number" min="0" step="0.01" value={productCost} onChange={(e) => setProductCost(e.target.value)} />
            </FormField>
            <FormField label="Shipping cost" htmlFor="pc-shipping-cost">
              <Input id="pc-shipping-cost" type="number" min="0" step="0.01" value={shippingCost} onChange={(e) => setShippingCost(e.target.value)} />
            </FormField>
            <FormField label="Packaging cost" htmlFor="pc-packaging-cost">
              <Input id="pc-packaging-cost" type="number" min="0" step="0.01" value={packagingCost} onChange={(e) => setPackagingCost(e.target.value)} />
            </FormField>
            <FormField label="Advertising cost" htmlFor="pc-advertising-cost">
              <Input id="pc-advertising-cost" type="number" min="0" step="0.01" value={advertisingCost} onChange={(e) => setAdvertisingCost(e.target.value)} />
            </FormField>
            <FormField label="Tax rate" htmlFor="pc-tax-rate" hint="Decimal, e.g. 0.08">
              <Input id="pc-tax-rate" type="number" min="0" step="0.001" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
            </FormField>
            <FormField label="Selling price" htmlFor="pc-selling-price">
              <Input id="pc-selling-price" type="number" min="0" step="0.01" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} />
            </FormField>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleCalculate} disabled={createCalculation.isPending}>
              {createCalculation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Calculate
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
        </CardHeader>
        <CardContent>
          {!latest ? (
            <p className="text-sm text-muted-foreground">Run a calculation to see profit results.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <Result label="Total landed cost" value={latest.totalLandedCost} />
              <Result label="Marketplace fees" value={latest.marketplaceFees} />
              <Result label="FBA fees" value={latest.fbaFees} />
              <Result label="Gross profit" value={latest.grossProfit} />
              <Result label="Net profit" value={latest.netProfit} emphasize />
              <Result label="Break-even price" value={latest.breakEvenPrice} />
              <Result label="Profit margin" value={latest.profitMargin} suffix="%" />
              <Result label="ROI" value={latest.roi} suffix="%" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Result({ label, value, suffix, emphasize }: { label: string; value?: number | null; suffix?: string; emphasize?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={emphasize ? 'text-lg font-bold text-foreground' : 'text-sm font-semibold text-foreground'}>
        {value === undefined || value === null ? '—' : suffix ? `${value.toFixed(1)}${suffix}` : formatCurrency(value)}
      </p>
    </div>
  );
}
