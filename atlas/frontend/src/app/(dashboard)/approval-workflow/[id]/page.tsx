'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { isAxiosError } from 'axios';
import { Check, X, MessageSquareWarning, Clock3, UserCog, Forward, RotateCcw, Ban, ShieldAlert } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/ui/form-field';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState, UnauthorizedState } from '@/components/ui/states';
import { ActionMenu } from '@/components/ui/action-menu';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EntityNotesPanel } from '@/components/collaboration/entity-notes-panel';
import {
  useApprovalDecisionHistory,
  useApprovalRequest,
  useApprovalStepInstances,
  useCancelApproval,
  useDecideApproval,
  useDelegateApproval,
  useOverrideApproval,
  useReassignApproval,
  useRecallApproval,
  useResubmitApproval,
  useUsers,
} from '@/hooks';
import { formatDate } from '@/lib/utils';
import type { ApprovalAssignment, ApprovalDecision, ApprovalDecisionAction, ApprovalStepInstance } from '@/types';

const TERMINAL_STATUSES = new Set(['APPROVED', 'REJECTED', 'CANCELLED', 'RECALLED', 'EXPIRED']);

export default function ApprovalRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: request, isLoading, isError, error, refetch } = useApprovalRequest(id);
  const steps = useApprovalStepInstances(id);
  const decisions = useApprovalDecisionHistory(id);

  const resubmit = useResubmitApproval(id);
  const cancel = useCancelApproval(id);
  const recall = useRecallApproval(id);
  const override = useOverrideApproval(id);

  const [reasonDialog, setReasonDialog] = useState<'cancel' | 'recall' | null>(null);
  const [reason, setReason] = useState('');
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideComment, setOverrideComment] = useState('');

  const isForbidden = isAxiosError(error) && error.response?.status === 403;
  const isNotFound = isAxiosError(error) && error.response?.status === 404;

  if (isForbidden) return <UnauthorizedState />;
  if (isError) return <QueryErrorState refetch={refetch} description={isNotFound ? 'This approval request could not be found.' : "We couldn't load this request."} />;
  if (isLoading || !request) return <Skeleton className="h-96 w-full" />;

  const isTerminal = TERMINAL_STATUSES.has(request.status);
  const currentStep = (steps.data ?? []).find((s) => s.stepIndex === request.currentStepIndex);

  return (
    <div>
      <PageHeader
        title={request.title}
        breadcrumbs={[{ label: 'Approval Inbox', href: '/approval-workflow' }, { label: request.title }]}
        actions={
          <>
            <StatusBadge status={request.status} />
            <ActionMenu
              items={[
                ...(request.status === 'CHANGES_REQUESTED' ? [{ label: 'Resubmit', icon: RotateCcw, onSelect: () => resubmit.mutate(undefined) }] : []),
                ...(!isTerminal ? [{ label: 'Cancel request', icon: Ban, onSelect: () => setReasonDialog('cancel'), destructive: true }] : []),
                ...(!isTerminal ? [{ label: 'Recall request', icon: RotateCcw, onSelect: () => setReasonDialog('recall') }] : []),
                ...(!isTerminal ? [{ label: 'Override', icon: ShieldAlert, onSelect: () => setOverrideOpen(true), separatorBefore: true }] : []),
              ]}
            />
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Field label="Module" value={request.module} />
        <Field label="Entity" value={`${request.entityType} · ${request.entityId}`} />
        <Field label="Requested by" value={request.requestedBy ?? '—'} />
        <Field label="Amount" value={request.amount != null ? request.amount.toLocaleString() : '—'} />
        <Field label="Risk level" value={request.riskLevel ?? '—'} />
        <Field label="Country" value={request.countryCode ?? '—'} />
        <Field label="Marketplace" value={request.marketplaceKey ?? '—'} />
        <Field label="SLA due" value={request.slaDueAt ? formatDate(request.slaDueAt) : '—'} />
        <Field label="Created" value={formatDate(request.createdAt)} />
        <Field label="Completed" value={request.completedAt ? formatDate(request.completedAt) : '—'} />
      </div>

      {!isTerminal && currentStep && (
        <DecisionPanel requestId={id} step={currentStep} />
      )}

      <Tabs defaultValue="steps">
        <TabsList>
          <TabsTrigger value="steps">Steps & Assignments</TabsTrigger>
          <TabsTrigger value="history">Decision History</TabsTrigger>
        </TabsList>
        <TabsContent value="steps">
          <StepsTab requestId={id} steps={steps.data} loading={steps.isLoading} />
        </TabsContent>
        <TabsContent value="history">
          <HistoryTab decisions={decisions.data} loading={decisions.isLoading} />
        </TabsContent>
      </Tabs>

      <div className="mt-6">
        <EntityNotesPanel entityType="approval_request" entityId={id} module="approval-workflow" />
      </div>

      <Dialog open={reasonDialog !== null} onOpenChange={(o) => !o && setReasonDialog(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{reasonDialog === 'cancel' ? 'Cancel request' : 'Recall request'}</DialogTitle>
          </DialogHeader>
          <FormField label="Reason (optional)" htmlFor="approval-reason">
            <Textarea id="approval-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
          </FormField>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReasonDialog(null)}>
              Close
            </Button>
            <Button
              variant={reasonDialog === 'cancel' ? 'danger' : 'default'}
              onClick={() => {
                const mutation = reasonDialog === 'cancel' ? cancel : recall;
                mutation.mutate(
                  { reason: reason || undefined },
                  {
                    onSuccess: () => {
                      setReasonDialog(null);
                      setReason('');
                    },
                  },
                );
              }}
              disabled={cancel.isPending || recall.isPending}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={overrideOpen} onOpenChange={setOverrideOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Override approval</DialogTitle>
          </DialogHeader>
          <FormField label="Comment" htmlFor="override-comment" required>
            <Textarea id="override-comment" value={overrideComment} onChange={(e) => setOverrideComment(e.target.value)} rows={3} />
          </FormField>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOverrideOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() =>
                override.mutate(
                  { comment: overrideComment },
                  {
                    onSuccess: () => {
                      setOverrideOpen(false);
                      setOverrideComment('');
                    },
                  },
                )
              }
              disabled={!overrideComment || override.isPending}
            >
              Override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mt-6">
        <Button variant="ghost" size="sm" onClick={() => router.push('/approval-workflow')}>
          Back to inbox
        </Button>
      </div>
    </div>
  );
}

function DecisionPanel({ requestId, step }: { requestId: string; step: ApprovalStepInstance }) {
  const decide = useDecideApproval(requestId);
  const [dialogAction, setDialogAction] = useState<ApprovalDecisionAction | null>(null);
  const [comment, setComment] = useState('');

  const actions: { action: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES' | 'DEFER'; label: string; icon: typeof Check; variant: 'default' | 'danger' | 'outline' }[] = [
    { action: 'APPROVE', label: 'Approve', icon: Check, variant: 'default' },
    { action: 'REJECT', label: 'Reject', icon: X, variant: 'danger' },
    { action: 'REQUEST_CHANGES', label: 'Request changes', icon: MessageSquareWarning, variant: 'outline' },
    { action: 'DEFER', label: 'Defer', icon: Clock3, variant: 'outline' },
  ];

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-sm">Your decision — {step.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {actions.map((a) => (
            <Button key={a.action} variant={a.variant} size="sm" onClick={() => setDialogAction(a.action)}>
              <a.icon className="h-3.5 w-3.5" />
              {a.label}
            </Button>
          ))}
        </div>
      </CardContent>

      <Dialog open={dialogAction !== null} onOpenChange={(o) => !o && setDialogAction(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{dialogAction === 'APPROVE' ? 'Approve request' : dialogAction === 'REJECT' ? 'Reject request' : dialogAction === 'REQUEST_CHANGES' ? 'Request changes' : 'Defer decision'}</DialogTitle>
          </DialogHeader>
          <FormField label="Comment" htmlFor="decision-comment">
            <Textarea id="decision-comment" value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />
          </FormField>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAction(null)}>
              Close
            </Button>
            <Button
              onClick={() =>
                decide.mutate(
                  { stepInstanceId: step.id, payload: { action: dialogAction as 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES' | 'DEFER', comment: comment || undefined } },
                  {
                    onSuccess: () => {
                      setDialogAction(null);
                      setComment('');
                    },
                  },
                )
              }
              disabled={decide.isPending}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function StepsTab({ requestId, steps, loading }: { requestId: string; steps: ApprovalStepInstance[] | undefined; loading: boolean }) {
  if (loading) return <Skeleton className="h-64 w-full" />;
  if (!steps || steps.length === 0) return <EmptyState title="No steps yet" />;

  return (
    <div className="space-y-4">
      {[...steps]
        .sort((a, b) => a.stepIndex - b.stepIndex)
        .map((step) => (
          <Card key={step.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-sm">
                <span>
                  Step {step.stepIndex + 1} · {step.name}
                </span>
                <StatusBadge status={step.status} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-xs text-muted-foreground">
                {step.strategy} · {step.receivedApprovals}/{step.requiredApprovals} approvals
                {step.dueAt && ` · due ${formatDate(step.dueAt)}`}
                {step.escalatedAt && ` · escalated ${formatDate(step.escalatedAt)}`}
              </p>
              {!step.assignments || step.assignments.length === 0 ? (
                <p className="text-xs text-muted-foreground">No assignments recorded.</p>
              ) : (
                <div className="space-y-2">
                  {step.assignments.map((a) => (
                    <AssignmentRow key={a.id} requestId={requestId} stepInstanceId={step.id} assignment={a} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
    </div>
  );
}

function AssignmentRow({ requestId, stepInstanceId, assignment }: { requestId: string; stepInstanceId: string; assignment: ApprovalAssignment }) {
  const delegate = useDelegateApproval(requestId);
  const reassign = useReassignApproval(requestId);
  const users = useUsers({ limit: 100 });
  const userOptions = (users.data?.items ?? []).map((u) => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }));

  const [mode, setMode] = useState<'delegate' | 'reassign' | null>(null);
  const [targetUserId, setTargetUserId] = useState('');

  const canAct = assignment.status === 'PENDING';

  return (
    <div className="flex items-center justify-between rounded-[var(--radius)] border border-border p-2.5 text-sm">
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-[10px]">
          {assignment.approverType.toLowerCase()}
        </Badge>
        <span className="text-foreground">{assignment.approverRef}</span>
        {assignment.delegatedToUserId && <span className="text-xs text-muted-foreground">→ delegated to {assignment.delegatedToUserId}</span>}
      </div>
      <div className="flex items-center gap-2">
        <StatusBadge status={assignment.status} />
        {canAct && (
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={() => setMode('delegate')}>
              <Forward className="h-3.5 w-3.5" />
              Delegate
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setMode('reassign')}>
              <UserCog className="h-3.5 w-3.5" />
              Reassign
            </Button>
          </div>
        )}
      </div>

      <Dialog open={mode !== null} onOpenChange={(o) => !o && setMode(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{mode === 'delegate' ? 'Delegate approval' : 'Reassign approval'}</DialogTitle>
          </DialogHeader>
          <FormField label="Target user" htmlFor="assignment-target-user" required>
            <Select id="assignment-target-user" value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} options={userOptions} placeholder="Select a user" />
          </FormField>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMode(null)}>
              Close
            </Button>
            <Button
              onClick={() => {
                if (mode === 'delegate') {
                  delegate.mutate(
                    { stepInstanceId, payload: { delegateToUserId: targetUserId } },
                    { onSuccess: () => setMode(null) },
                  );
                } else if (mode === 'reassign') {
                  reassign.mutate(
                    { stepInstanceId, assignmentId: assignment.id, payload: { reassignToUserId: targetUserId } },
                    { onSuccess: () => setMode(null) },
                  );
                }
              }}
              disabled={!targetUserId || delegate.isPending || reassign.isPending}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function HistoryTab({ decisions, loading }: { decisions: ApprovalDecision[] | undefined; loading: boolean }) {
  if (loading) return <Skeleton className="h-64 w-full" />;
  if (!decisions || decisions.length === 0) return <EmptyState title="No decisions yet" />;

  return (
    <div className="space-y-3">
      {decisions.map((d) => (
        <div key={d.id} className="rounded-[var(--radius)] border border-border p-3 text-sm">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="text-[10px]">
              {d.action.toLowerCase().replace('_', ' ')}
            </Badge>
            <span className="text-xs text-muted-foreground">{formatDate(d.createdAt)}</span>
          </div>
          <p className="mt-1 text-foreground">by {d.decidedBy}</p>
          {d.comment && <p className="mt-1 text-muted-foreground">{d.comment}</p>}
          {d.delegatedToUserId && <p className="mt-1 text-xs text-muted-foreground">Delegated to {d.delegatedToUserId}</p>}
          {d.reassignedToUserId && <p className="mt-1 text-xs text-muted-foreground">Reassigned to {d.reassignedToUserId}</p>}
        </div>
      ))}
    </div>
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
