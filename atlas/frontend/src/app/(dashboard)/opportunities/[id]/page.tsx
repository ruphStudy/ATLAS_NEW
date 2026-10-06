'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { isAxiosError } from 'axios';
import { Loader2, Pencil, RefreshCw, Trash2, X } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { QueryErrorState, UnauthorizedState } from '@/components/ui/states';
import { ScoreBadge } from '@/components/product-intelligence/score-badge';
import { AnalysisBlock } from '@/components/product-intelligence/analysis-block';
import { ScoringPanel } from '@/components/product-intelligence/scoring-panel';
import { ProfitCalculatorPanel } from '@/components/product-intelligence/profit-calculator-panel';
import { useConfirm, useDeleteOpportunity, useLatestProductAnalysis, useOpportunity, useTriggerReanalysis, useUpdateOpportunity } from '@/hooks';
import type { OpportunityStatus } from '@/types';

const STATUS_OPTIONS: { value: OpportunityStatus; label: string }[] = [
  { value: 'DISCOVERED', label: 'Discovered' },
  { value: 'ANALYZING', label: 'Analyzing' },
  { value: 'VALIDATED', label: 'Validated' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'ARCHIVED', label: 'Archived' },
];

export default function OpportunityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: opportunity, isLoading, isError, error, refetch } = useOpportunity(id);
  const { data: analysis, isLoading: analysisLoading } = useLatestProductAnalysis(id);
  const reanalyze = useTriggerReanalysis(id);
  const deleteOpportunity = useDeleteOpportunity();
  const updateOpportunity = useUpdateOpportunity(id);
  const confirm = useConfirm();
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');

  const isForbidden = isAxiosError(error) && error.response?.status === 403;
  const isNotFound = isAxiosError(error) && error.response?.status === 404;

  if (isForbidden) return <UnauthorizedState />;
  if (isError) return <QueryErrorState refetch={refetch} description={isNotFound ? 'This opportunity could not be found.' : "We couldn't load this opportunity."} />;

  if (isLoading || !opportunity) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const handleDelete = async () => {
    const ok = await confirm({ title: 'Delete this opportunity?', description: 'This cannot be undone.', confirmLabel: 'Delete', variant: 'danger' });
    if (ok) deleteOpportunity.mutate(opportunity.id);
  };

  const handleStatusChange = (status: string) => {
    updateOpportunity.mutate({ status: status as OpportunityStatus });
  };

  const startEditingNotes = () => {
    setNotesDraft(opportunity.notes ?? '');
    setIsEditingNotes(true);
  };

  const saveNotes = () => {
    updateOpportunity.mutate({ notes: notesDraft }, { onSuccess: () => setIsEditingNotes(false) });
  };

  return (
    <div>
      <PageHeader
        title={opportunity.keyword}
        breadcrumbs={[{ label: 'Opportunities', href: '/opportunities' }, { label: opportunity.keyword }]}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={opportunity.status} />
            <Select
              className="w-40"
              value={opportunity.status}
              options={STATUS_OPTIONS}
              disabled={updateOpportunity.isPending}
              onChange={(e) => handleStatusChange(e.target.value)}
              aria-label="Change status"
            />
            <Button variant="danger" onClick={handleDelete} disabled={deleteOpportunity.isPending}>
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Final" score={opportunity.finalScore} />
        <Stat label="Demand" score={opportunity.demandScore} />
        <Stat label="Competition" score={opportunity.competitionScore} />
        <Stat label="Profit" score={opportunity.profitScore} />
        <Stat label="Supplier" score={opportunity.supplierScore} />
        <Stat label="AI" score={opportunity.aiScore} />
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="scoring">Scoring</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
          <TabsTrigger value="profit">Profit Calculator</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 text-sm">
              <Field label="Marketplace" value={opportunity.marketplace} />
              <Field label="Country" value={opportunity.country} />
              <Field label="Category" value={opportunity.category ?? '—'} />
              <Field label="Recommendation" value={opportunity.recommendation ?? '—'} />
              <Field label="Created" value={new Date(opportunity.createdAt).toLocaleString()} />
              <Field label="Updated" value={new Date(opportunity.updatedAt).toLocaleString()} />
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</p>
                  {!isEditingNotes && (
                    <button type="button" onClick={startEditingNotes} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                      <Pencil className="h-3 w-3" />
                      Edit
                    </button>
                  )}
                </div>
                {isEditingNotes ? (
                  <div className="mt-1 space-y-2">
                    <Textarea value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)} rows={3} autoFocus />
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setIsEditingNotes(false)} disabled={updateOpportunity.isPending}>
                        <X className="h-3.5 w-3.5" />
                        Cancel
                      </Button>
                      <Button size="sm" onClick={saveNotes} disabled={updateOpportunity.isPending}>
                        {updateOpportunity.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-0.5 text-sm text-foreground">{opportunity.notes || '—'}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scoring">
          <ScoringPanel opportunityId={opportunity.id} />
        </TabsContent>

        <TabsContent value="analysis">
          <div className="mb-4 flex justify-end">
            <Button variant="outline" size="sm" onClick={() => reanalyze.mutate()} disabled={reanalyze.isPending}>
              {reanalyze.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Re-analyze
            </Button>
          </div>
          {analysisLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Demand analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <AnalysisBlock title="Demand analysis" data={analysis?.demandAnalysis} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Competition analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <AnalysisBlock title="Competition analysis" data={analysis?.competitionAnalysis} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Profit calculation</CardTitle>
                </CardHeader>
                <CardContent>
                  <AnalysisBlock title="Profit calculation" data={analysis?.profitCalculation} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Supplier analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <AnalysisBlock title="Supplier analysis" data={analysis?.supplierAnalysis} />
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="profit">
          <ProfitCalculatorPanel opportunityId={opportunity.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, score }: { label: string; score?: number | null }) {
  return (
    <div className="rounded-[var(--radius)] border border-border bg-card p-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1">
        <ScoreBadge score={score} />
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm text-foreground">{value}</p>
    </div>
  );
}
