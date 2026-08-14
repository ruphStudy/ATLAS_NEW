import { Badge, type BadgeProps } from './badge';
import { cn } from '@/lib/utils';

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple';

/** Generic word→tone heuristic so any module's status enum gets a sensible color without per-module hardcoding — override with the `tone` prop when a specific status needs a different treatment. */
const TONE_KEYWORDS: Record<StatusTone, string[]> = {
  success: ['ACTIVE', 'APPROVED', 'PUBLISHED', 'COMPLETED', 'RESOLVED', 'HEALTHY', 'PAID', 'VERIFIED', 'PREFERRED', 'CONNECTED', 'SUCCESS', 'DONE', 'ENABLED'],
  danger: ['REJECTED', 'FAILED', 'SUSPENDED', 'BLACKLISTED', 'CANCELLED', 'CANCELED', 'ERROR', 'UNHEALTHY', 'OFFLINE', 'BLOCKED', 'OVERDUE', 'EXPIRED', 'CRITICAL'],
  warning: ['PENDING', 'DRAFT', 'PROSPECT', 'REVIEW', 'DEGRADED', 'WARNING', 'AWAITING', 'ON_HOLD', 'PAUSED', 'PARTIAL'],
  info: ['PROCESSING', 'IN_PROGRESS', 'SCHEDULED', 'MAINTENANCE', 'SYNCING'],
  neutral: ['ARCHIVED', 'INACTIVE', 'DISMISSED', 'DISABLED', 'UNKNOWN'],
  purple: ['AI_GENERATED', 'READY_FOR_AI'],
};

function inferTone(status: string): StatusTone {
  const normalized = status.toUpperCase().replace(/[\s-]/g, '_');
  for (const [tone, keywords] of Object.entries(TONE_KEYWORDS) as [StatusTone, string[]][]) {
    if (keywords.some((kw) => normalized.includes(kw))) return tone;
  }
  return 'neutral';
}

const toneToBadgeVariant: Record<StatusTone, BadgeProps['variant']> = {
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  info: 'info',
  neutral: 'secondary',
  purple: 'purple',
};

export interface StatusBadgeProps extends Omit<BadgeProps, 'variant'> {
  status: string;
  tone?: StatusTone;
  label?: string;
}

export function StatusBadge({ status, tone, label, className, ...props }: StatusBadgeProps) {
  const resolvedTone = tone ?? inferTone(status);
  return (
    <Badge variant={toneToBadgeVariant[resolvedTone]} className={cn('capitalize', className)} {...props}>
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
      {(label ?? status).toLowerCase().replace(/_/g, ' ')}
    </Badge>
  );
}
