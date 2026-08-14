'use client';

import Link from 'next/link';
import { Activity, AlertOctagon, HeartPulse, History, ListChecks, Plug, Radio, Webhook } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface HubCard {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
}

const CARDS: HubCard[] = [
  { title: 'Marketplace Health', description: 'Live sync status, active issues and retry/cancel controls across all sync modules.', href: '/dashboard/marketplace-health', icon: HeartPulse },
  { title: 'Sync History & Failures', description: 'Sync run history, item-level failures, normalized error summaries and issue detection.', href: '/dashboard/marketplace-sync-history', icon: History },
  { title: 'Webhooks', description: 'Inbound webhook subscriptions with marketplace providers and delivery history.', href: '/dashboard/marketplace-webhooks', icon: Webhook },
  { title: 'Event Processing', description: 'Normalized event queue — pending, failed, reprocess and cancel actions.', href: '/dashboard/marketplace-events', icon: Radio },
  { title: 'Queue Management', description: 'Job queues, dead-letter jobs and rate-limit controls across sync, webhook and event queues.', href: '/dashboard/marketplace-queues', icon: ListChecks },
  { title: 'Error Center', description: 'Normalized error taxonomy — search, top errors and category/severity aggregates.', href: '/dashboard/marketplace-errors', icon: AlertOctagon },
  { title: 'Connection Tests', description: 'Authentication, reachability and capability connection-test results.', href: '/dashboard/marketplace-connection-tests', icon: Plug },
  { title: 'Activity & Audit', description: 'Provider and account activity timeline, searchable audit trail and suspicious-activity alerts.', href: '/dashboard/marketplace-activity', icon: Activity },
];

export default function MarketplaceOperationsHubPage() {
  return (
    <div>
      <PageHeader title="Marketplace Integration Operations" description="Central hub for monitoring and operating marketplace sync, webhooks, event processing, queues, errors and connection health." />
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
