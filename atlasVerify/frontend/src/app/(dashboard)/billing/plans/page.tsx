'use client';

import { useMemo, useState } from 'react';
import { ArrowRightLeft } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { FilterBar } from '@/components/ui/filter-bar';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState } from '@/components/ui/states';
import { Pagination } from '@/components/ui/pagination';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { Card, CardContent } from '@/components/ui/card';
import { Drawer, DrawerBody, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { usePlan, usePlanCompatibility, usePlans } from '@/hooks';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Plan, PlanFilterParams, PlanStatus, PlanType } from '@/types';

const STATUS_OPTIONS: { value: PlanStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'DEPRECATED', label: 'Deprecated' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const TYPE_OPTIONS: { value: PlanType; label: string }[] = [
  { value: 'FREE', label: 'Free' },
  { value: 'TRIAL', label: 'Trial' },
  { value: 'STANDARD', label: 'Standard' },
  { value: 'PREMIUM', label: 'Premium' },
  { value: 'ENTERPRISE', label: 'Enterprise' },
  { value: 'CUSTOM', label: 'Custom' },
];

function lowestPrice(plan: Plan): string {
  if (!plan.prices.length) return '—';
  const cheapest = [...plan.prices].sort((a, b) => a.amount - b.amount)[0];
  return `${formatCurrency(cheapest.amount, cheapest.currency)} / ${cheapest.billingCycle.toLowerCase()}`;
}

export default function PlansPage() {
  const [status, setStatus] = useState<PlanStatus | ''>('PUBLISHED');
  const [type, setType] = useState<PlanType | ''>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);

  const params = useMemo<PlanFilterParams>(
    () => ({ status: status || undefined, type: type || undefined, search: search || undefined, page, limit }),
    [status, type, search, page, limit],
  );

  const plans = usePlans(params);
  const rows = plans.data?.data ?? [];
  const hasActiveFilters = !!(status || type || search);

  return (
    <div>
      <PageHeader
        title="Plans"
        description="Plan catalog — features, limits, pricing and eligibility, sourced directly from the plan management backend."
        actions={
          <Button size="sm" variant="outline" onClick={() => setCompareOpen(true)}>
            <ArrowRightLeft className="h-3.5 w-3.5" />
            Compare plans
          </Button>
        }
      />

      <FilterBar
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Search plans…"
        hasActiveFilters={hasActiveFilters}
        onClearFilters={() => {
          setStatus('');
          setType('');
          setSearch('');
          setPage(1);
        }}
        className="mb-4"
      >
        <Select value={status} onChange={(e) => setStatus(e.target.value as PlanStatus | '')} options={[{ value: '', label: 'All statuses' }, ...STATUS_OPTIONS]} className="h-9 w-40" />
        <Select value={type} onChange={(e) => setType(e.target.value as PlanType | '')} options={[{ value: '', label: 'All types' }, ...TYPE_OPTIONS]} className="h-9 w-40" />
      </FilterBar>

      {plans.isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : plans.isError ? (
        <QueryErrorState refetch={plans.refetch} />
      ) : rows.length === 0 ? (
        <EmptyState title="No plans found" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Starting price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Effective</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => (
                <TableRow key={p.id} className="cursor-pointer" onClick={() => setSelectedId(p.id)}>
                  <TableCell>
                    <p className="text-sm font-medium text-foreground">{p.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {p.code} · v{p.version}
                    </p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.tier}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px]">
                      {p.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{lowestPrice(p)}</TableCell>
                  <TableCell>
                    <StatusBadge status={p.status} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(p.effectiveAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination
            page={plans.data?.page ?? page}
            limit={plans.data?.limit ?? limit}
            total={plans.data?.total ?? 0}
            totalPages={plans.data?.totalPages ?? 0}
            onPageChange={setPage}
            onLimitChange={(l) => {
              setLimit(l);
              setPage(1);
            }}
          />
        </>
      )}

      <PlanDetailDrawer id={selectedId} onClose={() => setSelectedId(null)} />
      <ComparePlansDialog open={compareOpen} onOpenChange={setCompareOpen} plans={rows} />
    </div>
  );
}

function PlanDetailDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: plan, isLoading } = usePlan(id ?? undefined);

  return (
    <Drawer open={!!id} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent size="lg">
        <DrawerHeader>
          <DrawerTitle>{plan?.name ?? 'Plan'}</DrawerTitle>
        </DrawerHeader>
        <DrawerBody>
          {isLoading || !plan ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <StatusBadge status={plan.status} />
                <Badge variant="secondary" className="text-[10px]">
                  {plan.type}
                </Badge>
                <span className="text-xs text-muted-foreground">v{plan.version}</span>
              </div>

              {plan.description && <p className="text-sm text-muted-foreground">{plan.description}</p>}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <Field label="Tier" value={`${plan.tier} (rank ${plan.tierRank})`} />
                <Field label="Effective" value={formatDate(plan.effectiveAt)} />
                <Field label="Published" value={plan.publishedAt ? formatDate(plan.publishedAt) : '—'} />
                <Field label="Deprecated" value={plan.deprecatedAt ? formatDate(plan.deprecatedAt) : '—'} />
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pricing</p>
                {plan.prices.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No prices configured.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {plan.prices.map((pr, i) => (
                      <div key={i} className="rounded-[var(--radius)] border border-border p-2.5 text-sm">
                        <p className="font-semibold text-foreground">{formatCurrency(pr.amount, pr.currency)}</p>
                        <p className="text-xs text-muted-foreground">{pr.billingCycle.toLowerCase()}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Entitlements</p>
                {plan.entitlements.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No entitlements configured.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Module / Feature</TableHead>
                        <TableHead>Included</TableHead>
                        <TableHead>Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {plan.entitlements.map((e, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-sm text-foreground">
                            {e.module} / {e.feature}
                            {e.capability && <span className="text-muted-foreground"> · {e.capability}</span>}
                          </TableCell>
                          <TableCell>
                            <Badge variant={e.included ? 'success' : 'secondary'} className="text-[10px]">
                              {e.included ? 'Yes' : 'No'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{e.value !== undefined && e.value !== null ? String(e.value) : '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Limits</p>
                {plan.limits.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No limits configured.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Resource</TableHead>
                        <TableHead>Soft</TableHead>
                        <TableHead>Hard</TableHead>
                        <TableHead>Overage rule</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {plan.limits.map((l, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-sm text-foreground">{l.resourceKey}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{l.soft ?? '—'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{l.hard ?? '—'} {l.unit ?? ''}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{l.overageRule ?? '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          )}
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}

function ComparePlansDialog({ open, onOpenChange, plans }: { open: boolean; onOpenChange: (o: boolean) => void; plans: Plan[] }) {
  const [fromCode, setFromCode] = useState('');
  const [toCode, setToCode] = useState('');
  const compatibility = usePlanCompatibility(fromCode || undefined, toCode || undefined);
  const options = plans.map((p) => ({ value: p.code, label: `${p.name} (${p.code})` }));

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent size="md">
        <DrawerHeader>
          <DrawerTitle>Compare plans</DrawerTitle>
        </DrawerHeader>
        <DrawerBody>
          <div className="grid grid-cols-2 gap-4">
            <Select value={fromCode} onChange={(e) => setFromCode(e.target.value)} options={[{ value: '', label: 'From plan' }, ...options]} />
            <Select value={toCode} onChange={(e) => setToCode(e.target.value)} options={[{ value: '', label: 'To plan' }, ...options]} />
          </div>
          {fromCode && toCode && fromCode !== toCode && (
            <Card className="mt-4">
              <CardContent className="pt-6">
                {compatibility.isLoading ? (
                  <Skeleton className="h-16 w-full" />
                ) : compatibility.data ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={compatibility.data.compatible ? 'success' : 'danger'}>{compatibility.data.compatible ? 'Compatible' : 'Not compatible'}</Badge>
                      <span className="text-sm text-muted-foreground">{compatibility.data.direction.toLowerCase()}</span>
                    </div>
                    {compatibility.data.reason && <p className="text-sm text-muted-foreground">{compatibility.data.reason}</p>}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}
        </DrawerBody>
      </DrawerContent>
    </Drawer>
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
