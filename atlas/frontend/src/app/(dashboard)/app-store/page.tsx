'use client';

import { useState } from 'react';
import { AlertTriangle, Loader2, Plus, Settings, ShieldCheck, Star } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FilterBar } from '@/components/ui/filter-bar';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/ui/form-field';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/states';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/action-menu';
import { ReasonDialog } from '@/components/suppliers/reason-dialog';
import {
  useActivatePlugin,
  useAppHealth,
  useAppInstallation,
  useAppInstallations,
  useAppListing,
  useAppListingHistory,
  useAppListings,
  useAppReviews,
  useAppVersions,
  useApproveAppListing,
  useArchiveAppListing,
  useDeactivatePlugin,
  useDeprecateAppVersion,
  useDisableAppInstallation,
  useEnableAppInstallation,
  useInstallApp,
  usePluginActivationHistory,
  usePluginActivations,
  usePluginManifests,
  usePublishAppVersion,
  usePublishPrivateApp,
  useQuarantinePlugin,
  useReactivatePlugin,
  useRegisterCatalogApp,
  useRegisterPrivateApp,
  useRejectAppListing,
  useReinstateAppListing,
  useRemoveAppListing,
  useRollbackAppInstallation,
  useSubmitAppForApproval,
  useSubmitAppReview,
  useSuspendAppListing,
  useUninstallApp,
  useUpdateAppInstallationConfig,
  useUpgradeAppInstallation,
} from '@/hooks';
import { formatDate } from '@/lib/utils';
import type { AppInstallationStatus, AppListing, AppListingStatus, AppPricingModel, AppPublisherType, AppVersion, PluginActivationStatus, RegisterAppListingPayload } from '@/types';
import { PlatformAdminGuard } from '@/components/auth/platform-admin-guard';

const PUBLISHER_OPTIONS: { value: AppPublisherType; label: string }[] = [
  { value: 'FIRST_PARTY', label: 'First party' },
  { value: 'PARTNER', label: 'Partner' },
  { value: 'PRIVATE', label: 'Private' },
];

const PRICING_OPTIONS: { value: AppPricingModel; label: string }[] = [
  { value: 'FREE', label: 'Free' },
  { value: 'PAID', label: 'Paid' },
  { value: 'TRIAL', label: 'Trial' },
  { value: 'SUBSCRIPTION', label: 'Subscription' },
];

const LISTING_STATUS_OPTIONS: { value: AppListingStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PENDING_APPROVAL', label: 'Pending approval' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'ARCHIVED', label: 'Archived' },
  { value: 'REMOVED', label: 'Removed' },
];

export default function AppStorePage() {
  return (
    <PlatformAdminGuard>
      <AppStorePageContent />
    </PlatformAdminGuard>
  );
}

function AppStorePageContent() {
  return (
    <div>
      <PageHeader title="App Store & Plugins" description="Browse the app catalog, manage installations, plugin activations and platform catalog approvals." />
      <Tabs defaultValue="catalog">
        <TabsList>
          <TabsTrigger value="catalog">Catalog</TabsTrigger>
          <TabsTrigger value="installations">My Installations</TabsTrigger>
          <TabsTrigger value="plugins">Plugin Activations</TabsTrigger>
          <TabsTrigger value="admin">Platform Catalog Admin</TabsTrigger>
        </TabsList>
        <TabsContent value="catalog">
          <CatalogTab />
        </TabsContent>
        <TabsContent value="installations">
          <InstallationsTab />
        </TabsContent>
        <TabsContent value="plugins">
          <PluginsTab />
        </TabsContent>
        <TabsContent value="admin">
          <PlatformAdminTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AppListingCard({ app, onSelect }: { app: AppListing; onSelect: (key: string) => void }) {
  return (
    <Card hover onClick={() => onSelect(app.key)} className="cursor-pointer">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-sm">
          <span>{app.name}</span>
          <StatusBadge status={app.publisherType} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 text-sm text-muted-foreground">
        <p className="line-clamp-2">{app.description ?? 'No description'}</p>
        <p className="flex items-center gap-1 text-xs">
          <Star className="h-3 w-3" /> {app.averageRating.toFixed(1)} ({app.ratingCount}) · {app.installCount} installs
        </p>
        <div className="flex flex-wrap gap-1 pt-1">
          <Badge variant="outline">{app.pricingModel}</Badge>
          {app.category && <Badge variant="outline">{app.category}</Badge>}
        </div>
      </CardContent>
    </Card>
  );
}

function DiscoverRow({ title, apps, onSelect }: { title: string; apps: AppListing[] | undefined; onSelect: (key: string) => void }) {
  if (!apps || apps.length === 0) return null;
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {apps.map((app) => (
          <div key={app.key} className="w-56 shrink-0">
            <AppListingCard app={app} onSelect={onSelect} />
          </div>
        ))}
      </div>
    </div>
  );
}

function CatalogTab() {
  const [publisherType, setPublisherType] = useState<AppPublisherType | ''>('');
  const [pricingModel, setPricingModel] = useState<AppPricingModel | ''>('');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const hasFilters = !!publisherType || !!pricingModel || !!category || !!search;

  const { data, isLoading } = useAppListings({ publisherType: publisherType || undefined, pricingModel: pricingModel || undefined, category: category || undefined, search: search || undefined, status: 'PUBLISHED', page, limit: 20 });
  const { data: popular } = useAppListings({ status: 'PUBLISHED', sortBy: 'installCount', sortOrder: 'desc', limit: 6 });
  const { data: recent } = useAppListings({ status: 'PUBLISHED', sortBy: 'createdAt', sortOrder: 'desc', limit: 6 });

  const topRated = [...(popular?.data ?? [])].sort((a, b) => b.averageRating - a.averageRating).slice(0, 6);

  return (
    <div>
      {!hasFilters && page === 1 && (
        <div className="mb-6 space-y-5">
          <DiscoverRow title="Popular" apps={popular?.data} onSelect={setSelectedKey} />
          <DiscoverRow title="New" apps={recent?.data} onSelect={setSelectedKey} />
          <DiscoverRow title="Recommended" apps={topRated} onSelect={setSelectedKey} />
        </div>
      )}

      <div className="mb-4 flex items-center justify-between gap-3">
        <FilterBar
          hasActiveFilters={hasFilters}
          onClearFilters={() => { setPublisherType(''); setPricingModel(''); setCategory(''); setSearch(''); setPage(1); }}
          searchValue={search}
          onSearchChange={(v) => { setSearch(v); setPage(1); }}
        >
          <Select value={publisherType} onChange={(e) => { setPublisherType(e.target.value as AppPublisherType | ''); setPage(1); }} placeholder="All publishers" options={PUBLISHER_OPTIONS} className="h-9 w-40" />
          <Select value={pricingModel} onChange={(e) => { setPricingModel(e.target.value as AppPricingModel | ''); setPage(1); }} placeholder="All pricing" options={PRICING_OPTIONS} className="h-9 w-36" />
          <Input value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} placeholder="Category" className="h-9 w-36" />
        </FilterBar>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Register private app
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No apps found" description="Try a different search or register a private app." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.data.map((app) => (
            <AppListingCard key={app.key} app={app} onSelect={setSelectedKey} />
          ))}
        </div>
      )}

      {data && data.total > 0 && (
        <Pagination page={page} limit={20} total={data.total} totalPages={data.totalPages} onPageChange={setPage} onLimitChange={() => {}} />
      )}

      <RegisterAppDialog open={createOpen} onOpenChange={setCreateOpen} isCatalog={false} />
      <AppListingDetailDialog listingKey={selectedKey} onClose={() => setSelectedKey(null)} isAdminView={false} />
    </div>
  );
}

function RegisterAppDialog({ open, onOpenChange, isCatalog }: { open: boolean; onOpenChange: (o: boolean) => void; isCatalog: boolean }) {
  const registerPrivate = useRegisterPrivateApp();
  const registerCatalog = useRegisterCatalogApp();
  const mutation = isCatalog ? registerCatalog : registerPrivate;
  const [form, setForm] = useState<RegisterAppListingPayload>({
    key: '',
    name: '',
    category: '',
    publisherType: isCatalog ? 'FIRST_PARTY' : 'PRIVATE',
    pricingModel: 'FREE',
    initialVersion: '1.0.0',
  });

  const reset = () => setForm({ key: '', name: '', category: '', publisherType: isCatalog ? 'FIRST_PARTY' : 'PRIVATE', pricingModel: 'FREE', initialVersion: '1.0.0' });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{isCatalog ? 'Register catalog app' : 'Register private app'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Key" htmlFor="app-key" required>
            <Input id="app-key" value={form.key} onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))} />
          </FormField>
          <FormField label="Name" htmlFor="app-name" required>
            <Input id="app-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </FormField>
          <FormField label="Category" htmlFor="app-category" required>
            <Input id="app-category" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
          </FormField>
          <FormField label="Initial version" htmlFor="app-version" required>
            <Input id="app-version" value={form.initialVersion} onChange={(e) => setForm((f) => ({ ...f, initialVersion: e.target.value }))} />
          </FormField>
          <FormField label="Pricing model" htmlFor="app-pricing" required>
            <Select id="app-pricing" value={form.pricingModel} onChange={(e) => setForm((f) => ({ ...f, pricingModel: e.target.value as AppPricingModel }))} options={PRICING_OPTIONS} />
          </FormField>
          {isCatalog && (
            <FormField label="Publisher type" htmlFor="app-publisher" required>
              <Select id="app-publisher" value={form.publisherType} onChange={(e) => setForm((f) => ({ ...f, publisherType: e.target.value as AppPublisherType }))} options={[{ value: 'FIRST_PARTY', label: 'First party' }, { value: 'PARTNER', label: 'Partner' }]} />
            </FormField>
          )}
          <div className="sm:col-span-2">
            <FormField label="Description" htmlFor="app-description">
              <Textarea id="app-description" rows={2} value={form.description ?? ''} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </FormField>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate(form, { onSuccess: () => { onOpenChange(false); reset(); } })}
            disabled={!form.key || !form.name || !form.category || !form.initialVersion || mutation.isPending}
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Register
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AppListingDetailDialog({ listingKey, onClose, isAdminView }: { listingKey: string | null; onClose: () => void; isAdminView: boolean }) {
  const { data: app, isLoading } = useAppListing(listingKey ?? undefined);
  const { data: versions } = useAppVersions(listingKey ?? undefined);
  const { data: reviews } = useAppReviews(listingKey ?? undefined);
  const { data: history } = useAppListingHistory(listingKey ?? undefined);
  const { data: manifests } = usePluginManifests(listingKey ?? undefined);
  const submitApproval = useSubmitAppForApproval(listingKey ?? '');
  const publishPrivate = usePublishPrivateApp(listingKey ?? '');
  const archive = useArchiveAppListing(listingKey ?? '');
  const approve = useApproveAppListing(listingKey ?? '');
  const reinstate = useReinstateAppListing(listingKey ?? '');
  const remove = useRemoveAppListing(listingKey ?? '');
  const reject = useRejectAppListing(listingKey ?? '');
  const suspend = useSuspendAppListing(listingKey ?? '');
  const publishVersion = usePublishAppVersion(listingKey ?? '');
  const deprecateVersion = useDeprecateAppVersion(listingKey ?? '');
  const submitReview = useSubmitAppReview(listingKey ?? '');
  const [rejectOpen, setRejectOpen] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [versionOpen, setVersionOpen] = useState(false);
  const [versionString, setVersionString] = useState('');
  const [installOpen, setInstallOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const actions: ActionMenuItem[] = [];
  if (app) {
    if (app.status === 'PUBLISHED') {
      actions.push({ label: 'Install', onSelect: () => setInstallOpen(true) });
    }
    if (!isAdminView) {
      if (app.status === 'DRAFT') {
        actions.push({ label: 'Submit for approval', onSelect: () => submitApproval.mutate() });
        actions.push({ label: 'Publish (private)', onSelect: () => publishPrivate.mutate() });
      }
      actions.push({ label: 'Publish new version', onSelect: () => setVersionOpen(true) });
      if (app.status !== 'ARCHIVED') {
        actions.push({ label: 'Archive', onSelect: () => archive.mutate(), destructive: true, separatorBefore: true });
      }
    }
    if (isAdminView) {
      if (app.status === 'PENDING_APPROVAL') {
        actions.push({ label: 'Approve', onSelect: () => approve.mutate() });
        actions.push({ label: 'Reject', onSelect: () => setRejectOpen(true), destructive: true });
      }
      if (app.status === 'PUBLISHED') {
        actions.push({ label: 'Suspend', onSelect: () => setSuspendOpen(true), destructive: true });
      }
      if (app.status === 'SUSPENDED') {
        actions.push({ label: 'Reinstate', onSelect: () => reinstate.mutate() });
      }
      actions.push({ label: 'Remove', onSelect: () => remove.mutate(), destructive: true, separatorBefore: true });
    }
  }

  return (
    <Dialog open={!!listingKey} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>{app?.name ?? 'App'}</span>
            {app && <ActionMenu items={actions} />}
          </DialogTitle>
        </DialogHeader>
        {isLoading || !app ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="versions">Versions</TabsTrigger>
              {manifests && manifests.length > 0 && <TabsTrigger value="plugin">Plugin</TabsTrigger>}
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                <Field label="Key" value={app.key} />
                <Field label="Category" value={app.category} />
                <Field label="Publisher" value={app.publisherName ?? app.publisherType} />
                <Field label="Pricing" value={app.pricingModel} />
                <Field label="Status" value={app.status} />
                <Field label="Current version" value={app.currentVersion ?? '—'} />
                <Field label="Plan" value={app.planKey ?? '—'} />
                <Field label="Feature flag" value={app.featureFlagKey ?? '—'} />
                <Field label="Installs" value={String(app.installCount)} />
                <Field label="Active tenants" value={String(app.activeTenantCount)} />
                <Field label="Rating" value={`${app.averageRating.toFixed(1)} (${app.ratingCount})`} />
              </div>
              {app.description && <p className="mt-4 text-sm text-muted-foreground">{app.description}</p>}
              {app.permissions.length > 0 && (
                <div className="mt-4">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Permissions</p>
                  <div className="flex flex-wrap gap-1">
                    {app.permissions.map((p) => (
                      <Badge key={p} variant="warning">{p}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {app.scopes.length > 0 && (
                <div className="mt-3">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Scopes</p>
                  <div className="flex flex-wrap gap-1">
                    {app.scopes.map((s) => (
                      <Badge key={s} variant="info">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {app.dependencies.length > 0 && (
                <div className="mt-3">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dependencies</p>
                  <div className="flex flex-wrap gap-1">
                    {app.dependencies.map((d) => (
                      <Badge key={d} variant="outline">{d}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {app.regions.length > 0 && (
                <div className="mt-3">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Regions</p>
                  <p className="text-sm text-foreground">{app.regions.join(', ')}</p>
                </div>
              )}
            </TabsContent>
            <TabsContent value="versions">
              {!versions || versions.length === 0 ? (
                <EmptyState title="No versions yet" className="border-none py-8" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Version</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Published</TableHead>
                      {!isAdminView && <TableHead />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {versions.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell className="text-sm text-foreground">{v.versionString}</TableCell>
                        <TableCell>
                          <StatusBadge status={v.status} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{v.publishedAt ? formatDate(v.publishedAt) : '—'}</TableCell>
                        {!isAdminView && (
                          <TableCell>
                            {v.status === 'PUBLISHED' && (
                              <Button size="sm" variant="outline" onClick={() => deprecateVersion.mutate(v.id)} disabled={deprecateVersion.isPending}>
                                Deprecate
                              </Button>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
            {manifests && manifests.length > 0 && (
              <TabsContent value="plugin">
                <div className="space-y-3">
                  {manifests.map((m) => (
                    <div key={m.id} className="rounded-[var(--radius)] border border-border p-3 text-sm">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-medium text-foreground">Manifest v{m.versionId}</span>
                        <StatusBadge status={m.status} />
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <Field label="Min Atlas version" value={m.minAtlasVersion ?? '—'} />
                        <Field label="Max Atlas version" value={m.maxAtlasVersion ?? '—'} />
                      </div>
                      {m.capabilities.length > 0 && (
                        <div className="mt-2">
                          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Capabilities</p>
                          <div className="flex flex-wrap gap-1">
                            {m.capabilities.map((c) => (
                              <Badge key={c} variant="secondary">{c}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {m.requiredPermissions.length > 0 && (
                        <div className="mt-2">
                          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Required permissions</p>
                          <div className="flex flex-wrap gap-1">
                            {m.requiredPermissions.map((p) => (
                              <Badge key={p} variant="warning">{p}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {m.requiredScopes.length > 0 && (
                        <div className="mt-2">
                          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Required scopes</p>
                          <div className="flex flex-wrap gap-1">
                            {m.requiredScopes.map((s) => (
                              <Badge key={s} variant="info">{s}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {m.hooks.length > 0 && (
                        <div className="mt-2">
                          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Hooks</p>
                          <p className="text-foreground">{m.hooks.join(', ')}</p>
                        </div>
                      )}
                      {m.configSchema != null && (
                        <div className="mt-2">
                          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Config schema</p>
                          <pre className="max-h-40 overflow-auto rounded-[var(--radius)] bg-muted p-2 text-xs text-foreground">{JSON.stringify(m.configSchema, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </TabsContent>
            )}
            <TabsContent value="history">
              {!history || history.length === 0 ? (
                <EmptyState title="No history yet" className="border-none py-8" />
              ) : (
                <ul className="space-y-2">
                  {history.map((h) => (
                    <li key={h.id} className="rounded-[var(--radius)] border border-border p-2 text-sm">
                      <p className="text-foreground">
                        {h.changeType}
                        {h.fromStatus && h.toStatus ? ` (${h.fromStatus} → ${h.toStatus})` : ''}
                      </p>
                      {h.reason && <p className="mt-1 text-muted-foreground">{h.reason}</p>}
                      <p className="mt-1 text-xs text-muted-foreground">{h.changedBy ?? 'System'} · {formatDate(h.createdAt)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
            <TabsContent value="reviews">
              <div className="mb-3 flex items-end gap-2">
                <FormField label="Rating" htmlFor="review-rating">
                  <Select id="review-rating" value={String(rating)} onChange={(e) => setRating(Number(e.target.value))} options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n} star${n > 1 ? 's' : ''}` }))} className="h-9 w-32" />
                </FormField>
                <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Comment (optional)" className="h-9 flex-1" />
                <Button size="sm" onClick={() => submitReview.mutate({ rating, comment: comment || undefined }, { onSuccess: () => setComment('') })} disabled={submitReview.isPending}>
                  Submit
                </Button>
              </div>
              {!reviews || reviews.data.length === 0 ? (
                <EmptyState title="No reviews yet" className="border-none py-8" />
              ) : (
                <ul className="space-y-2">
                  {reviews.data.map((r) => (
                    <li key={r.id} className="rounded-[var(--radius)] border border-border p-2 text-sm">
                      <p className="flex items-center gap-1 text-foreground">
                        <Star className="h-3 w-3" /> {r.rating}/5
                      </p>
                      {r.comment && <p className="mt-1 text-muted-foreground">{r.comment}</p>}
                      <p className="mt-1 text-xs text-muted-foreground">{formatDate(r.createdAt)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>

      <ReasonDialog open={rejectOpen} onOpenChange={setRejectOpen} title="Reject this app" confirmLabel="Reject" variant="danger" pending={reject.isPending} onSubmit={(reason) => reject.mutate(reason, { onSuccess: () => setRejectOpen(false) })} />
      <ReasonDialog open={suspendOpen} onOpenChange={setSuspendOpen} title="Suspend this app" confirmLabel="Suspend" variant="danger" pending={suspend.isPending} onSubmit={(reason) => suspend.mutate(reason, { onSuccess: () => setSuspendOpen(false) })} />

      <Dialog open={versionOpen} onOpenChange={setVersionOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Publish new version</DialogTitle>
          </DialogHeader>
          <FormField label="Version string" htmlFor="version-string" required>
            <Input id="version-string" value={versionString} onChange={(e) => setVersionString(e.target.value)} placeholder="1.1.0" />
          </FormField>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVersionOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => publishVersion.mutate({ versionString }, { onSuccess: () => { setVersionOpen(false); setVersionString(''); } })} disabled={!versionString || publishVersion.isPending}>
              Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {app && <InstallConsentDialog app={app} open={installOpen} onClose={() => setInstallOpen(false)} />}
    </Dialog>
  );
}

function InstallConsentDialog({ app, open, onClose }: { app: AppListing; open: boolean; onClose: () => void }) {
  const install = useInstallApp(app.key);
  const [credentials, setCredentials] = useState('');
  const isPaid = app.pricingModel === 'PAID' || app.pricingModel === 'SUBSCRIPTION';

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Install {app.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Pricing" value={app.pricingModel} />
            <Field label="Plan required" value={app.planKey ?? 'None'} />
          </div>
          {isPaid && (
            <div className="flex items-start gap-2 rounded-[var(--radius)] border border-warning/30 bg-warning/10 p-2 text-warning">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>This is a {app.pricingModel.toLowerCase()} app. Installing may affect your billing and usage. Ensure your plan/license covers this app before continuing — installation will be rejected if eligibility checks fail.</p>
            </div>
          )}
          {app.permissions.length > 0 && (
            <div>
              <p className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" /> Required permissions
              </p>
              <div className="flex flex-wrap gap-1">
                {app.permissions.map((p) => (
                  <Badge key={p} variant="warning">{p}</Badge>
                ))}
              </div>
            </div>
          )}
          {app.scopes.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Required scopes</p>
              <div className="flex flex-wrap gap-1">
                {app.scopes.map((s) => (
                  <Badge key={s} variant="info">{s}</Badge>
                ))}
              </div>
            </div>
          )}
          {app.dependencies.length > 0 && (
            <div className="flex items-start gap-2 rounded-[var(--radius)] border border-border p-2 text-muted-foreground">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>Depends on: {app.dependencies.join(', ')}. These must already be installed and enabled or this app may not function correctly.</p>
            </div>
          )}
          {app.regions.length > 0 && (
            <Field label="Available regions" value={app.regions.join(', ')} />
          )}
          <FormField label="Credentials (optional, never shown again)" htmlFor="install-credentials">
            <Input id="install-credentials" type="password" value={credentials} onChange={(e) => setCredentials(e.target.value)} placeholder="Enter credentials if required" />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => install.mutate({ credentials: credentials || undefined }, { onSuccess: () => { onClose(); setCredentials(''); } })}
            disabled={install.isPending}
          >
            {install.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirm install
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InstallationsTab() {
  const [status, setStatus] = useState<AppInstallationStatus | ''>('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data, isLoading } = useAppInstallations({ status: status || undefined, page, limit: 20 });

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Select
          value={status}
          onChange={(e) => { setStatus(e.target.value as AppInstallationStatus | ''); setPage(1); }}
          placeholder="All statuses"
          options={[{ value: 'INSTALLED', label: 'Installed' }, { value: 'ENABLED', label: 'Enabled' }, { value: 'DISABLED', label: 'Disabled' }, { value: 'UNINSTALLED', label: 'Uninstalled' }]}
          className="h-9 w-40"
        />
      </div>
      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No installations yet" description="Install an app from the catalog to see it here." />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>App</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Installed</TableHead>
                <TableHead>Last used</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((i) => (
                <TableRow key={i.id} clickable onClick={() => setSelectedId(i.id)}>
                  <TableCell className="text-sm font-medium text-foreground">{i.appKey}</TableCell>
                  <TableCell>
                    <StatusBadge status={i.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(i.installedAt)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{i.lastUsedAt ? formatDate(i.lastUsedAt) : 'Never'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.total > 0 && <Pagination page={page} limit={20} total={data.total} totalPages={data.totalPages} onPageChange={setPage} onLimitChange={() => {}} />}
        </>
      )}
      <InstallationDetailDialog id={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function InstallationDetailDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: installation, isLoading } = useAppInstallation(id ?? undefined);
  const { data: versions } = useAppVersions(installation?.appKey);
  const { data: health } = useAppHealth(installation?.appKey);
  const uninstall = useUninstallApp(id ?? '');
  const enable = useEnableAppInstallation(id ?? '');
  const disable = useDisableAppInstallation(id ?? '');
  const rollback = useRollbackAppInstallation(id ?? '');
  const activatePlugin = useActivatePlugin(id ?? '');
  const [rollbackOpen, setRollbackOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [configureOpen, setConfigureOpen] = useState(false);
  const [targetVersionId, setTargetVersionId] = useState('');

  const actions: ActionMenuItem[] = [];
  if (installation) {
    if (installation.status === 'INSTALLED' || installation.status === 'DISABLED') {
      actions.push({ label: 'Enable', onSelect: () => enable.mutate() });
    }
    if (installation.status === 'ENABLED') {
      actions.push({ label: 'Disable', onSelect: () => disable.mutate() });
    }
    actions.push({ label: 'Configure', icon: Settings, onSelect: () => setConfigureOpen(true) });
    actions.push({ label: 'Upgrade', onSelect: () => setUpgradeOpen(true) });
    actions.push({ label: 'Roll back', onSelect: () => setRollbackOpen(true) });
    actions.push({ label: 'Activate plugin', onSelect: () => activatePlugin.mutate({}) });
    if (installation.status !== 'UNINSTALLED') {
      actions.push({ label: 'Uninstall', onSelect: () => uninstall.mutate(), destructive: true, separatorBefore: true });
    }
  }

  return (
    <Dialog open={!!id} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>Installation</span>
            {installation && <ActionMenu items={actions} />}
          </DialogTitle>
        </DialogHeader>
        {isLoading || !installation ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <Field label="App key" value={installation.appKey} />
              <Field label="Status" value={installation.status} />
              <Field label="License" value={installation.licenseId ?? '—'} />
              <Field label="Subscription" value={installation.subscriptionId ?? '—'} />
              <Field label="Installed" value={formatDate(installation.installedAt)} />
              <Field label="Enabled" value={installation.enabledAt ? formatDate(installation.enabledAt) : '—'} />
              <Field label="Disabled" value={installation.disabledAt ? formatDate(installation.disabledAt) : '—'} />
              <Field label="Last used" value={installation.lastUsedAt ? formatDate(installation.lastUsedAt) : '—'} />
            </div>
            {health && (
              <div className="rounded-[var(--radius)] border border-border p-3 text-sm">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">App health</p>
                <p className="text-foreground">
                  {health.installCount} installs · {health.activeTenantCount} active tenants · {health.averageRating.toFixed(1)}★ ({health.ratingCount})
                </p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
      <Dialog open={rollbackOpen} onOpenChange={setRollbackOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Roll back version</DialogTitle>
          </DialogHeader>
          <FormField label="Target version" htmlFor="rollback-version" required>
            {versions && versions.length > 0 ? (
              <Select id="rollback-version" value={targetVersionId} onChange={(e) => setTargetVersionId(e.target.value)} placeholder="Select a version" options={versions.map((v) => ({ value: v.id, label: `${v.versionString} (${v.status})` }))} />
            ) : (
              <Input id="rollback-version" value={targetVersionId} onChange={(e) => setTargetVersionId(e.target.value)} placeholder="Target version ID" />
            )}
          </FormField>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRollbackOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => rollback.mutate({ targetVersionId }, { onSuccess: () => { setRollbackOpen(false); setTargetVersionId(''); } })} disabled={!targetVersionId || rollback.isPending}>
              Roll back
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {installation && <UpgradeVersionDialog installation={installation} versions={versions} open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />}
      {installation && <ConfigureInstallationDialog installationId={installation.id} open={configureOpen} onClose={() => setConfigureOpen(false)} />}
    </Dialog>
  );
}

function UpgradeVersionDialog({ installation, versions, open, onClose }: { installation: { id: string; appKey: string }; versions: AppVersion[] | undefined; open: boolean; onClose: () => void }) {
  const upgrade = useUpgradeAppInstallation(installation.id);
  const [targetVersionId, setTargetVersionId] = useState('');

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Upgrade {installation.appKey}</DialogTitle>
        </DialogHeader>
        {!versions || versions.length === 0 ? (
          <EmptyState title="No versions available" className="border-none py-6" />
        ) : (
          <FormField label="Target version" htmlFor="upgrade-version" required>
            <Select id="upgrade-version" value={targetVersionId} onChange={(e) => setTargetVersionId(e.target.value)} placeholder="Select a version" options={versions.filter((v) => v.status === 'PUBLISHED').map((v) => ({ value: v.id, label: v.versionString }))} />
          </FormField>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => upgrade.mutate(targetVersionId ? { targetVersionId } : {}, { onSuccess: () => { onClose(); setTargetVersionId(''); } })}
            disabled={upgrade.isPending}
          >
            {upgrade.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Upgrade
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConfigureInstallationDialog({ installationId, open, onClose }: { installationId: string; open: boolean; onClose: () => void }) {
  const updateConfig = useUpdateAppInstallationConfig(installationId);
  const [configText, setConfigText] = useState('{}');
  const [credentials, setCredentials] = useState('');
  const [error, setError] = useState('');

  const handleSave = () => {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(configText);
    } catch {
      setError('Config must be valid JSON');
      return;
    }
    setError('');
    updateConfig.mutate({ config: parsed, credentials: credentials || undefined }, { onSuccess: () => { onClose(); setCredentials(''); } });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Configure installation</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <FormField label="Configuration (JSON)" htmlFor="config-json" error={error}>
            <Textarea id="config-json" rows={8} value={configText} onChange={(e) => setConfigText(e.target.value)} className="font-mono text-xs" />
          </FormField>
          <FormField label="Credentials (optional, never shown again)" htmlFor="config-credentials">
            <Input id="config-credentials" type="password" value={credentials} onChange={(e) => setCredentials(e.target.value)} placeholder="Enter new credentials to replace existing" />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateConfig.isPending}>
            {updateConfig.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PluginsTab() {
  const [status, setStatus] = useState<PluginActivationStatus | ''>('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = usePluginActivations({ status: status || undefined, page, limit: 20 });

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Select
          value={status}
          onChange={(e) => { setStatus(e.target.value as PluginActivationStatus | ''); setPage(1); }}
          placeholder="All statuses"
          options={[{ value: 'ACTIVE', label: 'Active' }, { value: 'DISABLED', label: 'Disabled' }, { value: 'QUARANTINED', label: 'Quarantined' }]}
          className="h-9 w-40"
        />
      </div>
      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No plugin activations yet" description="Activate a plugin from an app installation to see it here." />
      ) : (
        <>
          <div className="space-y-2">
            {data.data.map((a) => (
              <PluginActivationRow key={a.id} activation={a} />
            ))}
          </div>
          {data.total > 0 && <Pagination page={page} limit={20} total={data.total} totalPages={data.totalPages} onPageChange={setPage} onLimitChange={() => {}} />}
        </>
      )}
    </div>
  );
}

function PluginActivationRow({
  activation,
}: {
  activation: {
    id: string;
    appKey: string;
    status: PluginActivationStatus;
    consecutiveFailures: number;
    lastInvokedAt: string | null;
    lastErrorAt: string | null;
    lastErrorMessage: string | null;
    quarantinedAt: string | null;
    quarantinedReason: string | null;
    grantedPermissions: string[];
  };
}) {
  const deactivate = useDeactivatePlugin(activation.id);
  const reactivate = useReactivatePlugin(activation.id);
  const quarantine = useQuarantinePlugin(activation.id);
  const [quarantineOpen, setQuarantineOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const { data: history } = usePluginActivationHistory(historyOpen ? activation.id : undefined);

  const actions: ActionMenuItem[] = [];
  if (activation.status === 'ACTIVE') {
    actions.push({ label: 'Deactivate', onSelect: () => deactivate.mutate() });
    actions.push({ label: 'Quarantine', onSelect: () => setQuarantineOpen(true), destructive: true });
  }
  if (activation.status !== 'ACTIVE') {
    actions.push({ label: 'Reactivate', onSelect: () => reactivate.mutate() });
  }
  actions.push({ label: historyOpen ? 'Hide history' : 'View history', onSelect: () => setHistoryOpen((v) => !v), separatorBefore: true });

  return (
    <div className="rounded-[var(--radius)] border border-border p-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-medium text-foreground">{activation.appKey}</span>
        <div className="flex items-center gap-2">
          <StatusBadge status={activation.status} />
          <ActionMenu items={actions} />
        </div>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Consecutive failures: {activation.consecutiveFailures}
        {activation.lastInvokedAt ? ` · Last invoked ${formatDate(activation.lastInvokedAt)}` : ''}
        {activation.lastErrorAt ? ` · Last error ${formatDate(activation.lastErrorAt)}` : ''}
        {activation.lastErrorMessage ? ` · ${activation.lastErrorMessage}` : ''}
      </p>
      {activation.quarantinedAt && (
        <p className="mt-1 text-xs text-danger">
          Quarantined {formatDate(activation.quarantinedAt)}{activation.quarantinedReason ? `: ${activation.quarantinedReason}` : ''}
        </p>
      )}
      {activation.grantedPermissions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {activation.grantedPermissions.map((p) => (
            <Badge key={p} variant="warning">{p}</Badge>
          ))}
        </div>
      )}
      {historyOpen && (
        <div className="mt-2 border-t border-border pt-2">
          {!history || history.length === 0 ? (
            <p className="text-xs text-muted-foreground">No history yet</p>
          ) : (
            <ul className="space-y-1">
              {history.map((h) => (
                <li key={h.id} className="text-xs text-muted-foreground">
                  {h.changeType}{h.fromStatus && h.toStatus ? ` (${h.fromStatus} → ${h.toStatus})` : ''} · {formatDate(h.createdAt)}
                  {h.reason ? ` · ${h.reason}` : ''}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <ReasonDialog open={quarantineOpen} onOpenChange={setQuarantineOpen} title="Quarantine this plugin" confirmLabel="Quarantine" variant="danger" pending={quarantine.isPending} onSubmit={(reason) => quarantine.mutate({ reason }, { onSuccess: () => setQuarantineOpen(false) })} />
    </div>
  );
}

function PlatformAdminTab() {
  const [status, setStatus] = useState<AppListingStatus | ''>('PENDING_APPROVAL');
  const [page, setPage] = useState(1);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading } = useAppListings({ status: status || undefined, page, limit: 20 });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <Select value={status} onChange={(e) => { setStatus(e.target.value as AppListingStatus | ''); setPage(1); }} placeholder="All statuses" options={LISTING_STATUS_OPTIONS} className="h-9 w-48" />
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Register catalog app
        </Button>
      </div>
      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No apps in this state" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Publisher</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Installs</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((app) => (
                <TableRow key={app.key} clickable onClick={() => setSelectedKey(app.key)}>
                  <TableCell className="text-sm font-medium text-foreground">{app.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{app.publisherType}</TableCell>
                  <TableCell>
                    <StatusBadge status={app.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{app.installCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.total > 0 && <Pagination page={page} limit={20} total={data.total} totalPages={data.totalPages} onPageChange={setPage} onLimitChange={() => {}} />}
        </>
      )}
      <RegisterAppDialog open={createOpen} onOpenChange={setCreateOpen} isCatalog />
      <AppListingDetailDialog listingKey={selectedKey} onClose={() => setSelectedKey(null)} isAdminView />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-foreground">{value}</p>
    </div>
  );
}
