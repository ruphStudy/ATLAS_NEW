'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { isAxiosError } from 'axios';
import { X } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/action-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState, UnauthorizedState } from '@/components/ui/states';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ReasonDialog } from '@/components/suppliers/reason-dialog';
import {
  useApproveReconciliationLine,
  useCancelReconciliationRun,
  useIgnoreReconciliationLine,
  useReconciliationLines,
  useReconciliationRun,
  useRejectReconciliationLine,
  useReopenReconciliationLine,
  useResolveReconciliationLine,
} from '@/hooks';
import { formatDate } from '@/lib/utils';

export default function ReconciliationRunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: run, isLoading, isError, error, refetch } = useReconciliationRun(id);
  const { data: linesRaw } = useReconciliationLines(id);
  const cancel = useCancelReconciliationRun(id);
  const approveLine = useApproveReconciliationLine(id);
  const rejectLine = useRejectReconciliationLine(id);
  const ignoreLine = useIgnoreReconciliationLine(id);
  const resolveLine = useResolveReconciliationLine(id);
  const reopenLine = useReopenReconciliationLine(id);
  const [cancelOpen, setCancelOpen] = useState(false);

  const isForbidden = isAxiosError(error) && error.response?.status === 403;
  const lines = Array.isArray(linesRaw) ? linesRaw : linesRaw?.items ?? [];

  if (isForbidden) return <UnauthorizedState />;
  if (isError) return <QueryErrorState refetch={refetch} description="We couldn't load this reconciliation run." />;
  if (isLoading || !run) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const actions: ActionMenuItem[] = [];
  if (run.status === 'PENDING') {
    actions.push({ label: 'Cancel run', icon: X, onSelect: () => setCancelOpen(true), destructive: true });
  }

  return (
    <div>
      <PageHeader
        title={`Reconciliation · ${run.sourceType.replace(/_/g, ' ')}`}
        breadcrumbs={[{ label: 'Reconciliations', href: '/inventory-reconciliations' }, { label: run.id }]}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={run.status} />
            {actions.length > 0 && <ActionMenu items={actions} />}
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
        <Stat label="Total" value={String(run.totalLines)} />
        <Stat label="Matched" value={String(run.matchedCount)} />
        <Stat label="Warning" value={String(run.warningCount)} />
        <Stat label="Critical" value={String(run.criticalCount)} />
        <Stat label="Unresolved" value={String(run.unresolvedCount)} />
      </div>

      {lines.length === 0 ? (
        <EmptyState title="No lines" />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Lines</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>System</TableHead>
                  <TableHead>Counted</TableHead>
                  <TableHead>Variance</TableHead>
                  <TableHead>Classification</TableHead>
                  <TableHead>Finding</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell className="text-sm text-foreground">{line.sku ?? line.inventoryItemId}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{line.systemQuantity}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{line.countedQuantity ?? '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{line.varianceQuantity ?? '—'}</TableCell>
                    <TableCell>
                      <StatusBadge status={line.classification} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={line.findingStatus} />
                    </TableCell>
                    <TableCell className="text-right">
                      {line.findingStatus === 'OPEN' && (
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => approveLine.mutate({ lineId: line.id })}>
                            Approve
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => rejectLine.mutate({ lineId: line.id })}>
                            Reject
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => ignoreLine.mutate({ lineId: line.id })}>
                            Ignore
                          </Button>
                        </div>
                      )}
                      {['APPROVED', 'REJECTED'].includes(line.findingStatus) && (
                        <Button variant="ghost" size="sm" onClick={() => resolveLine.mutate({ lineId: line.id })}>
                          Resolve
                        </Button>
                      )}
                      {line.findingStatus === 'RESOLVED' && (
                        <Button variant="ghost" size="sm" onClick={() => reopenLine.mutate({ lineId: line.id })}>
                          Reopen
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <ReasonDialog open={cancelOpen} onOpenChange={setCancelOpen} title="Cancel this run" confirmLabel="Cancel" variant="danger" pending={cancel.isPending} onSubmit={(reason) => cancel.mutate(reason, { onSuccess: () => setCancelOpen(false) })} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius)] border border-border bg-card p-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}
