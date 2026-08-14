'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { FormField } from '@/components/ui/form-field';
import { useMarketplaceAccounts, useMarketplaceProviders, useRegisterChannel } from '@/hooks';
import type { ChannelRegistration, ChannelType, RegisterChannelPayload } from '@/types';

const TYPE_OPTIONS: { value: ChannelType; label: string }[] = [
  { value: 'MARKETPLACE', label: 'Marketplace' },
  { value: 'D2C_STORE', label: 'D2C store' },
  { value: 'B2B_PORTAL', label: 'B2B portal' },
  { value: 'RETAIL_POS', label: 'Retail / POS' },
  { value: 'SOCIAL_COMMERCE', label: 'Social commerce' },
  { value: 'CUSTOM', label: 'Custom' },
];

interface RegisterChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (channel: ChannelRegistration) => void;
}

export function RegisterChannelDialog({ open, onOpenChange, onCreated }: RegisterChannelDialogProps) {
  const registerChannel = useRegisterChannel();
  const { data: providers } = useMarketplaceProviders();
  const { data: accounts } = useMarketplaceAccounts({ limit: 100 });

  const [channelType, setChannelType] = useState<ChannelType>('MARKETPLACE');
  const [channelKey, setChannelKey] = useState('');
  const [name, setName] = useState('');
  const [providerKey, setProviderKey] = useState('');
  const [marketplaceAccountId, setMarketplaceAccountId] = useState('');

  const providerOptions = (providers ?? []).map((p) => ({ value: p.providerKey, label: p.displayName }));
  const accountOptions = (accounts?.items ?? []).map((a) => ({ value: a.id, label: a.accountName }));
  const isMarketplace = channelType === 'MARKETPLACE';

  const canSubmit = !!channelKey.trim() && !!name.trim();

  const handleSubmit = () => {
    if (!canSubmit) return;
    const payload: Omit<RegisterChannelPayload, 'workspaceId'> = {
      channelType,
      channelKey: channelKey.trim(),
      name: name.trim(),
      providerKey: isMarketplace && providerKey ? providerKey : undefined,
      marketplaceAccountId: isMarketplace && marketplaceAccountId ? marketplaceAccountId : undefined,
    };
    registerChannel.mutate(payload, {
      onSuccess: (channel) => {
        onOpenChange(false);
        setChannelKey('');
        setName('');
        setProviderKey('');
        setMarketplaceAccountId('');
        onCreated?.(channel);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Register channel</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <FormField label="Channel type" htmlFor="ch-type" required>
            <Select id="ch-type" value={channelType} onChange={(e) => setChannelType(e.target.value as ChannelType)} options={TYPE_OPTIONS} />
          </FormField>
          <FormField label="Name" htmlFor="ch-name" required>
            <Input id="ch-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Amazon India Storefront" />
          </FormField>
          <FormField label="Channel key" htmlFor="ch-key" required hint="Unique identifier for this channel">
            <Input id="ch-key" value={channelKey} onChange={(e) => setChannelKey(e.target.value)} placeholder="e.g. amazon-in-main" />
          </FormField>
          {isMarketplace && (
            <>
              <FormField label="Provider" htmlFor="ch-provider">
                <Select id="ch-provider" value={providerKey} onChange={(e) => setProviderKey(e.target.value)} options={providerOptions} placeholder="Select a provider" />
              </FormField>
              <FormField label="Marketplace account" htmlFor="ch-account">
                <Select id="ch-account" value={marketplaceAccountId} onChange={(e) => setMarketplaceAccountId(e.target.value)} options={accountOptions} placeholder="Select an account" />
              </FormField>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || registerChannel.isPending}>
            {registerChannel.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Register
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
