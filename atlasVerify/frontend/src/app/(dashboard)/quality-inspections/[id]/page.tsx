'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { isAxiosError } from 'axios';
import { CheckCircle2, ClipboardCheck, Loader2, PlayCircle, RotateCcw, XCircle } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/action-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { QueryErrorState, UnauthorizedState } from '@/components/ui/states';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ReasonDialog } from '@/components/suppliers/reason-dialog';
import {
  useCloseInspection,
  useCompleteInspection,
  useQualityInspection,
  useRejectInspection,
  useRequestReInspection,
  useScheduleInspection,
  useStartInspection,
} from '@/hooks';
import { formatDate } from '@/lib/utils';

export default function QualityInspectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: inspection, isLoading, isError, error, refetch } = useQualityInspection(id);
  const schedule = useScheduleInspection(id);
  const start = useStartInspection(id);
  const complete = useCompleteInspection(id);
  const reject = useRejectInspection(id);
  const close = useCloseInspection(id);
  const reInspect = useRequestReInspection(id);

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [completeOpen, setCompleteOpen] = useState(false);
  const [quantityInspected, setQuantityInspected] = useState('');
  const [quantityPassed, setQuantityPassed] = useState('');
  const [quantityFailed, setQuantityFailed] = useState('');
  const [rejectOpen, setRejectOpen] = useState(false);

  const isForbidden = isAxiosError(error) && error.response?.status === 403;

  if (isForbidden) return <UnauthorizedState />;
  if (isError) return <QueryErrorState refetch={refetch} description="We couldn't load this inspection." />;
  if (isLoading || !inspection) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const actions: ActionMenuItem[] = [];
  if (inspection.status === 'PENDING') {
    actions.push({ label: 'Schedule', icon: ClipboardCheck, onSelect: () => setScheduleOpen(true) });
  }
  if (inspection.status === 'SCHEDULED') {
    actions.push({ label: 'Start inspection', icon: PlayCircle, onSelect: () => start.mutate({ inspectionDate: new Date().toISOString() }) });
  }
  if (inspection.status === 'IN_PROGRESS') {
    actions.push({ label: 'Complete inspection', icon: CheckCircle2, onSelect: () => setCompleteOpen(true) });
  }
  if (inspection.status === 'PASSED' || inspection.status === 'CONDITIONAL_APPROVAL' || inspection.status === 'FAILED') {
    actions.push({ label: 'Close', icon: CheckCircle2, onSelect: () => close.mutate(undefined) });
  }
  if (inspection.status === 'FAILED') {
    actions.push({ label: 'Reject', icon: XCircle, onSelect: () => setRejectOpen(true), destructive: true });
    actions.push({ label: 'Request re-inspection', icon: RotateCcw, onSelect: () => reInspect.mutate({}) });
  }

  return (
    <div>
      <PageHeader
        title={inspection.inspectionNumber}
        breadcrumbs={[{ label: 'Quality Inspections', href: '/dashboard/quality-inspections' }, { label: inspection.inspectionNumber }]}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={inspection.status} />
            <ActionMenu items={actions} />
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Quality score" value={inspection.qualityScore != null ? `${inspection.qualityScore}/100` : '—'} />
        <Stat label="Passed" value={String(inspection.quantityPassed)} />
        <Stat label="Failed" value={String(inspection.quantityFailed)} />
        <Stat label="Defects" value={String(inspection.defects.length)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 text-sm">
            <Field label="Type" value={inspection.inspectionType.replace(/_/g, ' ')} />
            <Field label="Sampling method" value={inspection.samplingMethod.replace(/_/g, ' ')} />
            <Field label="Inspector" value={inspection.inspectorName ?? '—'} />
            <Field label="Recommendation" value={inspection.recommendation?.replace(/_/g, ' ') ?? '—'} />
            <Field label="Scheduled" value={inspection.scheduledDate ? formatDate(inspection.scheduledDate) : '—'} />
            <Field label="Inspection date" value={inspection.inspectionDate ? formatDate(inspection.inspectionDate) : '—'} />
            <Field label="Quantity ordered" value={String(inspection.quantityOrdered)} />
            <Field label="Quantity inspected" value={String(inspection.quantityInspected)} />
            {inspection.notes && <div className="sm:col-span-2"><Field label="Notes" value={inspection.notes} /></div>}
            {inspection.conditionsForApproval && <div className="sm:col-span-2"><Field label="Conditions for approval" value={inspection.conditionsForApproval} /></div>}
            {inspection.rejectionReason && <div className="sm:col-span-2"><Field label="Rejection reason" value={inspection.rejectionReason} /></div>}
          </CardContent>
        </Card>

        {inspection.defects.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Defects</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {inspection.defects.map((d, i) => (
                <div key={i} className="rounded-[var(--radius)] border border-border p-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">{d.description}</span>
                    <StatusBadge status={d.severity} />
                  </div>
                  <p className="text-muted-foreground">Qty: {d.quantity}{d.location && ` · ${d.location}`}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {inspection.checklist.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-sm">Checklist</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {inspection.checklist.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-[var(--radius)] border border-border p-2 text-sm">
                <span className="text-foreground">{c.description}</span>
                <StatusBadge status={c.passed ? 'PASSED' : 'FAILED'} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Schedule inspection</DialogTitle>
          </DialogHeader>
          <FormField label="Scheduled date" htmlFor="sched-date" required>
            <Input id="sched-date" type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
          </FormField>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => schedule.mutate({ scheduledDate }, { onSuccess: () => { setScheduleOpen(false); setScheduledDate(''); } })}
              disabled={!scheduledDate || schedule.isPending}
            >
              {schedule.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Complete inspection</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-4">
            <FormField label="Inspected" htmlFor="comp-inspected" required>
              <Input id="comp-inspected" type="number" min="0" value={quantityInspected} onChange={(e) => setQuantityInspected(e.target.value)} />
            </FormField>
            <FormField label="Passed" htmlFor="comp-passed" required>
              <Input id="comp-passed" type="number" min="0" value={quantityPassed} onChange={(e) => setQuantityPassed(e.target.value)} />
            </FormField>
            <FormField label="Failed" htmlFor="comp-failed" required>
              <Input id="comp-failed" type="number" min="0" value={quantityFailed} onChange={(e) => setQuantityFailed(e.target.value)} />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                complete.mutate(
                  { quantityInspected: Number(quantityInspected), quantityPassed: Number(quantityPassed), quantityFailed: Number(quantityFailed) },
                  { onSuccess: () => { setCompleteOpen(false); setQuantityInspected(''); setQuantityPassed(''); setQuantityFailed(''); } },
                )
              }
              disabled={!quantityInspected || !quantityPassed || !quantityFailed || complete.isPending}
            >
              {complete.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReasonDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title="Reject this inspection"
        label="Rejection reason"
        confirmLabel="Reject"
        variant="danger"
        pending={reject.isPending}
        onSubmit={(rejectionReason) => reject.mutate({ rejectionReason }, { onSuccess: () => setRejectOpen(false) })}
      />
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm capitalize text-foreground">{value}</p>
    </div>
  );
}
