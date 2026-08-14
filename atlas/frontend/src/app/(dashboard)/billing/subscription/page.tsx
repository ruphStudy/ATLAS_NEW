'use client';

import { useState } from 'react';
import { Ban, PauseCircle, PlayCircle, RefreshCcw, Repeat, ShieldAlert } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/states';
import { StatusBadge } from '@/components/ui/status-badge';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/action-menu';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  useCancelSubscription,
  useChangeSubscriptionPlan,
  useConfirm,
  useEffectiveSubscription,
  usePauseSubscription,
  usePlans,
  useResumeSubscription,
  useSubscriptionHistory,
} from '@/hooks';
import { formatDate } from '@/lib/utils';
import type { ChangeSubscriptionPlanPayload, PlanChangeDirection, PlanChangeEffective, SubscriptionBillingCycle } from '@/types';

const CHANGE_DIRECTION_OPTIONS: { value: PlanChangeDirection; label: string }[] = [
  { value: 'UPGRADE', label: 'Upgrade' },
  { value: 'DOWNGRADE', label: 'Downgrade' },
  { value: 'LATERAL', label: 'Lateral' },
];

const CHANGE_EFFECTIVE_OPTIONS: { value: PlanChangeEffective; label: string }[] = [
  { value: 'IMMEDIATE', label: 'Immediately' },
  { value: 'END_OF_PERIOD', label: 'At end of current period' },
];

const BILLING_CYCLE_OPTIONS: { value: SubscriptionBillingCycle; label: string }[] = [
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'ANNUAL', label: 'Annual' },
  { value: 'CUSTOM', label: 'Custom' },
];

export default function SubscriptionPage() {
  const subscription = useEffectiveSubscription();
  const history = useSubscriptionHistory(subscription.data?.id);
  const confirm = useConfirm();
  const [changePlanOpen, setChangePlanOpen] = useState(false);

  const sub = subscription.data;
  const pause = usePauseSubscription(sub?.id ?? '');
  const resume = useResumeSubscription(sub?.id ?? '');
  const cancel = useCancelSubscription(sub?.id ?? '');

  if (subscription.isLoading) return <Skeleton className="h-96 w-full" />;

  if (!sub) {
    return (
      <div>
        <PageHeader title="Subscription" description="Current subscription and lifecycle history." />
        <EmptyState title="No active subscription" description="This workspace has no subscription yet." />
      </div>
    );
  }

  const handleCancel = async () => {
    const ok = await confirm({
      title: 'Cancel subscription?',
      description: 'You can choose to cancel immediately or at the end of the current billing period.',
      confirmLabel: 'Cancel subscription',
      variant: 'danger',
    });
    if (ok) cancel.mutate({ immediate: false });
  };

  const actions: ActionMenuItem[] = [];
  if (sub.status === 'ACTIVE' || sub.status === 'TRIALING') {
    actions.push({ label: 'Change plan', icon: Repeat, onSelect: () => setChangePlanOpen(true) });
    actions.push({ label: 'Pause', icon: PauseCircle, onSelect: () => pause.mutate({}) });
  }
  if (sub.status === 'PAUSED') {
    actions.push({ label: 'Resume', icon: PlayCircle, onSelect: () => resume.mutate({}) });
  }
  if (sub.status !== 'CANCELLED' && sub.status !== 'EXPIRED') {
    actions.push({ label: 'Cancel subscription', icon: Ban, onSelect: handleCancel, destructive: true, separatorBefore: true });
  }

  return (
    <div>
      <PageHeader title="Subscription" description="Current subscription, lifecycle timeline and plan-change actions." actions={<ActionMenu items={actions} />} />

      <Card className="mb-6 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <StatusBadge status={sub.status} />
              {sub.isAdminOverride && (
                <span className="flex items-center gap-1 text-xs text-warning">
                  <ShieldAlert className="h-3 w-3" /> admin override
                </span>
              )}
            </div>
            <p className="mt-1 text-2xl font-bold text-foreground">{sub.planKey}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {sub.scope.toLowerCase()} · {sub.type.toLowerCase()} · {sub.billingCycle.toLowerCase()}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <Field label="Current period" value={`${formatDate(sub.currentPeriodStart)} – ${formatDate(sub.currentPeriodEnd)}`} />
            <Field label="Renewal date" value={sub.renewalDate ? formatDate(sub.renewalDate) : '—'} />
            <Field label="Trial" value={sub.trialEndAt ? `Ends ${formatDate(sub.trialEndAt)}` : '—'} />
            <Field label="Auto-renew" value={sub.autoRenew ? 'Enabled' : 'Disabled'} />
            <Field label="Grace period" value={sub.gracePeriodDays ? `${sub.gracePeriodDays} days` : '—'} />
            <Field label="Version" value={`v${sub.version}`} />
          </div>
        </div>

        {sub.scheduledChange && (
          <div className="mt-4 rounded-[var(--radius)] border border-warning/30 bg-warning/5 p-3 text-sm">
            <p className="font-medium text-foreground">Scheduled change</p>
            <p className="text-muted-foreground">
              {sub.scheduledChange.changeType.toLowerCase()} to {sub.scheduledChange.toPlanKey} effective {formatDate(sub.scheduledChange.effectiveAt)}
            </p>
          </div>
        )}

        {sub.cancelAtPeriodEnd && (
          <div className="mt-4 rounded-[var(--radius)] border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
            This subscription will cancel at the end of the current period{sub.cancelledAt ? ` (requested ${formatDate(sub.cancelledAt)})` : ''}.
          </div>
        )}
      </Card>

      <Card>
        <CardContent className="pt-6">
          <p className="mb-4 text-sm font-semibold text-foreground">Lifecycle history</p>
          {!history.data || history.data.length === 0 ? (
            <EmptyState title="No history yet" className="border-none py-6" />
          ) : (
            <div className="space-y-3">
              {history.data.map((h) => (
                <div key={h.id} className="flex items-start gap-3 border-b border-border pb-3 last:border-0">
                  <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {h.changeType.replace(/_/g, ' ').toLowerCase()}
                      {h.fromStatus && h.toStatus && h.fromStatus !== h.toStatus && (
                        <span className="text-muted-foreground"> · {h.fromStatus.toLowerCase()} → {h.toStatus.toLowerCase()}</span>
                      )}
                    </p>
                    {(h.fromPlanKey || h.toPlanKey) && h.fromPlanKey !== h.toPlanKey && (
                      <p className="text-xs text-muted-foreground">
                        {h.fromPlanKey ?? '—'} → {h.toPlanKey ?? '—'}
                      </p>
                    )}
                    {h.reason && <p className="mt-0.5 text-xs text-muted-foreground">{h.reason}</p>}
                    <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(h.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ChangePlanDialog subscriptionId={sub.id} currentPlanKey={sub.planKey} open={changePlanOpen} onOpenChange={setChangePlanOpen} />
    </div>
  );
}

function ChangePlanDialog({
  subscriptionId,
  currentPlanKey,
  open,
  onOpenChange,
}: {
  subscriptionId: string;
  currentPlanKey: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const changePlan = useChangeSubscriptionPlan(subscriptionId);
  const plans = usePlans({ status: 'PUBLISHED', limit: 100 });
  const [toPlanKey, setToPlanKey] = useState('');
  const [toBillingCycle, setToBillingCycle] = useState<SubscriptionBillingCycle | ''>('');
  const [changeType, setChangeType] = useState<PlanChangeDirection>('UPGRADE');
  const [effective, setEffective] = useState<PlanChangeEffective>('END_OF_PERIOD');
  const [reason, setReason] = useState('');

  const planOptions = (plans.data?.data ?? []).filter((p) => p.code !== currentPlanKey).map((p) => ({ value: p.code, label: `${p.name} (${p.code})` }));

  const submit = () => {
    const payload: ChangeSubscriptionPlanPayload = {
      toPlanKey,
      toBillingCycle: toBillingCycle || undefined,
      changeType,
      effective,
      reason: reason || undefined,
    };
    changePlan.mutate(payload, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Change plan</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <FormField label="New plan" htmlFor="cp-plan" required>
            <Select id="cp-plan" value={toPlanKey} onChange={(e) => setToPlanKey(e.target.value)} options={[{ value: '', label: 'Select a plan' }, ...planOptions]} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Direction" htmlFor="cp-direction" required>
              <Select id="cp-direction" value={changeType} onChange={(e) => setChangeType(e.target.value as PlanChangeDirection)} options={CHANGE_DIRECTION_OPTIONS} />
            </FormField>
            <FormField label="New billing cycle" htmlFor="cp-cycle">
              <Select id="cp-cycle" value={toBillingCycle} onChange={(e) => setToBillingCycle(e.target.value as SubscriptionBillingCycle | '')} options={[{ value: '', label: 'Keep current' }, ...BILLING_CYCLE_OPTIONS]} />
            </FormField>
          </div>
          <FormField label="When" htmlFor="cp-effective" required>
            <Select id="cp-effective" value={effective} onChange={(e) => setEffective(e.target.value as PlanChangeEffective)} options={CHANGE_EFFECTIVE_OPTIONS} />
          </FormField>
          <FormField label="Reason (optional)" htmlFor="cp-reason">
            <Textarea id="cp-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!toPlanKey || changePlan.isPending}>
            <RefreshCcw className="h-3.5 w-3.5" />
            Request plan change
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
