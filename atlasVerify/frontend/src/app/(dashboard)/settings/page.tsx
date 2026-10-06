'use client';

import Link from 'next/link';
import { Building2, User, GitBranch, ToggleLeft, Languages, Globe2, Palette, SlidersHorizontal, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';

const CATEGORIES = [
  {
    href: '/dashboard/settings/organization',
    icon: Building2,
    title: 'Organization',
    description: 'Profile, regional defaults, operational defaults and business policies.',
  },
  {
    href: '/dashboard/settings/preferences',
    icon: User,
    title: 'My Preferences',
    description: 'Locale, timezone, currency, notifications, dashboards, tables, defaults and appearance.',
  },
  {
    href: '/dashboard/settings/rules',
    icon: GitBranch,
    title: 'Business Rules',
    description: 'Conditions, actions, priorities, simulation and execution history.',
  },
  {
    href: '/dashboard/settings/feature-flags',
    icon: ToggleLeft,
    title: 'Feature Flags',
    description: 'Targeting, rollout percentage, dependencies and kill switches.',
  },
  {
    href: '/dashboard/settings/localization',
    icon: Languages,
    title: 'Localization',
    description: 'Locales, fallback languages, enabled/preferred languages and translation completeness.',
  },
  {
    href: '/dashboard/settings/regional',
    icon: Globe2,
    title: 'Regional Settings',
    description: 'Country/region profiles — currency, tax, business hours, holidays and operational preferences.',
  },
  {
    href: '/dashboard/settings/theme',
    icon: Palette,
    title: 'Theme & Branding',
    description: 'Light/dark/system mode, logo, accent color, typography and density.',
  },
  {
    href: '/dashboard/settings/explorer',
    icon: SlidersHorizontal,
    title: 'Settings Explorer',
    description: 'Browse every setting definition, see inherited vs. overridden values and precedence, and roll back.',
  },
];

export default function SettingsHubPage() {
  return (
    <div>
      <PageHeader title="Settings" description="Organization, workspace, business and personal configuration in one place." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CATEGORIES.map((c) => (
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
