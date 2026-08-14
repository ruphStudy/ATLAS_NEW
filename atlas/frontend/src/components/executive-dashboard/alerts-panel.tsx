'use client';

import Link from 'next/link';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/states';
import { Skeleton } from '@/components/ui/skeleton';
import type { AlertSeverity, ExecutiveAlert } from '@/types';

const SEVERITY_TONE: Record<AlertSeverity, StatusTone> = {
  critical: 'danger',
  high: 'danger',
  medium: 'warning',
  low: 'info',
  info: 'neutral',
};

export function AlertsPanel({ alerts, loading }: { alerts: ExecutiveAlert[]; loading?: boolean }) {
  const unresolved = alerts.filter((a) => !a.resolvedAt);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            Critical alerts
          </CardTitle>
          {unresolved.length > 0 && <span className="text-xs font-semibold text-muted-foreground">{unresolved.length} active</span>}
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : unresolved.length === 0 ? (
          <EmptyState title="No active alerts" description="Everything looks healthy." className="border-none py-8" />
        ) : (
          unresolved.map((alert) => {
            const content = (
              <div className="flex items-start gap-3 rounded-[calc(var(--radius)-4px)] px-2 py-2.5 transition-colors hover:bg-secondary">
                <StatusBadge status={alert.severity} tone={SEVERITY_TONE[alert.severity]} className="mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{alert.title}</p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{alert.description}</p>
                </div>
                {alert.actionUrl && <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
              </div>
            );
            return alert.actionUrl ? (
              <Link key={alert.id} href={alert.actionUrl} className="block">
                {content}
              </Link>
            ) : (
              <div key={alert.id}>{content}</div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
