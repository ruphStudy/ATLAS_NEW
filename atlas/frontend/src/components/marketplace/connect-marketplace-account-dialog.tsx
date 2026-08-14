'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { FormField } from '@/components/ui/form-field';
import { useCreateMarketplaceAccount, useMarketplaceProviders } from '@/hooks';
import type { CreateMarketplaceAccountPayload, MarketplaceAccount } from '@/types';

interface ConnectMarketplaceAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (account: MarketplaceAccount) => void;
}

export function ConnectMarketplaceAccountDialog({ open, onOpenChange, onCreated }: ConnectMarketplaceAccountDialogProps) {
  const { data: providers } = useMarketplaceProviders();
  const createAccount = useCreateMarketplaceAccount();

  const [providerKey, setProviderKey] = useState('');
  const [marketplaceKey, setMarketplaceKey] = useState('');
  const [accountName, setAccountName] = useState('');
  const [externalAccountId, setExternalAccountId] = useState('');
  const [country, setCountry] = useState('');
  const [currency, setCurrency] = useState('');

  const providerOptions = (providers ?? []).filter((p) => p.isActive).map((p) => ({ value: p.providerKey, label: p.displayName }));
  const selectedProvider = providers?.find((p) => p.providerKey === providerKey);
  const marketplaceOptions = (selectedProvider?.supportedMarketplaces ?? []).map((m) => ({ value: m, label: m }));

  const canSubmit = !!providerKey && !!marketplaceKey && !!accountName.trim() && !!externalAccountId.trim();

  const handleSubmit = () => {
    if (!canSubmit) return;
    const payload: CreateMarketplaceAccountPayload = {
      providerKey,
      marketplaceKey,
      accountName: accountName.trim(),
      externalAccountId: externalAccountId.trim(),
      country: country || undefined,
      currency: currency || undefined,
    };
    createAccount.mutate(payload, {
      onSuccess: (account) => {
        onOpenChange(false);
        setProviderKey('');
        setMarketplaceKey('');
        setAccountName('');
        setExternalAccountId('');
        setCountry('');
        setCurrency('');
        onCreated?.(account);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Connect marketplace account</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <FormField label="Provider" htmlFor="conn-provider" required>
            <Select
              id="conn-provider"
              value={providerKey}
              onChange={(e) => { setProviderKey(e.target.value); setMarketplaceKey(''); }}
              options={providerOptions}
              placeholder={providers ? 'Select a provider' : 'Loading providers…'}
              disabled={!providers || providers.length === 0}
            />
          </FormField>
          <FormField label="Marketplace" htmlFor="conn-marketplace" required>
            <Select
              id="conn-marketplace"
              value={marketplaceKey}
              onChange={(e) => setMarketplaceKey(e.target.value)}
              options={marketplaceOptions}
              placeholder={providerKey ? 'Select a marketplace' : 'Select a provider first'}
              disabled={!providerKey}
            />
          </FormField>
          <FormField label="Account name" htmlFor="conn-name" required>
            <Input id="conn-name" value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="e.g. Main seller account" />
          </FormField>
          <FormField label="External account ID" htmlFor="conn-external-id" required hint="Seller/merchant ID as it appears on the marketplace">
            <Input id="conn-external-id" value={externalAccountId} onChange={(e) => setExternalAccountId(e.target.value)} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Country" htmlFor="conn-country">
              <Input id="conn-country" value={country} onChange={(e) => setCountry(e.target.value.toUpperCase())} maxLength={5} />
            </FormField>
            <FormField label="Currency" htmlFor="conn-currency">
              <Input id="conn-currency" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} />
            </FormField>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || createAccount.isPending}>
            {createAccount.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Connect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
