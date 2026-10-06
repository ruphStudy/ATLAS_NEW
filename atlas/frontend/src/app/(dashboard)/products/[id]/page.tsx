'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { isAxiosError } from 'axios';
import { Archive, CheckCircle2, Edit, Loader2, Rocket, RotateCcw, SendHorizonal, Sparkles, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState, UnauthorizedState } from '@/components/ui/states';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ProductFormDialog } from '@/components/product-intelligence/product-form-dialog';
import { formatCurrency } from '@/lib/utils';
import {
  useApproveProduct,
  useArchiveProduct,
  useAvailabilityBySku,
  useConfirm,
  useDeleteProduct,
  useMarketplaceListings,
  useProduct,
  useProductHistory,
  usePublishProduct,
  useRevertProductToDraft,
  useSubmitProductForApproval,
  useSupplier,
  useUniversalListings,
} from '@/hooks';
import { ROUTES } from '@/constants';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: product, isLoading, isError, error, refetch } = useProduct(id);
  const [editOpen, setEditOpen] = useState(false);

  const deleteProduct = useDeleteProduct();
  const submitForApproval = useSubmitProductForApproval(id);
  const approve = useApproveProduct(id);
  const publish = usePublishProduct(id);
  const archive = useArchiveProduct(id);
  const revertToDraft = useRevertProductToDraft(id);
  const confirm = useConfirm();

  const isForbidden = isAxiosError(error) && error.response?.status === 403;
  const isNotFound = isAxiosError(error) && error.response?.status === 404;

  if (isForbidden) return <UnauthorizedState />;
  if (isError) return <QueryErrorState refetch={refetch} description={isNotFound ? 'This product could not be found.' : "We couldn't load this product."} />;

  if (isLoading || !product) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const handleDelete = async () => {
    const ok = await confirm({ title: 'Delete this product?', description: 'This cannot be undone.', confirmLabel: 'Delete', variant: 'danger' });
    if (ok) deleteProduct.mutate(product.id);
  };

  const lifecycleActions: { label: string; icon: React.ElementType; onClick: () => void; pending: boolean }[] = [];
  if (product.status === 'DRAFT' || product.status === 'AI_GENERATED') {
    lifecycleActions.push({ label: 'Submit for approval', icon: SendHorizonal, onClick: () => submitForApproval.mutate(undefined), pending: submitForApproval.isPending });
  }
  if (product.status === 'READY_FOR_APPROVAL') {
    lifecycleActions.push({ label: 'Approve', icon: CheckCircle2, onClick: () => approve.mutate(undefined), pending: approve.isPending });
  }
  if (product.status === 'APPROVED') {
    lifecycleActions.push({ label: 'Publish', icon: Rocket, onClick: () => publish.mutate(undefined), pending: publish.isPending });
  }
  if (product.status !== 'ARCHIVED' && product.status !== 'DRAFT') {
    lifecycleActions.push({ label: 'Revert to draft', icon: RotateCcw, onClick: () => revertToDraft.mutate(undefined), pending: revertToDraft.isPending });
  }
  if (product.status !== 'ARCHIVED') {
    lifecycleActions.push({ label: 'Archive', icon: Archive, onClick: () => archive.mutate(undefined), pending: archive.isPending });
  }

  return (
    <div>
      <PageHeader
        title={product.productName}
        breadcrumbs={[{ label: 'Products', href: ROUTES.PRODUCTS }, { label: product.productName }]}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={product.status} />
            <Link href={`/ai-content-studio/${product.id}`}>
              <Button variant="outline">
                <Sparkles className="h-4 w-4" />
                AI Content Studio
              </Button>
            </Link>
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Edit className="h-4 w-4" />
              Edit
            </Button>
            {lifecycleActions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">Actions</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {lifecycleActions.map((action) => (
                    <DropdownMenuItem key={action.label} onSelect={action.onClick} disabled={action.pending}>
                      {action.pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <action.icon className="h-4 w-4" />}
                      {action.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button variant="danger" onClick={handleDelete} disabled={deleteProduct.isPending}>
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <span>
          SKU: <span className="font-medium text-foreground">{product.catalogSku}</span>
        </span>
        <Badge variant="outline" className="capitalize">
          {product.productType.toLowerCase()}
        </Badge>
        {product.isDuplicate && <Badge variant="warning">Possible duplicate</Badge>}
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="intelligence">Intelligence</TabsTrigger>
          <TabsTrigger value="supplier">Supplier</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab product={product} />
        </TabsContent>
        <TabsContent value="intelligence">
          <IntelligenceTab product={product} />
        </TabsContent>
        <TabsContent value="supplier">
          <SupplierTab supplierId={product.supplierId} />
        </TabsContent>
        <TabsContent value="pricing">
          <PricingTab product={product} />
        </TabsContent>
        <TabsContent value="inventory">
          <InventoryTab sku={product.catalogSku} />
        </TabsContent>
        <TabsContent value="marketplace">
          <MarketplaceTab catalogProductId={product.id} />
        </TabsContent>
        <TabsContent value="activity">
          <ActivityTab productId={product.id} />
        </TabsContent>
      </Tabs>

      <ProductFormDialog open={editOpen} onOpenChange={setEditOpen} product={product} />
    </div>
  );
}

function OverviewTab({ product }: { product: NonNullable<ReturnType<typeof useProduct>['data']> }) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Description</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-foreground">{product.description ?? product.shortDescription ?? 'No description yet.'}</p>
          {product.specifications && product.specifications.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Specifications</p>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                {product.specifications.map((s, i) => (
                  <div key={i} className="flex justify-between border-b border-border py-1">
                    <dt className="text-muted-foreground">{s.key}</dt>
                    <dd className="text-foreground">
                      {s.value} {s.unit ?? ''}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
          {product.attributes && product.attributes.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Attributes</p>
              <div className="flex flex-wrap gap-1.5">
                {product.attributes.map((a, i) => (
                  <Badge key={i} variant="outline">
                    {a.key}: {a.value}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Images</CardTitle>
        </CardHeader>
        <CardContent>
          {product.images.length === 0 ? (
            <EmptyState title="No images" className="border-none py-6" />
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {product.images.map((img, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={img} alt="" className="aspect-square w-full rounded-[calc(var(--radius)-4px)] object-cover" />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function IntelligenceTab({ product }: { product: NonNullable<ReturnType<typeof useProduct>['data']> }) {
  const hasReferences = product.procurementId || product.qualityInspectionId;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sourcing intelligence</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasReferences ? (
          <EmptyState title="No linked intelligence records" description="This product wasn't sourced from a procurement or quality inspection record." className="border-none py-8" />
        ) : (
          <dl className="grid gap-4 sm:grid-cols-2 text-sm">
            {product.procurementId && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Procurement reference</dt>
                <dd className="mt-0.5 text-foreground">{product.procurementId}</dd>
              </div>
            )}
            {product.qualityInspectionId && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Quality inspection reference</dt>
                <dd className="mt-0.5 text-foreground">{product.qualityInspectionId}</dd>
              </div>
            )}
          </dl>
        )}
      </CardContent>
    </Card>
  );
}

function SupplierTab({ supplierId }: { supplierId?: string | null }) {
  const { data: supplier, isLoading } = useSupplier(supplierId ?? undefined);

  if (!supplierId) return <EmptyState title="No supplier linked" description="Link a supplier when editing this product." />;
  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (!supplier) return <EmptyState title="Supplier not found" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{supplier.name}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Status</p>
          <StatusBadge status={supplier.status} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Country</p>
          <p className="text-foreground">{supplier.country}</p>
        </div>
        {supplier.contactEmail && (
          <div>
            <p className="text-xs text-muted-foreground">Contact</p>
            <p className="text-foreground">{supplier.contactEmail}</p>
          </div>
        )}
        <div>
          <p className="text-xs text-muted-foreground">Avg lead time</p>
          <p className="text-foreground">{supplier.avgLeadTimeDays ? `${supplier.avgLeadTimeDays} days` : '—'}</p>
        </div>
        <div className="sm:col-span-2">
          <Link href={`${ROUTES.SUPPLIERS}/${supplier.id}`} className="text-xs font-medium text-primary hover:underline">
            View supplier profile →
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function PricingTab({ product }: { product: NonNullable<ReturnType<typeof useProduct>['data']> }) {
  const currency = product.currency ?? 'USD';
  const margin =
    product.suggestedSellingPrice && product.landedCost ? (((product.suggestedSellingPrice - product.landedCost) / product.suggestedSellingPrice) * 100).toFixed(1) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pricing</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <PriceStat label="Purchase cost" value={product.purchaseCost} currency={currency} />
        <PriceStat label="Landed cost" value={product.landedCost} currency={currency} />
        <PriceStat label="Selling price" value={product.suggestedSellingPrice} currency={currency} emphasize />
        <div>
          <p className="text-xs text-muted-foreground">Est. margin</p>
          <p className="text-lg font-bold text-foreground">{margin ? `${margin}%` : '—'}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function PriceStat({ label, value, currency, emphasize }: { label: string; value?: number | null; currency: string; emphasize?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={emphasize ? 'text-lg font-bold text-foreground' : 'text-sm font-semibold text-foreground'}>{value != null ? formatCurrency(value, currency) : '—'}</p>
    </div>
  );
}

function InventoryTab({ sku }: { sku: string }) {
  const { data: availability, isLoading } = useAvailabilityBySku(sku);

  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (!availability) return <EmptyState title="No inventory data" description="No availability record exists yet for this SKU." />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventory availability</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Available to sell" value={availability.availableToSell} emphasize />
        <Stat label="Physical stock" value={availability.physicalStock} />
        <Stat label="Reserved" value={availability.reservedStock} />
        <Stat label="Safety stock" value={availability.safetyStock} />
        <Stat label="Incoming" value={availability.incomingStock} />
        <Stat label="In transit" value={availability.inTransitStock} />
        <Stat label="Allocated" value={availability.allocatedStock} />
        <Stat label="Damaged" value={availability.damagedStock} />
      </CardContent>
      {availability.availableToSell <= availability.safetyStock && (
        <CardContent className="pt-0">
          <Badge variant="warning">Reorder recommended</Badge>
        </CardContent>
      )}
    </Card>
  );
}

function Stat({ label, value, emphasize }: { label: string; value: number; emphasize?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={emphasize ? 'text-lg font-bold text-foreground' : 'text-sm font-semibold text-foreground'}>{value.toLocaleString()}</p>
    </div>
  );
}

function MarketplaceTab({ catalogProductId }: { catalogProductId: string }) {
  const { data: universalListings, isLoading } = useUniversalListings(catalogProductId);
  const primaryListing = universalListings?.[0];
  const { data: marketplaceListings, isLoading: marketplaceLoading } = useMarketplaceListings(primaryListing?.id);

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!universalListings || universalListings.length === 0) return <EmptyState title="No listing generated yet" description="Generate a listing to see marketplace readiness here." />;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Listing readiness</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <StatusBadge status={primaryListing?.status ?? ''} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Quality score</p>
            <p className="text-sm font-semibold text-foreground">{primaryListing?.qualityScore != null ? primaryListing.qualityScore.toFixed(0) : '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">AI content</p>
            <p className="text-sm text-foreground">
              {[primaryListing?.aiDescriptionId && 'Description', primaryListing?.aiSeoId && 'SEO', primaryListing?.aiImageSetId && 'Images'].filter(Boolean).join(', ') || 'Not generated'}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Marketplace availability</CardTitle>
        </CardHeader>
        <CardContent>
          {marketplaceLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : !marketplaceListings || marketplaceListings.length === 0 ? (
            <EmptyState title="Not published to any marketplace yet" className="border-none py-6" />
          ) : (
            <div className="space-y-2">
              {marketplaceListings.map((ml) => (
                <div key={ml.id} className="flex items-center justify-between rounded-[calc(var(--radius)-4px)] border border-border px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {ml.marketplaceKey} <span className="text-xs text-muted-foreground">{ml.country}</span>
                    </p>
                    {ml.readinessScore != null && <p className="text-xs text-muted-foreground">Readiness: {ml.readinessScore.toFixed(0)}</p>}
                  </div>
                  <StatusBadge status={ml.status} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ActivityTab({ productId }: { productId: string }) {
  const { data: history, isLoading } = useProductHistory(productId);

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!history || history.length === 0) return <EmptyState title="No history yet" />;

  return (
    <ol className="space-y-3">
      {history.map((entry) => (
        <li key={entry.id} className="relative border-l border-border pl-4">
          <span className="absolute -left-[3px] top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
          <p className="text-sm text-foreground">
            {entry.fromStatus} → {entry.toStatus}
          </p>
          {entry.reason && <p className="text-xs text-muted-foreground">{entry.reason}</p>}
          <p className="text-xs text-muted-foreground">{new Date(entry.createdAt).toLocaleString()}</p>
        </li>
      ))}
    </ol>
  );
}
