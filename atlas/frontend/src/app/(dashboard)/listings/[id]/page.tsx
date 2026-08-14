'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { isAxiosError } from 'axios';
import { Loader2, RefreshCw, Send, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { FormField } from '@/components/ui/form-field';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState, UnauthorizedState } from '@/components/ui/states';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AnalysisBlock } from '@/components/product-intelligence/analysis-block';
import { ReasonDialog } from '@/components/suppliers/reason-dialog';
import {
  useApproveListingApproval,
  useArchivePublication,
  useConfirm,
  useCreateListingApproval,
  useDeleteUniversalListing,
  useLatestApprovalForListing,
  useMarketplaceListings,
  useMarkListingReadyToPublish,
  useMarketplaceProviders,
  usePublicationsForListing,
  usePublishListing,
  useRegenerateUniversalListing,
  useRejectListingApproval,
  useRepublishListing,
  useRequestListingRevision,
  useResubmitListingApproval,
  useRetryPublication,
  useTransformToMarketplace,
  useUnpublishListing,
  useUniversalListing,
} from '@/hooks';
import { formatDate } from '@/lib/utils';
import type { ListingSection } from '@/types';

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const confirm = useConfirm();
  const { data: listing, isLoading, isError, error, refetch } = useUniversalListing(id);
  const deleteListing = useDeleteUniversalListing();
  const regenerate = useRegenerateUniversalListing(id);

  const isForbidden = isAxiosError(error) && error.response?.status === 403;
  const isNotFound = isAxiosError(error) && error.response?.status === 404;

  if (isForbidden) return <UnauthorizedState />;
  if (isError) return <QueryErrorState refetch={refetch} description={isNotFound ? 'This listing could not be found.' : "We couldn't load this listing."} />;
  if (isLoading || !listing) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const handleDelete = async () => {
    const ok = await confirm({ title: 'Delete this listing?', description: 'This cannot be undone.', confirmLabel: 'Delete', variant: 'danger' });
    if (ok) deleteListing.mutate(listing.id, { onSuccess: () => router.push('/dashboard/listings') });
  };

  const handleRegenerate = () => {
    const allSections: ListingSection[] = ['TITLE', 'BRAND', 'CATEGORY', 'DESCRIPTION', 'BULLET_POINTS', 'IMAGES', 'VARIANTS', 'ATTRIBUTES', 'SPECIFICATIONS', 'SEARCH_TERMS', 'PRICING', 'SEO'];
    regenerate.mutate({ sections: allSections });
  };

  return (
    <div>
      <PageHeader
        title={(listing.content?.['title'] as string) || listing.catalogProductId}
        breadcrumbs={[{ label: 'Listings', href: '/dashboard/listings' }, { label: listing.catalogProductId }]}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={listing.status} />
            <Button variant="outline" onClick={handleRegenerate} disabled={regenerate.isPending}>
              {regenerate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Regenerate
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleteListing.isPending}>
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Stat label="Quality score" value={listing.qualityScore != null ? `${listing.qualityScore}/100` : '—'} />
        <Stat label="Version" value={`v${listing.version}`} />
        <Stat label="Updated" value={formatDate(listing.updatedAt)} />
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="marketplace">Marketplace preview</TabsTrigger>
          <TabsTrigger value="approval">Approval</TabsTrigger>
          <TabsTrigger value="publication">Publication</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Content</CardTitle>
              </CardHeader>
              <CardContent>
                <AnalysisBlock title="Content" data={listing.content} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Validation</CardTitle>
              </CardHeader>
              <CardContent>
                {listing.errorMessage && <p className="mb-3 text-sm text-danger">{listing.errorMessage}</p>}
                <AnalysisBlock title="Validation" data={listing.validationResult ?? undefined} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="marketplace">
          <MarketplaceTab universalListingId={listing.id} catalogProductId={listing.catalogProductId} />
        </TabsContent>

        <TabsContent value="approval">
          <ApprovalTab listingId={listing.id} catalogProductId={listing.catalogProductId} />
        </TabsContent>

        <TabsContent value="publication">
          <PublicationTab listingId={listing.id} catalogProductId={listing.catalogProductId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius)] border border-border bg-card p-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

function MarketplaceTab({ universalListingId, catalogProductId }: { universalListingId: string; catalogProductId: string }) {
  const { data: marketplaceListings, isLoading } = useMarketplaceListings(universalListingId);
  const { data: providers } = useMarketplaceProviders();
  const transform = useTransformToMarketplace(universalListingId);
  const [transformOpen, setTransformOpen] = useState(false);
  const [marketplaceKey, setMarketplaceKey] = useState('');
  const [country, setCountry] = useState('');

  const providerOptions = (providers ?? []).flatMap((p) => p.supportedMarketplaces).filter((v, i, arr) => arr.indexOf(v) === i).map((m) => ({ value: m, label: m }));

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setTransformOpen(true)}>
          Transform to marketplace
        </Button>
      </div>

      {!marketplaceListings || marketplaceListings.length === 0 ? (
        <EmptyState title="No marketplace transformations yet" description="Transform this listing for a specific marketplace to preview readiness." className="border-none py-8" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {marketplaceListings.map((ml) => (
            <Card key={ml.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm capitalize">{ml.marketplaceKey.toLowerCase()} · {ml.country}</CardTitle>
                  <StatusBadge status={ml.status} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Readiness</p>
                    <p className="font-medium text-foreground">{ml.readinessScore != null ? `${ml.readinessScore}/100` : '—'}</p>
                  </div>
                  {ml.externalListingId && (
                    <div>
                      <p className="text-xs text-muted-foreground">External ID</p>
                      <p className="font-medium text-foreground">{ml.externalListingId}</p>
                    </div>
                  )}
                </div>
                {ml.errors && ml.errors.length > 0 && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-danger">Errors</p>
                    <ul className="list-inside list-disc text-xs text-danger">
                      {ml.errors.map((e, i) => (
                        <li key={i}>{typeof e === 'string' ? e : JSON.stringify(e)}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {ml.warnings && ml.warnings.length > 0 && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-warning">Warnings</p>
                    <ul className="list-inside list-disc text-xs text-warning">
                      {ml.warnings.map((w, i) => (
                        <li key={i}>{typeof w === 'string' ? w : JSON.stringify(w)}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {ml.transformedPayload && (
                  <details>
                    <summary className="cursor-pointer text-xs font-medium text-primary">View transformed payload</summary>
                    <AnalysisBlock title="Transformed payload" data={ml.transformedPayload} />
                  </details>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={transformOpen} onOpenChange={setTransformOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Transform to marketplace</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <FormField label="Marketplace" htmlFor="tx-marketplace" required>
              <Select id="tx-marketplace" value={marketplaceKey} onChange={(e) => setMarketplaceKey(e.target.value)} options={providerOptions} placeholder="Select a marketplace" />
            </FormField>
            <FormField label="Country" htmlFor="tx-country">
              <Input id="tx-country" value={country} onChange={(e) => setCountry(e.target.value.toUpperCase())} maxLength={5} />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransformOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                transform.mutate(
                  { marketplaceKey, country: country || undefined },
                  { onSuccess: () => { setTransformOpen(false); setMarketplaceKey(''); setCountry(''); } },
                )
              }
              disabled={!marketplaceKey || transform.isPending}
            >
              {transform.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Transform
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ApprovalTab({ listingId, catalogProductId }: { listingId: string; catalogProductId: string }) {
  const { data: approval, isLoading, isError } = useLatestApprovalForListing(listingId);
  const createApproval = useCreateListingApproval();
  const approve = useApproveListingApproval(approval?.id ?? '');
  const reject = useRejectListingApproval(approval?.id ?? '');
  const requestRevision = useRequestListingRevision(approval?.id ?? '');
  const resubmit = useResubmitListingApproval(approval?.id ?? '');
  const markReady = useMarkListingReadyToPublish(approval?.id ?? '');
  const [rejectOpen, setRejectOpen] = useState(false);
  const [revisionOpen, setRevisionOpen] = useState(false);

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  if (isError || !approval) {
    return (
      <EmptyState
        title="Not submitted for approval"
        description="Submit this listing for approval before it can be published."
        action={{ label: 'Submit for approval', onClick: () => createApproval.mutate({ listingId, catalogProductId }) }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <StatusBadge status={approval.status} />
        <div className="flex items-center gap-2">
          {approval.status === 'PENDING_REVIEW' || approval.status === 'UNDER_REVIEW' ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setRevisionOpen(true)}>
                Request revision
              </Button>
              <Button variant="danger" size="sm" onClick={() => setRejectOpen(true)}>
                Reject
              </Button>
              <Button size="sm" onClick={() => approve.mutate({})} disabled={approve.isPending}>
                {approve.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Approve
              </Button>
            </>
          ) : approval.status === 'REVISION_REQUIRED' ? (
            <Button size="sm" onClick={() => resubmit.mutate(undefined)} disabled={resubmit.isPending}>
              Resubmit
            </Button>
          ) : approval.status === 'APPROVED' ? (
            <Button size="sm" onClick={() => markReady.mutate(undefined)} disabled={markReady.isPending}>
              Mark ready to publish
            </Button>
          ) : null}
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 text-sm">
          <Field label="Reviewed by" value={approval.reviewedBy ?? '—'} />
          <Field label="Reviewed at" value={approval.reviewedAt ? formatDate(approval.reviewedAt) : '—'} />
          {approval.approvalComment && <div className="sm:col-span-2"><Field label="Comment" value={approval.approvalComment} /></div>}
          {approval.rejectionReason && <div className="sm:col-span-2"><Field label="Rejection reason" value={approval.rejectionReason} /></div>}
          {approval.revisionNotes && <div className="sm:col-span-2"><Field label="Revision notes" value={approval.revisionNotes} /></div>}
        </CardContent>
      </Card>

      {approval.checkResults && approval.checkResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Checks</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {approval.checkResults.map((c, i) => (
              <div key={i} className="flex items-center justify-between rounded-[var(--radius)] border border-border p-2 text-sm">
                <span className="text-foreground">{c.area}</span>
                <StatusBadge status={c.passed ? 'PASSED' : 'FAILED'} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <ReasonDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title="Reject this listing"
        confirmLabel="Reject"
        variant="danger"
        pending={reject.isPending}
        onSubmit={(reason) => reject.mutate({ reason }, { onSuccess: () => setRejectOpen(false) })}
      />
      <ReasonDialog
        open={revisionOpen}
        onOpenChange={setRevisionOpen}
        title="Request a revision"
        label="Revision notes"
        confirmLabel="Request revision"
        pending={requestRevision.isPending}
        onSubmit={(notes) => requestRevision.mutate({ notes }, { onSuccess: () => setRevisionOpen(false) })}
      />
    </div>
  );
}

function PublicationTab({ listingId, catalogProductId }: { listingId: string; catalogProductId: string }) {
  const { data: publications, isLoading } = usePublicationsForListing(listingId);
  const { data: providers } = useMarketplaceProviders();
  const publish = usePublishListing();
  const [publishOpen, setPublishOpen] = useState(false);
  const [marketplace, setMarketplace] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');

  const marketplaceOptions = (providers ?? []).flatMap((p) => p.supportedMarketplaces).filter((v, i, arr) => arr.indexOf(v) === i).map((m) => ({ value: m, label: m }));

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setPublishOpen(true)}>
          <Send className="h-3.5 w-3.5" />
          Publish
        </Button>
      </div>

      {!publications || publications.length === 0 ? (
        <EmptyState title="Not published yet" description="Publish this listing to a marketplace to start tracking status here." className="border-none py-8" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Marketplace</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sync</TableHead>
              <TableHead>External ID</TableHead>
              <TableHead>Retries</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {publications.map((pub) => (
              <PublicationRow key={pub.id} publication={pub} />
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Publish listing</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <FormField label="Marketplace" htmlFor="pub-marketplace" required>
              <Select id="pub-marketplace" value={marketplace} onChange={(e) => setMarketplace(e.target.value)} options={marketplaceOptions} placeholder="Select a marketplace" />
            </FormField>
            <FormField label="Schedule for later" htmlFor="pub-scheduled" hint="Leave blank to publish immediately">
              <Input id="pub-scheduled" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                publish.mutate(
                  { listingId, catalogProductId, marketplace, scheduledAt: scheduledAt || undefined },
                  { onSuccess: () => { setPublishOpen(false); setMarketplace(''); setScheduledAt(''); } },
                )
              }
              disabled={!marketplace || publish.isPending}
            >
              {publish.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PublicationRow({ publication }: { publication: NonNullable<ReturnType<typeof usePublicationsForListing>['data']>[number] }) {
  const republish = useRepublishListing(publication.id);
  const retry = useRetryPublication(publication.id);
  const unpublish = useUnpublishListing(publication.id);
  const archive = useArchivePublication(publication.id);

  return (
    <TableRow>
      <TableCell className="text-sm capitalize text-foreground">{publication.marketplace.toLowerCase()}</TableCell>
      <TableCell>
        <StatusBadge status={publication.status} />
      </TableCell>
      <TableCell>
        <StatusBadge status={publication.syncStatus} />
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{publication.marketplaceListingId ?? '—'}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{publication.retryCount}</TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          {publication.status === 'FAILED' && (
            <Button variant="outline" size="sm" onClick={() => retry.mutate(undefined)} disabled={retry.isPending}>
              Retry
            </Button>
          )}
          {publication.status === 'PUBLISHED' && (
            <>
              <Button variant="outline" size="sm" onClick={() => republish.mutate(undefined)} disabled={republish.isPending}>
                Republish
              </Button>
              <Button variant="outline" size="sm" onClick={() => unpublish.mutate(undefined)} disabled={unpublish.isPending}>
                Unpublish
              </Button>
            </>
          )}
          {publication.status !== 'ARCHIVED' && (
            <Button variant="ghost" size="sm" onClick={() => archive.mutate(undefined)} disabled={archive.isPending}>
              Archive
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm text-foreground">{value}</p>
    </div>
  );
}
