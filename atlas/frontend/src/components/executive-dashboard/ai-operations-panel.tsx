'use client';

import { Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import type { AiOperationsSummary } from '@/types';

export function AiOperationsPanel({ summary, currency, loading }: { summary?: AiOperationsSummary; currency: string; loading?: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-500" />
          AI operations
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading || !summary ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Requests" value={summary.totalRequests.toLocaleString()} />
              <Stat label="Success rate" value={`${(summary.successRate * 100).toFixed(1)}%`} />
              <Stat label="Total cost" value={formatCurrency(summary.totalCost, currency)} />
              <Stat label="Avg latency" value={`${summary.averageLatency.toFixed(0)}ms`} />
              <Stat label="Cost savings" value={formatCurrency(summary.costSavings, currency)} />
              <Stat label="Failure rate" value={`${(summary.failureRate * 100).toFixed(1)}%`} tone={summary.failureRate > 0.05 ? 'danger' : undefined} />
              <Stat label="Recommendations" value={String(summary.recommendationCount)} />
            </div>

            {summary.topModels.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Top models</p>
                <div className="space-y-1.5">
                  {summary.topModels.map((model) => (
                    <div key={model.modelKey} className="flex items-center justify-between text-sm">
                      <span className="truncate text-foreground">{model.modelKey}</span>
                      <span className="shrink-0 text-muted-foreground">
                        {model.requests.toLocaleString()} req · {formatCurrency(model.cost, currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'danger' }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-sm font-semibold ${tone === 'danger' ? 'text-danger' : 'text-foreground'}`}>{value}</p>
    </div>
  );
}
