'use client';

import { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { FormField } from '@/components/ui/form-field';
import { useCreateDiscoverySession, useSupportedDiscoveryMarketplaces } from '@/hooks';

export function DiscoverProductsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: marketplaces } = useSupportedDiscoveryMarketplaces();
  const createSession = useCreateDiscoverySession();

  const [marketplace, setMarketplace] = useState('');
  const [country, setCountry] = useState('US');
  const [keywordInput, setKeywordInput] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);

  const addKeyword = () => {
    const trimmed = keywordInput.trim();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords([...keywords, trimmed]);
      setKeywordInput('');
    }
  };

  const handleSubmit = () => {
    if (!marketplace || keywords.length === 0) return;
    createSession.mutate(
      { marketplace, country, keywords },
      {
        onSuccess: () => {
          onOpenChange(false);
          setKeywords([]);
          setMarketplace('');
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Discover products</DialogTitle>
          <DialogDescription>Search a marketplace for new product opportunities by keyword.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <FormField label="Marketplace" htmlFor="disc-marketplace" required>
            <Select
              id="disc-marketplace"
              value={marketplace}
              onChange={(e) => setMarketplace(e.target.value)}
              placeholder="Select a marketplace"
              options={(marketplaces ?? []).map((m) => ({ value: m, label: m }))}
            />
          </FormField>

          <FormField label="Country" htmlFor="disc-country" hint="ISO 3166-1 alpha-2 code">
            <Input id="disc-country" value={country} onChange={(e) => setCountry(e.target.value.toUpperCase())} maxLength={5} />
          </FormField>

          <FormField label="Keywords" htmlFor="disc-keyword" required>
            <div className="flex gap-2">
              <Input
                id="disc-keyword"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addKeyword();
                  }
                }}
                placeholder="wireless earbuds"
              />
              <Button type="button" variant="outline" onClick={addKeyword}>
                Add
              </Button>
            </div>
            {keywords.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {keywords.map((kw) => (
                  <span key={kw} className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs text-foreground">
                    {kw}
                    <button onClick={() => setKeywords(keywords.filter((k) => k !== kw))} aria-label={`Remove ${kw}`}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </FormField>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!marketplace || keywords.length === 0 || createSession.isPending}>
            {createSession.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Start discovery
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
