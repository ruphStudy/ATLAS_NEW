'use client';

import { Lightbulb, TrendingDown, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/states';
import { Skeleton } from '@/components/ui/skeleton';
import type { ExecutiveInsight } from '@/types';

export function InsightsPanel({ insights, loading }: { insights: ExecutiveInsight[]; loading?: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-primary" />
          Opportunities &amp; insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : insights.length === 0 ? (
          <EmptyState title="No insights yet" description="Business insights will appear here as they're generated." className="border-none py-8" />
        ) : (
          insights.map((insight, i) => {
            const isPositive = insight.impact?.toLowerCase().includes('positive') || insight.insightType?.toLowerCase().includes('opportunity');
            const Icon = isPositive ? TrendingUp : TrendingDown;
            return (
              <div key={`${insight.category}-${i}`} className="rounded-[calc(var(--radius)-4px)] border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <Icon className={isPositive ? 'mt-0.5 h-4 w-4 shrink-0 text-success' : 'mt-0.5 h-4 w-4 shrink-0 text-warning'} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{insight.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{insight.description}</p>
                      {insight.recommendation && <p className="mt-1 text-xs font-medium text-primary">{insight.recommendation}</p>}
                    </div>
                  </div>
                  <Badge variant="outline" className="shrink-0 capitalize">
                    {insight.category.replace(/_/g, ' ')}
                  </Badge>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
