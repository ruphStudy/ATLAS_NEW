'use client';

import Link from 'next/link';
import { KeyRound, Radio, Link2, ShieldCheck, Server, Store } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface HubCard {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
}

const CARDS: HubCard[] = [
  { title: 'API Keys', description: 'Create, rotate and revoke API keys, and manage scopes and permissions.', href: '/dashboard/api-keys', icon: KeyRound },
  { title: 'Webhooks', description: 'Subscribe endpoints to events, monitor delivery health and redeliver failed events.', href: '/dashboard/webhooks', icon: Radio },
  { title: 'OAuth Connections', description: 'Register provider clients and manage authorized connections and tokens.', href: '/dashboard/oauth-connections', icon: Link2 },
  { title: 'SSO Configuration', description: 'Configure SAML/OIDC single sign-on, domain enforcement and group mapping.', href: '/dashboard/sso-connections', icon: ShieldCheck },
  { title: 'AI Providers', description: 'AI provider registry, configuration, credentials and rollout status.', href: '/dashboard/ai-providers', icon: Server },
  { title: 'Marketplace Providers', description: 'Marketplace provider capability matrix and account connections.', href: '/dashboard/marketplace-providers', icon: Store },
];

export default function DeveloperHubPage() {
  return (
    <div>
      <PageHeader title="Developer & Integrations" description="Manage API access, webhooks, OAuth connections, SSO and provider integrations." />
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
