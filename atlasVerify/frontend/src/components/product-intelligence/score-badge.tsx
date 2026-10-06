import { cn } from '@/lib/utils';

function toneForScore(score: number): string {
  if (score >= 70) return 'bg-success/10 text-success border-success/20';
  if (score >= 40) return 'bg-warning/10 text-warning border-warning/20';
  return 'bg-danger/10 text-danger border-danger/20';
}

export function ScoreBadge({ score, label, className }: { score?: number | null; label?: string; className?: string }) {
  if (score === undefined || score === null) {
    return <span className={cn('inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground', className)}>{label ? `${label}: —` : '—'}</span>;
  }
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold', toneForScore(score), className)}>
      {label && <span className="font-normal opacity-80">{label}</span>}
      {score.toFixed(0)}
    </span>
  );
}
