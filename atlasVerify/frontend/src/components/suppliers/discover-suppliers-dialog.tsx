'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { FormField } from '@/components/ui/form-field';
import { useCreateSupplierDiscoverySession, useSupportedSupplierProviders } from '@/hooks';

interface DiscoverSuppliersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DiscoverSuppliersDialog({ open, onOpenChange }: DiscoverSuppliersDialogProps) {
  const router = useRouter();
  const { data: providers } = useSupportedSupplierProviders();
  const createSession = useCreateSupplierDiscoverySession();

  const [provider, setProvider] = useState('');
  const [keyword, setKeyword] = useState('');
  const [country, setCountry] = useState('IN');
  const [category, setCategory] = useState('');

  const providerOptions = (providers ?? []).map((p) => ({ value: p, label: p.charAt(0) + p.slice(1).toLowerCase() }));

  const handleSubmit = () => {
    if (!provider || !keyword.trim()) return;
    createSession.mutate(
      { provider, keyword: keyword.trim(), country: country || undefined, category: category || undefined },
      {
        onSuccess: (session) => {
          onOpenChange(false);
          setKeyword('');
          setCategory('');
          router.push(`/dashboard/suppliers?discoverySession=${session.id}`);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Discover suppliers</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <FormField label="Provider" htmlFor="ds-provider" required>
            <Select
              id="ds-provider"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              options={providerOptions}
              placeholder={providers ? 'Select a provider' : 'Loading providers…'}
              disabled={!providers || providers.length === 0}
            />
          </FormField>
          <FormField label="Keyword" htmlFor="ds-keyword" required hint="Product or category to search suppliers for">
            <Input id="ds-keyword" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="e.g. wireless earbuds" />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Country" htmlFor="ds-country">
              <Input id="ds-country" value={country} onChange={(e) => setCountry(e.target.value.toUpperCase())} maxLength={5} />
            </FormField>
            <FormField label="Category" htmlFor="ds-category">
              <Input id="ds-category" value={category} onChange={(e) => setCategory(e.target.value)} />
            </FormField>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!provider || !keyword.trim() || createSession.isPending}>
            {createSession.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Start discovery
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
