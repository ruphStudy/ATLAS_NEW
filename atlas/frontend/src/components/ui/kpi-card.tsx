import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from './card';
import { Skeleton } from './skeleton';

export interface KpiCardProps {
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ElementType;
  gradient?: string;
  description?: string;
  loading?: boolean;
  className?: string;
}

export function KpiCard({ label, value, change, trend, icon: Icon, gradient = 'from-primary to-accent', description, loading, className }: KpiCardProps) {
  if (loading) {
    return (
      <Card className={cn('p-5', className)}>
        <div className="flex items-center justify-between">
          <Skeleton variant="text" className="h-3 w-24" />
          <Skeleton variant="circular" className="h-9 w-9" />
        </div>
        <Skeleton variant="text" className="mt-3 h-7 w-28" />
        <Skeleton variant="text" className="mt-2 h-3 w-32" />
      </Card>
    );
  }

  return (
    <Card hover className={cn('p-5', className)}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        {Icon && (
          <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br shadow-sm', gradient)}>
            <Icon className="h-4.5 w-4.5 text-white" />
          </div>
        )}
      </div>

      <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{value}</p>

      {(change || description) && (
        <div className="mt-1.5 flex items-center gap-1.5">
          {change && trend && trend !== 'neutral' && (
            <span className={cn('flex items-center gap-0.5 text-xs font-semibold', trend === 'up' ? 'text-success' : 'text-danger')}>
              {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {change}
            </span>
          )}
          {description && <span className="truncate text-xs text-muted-foreground">{description}</span>}
        </div>
      )}
    </Card>
  );
}
