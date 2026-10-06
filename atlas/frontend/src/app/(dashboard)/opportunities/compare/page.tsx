'use client';

import { useSearchParams } from 'next/navigation';
import { useQueries } from '@tanstack/react-query';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/states';
import { ScoreBadge } from '@/components/product-intelligence/score-badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { getOpportunityById } from '@/services/opportunities.service';

const ROWS: { label: string; key: 'finalScore' | 'demandScore' | 'competitionScore' | 'profitScore' | 'supplierScore' | 'aiScore' }[] = [
  { label: 'Final score', key: 'finalScore' },
  { label: 'Demand', key: 'demandScore' },
  { label: 'Competition', key: 'competitionScore' },
  { label: 'Profit', key: 'profitScore' },
  { label: 'Supplier', key: 'supplierScore' },
  { label: 'AI', key: 'aiScore' },
];

export default function CompareOpportunitiesPage() {
  const searchParams = useSearchParams();
  const ids = (searchParams.get('ids') ?? '').split(',').filter(Boolean);

  const results = useQueries({
    queries: ids.map((id) => ({ queryKey: ['opportunities', id], queryFn: () => getOpportunityById(id), enabled: !!id })),
  });

  const isLoading = results.some((r) => r.isLoading);
  const opportunities = results.map((r) => r.data).filter((o): o is NonNullable<typeof o> => !!o);

  return (
    <div>
      <PageHeader title="Compare opportunities" breadcrumbs={[{ label: 'Opportunities', href: '/opportunities' }, { label: 'Compare' }]} />

      {ids.length === 0 ? (
        <EmptyState title="No opportunities selected" description="Select two or more opportunities from the list to compare them." />
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius)] border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Metric</th>
                {opportunities.map((o) => (
                  <th key={o.id} className="px-4 py-2.5 text-left text-xs font-semibold text-foreground">
                    {o.keyword}
                    <p className="text-[10px] font-normal text-muted-foreground">
                      {o.marketplace} · {o.country}
                    </p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-2.5 text-muted-foreground">Status</td>
                {opportunities.map((o) => (
                  <td key={o.id} className="px-4 py-2.5">
                    <StatusBadge status={o.status} />
                  </td>
                ))}
              </tr>
              {ROWS.map((row) => (
                <tr key={row.key}>
                  <td className="px-4 py-2.5 text-muted-foreground">{row.label}</td>
                  {opportunities.map((o) => (
                    <td key={o.id} className="px-4 py-2.5">
                      <ScoreBadge score={o[row.key]} />
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <td className="px-4 py-2.5 text-muted-foreground">Category</td>
                {opportunities.map((o) => (
                  <td key={o.id} className="px-4 py-2.5 text-foreground">
                    {o.category ?? '—'}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
