'use client';

import Link from 'next/link';
import { Bell, Building2, PlugZap, Server, Truck, Wallet } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface HubCard {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
}

const CARDS: HubCard[] = [
  { title: 'Marketplace Providers', description: 'Marketplace provider registry, configuration, capabilities and account connections.', href: '/dashboard/marketplace-providers', icon: PlugZap },
  { title: 'AI Providers', description: 'AI provider registry, configuration, credentials and rollout status.', href: '/dashboard/ai-providers', icon: Server },
  { title: 'Payment Providers', description: 'Payment provider accounts, credentials, connection health and transactions.', href: '/dashboard/payment-providers', icon: Wallet },
  { title: 'Supplier Providers', description: 'B2B supplier discovery provider registry and connection health.', href: '/dashboard/supplier-providers', icon: Building2 },
  { title: 'Shipping Providers', description: 'Shipping and courier provider registry, service levels and connection health.', href: '/dashboard/shipping-providers', icon: Truck },
  { title: 'Notification Providers', description: 'Notification provider registry, configuration, credentials and delivery activity.', href: '/dashboard/notification-providers', icon: Bell },
];

export default function ProviderAdminHubPage() {
  return (
    <div>
      <PageHeader title="Provider & Integration Administration" description="Central hub for managing marketplace, AI, payment, supplier, shipping and notification provider integrations." />
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
