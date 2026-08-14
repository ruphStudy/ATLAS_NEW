'use client';

import Link from 'next/link';
import { Globe2, Coins, Landmark, ScrollText, ShieldCheck, Languages, MapPinned, Building2, Network } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface HubCard {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
}

const CARDS: HubCard[] = [
  { title: 'Countries', description: 'Country configuration for locale, timezone, currency, tax regime and provider availability.', href: '/dashboard/countries', icon: Globe2 },
  { title: 'Currencies & Exchange Rates', description: 'Currency registry, ISO codes, rounding and exchange-rate history, sync and approvals.', href: '/dashboard/currencies', icon: Coins },
  { title: 'Tax Engine', description: 'Tax jurisdictions, rules, rates, thresholds, exemptions and applicability.', href: '/dashboard/tax', icon: Landmark },
  { title: 'GST / VAT', description: 'Registrations, tax codes, reverse charge, input/output tax and applied transactions.', href: '/dashboard/gst-vat', icon: ScrollText },
  { title: 'Compliance', description: 'Compliance requirement rules, records, evidence, review and waiver/override workflows.', href: '/dashboard/compliance', icon: ShieldCheck },
  { title: 'Localization', description: 'Locale, language, direction, formats and per-country/marketplace availability.', href: '/dashboard/localization', icon: Languages },
  { title: 'Regional Settings', description: 'Country/region profiles for business hours, holidays and operational preferences.', href: '/dashboard/regional-settings', icon: MapPinned },
  { title: 'Brands', description: 'Multi-brand profiles, ownership, associations and lifecycle status.', href: '/dashboard/multi-brand', icon: Building2 },
  { title: 'Businesses & Enterprise Structure', description: 'Legal entities, hierarchy, tax identifiers and the organization structure tree.', href: '/dashboard/multi-business', icon: Network },
];

export default function MultiCountryHubPage() {
  return (
    <div>
      <PageHeader title="Multi-Country, Tax & Compliance" description="Countries, currencies, tax, GST/VAT, compliance, localization and enterprise structure." />
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
