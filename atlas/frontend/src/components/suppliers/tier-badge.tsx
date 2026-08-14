import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const TIER_STYLES: Record<string, string> = {
  GOLD: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
  SILVER: 'border-slate-400/30 bg-slate-400/10 text-slate-600 dark:text-slate-300',
  BRONZE: 'border-orange-700/30 bg-orange-700/10 text-orange-700 dark:text-orange-400',
  UNVERIFIED: 'border-border bg-secondary text-muted-foreground',
};

export function TierBadge({ tier, className }: { tier?: string | null; className?: string }) {
  if (!tier) return null;
  const key = tier.toUpperCase();
  return (
    <Badge variant="outline" className={cn('capitalize', TIER_STYLES[key] ?? TIER_STYLES['UNVERIFIED'], className)}>
      {tier.toLowerCase()}
    </Badge>
  );
}
