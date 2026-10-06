'use client';

import { AlertTriangle, Inbox, RefreshCw, ShieldAlert, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface StateProps {
  title: string;
  description?: string;
  icon?: React.ElementType;
  action?: { label: string; onClick: () => void };
  className?: string;
}

function BaseState({ title, description, icon: Icon, action, className, iconClassName }: StateProps & { iconClassName?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-[var(--radius)] border border-dashed border-border px-6 py-14 text-center', className)}>
      {Icon && (
        <div className={cn('mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted', iconClassName)}>
          <Icon className="h-5.5 w-5.5" />
        </div>
      )}
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && (
        <Button variant="outline" size="sm" className="mt-4" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ icon = Inbox, ...props }: StateProps) {
  return <BaseState icon={icon} iconClassName="text-muted-foreground" {...props} />;
}

export function ErrorState({ icon = AlertTriangle, title = 'Something went wrong', description = 'We ran into a problem loading this data.', action, ...props }: Partial<StateProps>) {
  return (
    <BaseState
      icon={icon}
      title={title}
      description={description}
      iconClassName="bg-danger/10 text-danger"
      action={action ?? undefined}
      {...props}
    />
  );
}

export function UnauthorizedState({
  title = "You don't have access to this",
  description = 'Your role does not have permission to view this page. Contact a workspace admin if you think this is a mistake.',
  icon = ShieldAlert,
  ...props
}: Partial<StateProps>) {
  return <BaseState icon={icon} title={title} description={description} iconClassName="bg-warning/10 text-warning" {...props} />;
}

export function DegradedState({
  title = 'This data may be out of date',
  description = 'One or more upstream services are degraded — showing the last known data.',
  icon = WifiOff,
  ...props
}: Partial<StateProps>) {
  return <BaseState icon={icon} title={title} description={description} iconClassName="bg-warning/10 text-warning" {...props} />;
}

/** Convenience: an `ErrorState` pre-wired with a "Try again" action calling `refetch`. */
export function QueryErrorState({ refetch, description }: { refetch: () => void; description?: string }) {
  return <ErrorState description={description} action={{ label: 'Try again', onClick: refetch }} icon={RefreshCw} />;
}
