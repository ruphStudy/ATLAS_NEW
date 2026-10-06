'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search as SearchIcon,
  SlidersHorizontal,
  Bookmark,
  BookmarkPlus,
  Clock,
  Rows3,
  Rows4,
  Tag as TagIcon,
  X,
  Star,
  Copy,
  Pencil,
  Trash2,
  Share2,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState } from '@/components/ui/states';
import { Pagination } from '@/components/ui/pagination';
import { ActionMenu } from '@/components/ui/action-menu';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  useBulkAssignTags,
  useCreateSavedSearch,
  useDeleteSavedSearch,
  useGlobalSearchResults,
  useRecentEntities,
  useRecentSearches,
  useSavedSearches,
  useSearchHistory,
  useSearchRegistrations,
  useSearchSuggestions,
  useTags,
  useUpdateSavedSearch,
  useUpdateWorkspaceViewPreferences,
  useWorkspaceViewPreferences,
} from '@/hooks';
import { formatDistanceToNow } from '@/lib/utils';
import type { GlobalSearchFilterParams, GlobalSearchResultItem, SavedSearch, SearchMode } from '@/types';

type Grouping = 'module' | 'entityType' | 'none';
type Density = 'compact' | 'comfortable';

interface TableDisplayPrefs {
  grouping: Grouping;
  density: Density;
  visibleFields: { summary: boolean; tags: boolean; status: boolean };
}

const DEFAULT_DISPLAY_PREFS: TableDisplayPrefs = {
  grouping: 'module',
  density: 'comfortable',
  visibleFields: { summary: true, tags: true, status: true },
};

const MODE_OPTIONS: { value: SearchMode; label: string }[] = [
  { value: 'FULL_TEXT', label: 'Full text' },
  { value: 'EXACT', label: 'Exact' },
  { value: 'PREFIX', label: 'Prefix' },
  { value: 'PARTIAL', label: 'Partial' },
];

const GROUPING_OPTIONS: { value: Grouping; label: string }[] = [
  { value: 'module', label: 'Group by module' },
  { value: 'entityType', label: 'Group by entity type' },
  { value: 'none', label: 'No grouping' },
];

function resolveHref(ref: unknown): string | null {
  if (typeof ref === 'string') return ref;
  if (ref && typeof ref === 'object' && 'path' in ref && typeof (ref as { path?: unknown }).path === 'string') {
    return (ref as { path: string }).path;
  }
  return null;
}

function resultKey(item: GlobalSearchResultItem) {
  return `${item.entityType}:${item.entityId}`;
}

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams?.get('q') ?? '');
  const [mode, setMode] = useState<SearchMode | ''>('');
  const [entityTypes, setEntityTypes] = useState<Set<string>>(new Set());
  const [module, setModule] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [status, setStatus] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [marketplace, setMarketplace] = useState('');
  const [warehouse, setWarehouse] = useState('');
  const [country, setCountry] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [suggestionsFocused, setSuggestionsFocused] = useState(false);

  const [display, setDisplay] = useState<TableDisplayPrefs>(DEFAULT_DISPLAY_PREFS);
  const [saveSearchOpen, setSaveSearchOpen] = useState(false);
  const [savedSearchesOpen, setSavedSearchesOpen] = useState(false);
  const [bulkTagOpen, setBulkTagOpen] = useState(false);

  const prefs = useWorkspaceViewPreferences();
  const updatePrefs = useUpdateWorkspaceViewPreferences();

  useEffect(() => {
    if (!prefs.data) return;
    const table = prefs.data['tablePreferences']?.value as Record<string, unknown> | undefined;
    const saved = table?.['search'] as Partial<TableDisplayPrefs> | undefined;
    if (saved) {
      setDisplay({ ...DEFAULT_DISPLAY_PREFS, ...saved, visibleFields: { ...DEFAULT_DISPLAY_PREFS.visibleFields, ...saved.visibleFields } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs.data]);

  function persistDisplay(next: TableDisplayPrefs) {
    setDisplay(next);
    const existingTable = (prefs.data?.['tablePreferences']?.value as Record<string, unknown> | undefined) ?? {};
    updatePrefs.mutate({ tablePreferences: { ...existingTable, search: next } });
  }

  const tags = useMemo(() => (tagsInput ? tagsInput.split(',').map((t) => t.trim()).filter(Boolean) : undefined), [tagsInput]);

  const params = useMemo<GlobalSearchFilterParams>(
    () => ({
      q: query || undefined,
      mode: mode || undefined,
      entityTypes: entityTypes.size > 0 ? Array.from(entityTypes) : undefined,
      module: module || undefined,
      tags,
      status: status || undefined,
      ownerId: ownerId || undefined,
      marketplace: marketplace || undefined,
      warehouse: warehouse || undefined,
      country: country || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page,
      limit,
    }),
    [query, mode, entityTypes, module, tags, status, ownerId, marketplace, warehouse, country, dateFrom, dateTo, page, limit],
  );

  const results = useGlobalSearchResults(params);
  const registrations = useSearchRegistrations();
  const suggestions = useSearchSuggestions(query);
  const recentSearches = useRecentSearches(8);
  const recentEntities = useRecentEntities(8);

  const registrationsByModule = useMemo(() => {
    const map = new Map<string, typeof registrations.data>();
    (registrations.data ?? []).forEach((reg) => {
      const list = map.get(reg.module) ?? [];
      list.push(reg);
      map.set(reg.module, list as NonNullable<typeof registrations.data>);
    });
    return map;
  }, [registrations.data]);

  function toggleEntityType(entityType: string) {
    setEntityTypes((prev) => {
      const next = new Set(prev);
      if (next.has(entityType)) next.delete(entityType);
      else next.add(entityType);
      return next;
    });
    setPage(1);
  }

  function clearFilters() {
    setEntityTypes(new Set());
    setModule('');
    setTagsInput('');
    setStatus('');
    setOwnerId('');
    setMarketplace('');
    setWarehouse('');
    setCountry('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  }

  const hasActiveFilters = entityTypes.size > 0 || !!module || !!tagsInput || !!status || !!ownerId || !!marketplace || !!warehouse || !!country || !!dateFrom || !!dateTo;

  function handleFacetClick(facetKey: string, value: string) {
    setPage(1);
    switch (facetKey) {
      case 'status':
        setStatus((prev) => (prev === value ? '' : value));
        break;
      case 'ownerId':
        setOwnerId((prev) => (prev === value ? '' : value));
        break;
      case 'marketplace':
        setMarketplace((prev) => (prev === value ? '' : value));
        break;
      case 'warehouse':
        setWarehouse((prev) => (prev === value ? '' : value));
        break;
      case 'country':
        setCountry((prev) => (prev === value ? '' : value));
        break;
      case 'tags':
        setTagsInput((prev) => {
          const list = prev ? prev.split(',').map((t) => t.trim()).filter(Boolean) : [];
          return list.includes(value) ? list.filter((t) => t !== value).join(', ') : [...list, value].join(', ');
        });
        break;
      default:
        break;
    }
  }

  const rows = results.data?.items ?? [];
  const grouped = useMemo(() => {
    if (display.grouping === 'none') return { All: rows };
    if (display.grouping === 'module') return results.data?.groupedByModule ?? {};
    return results.data?.groupedByEntityType ?? {};
  }, [display.grouping, rows, results.data]);

  function toggleSelect(item: GlobalSearchResultItem) {
    setSelected((prev) => {
      const next = new Set(prev);
      const key = resultKey(item);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const selectedItems = rows.filter((r) => selected.has(resultKey(r)));

  function applySavedSearch(saved: SavedSearch) {
    setQuery(saved.query ?? '');
    const filters = (saved.filters ?? {}) as GlobalSearchFilterParams;
    setEntityTypes(new Set(filters.entityTypes ?? []));
    setModule(filters.module ?? '');
    setTagsInput((filters.tags ?? []).join(', '));
    setStatus(filters.status ?? '');
    setOwnerId(filters.ownerId ?? '');
    setMarketplace(filters.marketplace ?? '');
    setWarehouse(filters.warehouse ?? '');
    setCountry(filters.country ?? '');
    setDateFrom(filters.dateFrom ?? '');
    setDateTo(filters.dateTo ?? '');
    setPage(1);
  }

  return (
    <div>
      <PageHeader title="Search" description="Search across products, suppliers, procurement, inventory, warehouses, marketplaces, tasks, documents, reports, analytics and AI entities." />

      <div className="relative mb-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              onFocus={() => setSuggestionsFocused(true)}
              onBlur={() => setTimeout(() => setSuggestionsFocused(false), 150)}
              icon={<SearchIcon className="h-4 w-4" />}
              rightElement={
                query ? (
                  <button onClick={() => setQuery('')} className="pointer-events-auto text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : undefined
              }
              placeholder="Search everything…"
              className="h-11"
            />
            {suggestionsFocused && query.trim().length >= 2 && (suggestions.data?.length ?? 0) > 0 && (
              <div className="absolute z-20 mt-1 w-full rounded-[var(--radius)] border border-border bg-card p-1 shadow-card-hover">
                {suggestions.data!.map((s) => (
                  <button
                    key={s}
                    onMouseDown={() => setQuery(s)}
                    className="flex w-full items-center gap-2 rounded-[calc(var(--radius)-4px)] px-2.5 py-1.5 text-left text-sm text-foreground hover:bg-secondary"
                  >
                    <SearchIcon className="h-3 w-3 text-muted-foreground" />
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Select value={mode} onChange={(e) => setMode(e.target.value as SearchMode | '')} options={[{ value: '', label: 'Any match' }, ...MODE_OPTIONS]} className="h-11 w-40" />
          <Button variant={filtersOpen ? 'secondary' : 'outline'} onClick={() => setFiltersOpen((v) => !v)}>
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <Badge variant="solid" className="ml-1 px-1.5 py-0 text-[10px]">
                {entityTypes.size + [module, tagsInput, status, ownerId, marketplace, warehouse, country, dateFrom, dateTo].filter(Boolean).length}
              </Badge>
            )}
          </Button>
        </div>

        {!query && recentSearches.data && recentSearches.data.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Clock className="h-3 w-3 text-muted-foreground" />
            {recentSearches.data.map((r, i) => (
              <button
                key={i}
                onClick={() => r.query && setQuery(r.query)}
                className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary"
              >
                {r.query}
              </button>
            ))}
          </div>
        )}
      </div>

      {filtersOpen && (
        <Card className="mb-4">
          <CardContent className="space-y-4 pt-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Entity types</p>
              {registrations.isLoading ? (
                <Skeleton className="h-8 w-full" />
              ) : (
                <div className="space-y-2">
                  {Array.from(registrationsByModule.entries()).map(([moduleName, regs]) => (
                    <div key={moduleName} className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] uppercase text-muted-foreground">{moduleName}:</span>
                      {(regs ?? []).map((reg) => (
                        <button
                          key={reg.key}
                          onClick={() => toggleEntityType(reg.entityType)}
                          className={
                            entityTypes.has(reg.entityType)
                              ? 'rounded-full border border-primary bg-primary/10 px-2.5 py-0.5 text-xs text-primary'
                              : 'rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground hover:text-foreground'
                          }
                        >
                          {reg.displayName}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <FormField label="Module" htmlFor="f-module">
                <Input id="f-module" value={module} onChange={(e) => setModule(e.target.value)} className="h-9" />
              </FormField>
              <FormField label="Tags (comma-separated)" htmlFor="f-tags">
                <Input id="f-tags" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} className="h-9" />
              </FormField>
              <FormField label="Status" htmlFor="f-status">
                <Input id="f-status" value={status} onChange={(e) => setStatus(e.target.value)} className="h-9" />
              </FormField>
              <FormField label="Owner ID" htmlFor="f-owner">
                <Input id="f-owner" value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className="h-9" />
              </FormField>
              <FormField label="Marketplace" htmlFor="f-marketplace">
                <Input id="f-marketplace" value={marketplace} onChange={(e) => setMarketplace(e.target.value)} className="h-9" />
              </FormField>
              <FormField label="Warehouse" htmlFor="f-warehouse">
                <Input id="f-warehouse" value={warehouse} onChange={(e) => setWarehouse(e.target.value)} className="h-9" />
              </FormField>
              <FormField label="Country" htmlFor="f-country">
                <Input id="f-country" value={country} onChange={(e) => setCountry(e.target.value)} className="h-9" />
              </FormField>
              <div className="grid grid-cols-2 gap-2">
                <FormField label="From" htmlFor="f-date-from">
                  <Input id="f-date-from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9" />
                </FormField>
                <FormField label="To" htmlFor="f-date-to">
                  <Input id="f-date-to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9" />
                </FormField>
              </div>
            </div>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-3.5 w-3.5" />
                Clear filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={display.grouping}
            onChange={(e) => persistDisplay({ ...display, grouping: e.target.value as Grouping })}
            options={GROUPING_OPTIONS}
            className="h-9 w-48"
          />
          <Button variant="outline" size="icon-sm" title="Comfortable density" onClick={() => persistDisplay({ ...display, density: 'comfortable' })} className={display.density === 'comfortable' ? 'border-primary text-primary' : ''}>
            <Rows3 className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon-sm" title="Compact density" onClick={() => persistDisplay({ ...display, density: 'compact' })} className={display.density === 'compact' ? 'border-primary text-primary' : ''}>
            <Rows4 className="h-4 w-4" />
          </Button>
          {(['summary', 'tags', 'status'] as const).map((field) => (
            <Button
              key={field}
              variant={display.visibleFields[field] ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => persistDisplay({ ...display, visibleFields: { ...display.visibleFields, [field]: !display.visibleFields[field] } })}
            >
              {field}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setSavedSearchesOpen(true)}>
            <Bookmark className="h-3.5 w-3.5" />
            Saved searches
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSaveSearchOpen(true)}>
            <BookmarkPlus className="h-3.5 w-3.5" />
            Save search
          </Button>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-[var(--radius)] border border-border bg-secondary px-3 py-2">
          <p className="text-sm text-foreground">{selected.size} selected</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setBulkTagOpen(true)}>
              <TagIcon className="h-3.5 w-3.5" />
              Assign tags
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </div>
        </div>
      )}

      <Tabs defaultValue="results">
        <TabsList>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="history">Search History</TabsTrigger>
        </TabsList>

        <TabsContent value="results">
          {results.data?.facets && Object.keys(results.data.facets).length > 0 && (
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {Object.entries(results.data.facets).map(([facetKey, buckets]) => (
                <Card key={facetKey}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs capitalize">{facetKey}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-1.5 pt-0">
                    {buckets.slice(0, 8).map((b) => (
                      <button
                        key={b.value}
                        onClick={() => handleFacetClick(facetKey, b.value)}
                        className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-secondary"
                      >
                        {b.value} ({b.count})
                      </button>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {results.isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : results.isError ? (
            <QueryErrorState refetch={results.refetch} />
          ) : rows.length === 0 ? (
            <div className="space-y-6">
              <EmptyState
                title={query || hasActiveFilters ? 'No results found' : 'Start searching'}
                description={query || hasActiveFilters ? 'Try a different query or adjust your filters.' : 'Search across every module in your workspace, or browse recent entities below.'}
              />
              {recentEntities.data && recentEntities.data.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recently viewed</p>
                  <div className="space-y-1.5">
                    {recentEntities.data.map((e) => (
                      <button
                        key={`${e.entityType}-${e.entityId}`}
                        onClick={() => setQuery(e.title)}
                        className="flex w-full items-center justify-between rounded-[var(--radius)] border border-border p-2.5 text-left text-sm hover:bg-secondary"
                      >
                        <span className="text-foreground">{e.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {e.entityType} · {formatDistanceToNow(e.lastOpenedAt)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-6">
                {Object.entries(grouped).map(([groupName, items]) => (
                  <div key={groupName}>
                    {display.grouping !== 'none' && <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{groupName}</p>}
                    <div className="space-y-1.5">
                      {items.map((item) => (
                        <ResultRow
                          key={resultKey(item)}
                          item={item}
                          selected={selected.has(resultKey(item))}
                          onToggle={() => toggleSelect(item)}
                          density={display.density}
                          visibleFields={display.visibleFields}
                          onOpen={() => {
                            const href = resolveHref(item.navigationRef);
                            if (href) router.push(href);
                          }}
                          onNavigate={(href) => router.push(href)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <Pagination
                  page={results.data?.page ?? page}
                  limit={results.data?.limit ?? limit}
                  total={results.data?.total ?? 0}
                  totalPages={results.data?.totalPages ?? 0}
                  onPageChange={setPage}
                  onLimitChange={(l) => {
                    setLimit(l);
                    setPage(1);
                  }}
                />
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="history">
          <SearchHistoryTab />
        </TabsContent>
      </Tabs>

      <SaveSearchDialog open={saveSearchOpen} onOpenChange={setSaveSearchOpen} query={query} filters={params} />
      <SavedSearchesDialog open={savedSearchesOpen} onOpenChange={setSavedSearchesOpen} onApply={applySavedSearch} />
      <BulkTagDialog open={bulkTagOpen} onOpenChange={setBulkTagOpen} items={selectedItems} onDone={() => setSelected(new Set())} />
    </div>
  );
}

function ResultRow({
  item,
  selected,
  onToggle,
  density,
  visibleFields,
  onOpen,
  onNavigate,
}: {
  item: GlobalSearchResultItem;
  selected: boolean;
  onToggle: () => void;
  density: Density;
  visibleFields: TableDisplayPrefs['visibleFields'];
  onOpen: () => void;
  onNavigate: (href: string) => void;
}) {
  return (
    <div
      className={
        density === 'compact'
          ? 'flex items-center gap-3 rounded-[var(--radius)] border border-border px-3 py-2 hover:bg-secondary'
          : 'flex items-start gap-3 rounded-[var(--radius)] border border-border p-3 hover:bg-secondary'
      }
    >
      <Checkbox checked={selected} onChange={onToggle} className="mt-0.5 shrink-0" />
      <button onClick={onOpen} className="min-w-0 flex-1 text-left">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
          {item.module && (
            <Badge variant="outline" className="shrink-0 text-[9px]">
              {item.module}
            </Badge>
          )}
        </div>
        {visibleFields.summary && item.summary && density !== 'compact' && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{item.summary}</p>}
        {visibleFields.tags && item.tags.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {item.tags.map((t) => (
              <Badge key={t} variant="secondary" className="text-[9px]">
                {t}
              </Badge>
            ))}
          </div>
        )}
      </button>
      <div className="flex shrink-0 items-center gap-2">
        {visibleFields.status && item.status && <StatusBadge status={item.status} />}
        {item.quickActions.length > 0 && (
          <ActionMenu
            items={item.quickActions.map((qa) => ({
              label: qa.label,
              onSelect: () => {
                const href = resolveHref(qa.navigationRef);
                if (href) onNavigate(href);
              },
            }))}
          />
        )}
      </div>
    </div>
  );
}

function SavedSearchesDialog({ open, onOpenChange, onApply }: { open: boolean; onOpenChange: (o: boolean) => void; onApply: (s: SavedSearch) => void }) {
  const savedSearches = useSavedSearches();
  const deleteSaved = useDeleteSavedSearch();
  const createSaved = useCreateSavedSearch();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Saved searches</DialogTitle>
        </DialogHeader>
        {savedSearches.isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : !savedSearches.data || savedSearches.data.length === 0 ? (
          <EmptyState title="No saved searches yet" description="Save a search to quickly re-run it later." className="border-none py-8" />
        ) : (
          <div className="space-y-2">
            {savedSearches.data.map((s) => (
              <SavedSearchRow
                key={s.id}
                savedSearch={s}
                onApply={() => {
                  onApply(s);
                  onOpenChange(false);
                }}
                onDuplicate={() =>
                  createSaved.mutate({ name: `${s.name} (copy)`, query: s.query ?? undefined, filters: s.filters, isShared: false })
                }
                onDelete={() => deleteSaved.mutate(s.id)}
              />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SavedSearchRow({
  savedSearch,
  onApply,
  onDuplicate,
  onDelete,
}: {
  savedSearch: SavedSearch;
  onApply: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const updateSaved = useUpdateSavedSearch(savedSearch.id);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(savedSearch.name);

  return (
    <div className="flex items-center justify-between rounded-[var(--radius)] border border-border p-3 text-sm">
      <div className="min-w-0 flex-1">
        {renaming ? (
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                updateSaved.mutate({ name }, { onSuccess: () => setRenaming(false) });
              }
            }}
            className="h-8"
          />
        ) : (
          <button onClick={onApply} className="block w-full text-left">
            <p className="truncate font-medium text-foreground">{savedSearch.name}</p>
            <p className="truncate text-xs text-muted-foreground">{savedSearch.query || 'No query — filters only'}</p>
          </button>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {savedSearch.isShared && (
          <Badge variant="info" className="gap-1 text-[9px]">
            <Share2 className="h-2.5 w-2.5" />
            Shared
          </Badge>
        )}
        <ActionMenu
          items={[
            { label: 'Apply', icon: Star, onSelect: onApply },
            { label: 'Rename', icon: Pencil, onSelect: () => setRenaming(true) },
            {
              label: savedSearch.isShared ? 'Unshare' : 'Share',
              icon: Share2,
              onSelect: () => updateSaved.mutate({ isShared: !savedSearch.isShared }),
            },
            { label: 'Duplicate', icon: Copy, onSelect: onDuplicate },
            { label: 'Delete', icon: Trash2, onSelect: onDelete, destructive: true, separatorBefore: true },
          ]}
        />
      </div>
    </div>
  );
}

function SaveSearchDialog({ open, onOpenChange, query, filters }: { open: boolean; onOpenChange: (o: boolean) => void; query: string; filters: GlobalSearchFilterParams }) {
  const createSaved = useCreateSavedSearch();
  const [name, setName] = useState('');
  const [isShared, setIsShared] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Save this search</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <FormField label="Name" htmlFor="save-search-name" required>
            <Input id="save-search-name" value={name} onChange={(e) => setName(e.target.value)} />
          </FormField>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <Checkbox checked={isShared} onChange={(e) => setIsShared(e.target.checked)} />
            Share with workspace
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              createSaved.mutate(
                { name, query: query || undefined, filters: filters as unknown as Record<string, unknown>, isShared },
                {
                  onSuccess: () => {
                    setName('');
                    setIsShared(false);
                    onOpenChange(false);
                  },
                },
              )
            }
            disabled={!name || createSaved.isPending}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BulkTagDialog({ open, onOpenChange, items, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; items: GlobalSearchResultItem[]; onDone: () => void }) {
  const bulkAssign = useBulkAssignTags();
  const tags = useTags({ status: 'ACTIVE', limit: 100 });
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);

  function toggleTag(id: string) {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleApply() {
    if (selectedTagIds.size === 0 || items.length === 0) return;
    setApplying(true);
    try {
      for (const item of items) {
        await bulkAssign.mutateAsync({ tagIds: Array.from(selectedTagIds), module: item.module, entityType: item.entityType, entityId: item.entityId });
      }
      setSelectedTagIds(new Set());
      onOpenChange(false);
      onDone();
    } finally {
      setApplying(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Assign tags to {items.length} result(s)</DialogTitle>
        </DialogHeader>
        {tags.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : !tags.data || tags.data.data.length === 0 ? (
          <EmptyState title="No tags available" description="Create tags in Tags Management first." className="border-none py-6" />
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {tags.data.data.map((tag) => (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                className={
                  selectedTagIds.has(tag.id)
                    ? 'rounded-full border border-primary bg-primary/10 px-2.5 py-1 text-xs text-primary'
                    : 'rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground'
                }
              >
                {tag.name}
              </button>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={selectedTagIds.size === 0 || applying}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SearchHistoryTab() {
  const history = useSearchHistory(50);

  if (history.isLoading) return <Skeleton className="h-64 w-full" />;
  if (history.isError) return <QueryErrorState refetch={history.refetch} />;
  if (!history.data || history.data.length === 0) return <EmptyState title="No search history yet" />;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Query</TableHead>
          <TableHead>Results</TableHead>
          <TableHead>Latency</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>When</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {history.data.map((h) => (
          <TableRow key={h.id}>
            <TableCell className="text-sm text-foreground">{h.query || '—'}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{h.resultCount}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{h.latencyMs}ms</TableCell>
            <TableCell>
              {h.failed ? (
                <Badge variant="danger" className="text-[10px]">
                  Failed
                </Badge>
              ) : h.resultCount === 0 ? (
                <Badge variant="warning" className="text-[10px]">
                  Zero results
                </Badge>
              ) : (
                <Badge variant="success" className="text-[10px]">
                  OK
                </Badge>
              )}
              {h.errorMessage && <span className="ml-1 text-xs text-muted-foreground">{h.errorMessage}</span>}
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(h.createdAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
