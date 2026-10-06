'use client';

import Link from 'next/link';
import { Building2, Coins, FileKey2, Flag, Gauge, LineChart, HeartPulse, Repeat, ShieldAlert, Store, Tag } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface HubCard {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
}

const CARDS: HubCard[] = [
  { title: 'Tenants', description: 'Cross-tenant list, lifecycle actions, overrides, notes and impersonation.', href: '/dashboard/platform-admin/tenants', icon: Building2 },
  { title: 'Tenant Analytics', description: 'MRR, ARR, ARPU, growth, churn, retention, segments and cohorts.', href: '/dashboard/tenant-analytics', icon: LineChart },
  { title: 'SaaS Monitoring', description: 'Cross-tenant module health for provisioning, billing, payments, apps and plugins.', href: '/dashboard/saas-monitoring', icon: HeartPulse },
  { title: 'SaaS Audit', description: 'Cross-tenant audit trail, admin actions, impersonation sessions and security incidents.', href: '/dashboard/saas-audit', icon: ShieldAlert },
  { title: 'App Store & Plugins', description: 'Catalog apps, installations, versions, approvals and plugin activations.', href: '/dashboard/app-store', icon: Store },
  { title: 'Plans', description: 'Plan catalog, entitlements, limits, versions, compatibility and publishing.', href: '/dashboard/plans', icon: Tag },
  { title: 'Subscriptions', description: 'Subscription lifecycle, plan changes, proration and admin overrides.', href: '/dashboard/subscriptions', icon: Repeat },
  { title: 'Quotas', description: 'Resource quota policies, soft/hard limits, overage rules and admin overrides.', href: '/dashboard/quotas', icon: Gauge },
  { title: 'Licenses', description: 'License issuance, activation, entitlements, renewal and transfer.', href: '/dashboard/licenses', icon: FileKey2 },
  { title: 'Feature Flags', description: 'Flag definitions, rollout rules, kill switches and scoped overrides.', href: '/dashboard/feature-flags', icon: Flag },
  { title: 'Billing', description: 'Billing rules, periods, payments, adjustments and reconciliation.', href: '/dashboard/billing', icon: Coins },
];

export default function PlatformAdminHubPage() {
  return (
    <div>
      <PageHeader title="Platform Admin" description="Cross-tenant SaaS administration — true platform-admin access only." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((card) => (
          <Link key={card.href} href={card.href}>
            <Card hover className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <card.icon className="h-4 w-4 text-primary" />
                  {card.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{card.description}</CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
