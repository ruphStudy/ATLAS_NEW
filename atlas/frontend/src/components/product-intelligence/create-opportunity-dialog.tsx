'use client';

import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/ui/form-field';
import { useCountries, useCreateOpportunity, useMarketplaceProviders, useSupportedDiscoveryMarketplaces } from '@/hooks';
import { useRouter } from 'next/navigation';

export function CreateOpportunityDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const createOpportunity = useCreateOpportunity();
  const router = useRouter();

  // Same data sources as the Discover Products dialog — no duplicated
  // marketplace/country metadata.
  const { data: marketplaces } = useSupportedDiscoveryMarketplaces();
  const { data: providers } = useMarketplaceProviders();
  const { data: countriesResult } = useCountries({ limit: 100 });

  const [keyword, setKeyword] = useState('');
  const [provider, setProvider] = useState('');
  const [country, setCountry] = useState('');
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');

  const selectedProvider = providers?.find((p) => p.providerKey === provider);

  const marketplaceOptions = (marketplaces ?? []).map((code) => ({
    value: code,
    label: providers?.find((p) => p.providerKey === code)?.displayName ?? code,
  }));

  const countryNameByCode = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of countriesResult?.items ?? []) map.set(c.code, c.name);
    return map;
  }, [countriesResult]);

  // Country options are exactly this provider's own supportedCountries —
  // real provider metadata, never a generic/unfiltered country list.
  const countryOptions = (selectedProvider?.supportedCountries ?? []).map((code) => {
    const name = countryNameByCode.get(code);
    return { value: code, label: name ? `${name} (${code})` : code };
  });

  const handleProviderChange = (value: string) => {
    setProvider(value);
    setCountry('');
  };

  const handleSubmit = () => {
    if (!keyword || !provider || !country) return;
    // Opportunity.marketplace is the existing combined provider+country code
    // (e.g. "AMAZON_US") — the same convention Discovery itself already
    // produces; the dropdowns just remove the need to type it by hand.
    const marketplace = `${provider}_${country}`;
    createOpportunity.mutate(
      { keyword, marketplace, country, category: category || undefined, notes: notes || undefined },
      {
        onSuccess: (opportunity) => {
          onOpenChange(false);
          router.push(`/opportunities/${opportunity.id}`);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Add an opportunity manually</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <FormField label="Keyword / product name" htmlFor="opp-keyword" required>
            <Input id="opp-keyword" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="wireless earbuds" />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Marketplace" htmlFor="opp-marketplace" required>
              <Select
                id="opp-marketplace"
                value={provider}
                onChange={(e) => handleProviderChange(e.target.value)}
                placeholder="Select a marketplace"
                options={marketplaceOptions}
                disabled={!marketplaces || marketplaces.length === 0}
              />
            </FormField>
            <FormField label="Country" htmlFor="opp-country" required>
              <Select
                id="opp-country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder={provider ? 'Select a country' : 'Select a marketplace first'}
                options={countryOptions}
                disabled={!provider || countryOptions.length === 0}
              />
            </FormField>
          </div>
          <FormField label="Category" htmlFor="opp-category">
            <Input id="opp-category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Electronics" />
          </FormField>
          <FormField label="Notes" htmlFor="opp-notes">
            <Textarea id="opp-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!keyword || !provider || !country || createOpportunity.isPending}>
            {createOpportunity.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
