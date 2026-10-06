'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { FilterBar } from '@/components/ui/filter-bar';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { KpiCard } from '@/components/ui/kpi-card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState } from '@/components/ui/states';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/action-menu';
import { ReasonDialog } from '@/components/suppliers/reason-dialog';
import {
  useAcceptRecommendation,
  useApproveDecision,
  useDecision,
  useDecisionStats,
  useDecisions,
  useDeferRecommendation,
  useDismissRecommendation,
  useRecommendation,
  useRecommendationStats,
  useRecommendations,
  useRejectDecision,
  useRejectRecommendation,
} from '@/hooks';
import { useAuthStore } from '@/stores';
import { formatDate } from '@/lib/utils';
import type { AiDecisionStatus, AiRecommendationStatus } from '@/types';

const DECISION_STATUS_OPTIONS: { value: AiDecisionStatus; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'EVALUATING', label: 'Evaluating' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'REVIEW_REQUIRED', label: 'Review required' },
  { value: 'DEFERRED', label: 'Deferred' },
  { value: 'OVERRIDDEN', label: 'Overridden' },
];

const RECOMMENDATION_STATUS_OPTIONS: { value: AiRecommendationStatus; label: string }[] = [
  { value: 'READY', label: 'Ready' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'DISMISSED', label: 'Dismissed' },
  { value: 'DEFERRED', label: 'Deferred' },
];

export default function AiDecisionsPage() {
  return (
    <div>
      <PageHeader title="AI Decisions & Recommendations" description="Decision scores, rationale, evidence, risks and recommendation ranking with accept/reject/defer." />
      <Tabs defaultValue="decisions">
        <TabsList>
          <TabsTrigger value="decisions">Decisions</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>
        <TabsContent value="decisions">
          <DecisionsTab />
        </TabsContent>
        <TabsContent value="recommendations">
          <RecommendationsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DecisionsTab() {
  const workspaceId = useAuthStore((s) => s.user?.workspaceId);
  const [status, setStatus] = useState<AiDecisionStatus | ''>('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data, isLoading, isError, refetch } = useDecisions({ workspaceId: workspaceId ?? '', status: status || undefined, limit: 30 });
  const stats = useDecisionStats(workspaceId);

  return (
    <div>
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Total decisions" value={stats.data?.totalDecisions ?? 0} loading={stats.isLoading} />
        <KpiCard label="Approved" value={stats.data?.approvedDecisions ?? 0} loading={stats.isLoading} />
        <KpiCard label="Approval rate" value={stats.data ? `${(stats.data.approvalRate * 100).toFixed(0)}%` : '—'} loading={stats.isLoading} />
        <KpiCard label="Avg confidence" value={stats.data ? `${(stats.data.avgConfidenceScore * 100).toFixed(0)}%` : '—'} loading={stats.isLoading} />
      </div>

      <FilterBar hasActiveFilters={!!status} onClearFilters={() => setStatus('')} className="mb-4">
        <Select value={status} onChange={(e) => setStatus(e.target.value as AiDecisionStatus | '')} placeholder="All statuses" options={DECISION_STATUS_OPTIONS} className="h-9 w-44" />
      </FilterBar>

      {isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load decisions." />
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No decisions yet" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Score / Confidence</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((d) => (
              <TableRow key={d.id} clickable onClick={() => setSelectedId(d.id)}>
                <TableCell className="text-sm font-medium text-foreground">{d.decisionType}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{d.decisionMethod}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{d.finalScore?.toFixed(1) ?? '—'} / {d.confidenceScore != null ? `${(d.confidenceScore * 100).toFixed(0)}%` : '—'}</TableCell>
                <TableCell>
                  <StatusBadge status={d.status} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(d.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <DecisionDetailDialog id={selectedId} workspaceId={workspaceId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function DecisionDetailDialog({ id, workspaceId, onClose }: { id: string | null; workspaceId: string | undefined; onClose: () => void }) {
  const userId = useAuthStore((s) => s.user?.id);
  const { data: decision, isLoading } = useDecision(id ?? undefined, workspaceId);
  const approve = useApproveDecision(id ?? '');
  const [rejectOpen, setRejectOpen] = useState(false);
  const reject = useRejectDecision(id ?? '');

  const actions: ActionMenuItem[] = [];
  if (decision && decision.status !== 'APPROVED') {
    actions.push({ label: 'Approve', onSelect: () => workspaceId && approve.mutate({ workspaceId, approvedBy: userId ?? '' }) });
    actions.push({ label: 'Reject', onSelect: () => setRejectOpen(true), destructive: true, separatorBefore: true });
  }

  return (
    <Dialog open={!!id} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>Decision detail</span>
            {decision && (
              <div className="flex items-center gap-2">
                <StatusBadge status={decision.status} />
                <ActionMenu items={actions} />
              </div>
            )}
          </DialogTitle>
        </DialogHeader>
        {isLoading || !decision ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <Field label="Type" value={decision.decisionType} />
              <Field label="Method" value={decision.decisionMethod} />
              <Field label="Outcome" value={decision.outcome ?? '—'} />
              <Field label="Final score" value={decision.finalScore?.toFixed(2) ?? '—'} />
              <Field label="Confidence" value={decision.confidenceScore != null ? `${(decision.confidenceScore * 100).toFixed(0)}%` : '—'} />
              <Field label="Model" value={`${decision.modelProvider ?? '—'} / ${decision.modelName ?? '—'}`} />
            </div>

            {decision.rationale && (
              <Card>
                <CardContent className="pt-4 text-sm">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rationale</p>
                  <p className="text-foreground">{decision.rationale}</p>
                </CardContent>
              </Card>
            )}

            {decision.risks.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Risks</p>
                <div className="space-y-2">
                  {decision.risks.map((r, i) => (
                    <div key={i} className="rounded-[var(--radius)] border border-border p-2 text-sm">
                      <p className="text-foreground">{r.description}</p>
                      <p className="text-xs text-muted-foreground">{r.type} · {r.severity}{r.mitigation ? ` · Mitigation: ${r.mitigation}` : ''}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {decision.alternatives.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Alternatives</p>
                <div className="space-y-1.5">
                  {decision.alternatives.map((a, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{a.reason}</span>
                      <span className="text-foreground">{a.score.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
      <ReasonDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title="Reject this decision"
        variant="danger"
        confirmLabel="Reject"
        pending={reject.isPending}
        onSubmit={(reason) => workspaceId && reject.mutate({ workspaceId, rejectedBy: userId ?? '', reason }, { onSuccess: () => setRejectOpen(false) })}
      />
    </Dialog>
  );
}

function RecommendationsTab() {
  const workspaceId = useAuthStore((s) => s.user?.workspaceId);
  const [status, setStatus] = useState<AiRecommendationStatus | ''>('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data, isLoading, isError, refetch } = useRecommendations({ workspaceId: workspaceId ?? '', status: status || undefined, limit: 30 });
  const stats = useRecommendationStats(workspaceId);

  return (
    <div>
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Total recommendations" value={stats.data?.totalRecommendations ?? 0} loading={stats.isLoading} />
        <KpiCard label="Accepted" value={stats.data?.acceptedRecommendations ?? 0} loading={stats.isLoading} />
        <KpiCard label="Acceptance rate" value={stats.data ? `${(stats.data.acceptanceRate * 100).toFixed(0)}%` : '—'} loading={stats.isLoading} />
        <KpiCard label="Avg score" value={stats.data?.avgOverallScore.toFixed(1) ?? '—'} loading={stats.isLoading} />
      </div>

      <FilterBar hasActiveFilters={!!status} onClearFilters={() => setStatus('')} className="mb-4">
        <Select value={status} onChange={(e) => setStatus(e.target.value as AiRecommendationStatus | '')} placeholder="All statuses" options={RECOMMENDATION_STATUS_OPTIONS} className="h-9 w-44" />
      </FilterBar>

      {isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load recommendations." />
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No recommendations yet" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Strategy</TableHead>
              <TableHead>Score / Confidence</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((r) => (
              <TableRow key={r.id} clickable onClick={() => setSelectedId(r.id)}>
                <TableCell className="text-sm font-medium text-foreground">{r.recommendationType}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.strategy}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.overallScore?.toFixed(1) ?? '—'} / {r.confidenceScore != null ? `${(r.confidenceScore * 100).toFixed(0)}%` : '—'}</TableCell>
                <TableCell>
                  <StatusBadge status={r.status} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(r.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <RecommendationDetailDialog id={selectedId} workspaceId={workspaceId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function RecommendationDetailDialog({ id, workspaceId, onClose }: { id: string | null; workspaceId: string | undefined; onClose: () => void }) {
  const userId = useAuthStore((s) => s.user?.id);
  const { data: recommendation, isLoading } = useRecommendation(id ?? undefined, workspaceId);
  const accept = useAcceptRecommendation(id ?? '');
  const reject = useRejectRecommendation(id ?? '');
  const dismiss = useDismissRecommendation(id ?? '');
  const defer = useDeferRecommendation(id ?? '');

  const actions: ActionMenuItem[] = [];
  if (recommendation && recommendation.status === 'READY') {
    actions.push({ label: 'Accept', onSelect: () => workspaceId && accept.mutate({ workspaceId, acceptedBy: userId ?? '' }) });
    actions.push({ label: 'Defer', onSelect: () => workspaceId && defer.mutate({ workspaceId, deferredBy: userId ?? '' }) });
    actions.push({ label: 'Dismiss', onSelect: () => workspaceId && dismiss.mutate({ workspaceId, dismissedBy: userId ?? '' }) });
    actions.push({ label: 'Reject', onSelect: () => workspaceId && reject.mutate({ workspaceId, rejectedBy: userId ?? '' }), destructive: true, separatorBefore: true });
  }

  return (
    <Dialog open={!!id} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>Recommendation detail</span>
            {recommendation && (
              <div className="flex items-center gap-2">
                <StatusBadge status={recommendation.status} />
                <ActionMenu items={actions} />
              </div>
            )}
          </DialogTitle>
        </DialogHeader>
        {isLoading || !recommendation ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <Field label="Type" value={recommendation.recommendationType} />
              <Field label="Strategy" value={recommendation.strategy} />
              <Field label="Overall score" value={recommendation.overallScore?.toFixed(2) ?? '—'} />
              <Field label="Confidence" value={recommendation.confidenceScore != null ? `${(recommendation.confidenceScore * 100).toFixed(0)}%` : '—'} />
              <Field label="Personalized" value={recommendation.personalized ? 'Yes' : 'No'} />
              <Field label="Model" value={`${recommendation.modelProvider ?? '—'} / ${recommendation.modelName ?? '—'}`} />
            </div>

            {recommendation.rationale && (
              <Card>
                <CardContent className="pt-4 text-sm">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rationale</p>
                  <p className="text-foreground">{recommendation.rationale}</p>
                </CardContent>
              </Card>
            )}

            {recommendation.risks.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Risks</p>
                <div className="space-y-2">
                  {recommendation.risks.map((r, i) => (
                    <div key={i} className="rounded-[var(--radius)] border border-border p-2 text-sm">
                      <p className="text-foreground">{r.description}</p>
                      <p className="text-xs text-muted-foreground">{r.type} · {r.severity}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-foreground">{value}</p>
    </div>
  );
}
