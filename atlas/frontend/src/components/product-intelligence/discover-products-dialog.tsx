'use client';

import { useMemo, useState } from 'react';
import { Barcode, Loader2, Sparkles, TrendingUp, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { FormField } from '@/components/ui/form-field';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/states';
import {
  useCountries,
  useCreateDiscoverySession,
  useMarketplaceProviders,
  useSupportedDiscoveryMarketplaces,
  useTrendingConcepts,
} from '@/hooks';
import type { TrendConcept } from '@/types';

type DiscoveryDialogTab = 'trending' | 'category' | 'keyword' | 'asin';

export function DiscoverProductsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [tab, setTab] = useState<DiscoveryDialogTab>('trending');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Product Discovery</DialogTitle>
          <DialogDescription>Find new product opportunities across marketplaces.</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as DiscoveryDialogTab)}>
          <TabsList>
            <TabsTrigger value="trending">Explore Trending</TabsTrigger>
            <TabsTrigger value="category" disabled>
              Category Discovery
            </TabsTrigger>
            <TabsTrigger value="keyword">Keyword Research</TabsTrigger>
            <TabsTrigger value="asin" disabled>
              Analyze Product / ASIN
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trending">
            <ExploreTrendingTab />
          </TabsContent>

          <TabsContent value="category">
            <EmptyState
              icon={Sparkles}
              title="Coming next"
              description="Category-first browsing will appear here once the trend/category discovery flow is connected."
            />
          </TabsContent>

          <TabsContent value="keyword">
            <KeywordResearchTab onDone={() => onOpenChange(false)} onCancel={() => onOpenChange(false)} />
          </TabsContent>

          <TabsContent value="asin">
            <EmptyState
              icon={Barcode}
              title="Coming next"
              description="Analyzing a specific product by ASIN will appear here once that discovery mode is implemented."
            />
          </TabsContent>
        </Tabs>

        {tab !== 'keyword' && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Explore Trending — the marketplace-neutral cold-start path (Prompt 6).
 * Purely read-only: shows whatever a TREND_COLD_START discovery session
 * has already persisted via GET /product-taxonomy/trending-concepts. Never
 * triggers a provider call itself, never renders a composite "Top
 * Trending Product" ranking — each row is one concept with its own real
 * evidence and an evidence-driven state, nothing invented.
 */
function ExploreTrendingTab() {
  const { data: concepts, isLoading, isError } = useTrendingConcepts(20);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (isError) {
    return <p className="py-8 text-center text-sm text-danger">Could not load trending concepts.</p>;
  }

  if (!concepts || concepts.length === 0) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="No trending concepts yet"
        description="Cold-start trend discovery hasn't produced any real evidence yet. This list will fill in once a trend-discovery run has collected attention data from Wikipedia."
      />
    );
  }

  return (
    <div className="max-h-[26rem] overflow-y-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Concept</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Attention growth</TableHead>
            <TableHead>Search demand</TableHead>
            <TableHead>State</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {concepts.map((concept) => (
            <TrendConceptRow key={concept.conceptId} concept={concept} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function TrendConceptRow({ concept }: { concept: TrendConcept }) {
  const { attentionSignal, searchDemandSignal } = concept;

  return (
    <TableRow>
      <TableCell className="text-sm font-medium text-foreground">{concept.conceptName}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{concept.categoryName ?? '—'}</TableCell>
      <TableCell>
        {attentionSignal?.value != null ? (
          <div className="text-sm text-foreground">
            {attentionSignal.value > 0 ? '+' : ''}
            {attentionSignal.value}
            {attentionSignal.unit === 'percent_change_30d' ? '%' : ''}
            <p className="text-xs text-muted-foreground">source: {attentionSignal.source}</p>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell>
        {searchDemandSignal?.value != null ? (
          <div className="text-sm text-foreground">
            {searchDemandSignal.value} {searchDemandSignal.unit ?? ''}
            <p className="text-xs text-muted-foreground">source: {searchDemandSignal.source}</p>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Not validated</span>
        )}
      </TableCell>
      <TableCell>
        {concept.state === 'TREND_CANDIDATE' ? (
          <Badge variant="success">Trend candidate</Badge>
        ) : (
          <Badge variant="warning">Emerging · Needs validation</Badge>
        )}
      </TableCell>
    </TableRow>
  );
}

/** The existing, working keyword-based discovery flow — unchanged behavior, now hosted as one tab among several discovery modes. */
function KeywordResearchTab({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const { data: marketplaces } = useSupportedDiscoveryMarketplaces();
  const { data: providers } = useMarketplaceProviders();
  // Friendly country names for display only — the value sent to the
  // discovery API is always the raw code from the provider's
  // supportedCountries below, never anything from this list.
  const { data: countriesResult } = useCountries({ limit: 100 });
  const createSession = useCreateDiscoverySession();

  const [marketplace, setMarketplace] = useState('');
  const [country, setCountry] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);

  const selectedProvider = providers?.find((p) => p.providerKey === marketplace);

  const marketplaceOptions = (marketplaces ?? []).map((code) => ({
    value: code,
    label: providers?.find((p) => p.providerKey === code)?.displayName ?? code,
  }));

  const countryNameByCode = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of countriesResult?.items ?? []) map.set(c.code, c.name);
    return map;
  }, [countriesResult]);

  // Country options are exactly this marketplace's own supportedCountries
  // (real provider metadata, e.g. AmazonMarketplace's registered country
  // codes) — never a generic/unfiltered country list.
  const countryOptions = (selectedProvider?.supportedCountries ?? []).map((code) => {
    const name = countryNameByCode.get(code);
    return { value: code, label: name ? `${name} (${code})` : code };
  });

  const handleMarketplaceChange = (value: string) => {
    setMarketplace(value);
    setCountry('');
  };

  const addKeyword = () => {
    const trimmed = keywordInput.trim();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords([...keywords, trimmed]);
      setKeywordInput('');
    }
  };

  const handleSubmit = () => {
    if (!marketplace || !country || keywords.length === 0) return;
    // No `mode` sent — backend defaults to (and only currently supports)
    // KEYWORD; ASIN/TREND_COLD_START are rejected server-side, so this UI
    // never attempts them.
    createSession.mutate(
      { marketplace, country, keywords },
      {
        onSuccess: () => {
          onDone();
          setKeywords([]);
          setMarketplace('');
          setCountry('');
        },
      },
    );
  };

  return (
    <div>
      <div className="space-y-4">
        <FormField label="Marketplace" htmlFor="disc-marketplace" required>
          <Select
            id="disc-marketplace"
            value={marketplace}
            onChange={(e) => handleMarketplaceChange(e.target.value)}
            placeholder="Select a marketplace"
            options={marketplaceOptions}
            disabled={!marketplaces || marketplaces.length === 0}
          />
        </FormField>

        <FormField label="Country" htmlFor="disc-country" required>
          <Select
            id="disc-country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder={marketplace ? 'Select a country' : 'Select a marketplace first'}
            options={countryOptions}
            disabled={!marketplace || countryOptions.length === 0}
          />
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

      <DialogFooter className="mt-6">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={!marketplace || !country || keywords.length === 0 || createSession.isPending}>
          {createSession.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Start discovery
        </Button>
      </DialogFooter>
    </div>
  );
}
