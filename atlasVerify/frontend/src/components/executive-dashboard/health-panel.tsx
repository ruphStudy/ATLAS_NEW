'use client';

import { HeartPulse } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/states';
import { Skeleton } from '@/components/ui/skeleton';
import type { MonitoringDashboard, MonitoringHealthLevel } from '@/types';

const LEVEL_TONE: Record<MonitoringHealthLevel, StatusTone> = {
  HEALTHY: 'success',
  DEGRADED: 'warning',
  UNHEALTHY: 'danger',
  OFFLINE: 'danger',
  MAINTENANCE: 'info',
  UNKNOWN: 'neutral',
};

export function HealthPanel({ dashboard, loading }: { dashboard?: MonitoringDashboard; loading?: boolean }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <HeartPulse className="h-4 w-4 text-primary" />
            System &amp; provider health
          </CardTitle>
          {dashboard && <StatusBadge status={dashboard.overallLevel} tone={LEVEL_TONE[dashboard.overallLevel]} />}
        </div>
      </CardHeader>
      <CardContent>
        {loading || !dashboard ? (
          <Skeleton className="h-32 w-full" />
        ) : dashboard.sources.length === 0 ? (
          <EmptyState title="No monitored sources" className="border-none py-8" />
        ) : (
          <div className="space-y-2">
            {dashboard.sources.map((source, i) => (
              <div key={`${source.sourceKey}-${i}`} className="flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <span className="text-foreground">{source.service ?? source.sourceKey}</span>
                  {source.provider && <span className="ml-1.5 text-xs text-muted-foreground">{source.provider}</span>}
                </div>
                <StatusBadge status={source.level} tone={LEVEL_TONE[source.level]} className="shrink-0" />
              </div>
            ))}
            {dashboard.openIncidentCount > 0 && (
              <p className="pt-2 text-xs text-danger">{dashboard.openIncidentCount} open incident{dashboard.openIncidentCount === 1 ? '' : 's'}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
