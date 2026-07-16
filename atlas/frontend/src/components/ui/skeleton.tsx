import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'circular' | 'text';
}

function Skeleton({ className, variant = 'default', ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse bg-muted',
        variant === 'circular' && 'rounded-full',
        variant === 'text' && 'rounded h-4',
        variant === 'default' && 'rounded-[var(--radius)]',
        className,
      )}
      {...props}
    />
  );
}

/* ── Skeleton Card ─────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="rounded-[var(--radius)] border border-border bg-card p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" className="h-10 w-10" />
        <div className="space-y-2 flex-1">
          <Skeleton variant="text" className="h-3 w-24" />
          <Skeleton variant="text" className="h-3 w-36" />
        </div>
      </div>
      <Skeleton className="h-16 w-full" />
      <div className="space-y-2">
        <Skeleton variant="text" className="h-3 w-full" />
        <Skeleton variant="text" className="h-3 w-4/5" />
      </div>
    </div>
  );
}

export { Skeleton, SkeletonCard };
