'use client';

import Link from 'next/link';
import { CreditCard, Layers, Receipt, Wallet, Gauge, ShieldCheck, KeyRound, ChevronRight, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { KpiCard } from '@/components/ui/kpi-card';
import { Progress } from '@/components/ui/progress';
import { EmptyState } from '@/components/ui/states';
import { useBillingPeriods, useEffectiveSubscription, useResourceUsageSummary } from '@/hooks';
import { formatCurrency, formatDate } from '@/lib/utils';

const SECTIONS = [
  { href: '/dashboard/billing/plans', icon: Layers, title: 'Plans', description: 'Browse the plan catalog, compare features, limits and pricing.' },
  { href: '/dashboard/billing/subscription', icon: CreditCard, title: 'Subscription', description: 'Current subscription, lifecycle history and plan-change actions.' },
  { href: '/dashboard/billing/invoices', icon: Receipt, title: 'Invoices', description: 'Invoice history, tax breakdown, payment references and downloads.' },
  { href: '/dashboard/billing/payments', icon: Wallet, title: 'Payment Providers', description: 'Connected payment accounts, health, transactions and refunds.' },
  { href: '/dashboard/billing/usage', icon: Gauge, title: 'Usage', description: 'Metered resource usage vs. plan allowance, overage and forecast.' },
  { href: '/dashboard/billing/quota', icon: ShieldCheck, title: 'Quota', description: 'Quota policies, overrides, grace limits and enforcement checks.' },
  { href: '/dashboard/billing/licenses', icon: KeyRound, title: 'Licenses', description: 'License status, activations, expiry and feature entitlements.' },
];

export default function BillingDashboardPage() {
  const subscription = useEffectiveSubscription();
  const periods = useBillingPeriods(subscription.data ? { subscriptionId: subscription.data.id, limit: 1, sortBy: 'periodStart', sortOrder: 'desc' } : { limit: 1 });
  const usage = useResourceUsageSummary();

  const sub = subscription.data;
  const currentPeriod = periods.data?.data?.[0];
  const topUsage = (usage.data ?? []).slice(0, 4);

  return (
    <div>
      <PageHeader title="Billing & Subscription" description="Plan, subscription status, billing summary and usage at a glance." />

      {subscription.isLoading ? (
        <Skeleton className="mb-6 h-32 w-full" />
      ) : !sub ? (
        <EmptyState
          icon={AlertTriangle}
          title="No active subscription"
          description="This workspace has no subscription yet. Contact your organization owner to set one up."
          className="mb-6"
        />
      ) : (
        <Card className="mb-6 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Current plan</p>
                <StatusBadge status={sub.status} />
                {sub.cancelAtPeriodEnd && <StatusBadge status="CANCELS_AT_PERIOD_END" tone="warning" label="Cancels at period end" />}
              </div>
              <p className="mt-1 text-2xl font-bold text-foreground">{sub.planKey}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {sub.billingCycle.toLowerCase()} billing · {sub.type.toLowerCase()}
                {sub.status === 'TRIALING' && sub.trialEndAt && <> · trial ends {formatDate(sub.trialEndAt)}</>}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <Field label="Current period" value={`${formatDate(sub.currentPeriodStart)} – ${formatDate(sub.currentPeriodEnd)}`} />
              <Field label="Renewal date" value={sub.renewalDate ? formatDate(sub.renewalDate) : '—'} />
              <Field label="Auto-renew" value={sub.autoRenew ? 'Enabled' : 'Disabled'} />
              <Field label="Grace period" value={sub.gracePeriodDays ? `${sub.gracePeriodDays} days` : '—'} />
            </div>
            <Link href="/dashboard/billing/subscription" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              Manage subscription
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </Card>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {periods.isLoading ? (
          <>
            <KpiCard label="Total" value="" loading />
            <KpiCard label="Balance due" value="" loading />
            <KpiCard label="Overage" value="" loading />
            <KpiCard label="Adjustments" value="" loading />
          </>
        ) : currentPeriod ? (
          <>
            <KpiCard label="Current period total" value={formatCurrency(currentPeriod.total, currentPeriod.currency)} icon={Receipt} description={currentPeriod.status.toLowerCase()} />
            <KpiCard
              label="Balance due"
              value={formatCurrency(currentPeriod.balanceDue, currentPeriod.currency)}
              icon={Wallet}
              gradient={currentPeriod.balanceDue > 0 ? 'from-danger to-warning' : 'from-success to-primary'}
              description={currentPeriod.dueDate ? `Due ${formatDate(currentPeriod.dueDate)}` : undefined}
            />
            <KpiCard label="Overage charges" value={formatCurrency(currentPeriod.overageTotal, currentPeriod.currency)} icon={Gauge} />
            <KpiCard label="Discounts & credits" value={formatCurrency(currentPeriod.discountTotal + currentPeriod.creditTotal, currentPeriod.currency)} icon={CreditCard} />
          </>
        ) : (
          <div className="sm:col-span-2 lg:col-span-4">
            <EmptyState title="No billing periods yet" className="py-8" />
          </div>
        )}
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Usage snapshot</p>
            <Link href="/dashboard/billing/usage" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              View full usage dashboard
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          {usage.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : topUsage.length === 0 ? (
            <EmptyState title="No usage recorded yet" className="border-none py-6" />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {topUsage.map((u) => {
                const limit = u.comparison?.limit?.hard ?? u.comparison?.limit?.soft;
                const pct = limit ? Math.min(100, Math.round((u.currentPeriodUsage / limit) * 100)) : null;
                const level = u.comparison?.thresholdLevel;
                return (
                  <div key={u.resourceKey}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">{u.resourceKey}</span>
                      <span className="text-muted-foreground">
                        {u.currentPeriodUsage.toLocaleString()} {u.unit}
                        {limit ? ` / ${limit.toLocaleString()}` : ''}
                      </span>
                    </div>
                    {pct !== null && (
                      <Progress value={pct} variant={level === 'EXCEEDED' ? 'danger' : level === 'WARNING' || level === 'GRACE' ? 'warning' : 'default'} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((c) => (
          <Link key={c.href} href={c.href}>
            <Card hover className="h-full p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent shadow-sm">
                  <c.icon className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 text-sm font-semibold text-foreground">
                    {c.title}
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{c.description}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
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
