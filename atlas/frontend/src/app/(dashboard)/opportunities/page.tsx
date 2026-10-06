'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { AlertCircle, Check, Eye, GitCompareArrows, Loader2, Plus, Search } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { FilterBar } from '@/components/ui/filter-bar';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState, UnauthorizedState } from '@/components/ui/states';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScoreBadge } from '@/components/product-intelligence/score-badge';
import { DiscoverProductsDialog } from '@/components/product-intelligence/discover-products-dialog';
import { CreateOpportunityDialog } from '@/components/product-intelligence/create-opportunity-dialog';
import { useDiscoverySessions, useDiscoverySessionResults, useOpportunities, usePromoteCandidate } from '@/hooks';
import { ROUTES } from '@/constants';
import type { DiscoverySession, Opportunity, OpportunityStatus } from '@/types';

const OPPORTUNITIES_QUERY_KEY = 'opportunities';

const STATUS_OPTIONS: { value: OpportunityStatus; label: string }[] = [
  { value: 'DISCOVERED', label: 'Discovered' },
  { value: 'ANALYZING', label: 'Analyzing' },
  { value: 'VALIDATED', label: 'Validated' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'ARCHIVED', label: 'Archived' },
];

export default function OpportunitiesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<OpportunityStatus | ''>('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selected, setSelected] = useState<string[]>([]);
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [resultsSessionId, setResultsSessionId] = useState<string | null>(null);
  const [failedSession, setFailedSession] = useState<DiscoverySession | null>(null);

  const { data, isLoading, isError, error, refetch } = useOpportunities({
    keyword: keyword || undefined,
    status: status || undefined,
    page,
    limit,
  });

  // Reuses useDiscoverySessions()'s own existing polling (it already
  // refetches every 5s while any session is PENDING/RUNNING) — no separate
  // polling is added here.
  const { data: sessionsData, isLoading: sessionsLoading } = useDiscoverySessions({ limit: 5 });

  // When a tracked session's status flips to COMPLETED, the Opportunities
  // list it just populated won't otherwise know to refresh — this reacts to
  // that transition (still driven entirely by useDiscoverySessions()'s own
  // poll) rather than starting a new one.
  const previousStatusesRef = useRef<Record<string, string>>({});
  useEffect(() => {
    if (!sessionsData) return;
    let sessionJustCompleted = false;
    for (const session of sessionsData.items) {
      const previousStatus = previousStatusesRef.current[session.id];
      if (previousStatus && previousStatus !== 'COMPLETED' && session.status === 'COMPLETED') {
        sessionJustCompleted = true;
      }
      previousStatusesRef.current[session.id] = session.status;
    }
    if (sessionJustCompleted) {
      queryClient.invalidateQueries({ queryKey: [OPPORTUNITIES_QUERY_KEY] });
    }
  }, [sessionsData, queryClient]);

  const isForbidden = isAxiosError(error) && error.response?.status === 403;

  const toggleSelected = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const hasActiveFilters = !!keyword || !!status;

  return (
    <div>
      <PageHeader
        title="Product Opportunities"
        description="Discover, score and evaluate new products before you source them."
        actions={
          <div className="flex items-center gap-2">
            {selected.length >= 2 && (
              <Button variant="outline" onClick={() => router.push(`${ROUTES.OPPORTUNITIES_COMPARE}?ids=${selected.join(',')}`)}>
                <GitCompareArrows className="h-4 w-4" />
                Compare ({selected.length})
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4" />
                  New
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setDiscoverOpen(true)}>
                  <Search className="h-4 w-4" />
                  Discover products
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Add manually
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      {(sessionsLoading || (sessionsData && sessionsData.items.length > 0)) && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-sm">Recent Discovery Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            {sessionsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Marketplace</TableHead>
                    <TableHead>Keywords</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Discovered</TableHead>
                    <TableHead>New</TableHead>
                    <TableHead>Duplicates</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessionsData?.items.map((session: DiscoverySession) => (
                    <TableRow
                      key={session.id}
                      clickable={session.status === 'FAILED'}
                      onClick={() => {
                        if (session.status === 'FAILED') setFailedSession(session);
                      }}
                    >
                      <TableCell className="text-sm text-foreground">
                        {session.marketplace}
                        <span className="ml-1 text-muted-foreground">{session.country}</span>
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate text-sm text-muted-foreground" title={session.keywords.join(', ')}>
                        {session.keywords.join(', ')}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={session.status} tone={session.status === 'RUNNING' ? 'info' : undefined} />
                        {session.status === 'FAILED' && session.errorMessage && (
                          <p className="mt-1 flex max-w-[220px] items-start gap-1 text-xs text-danger" title={session.errorMessage}>
                            <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                            <span className="line-clamp-2">{session.errorMessage}</span>
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{session.totalDiscovered}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{session.newCandidates}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{session.duplicatesSkipped}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(session.createdAt).toLocaleString()}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {session.completedAt ? new Date(session.completedAt).toLocaleString() : '—'}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {session.totalDiscovered > 0 && (
                          <Button variant="ghost" size="icon-sm" onClick={() => setResultsSessionId(session.id)} aria-label="View results">
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <FilterBar
        searchValue={keyword}
        onSearchChange={(v) => {
          setKeyword(v);
          setPage(1);
        }}
        searchPlaceholder="Search by keyword…"
        hasActiveFilters={hasActiveFilters}
        onClearFilters={() => {
          setKeyword('');
          setStatus('');
          setPage(1);
        }}
        className="mb-4"
      >
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as OpportunityStatus | '');
            setPage(1);
          }}
          placeholder="All statuses"
          options={STATUS_OPTIONS}
          className="h-9 w-44"
        />
      </FilterBar>

      {isForbidden ? (
        <UnauthorizedState />
      ) : isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load opportunities." />
      ) : isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No opportunities yet" description="Discover products or add one manually to get started." />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>Keyword</TableHead>
                <TableHead>Marketplace</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Final score</TableHead>
                <TableHead>Demand</TableHead>
                <TableHead>Competition</TableHead>
                <TableHead>Profit</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((opp: Opportunity) => (
                <TableRow key={opp.id} clickable onClick={() => router.push(`/opportunities/${opp.id}`)}>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={selected.includes(opp.id)} onChange={() => toggleSelected(opp.id)} />
                  </TableCell>
                  <TableCell className="text-sm font-medium text-foreground">{opp.keyword}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {opp.marketplace}
                    <span className="ml-1">{opp.country}</span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{opp.category ?? '—'}</TableCell>
                  <TableCell>
                    <ScoreBadge score={opp.finalScore} />
                  </TableCell>
                  <TableCell>
                    <ScoreBadge score={opp.demandScore} />
                  </TableCell>
                  <TableCell>
                    <ScoreBadge score={opp.competitionScore} />
                  </TableCell>
                  <TableCell>
                    <ScoreBadge score={opp.profitScore} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={opp.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Pagination
            page={page}
            limit={limit}
            total={data.total}
            totalPages={Math.ceil(data.total / limit)}
            onPageChange={setPage}
            onLimitChange={(l) => {
              setLimit(l);
              setPage(1);
            }}
          />
        </>
      )}

      <DiscoverProductsDialog open={discoverOpen} onOpenChange={setDiscoverOpen} />
      <CreateOpportunityDialog open={createOpen} onOpenChange={setCreateOpen} />
      <DiscoverySessionResultsDialog
        sessionId={resultsSessionId}
        onOpenChange={(open) => {
          if (!open) setResultsSessionId(null);
        }}
      />
      <DiscoverySessionDetailsDialog
        session={failedSession}
        onOpenChange={(open) => {
          if (!open) setFailedSession(null);
        }}
      />
    </div>
  );
}

/** Failed sessions have no results to show — this surfaces the session's own existing real fields (never fabricated) so clicking a FAILED row isn't a dead end. */
function DiscoverySessionDetailsDialog({
  session,
  onOpenChange,
}: {
  session: DiscoverySession | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={!!session} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Discovery session details</DialogTitle>
        </DialogHeader>
        {session && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <DetailField label="Marketplace" value={`${session.marketplace} ${session.country}`} />
            <DetailField label="Status" value={<StatusBadge status={session.status} />} />
            <DetailField label="Keywords" value={session.keywords.join(', ') || '—'} className="col-span-2" />
            <DetailField label="Discovered" value={String(session.totalDiscovered)} />
            <DetailField label="New candidates" value={String(session.newCandidates)} />
            <DetailField label="Duplicates" value={String(session.duplicatesSkipped)} />
            <DetailField label="Started" value={session.startedAt ? new Date(session.startedAt).toLocaleString() : '—'} />
            <DetailField
              label="Completed"
              value={session.completedAt ? new Date(session.completedAt).toLocaleString() : '—'}
            />
            {session.errorMessage && (
              <DetailField label="Error" value={session.errorMessage} className="col-span-2 text-danger" />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DetailField({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-0.5 text-foreground">{value}</div>
    </div>
  );
}

/**
 * Read-only view of a single discovery session's results, one row per
 * MarketplaceProductCandidate that was found (Discovery no longer
 * auto-creates Opportunity — see the "Promote" button per row). Reuses
 * useDiscoverySessionResults() directly; display fields (title/ASIN/image)
 * come from the result's own `rawData` — the real values the marketplace
 * adapter recorded, not a separate candidate-details endpoint.
 */
function DiscoverySessionResultsDialog({ sessionId, onOpenChange }: { sessionId: string | null; onOpenChange: (open: boolean) => void }) {
  const { data: results, isLoading, isError } = useDiscoverySessionResults(sessionId ?? undefined);

  // A lightweight, separate query (not the paginated main table's own
  // useOpportunities call) used only to know which candidates already have
  // an active Opportunity in this workspace, so "Promote" can show
  // "Already in Opportunities" instead of re-offering promotion.
  const { data: existingOpportunities } = useOpportunities({ limit: 100 });
  const promotedCandidateIds = useMemo(() => {
    const ids = new Set<string>();
    for (const opp of existingOpportunities?.items ?? []) {
      if (opp.marketplaceProductCandidateId) ids.add(opp.marketplaceProductCandidateId);
    }
    return ids;
  }, [existingOpportunities]);

  return (
    <Dialog open={!!sessionId} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Discovery results</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : isError ? (
          <p className="text-sm text-danger">Could not load results for this session.</p>
        ) : !results || results.length === 0 ? (
          <p className="text-sm text-muted-foreground">No results recorded for this session.</p>
        ) : (
          <div className="max-h-[28rem] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Marketplace</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>External ID</TableHead>
                  <TableHead>Analysis</TableHead>
                  <TableHead className="w-44" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r, i) => (
                  <DiscoveryResultRow
                    key={String(r['id'] ?? i)}
                    result={r}
                    alreadyPromoted={
                      typeof r['marketplaceProductCandidateId'] === 'string' &&
                      promotedCandidateIds.has(r['marketplaceProductCandidateId'])
                    }
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** One discovered marketplace product candidate. Only ever renders real, currently-available fields — never a fabricated score. */
function DiscoveryResultRow({ result, alreadyPromoted }: { result: Record<string, unknown>; alreadyPromoted: boolean }) {
  const promote = usePromoteCandidate();
  const [justPromoted, setJustPromoted] = useState(false);

  const rawData = (result['rawData'] ?? {}) as Record<string, unknown>;
  const candidateId =
    typeof result['marketplaceProductCandidateId'] === 'string' ? result['marketplaceProductCandidateId'] : null;
  const title = typeof rawData['title'] === 'string' ? rawData['title'] : typeof result['keyword'] === 'string' ? result['keyword'] : '—';
  const externalProductId = typeof rawData['asin'] === 'string' ? rawData['asin'] : null;
  const imageUrl = typeof rawData['imageUrl'] === 'string' ? rawData['imageUrl'] : null;
  const category = result['category'] != null ? String(result['category']) : null;
  const marketplace = result['marketplace'] != null ? String(result['marketplace']) : '—';
  const country = result['country'] != null ? String(result['country']) : null;
  // Honesty gate: only Amazon's adapter currently sets this flag, and only
  // ever to `false` (never fabricates a real analysis). Never render 0 as
  // if it were a measured demand/competition/profit/AI score.
  const analysisUnavailable = rawData['scoringAvailable'] === false;

  const isPromoted = alreadyPromoted || justPromoted;

  return (
    <TableRow>
      <TableCell className="max-w-[240px]">
        <div className="flex items-center gap-2">
          {imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="h-8 w-8 shrink-0 rounded object-cover" />
          )}
          <span className="truncate text-sm text-foreground" title={title}>
            {title}
          </span>
        </div>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {marketplace}
        {country && <span className="ml-1">{country}</span>}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{category ?? '—'}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{externalProductId ?? '—'}</TableCell>
      <TableCell>
        {analysisUnavailable ? (
          <Badge variant="secondary">Analysis unavailable</Badge>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell>
        {!candidateId ? (
          <span className="text-xs text-muted-foreground">No stable product ID</span>
        ) : isPromoted ? (
          <Badge variant="success">
            <Check className="h-3 w-3" />
            Already in Opportunities
          </Badge>
        ) : (
          <Button
            variant="outline"
            size="sm"
            disabled={promote.isPending}
            onClick={() =>
              promote.mutate(candidateId, {
                onSuccess: () => setJustPromoted(true),
              })
            }
          >
            {promote.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Promote to Opportunity
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}
