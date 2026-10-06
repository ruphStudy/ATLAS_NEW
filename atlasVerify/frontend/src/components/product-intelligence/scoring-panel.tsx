'use client';

import { Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/states';
import { ScoreBadge } from './score-badge';
import { useLatestProductScore, useTriggerRescoring } from '@/hooks';

const RISK_TONE: Record<string, string> = { LOW: 'success', MEDIUM: 'warning', HIGH: 'danger' };

export function ScoringPanel({ opportunityId }: { opportunityId: string }) {
  const { data: score, isLoading } = useLatestProductScore(opportunityId);
  const rescore = useTriggerRescoring(opportunityId);

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => rescore.mutate()} disabled={rescore.isPending}>
          {rescore.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Re-score
        </Button>
      </div>

      {!score ? (
        <EmptyState title="No score yet" description="Trigger scoring to see the breakdown and rationale." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            <ScoreStat label="Final" score={score.finalScore} large />
            <ScoreStat label="Demand" score={score.demandScore} />
            <ScoreStat label="Competition" score={score.competitionScore} />
            <ScoreStat label="Profit" score={score.profitScore} />
            <ScoreStat label="Supplier" score={score.supplierScore} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {score.recommendation && <Badge variant={score.recommendation === 'BUY' ? 'success' : score.recommendation === 'REJECT' ? 'danger' : 'warning'}>{score.recommendation}</Badge>}
            {score.riskLevel && <Badge variant={RISK_TONE[score.riskLevel] as 'success' | 'warning' | 'danger'}>{score.riskLevel} risk</Badge>}
            {score.confidenceLevel && (
              <Badge variant="outline">
                {score.confidenceLevel.toLowerCase()} confidence{score.confidenceScore != null ? ` (${score.confidenceScore.toFixed(0)}%)` : ''}
              </Badge>
            )}
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Strengths</CardTitle>
              </CardHeader>
              <CardContent>
                {score.strengths && score.strengths.length > 0 ? (
                  <ul className="list-inside list-disc space-y-1 text-sm text-foreground">
                    {score.strengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">None recorded.</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Weaknesses</CardTitle>
              </CardHeader>
              <CardContent>
                {score.weaknesses && score.weaknesses.length > 0 ? (
                  <ul className="list-inside list-disc space-y-1 text-sm text-foreground">
                    {score.weaknesses.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">None recorded.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {score.weights && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Weights applied</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-4">
                {Object.entries(score.weights).map(([key, value]) => (
                  <div key={key}>
                    <p className="text-xs capitalize text-muted-foreground">{key}</p>
                    <p className="text-sm font-semibold text-foreground">{(value * 100).toFixed(0)}%</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function ScoreStat({ label, score, large }: { label: string; score?: number | null; large?: boolean }) {
  return (
    <div className="rounded-[var(--radius)] border border-border p-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className={large ? 'mt-1 text-2xl' : 'mt-1'}>
        <ScoreBadge score={score} />
      </div>
    </div>
  );
}
