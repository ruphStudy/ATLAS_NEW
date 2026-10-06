'use client';

import { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { FilterBar } from '@/components/ui/filter-bar';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState } from '@/components/ui/states';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/action-menu';
import { ReasonDialog } from '@/components/suppliers/reason-dialog';
import {
  useActivateSubscription,
  useAdminOverrideSubscription,
  useCancelSubscription,
  useChangeSubscriptionPlan,
  useCreateSubscription,
  useMarkSubscriptionPastDue,
  usePauseSubscription,
  usePlans,
  useResumeSubscription,
  useSubscription,
  useSubscriptionHistory,
  useSubscriptions,
  useSuspendSubscription,
} from '@/hooks';
import { formatDate } from '@/lib/utils';
import type { CreateSubscriptionPayload, PlanChangeDirection, PlanChangeEffective, SubscriptionBillingCycle, SubscriptionScope, SubscriptionStatus, SubscriptionType } from '@/types';

const SCOPES: SubscriptionScope[] = ['ORGANIZATION', 'WORKSPACE'];
const TYPES: SubscriptionType[] = ['TRIAL', 'PAID', 'INTERNAL', 'CUSTOM', 'ENTERPRISE'];
const STATUSES: SubscriptionStatus[] = ['TRIALING', 'ACTIVE', 'PAST_DUE', 'PAUSED', 'SUSPENDED', 'CANCELLED', 'EXPIRED'];
const BILLING_CYCLES: SubscriptionBillingCycle[] = ['MONTHLY', 'QUARTERLY', 'ANNUAL', 'CUSTOM'];
const CHANGE_DIRECTIONS: PlanChangeDirection[] = ['UPGRADE', 'DOWNGRADE', 'LATERAL'];
const CHANGE_EFFECTIVE: PlanChangeEffective[] = ['IMMEDIATE', 'END_OF_PERIOD'];

export default function SubscriptionsPage() {
  const [scope, setScope] = useState<SubscriptionScope | ''>('');
  const [status, setStatus] = useState<SubscriptionStatus | ''>('');
  const [type, setType] = useState<SubscriptionType | ''>('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useSubscriptions({ scope: scope || undefined, status: status || undefined, type: type || undefined, page, limit: 20 });

  return (
    <div>
      <PageHeader title="Subscriptions" description="Commercial subscription lifecycle, plan changes and admin overrides." />

      <div className="mb-4 flex items-center justify-between gap-3">
        <FilterBar hasActiveFilters={!!scope || !!status || !!type} onClearFilters={() => { setScope(''); setStatus(''); setType(''); setPage(1); }}>
          <Select value={scope} onChange={(e) => { setScope(e.target.value as SubscriptionScope | ''); setPage(1); }} placeholder="All scopes" options={SCOPES.map((s) => ({ value: s, label: s }))} className="h-9 w-36" />
          <Select value={status} onChange={(e) => { setStatus(e.target.value as SubscriptionStatus | ''); setPage(1); }} placeholder="All statuses" options={STATUSES.map((s) => ({ value: s, label: s }))} className="h-9 w-40" />
          <Select value={type} onChange={(e) => { setType(e.target.value as SubscriptionType | ''); setPage(1); }} placeholder="All types" options={TYPES.map((t) => ({ value: t, label: t }))} className="h-9 w-36" />
        </FilterBar>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Create subscription
        </Button>
      </div>

      {isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load subscriptions." />
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No subscriptions yet" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Billing cycle</TableHead>
                <TableHead>Current period</TableHead>
                <TableHead>Auto-renew</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((s) => (
                <TableRow key={s.id} clickable onClick={() => setSelectedId(s.id)}>
                  <TableCell className="text-sm font-medium text-foreground">{s.planKey}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.scope}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.type}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.billingCycle}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(s.currentPeriodStart)} – {formatDate(s.currentPeriodEnd)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.autoRenew ? 'Yes' : 'No'}</TableCell>
                  <TableCell>
                    <StatusBadge status={s.status} />
                    {s.isAdminOverride && <Badge variant="warning" className="ml-1.5 text-[9px]">override</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.total > 0 && <Pagination page={page} limit={20} total={data.total} totalPages={data.totalPages} onPageChange={setPage} onLimitChange={() => {}} />}
        </>
      )}

      <CreateSubscriptionDialog open={createOpen} onOpenChange={setCreateOpen} />
      <SubscriptionDetailDialog id={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function CreateSubscriptionDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const create = useCreateSubscription();
  const { data: plans } = usePlans({ status: 'PUBLISHED', limit: 100 });
  const [form, setForm] = useState<CreateSubscriptionPayload>({ scope: 'WORKSPACE', type: 'TRIAL', planKey: '', billingCycle: 'MONTHLY' });
  const reset = () => setForm({ scope: 'WORKSPACE', type: 'TRIAL', planKey: '', billingCycle: 'MONTHLY' });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Create subscription</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Scope" htmlFor="sub-scope" required>
            <Select id="sub-scope" value={form.scope} onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value as SubscriptionScope }))} options={SCOPES.map((s) => ({ value: s, label: s }))} />
          </FormField>
          <FormField label="Type" htmlFor="sub-type" required>
            <Select id="sub-type" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as SubscriptionType }))} options={TYPES.map((t) => ({ value: t, label: t }))} />
          </FormField>
          <FormField label="Plan" htmlFor="sub-plan" required>
            <Select id="sub-plan" value={form.planKey} onChange={(e) => setForm((f) => ({ ...f, planKey: e.target.value }))} placeholder="Select a plan" options={(plans?.data ?? []).map((p) => ({ value: p.code, label: `${p.name} (${p.code})` }))} />
          </FormField>
          <FormField label="Billing cycle" htmlFor="sub-cycle" required>
            <Select id="sub-cycle" value={form.billingCycle} onChange={(e) => setForm((f) => ({ ...f, billingCycle: e.target.value as SubscriptionBillingCycle }))} options={BILLING_CYCLES.map((c) => ({ value: c, label: c }))} />
          </FormField>
          <FormField label="Trial days (optional)" htmlFor="sub-trial">
            <Input id="sub-trial" type="number" value={form.trialDays ?? ''} onChange={(e) => setForm((f) => ({ ...f, trialDays: e.target.value ? Number(e.target.value) : undefined }))} />
          </FormField>
          <FormField label="Grace period days (optional)" htmlFor="sub-grace">
            <Input id="sub-grace" type="number" value={form.gracePeriodDays ?? ''} onChange={(e) => setForm((f) => ({ ...f, gracePeriodDays: e.target.value ? Number(e.target.value) : undefined }))} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => create.mutate(form, { onSuccess: () => { onOpenChange(false); reset(); } })}
            disabled={!form.planKey || create.isPending}
          >
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SubscriptionDetailDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: sub, isLoading } = useSubscription(id ?? undefined);
  const { data: history } = useSubscriptionHistory(id ?? undefined);
  const activate = useActivateSubscription(id ?? '');
  const pause = usePauseSubscription(id ?? '');
  const resume = useResumeSubscription(id ?? '');
  const suspend = useSuspendSubscription(id ?? '');
  const markPastDue = useMarkSubscriptionPastDue(id ?? '');
  const cancel = useCancelSubscription(id ?? '');
  const changePlan = useChangeSubscriptionPlan(id ?? '');
  const adminOverride = useAdminOverrideSubscription(id ?? '');
  const { data: plans } = usePlans({ status: 'PUBLISHED', limit: 100 });

  const [reasonAction, setReasonAction] = useState<'pause' | 'suspend' | 'cancel' | null>(null);
  const [changePlanOpen, setChangePlanOpen] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);

  const actions: ActionMenuItem[] = [];
  if (sub) {
    if (sub.status === 'TRIALING' || sub.status === 'PAST_DUE') actions.push({ label: 'Activate', onSelect: () => activate.mutate() });
    if (sub.status === 'ACTIVE') actions.push({ label: 'Pause', onSelect: () => setReasonAction('pause') });
    if (sub.status === 'PAUSED') actions.push({ label: 'Resume', onSelect: () => resume.mutate({}) });
    if (sub.status !== 'SUSPENDED' && sub.status !== 'CANCELLED') actions.push({ label: 'Suspend', onSelect: () => setReasonAction('suspend') });
    if (sub.status === 'ACTIVE') actions.push({ label: 'Mark past due', onSelect: () => markPastDue.mutate({}) });
    actions.push({ label: 'Change plan', onSelect: () => setChangePlanOpen(true), separatorBefore: true });
    actions.push({ label: 'Admin override', onSelect: () => setOverrideOpen(true) });
    if (sub.status !== 'CANCELLED') actions.push({ label: 'Cancel', onSelect: () => setReasonAction('cancel'), destructive: true, separatorBefore: true });
  }

  return (
    <Dialog open={!!id} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>{sub ? sub.planKey : 'Subscription'}</span>
            {sub && <div className="flex items-center gap-2"><StatusBadge status={sub.status} /><ActionMenu items={actions} /></div>}
          </DialogTitle>
        </DialogHeader>
        {isLoading || !sub ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <Field label="Scope" value={sub.scope} />
              <Field label="Type" value={sub.type} />
              <Field label="Billing cycle" value={sub.billingCycle} />
              <Field label="Current period" value={`${formatDate(sub.currentPeriodStart)} – ${formatDate(sub.currentPeriodEnd)}`} />
              <Field label="Renewal date" value={sub.renewalDate ? formatDate(sub.renewalDate) : '—'} />
              <Field label="Auto-renew" value={sub.autoRenew ? 'Yes' : 'No'} />
              <Field label="Grace period" value={`${sub.gracePeriodDays} day(s)`} />
              <Field label="Trial" value={sub.trialEndAt ? `ends ${formatDate(sub.trialEndAt)}` : '—'} />
              <Field label="Admin override" value={sub.isAdminOverride ? 'Yes' : 'No'} />
            </div>
            {sub.scheduledChange && (
              <div className="rounded-[var(--radius)] border border-info/20 bg-info/5 p-3 text-sm">
                <p className="text-foreground">Scheduled: {sub.scheduledChange.changeType} to {sub.scheduledChange.toPlanKey} on {formatDate(sub.scheduledChange.effectiveAt)}</p>
                {sub.scheduledChange.reason && <p className="mt-1 text-xs text-muted-foreground">{sub.scheduledChange.reason}</p>}
              </div>
            )}
            {sub.prorationReference && (
              <Field label="Last proration" value={`${sub.prorationReference.amount} ${sub.prorationReference.currency ?? ''} — ${sub.prorationReference.description ?? ''}`} />
            )}

            {history && history.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">History</p>
                <ul className="space-y-1.5">
                  {history.map((h) => (
                    <li key={h.id} className="text-sm">
                      <span className="font-medium text-foreground">{h.changeType}</span>
                      <span className="ml-1.5 text-xs text-muted-foreground">
                        {h.fromStatus ?? '—'} → {h.toStatus}
                        {h.fromPlanKey && h.toPlanKey && h.fromPlanKey !== h.toPlanKey ? ` (${h.fromPlanKey} → ${h.toPlanKey})` : ''} · {formatDate(h.createdAt)}
                      </span>
                      {h.reason && <p className="text-xs text-muted-foreground">{h.reason}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </DialogContent>

      <ReasonDialog open={reasonAction === 'pause'} onOpenChange={(o) => !o && setReasonAction(null)} title="Pause this subscription" pending={pause.isPending} onSubmit={(reason) => pause.mutate({ reason }, { onSuccess: () => setReasonAction(null) })} />
      <ReasonDialog open={reasonAction === 'suspend'} onOpenChange={(o) => !o && setReasonAction(null)} title="Suspend this subscription" variant="danger" pending={suspend.isPending} onSubmit={(reason) => suspend.mutate({ reason }, { onSuccess: () => setReasonAction(null) })} />
      <ReasonDialog open={reasonAction === 'cancel'} onOpenChange={(o) => !o && setReasonAction(null)} title="Cancel this subscription" confirmLabel="Cancel subscription" variant="danger" pending={cancel.isPending} onSubmit={(reason) => cancel.mutate({ reason }, { onSuccess: () => setReasonAction(null) })} />

      {sub && (
        <ChangePlanDialog
          open={changePlanOpen}
          onOpenChange={setChangePlanOpen}
          currentPlanKey={sub.planKey}
          plans={plans?.data ?? []}
          onSubmit={(payload) => changePlan.mutate(payload, { onSuccess: () => setChangePlanOpen(false) })}
          pending={changePlan.isPending}
        />
      )}

      <AdminOverrideDialog open={overrideOpen} onOpenChange={setOverrideOpen} pending={adminOverride.isPending} onSubmit={(payload) => adminOverride.mutate(payload, { onSuccess: () => setOverrideOpen(false) })} />
    </Dialog>
  );
}

function ChangePlanDialog({
  open,
  onOpenChange,
  currentPlanKey,
  plans,
  onSubmit,
  pending,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  currentPlanKey: string;
  plans: { code: string; name: string }[];
  onSubmit: (payload: { toPlanKey: string; toBillingCycle?: SubscriptionBillingCycle; changeType: PlanChangeDirection; effective: PlanChangeEffective; reason?: string }) => void;
  pending: boolean;
}) {
  const [toPlanKey, setToPlanKey] = useState('');
  const [changeType, setChangeType] = useState<PlanChangeDirection>('UPGRADE');
  const [effective, setEffective] = useState<PlanChangeEffective>('IMMEDIATE');
  const [reason, setReason] = useState('');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Change plan</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <FormField label="Current plan" htmlFor="cp-current">
            <Input id="cp-current" value={currentPlanKey} disabled />
          </FormField>
          <FormField label="New plan" htmlFor="cp-new" required>
            <Select id="cp-new" value={toPlanKey} onChange={(e) => setToPlanKey(e.target.value)} placeholder="Select a plan" options={plans.filter((p) => p.code !== currentPlanKey).map((p) => ({ value: p.code, label: `${p.name} (${p.code})` }))} />
          </FormField>
          <FormField label="Direction" htmlFor="cp-direction" required>
            <Select id="cp-direction" value={changeType} onChange={(e) => setChangeType(e.target.value as PlanChangeDirection)} options={CHANGE_DIRECTIONS.map((d) => ({ value: d, label: d }))} />
          </FormField>
          <FormField label="Effective" htmlFor="cp-effective" required>
            <Select id="cp-effective" value={effective} onChange={(e) => setEffective(e.target.value as PlanChangeEffective)} options={CHANGE_EFFECTIVE.map((e) => ({ value: e, label: e.replace(/_/g, ' ') }))} />
          </FormField>
          <FormField label="Reason (optional)" htmlFor="cp-reason">
            <Input id="cp-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onSubmit({ toPlanKey, changeType, effective, reason: reason || undefined })} disabled={!toPlanKey || pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Change plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AdminOverrideDialog({ open, onOpenChange, onSubmit, pending }: { open: boolean; onOpenChange: (o: boolean) => void; onSubmit: (payload: { toStatus: SubscriptionStatus; reason: string }) => void; pending: boolean }) {
  const [toStatus, setToStatus] = useState<SubscriptionStatus>('ACTIVE');
  const [reason, setReason] = useState('');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Admin override status</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-xs text-warning">This bypasses normal lifecycle rules — use only for exceptional commercial situations.</p>
          <FormField label="New status" htmlFor="ov-status" required>
            <Select id="ov-status" value={toStatus} onChange={(e) => setToStatus(e.target.value as SubscriptionStatus)} options={STATUSES.map((s) => ({ value: s, label: s }))} />
          </FormField>
          <FormField label="Reason" htmlFor="ov-reason" required>
            <Input id="ov-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="danger" onClick={() => onSubmit({ toStatus, reason })} disabled={!reason || pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Override
          </Button>
        </DialogFooter>
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
