'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQueries } from '@tanstack/react-query';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/states';
import { StatusBadge } from '@/components/ui/status-badge';
import { TierBadge } from '@/components/suppliers/tier-badge';
import { getSupplierById } from '@/services/suppliers.service';
import { QUERY_KEYS, ROUTES } from '@/constants';
import { formatDate } from '@/lib/utils';

const ROWS: { label: string; render: (s: Awaited<ReturnType<typeof getSupplierById>>) => React.ReactNode }[] = [
  { label: 'Status', render: (s) => <StatusBadge status={s.status} /> },
  { label: 'Tier', render: (s) => <TierBadge tier={s.tier} /> },
  { label: 'Location', render: (s) => [s.city, s.country].filter(Boolean).join(', ') || '—' },
  { label: 'Categories', render: (s) => s.categories.join(', ') || '—' },
  { label: 'MOQ', render: (s) => (s.minOrderQuantity != null ? String(s.minOrderQuantity) : '—') },
  { label: 'Avg lead time', render: (s) => (s.avgLeadTimeDays != null ? `${s.avgLeadTimeDays} days` : '—') },
  { label: 'Verification score', render: (s) => (s.verificationScore != null ? `${s.verificationScore}/100` : '—') },
  { label: 'Risk score', render: (s) => (s.riskScore != null ? `${s.riskScore}/100` : '—') },
  { label: 'Performance score', render: (s) => (s.performanceScore != null ? `${s.performanceScore}/100` : '—') },
  { label: 'Rating', render: (s) => (s.overallRating != null ? `${s.overallRating}/5` : '—') },
  { label: 'Payment terms', render: (s) => (s.paymentTerms?.netDays != null ? `Net ${s.paymentTerms.netDays}` : '—') },
  { label: 'Shipping terms', render: (s) => s.shippingTerms?.incoterms ?? '—' },
  { label: 'Added', render: (s) => formatDate(s.createdAt) },
];

function CompareSuppliersPageContent() {
  const searchParams = useSearchParams();
  const ids = (searchParams.get('ids') ?? '').split(',').filter(Boolean);

  const results = useQueries({
    queries: ids.map((id) => ({ queryKey: [QUERY_KEYS.SUPPLIERS, id], queryFn: () => getSupplierById(id), enabled: !!id })),
  });

  const isLoading = results.some((r) => r.isLoading);
  const suppliers = results.map((r) => r.data).filter((s): s is NonNullable<typeof s> => !!s);

  return (
    <div>
      <PageHeader title="Compare suppliers" breadcrumbs={[{ label: 'Suppliers', href: ROUTES.SUPPLIERS }, { label: 'Compare' }]} />

      {ids.length === 0 ? (
        <EmptyState title="No suppliers selected" description="Select two or more suppliers from the list to compare them." />
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius)] border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Metric</th>
                {suppliers.map((s) => (
                  <th key={s.id} className="px-4 py-2.5 text-left text-xs font-semibold text-foreground">
                    {s.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ROWS.map((row) => (
                <tr key={row.label}>
                  <td className="px-4 py-2.5 text-muted-foreground">{row.label}</td>
                  {suppliers.map((s) => (
                    <td key={s.id} className="px-4 py-2.5 text-foreground">
                      {row.render(s)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function CompareSuppliersPage() {
  return (
    <Suspense fallback={null}>
      <CompareSuppliersPageContent />
    </Suspense>
  );
}
