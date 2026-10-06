import { EmptyState } from '@/components/ui/states';

/** Renders an arbitrary, backend-computed analysis object generically — the shape of `demandAnalysis`/`competitionAnalysis`/etc isn't typed on the backend (`Record<string, unknown>`), so this reflects whatever fields are actually present rather than assuming a fixed layout. */
export function AnalysisBlock({ title, data }: { title: string; data?: Record<string, unknown> }) {
  const entries = data ? Object.entries(data).filter(([, v]) => v !== null && v !== undefined) : [];

  if (entries.length === 0) {
    return <EmptyState title={`No ${title.toLowerCase()} yet`} description="Run analysis to populate this section." className="border-none py-6" />;
  }

  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
      {entries.map(([key, value]) => (
        <div key={key} className="min-w-0">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{key.replace(/([A-Z])/g, ' $1').trim()}</dt>
          <dd className="mt-0.5 truncate text-sm text-foreground">
            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}
