'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Bell,
  Bot,
  Boxes,
  Building2,
  CheckCircle2,
  Circle,
  Coins,
  CreditCard,
  ExternalLink,
  FileText,
  Globe2,
  HelpCircle,
  Loader2,
  Package,
  Palette,
  RefreshCw,
  ScrollText,
  SkipForward,
  Store,
  Truck,
  Users,
  Warehouse as WarehouseIcon,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { FormField } from '@/components/ui/form-field';
import { Progress } from '@/components/ui/progress';
import { StatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/states';
import { Tooltip } from '@/components/ui/tooltip';
import { useAuthStore } from '@/stores';
import {
  useCachedSupplierProviderHealth,
  useComplianceRules,
  useCreateWarehouse,
  useCreateWorkspace,
  useEffectiveSubscription,
  useGstVatRegistrations,
  useInviteMember,
  useMarketplaceAccounts,
  useMarketplaceProviders,
  useMultiBrands,
  useMyWorkspaces,
  useNotificationProviderRegistry,
  useOrganizationProfile,
  usePaymentProviderAccounts,
  useProducts,
  useProviderRegistryEntries,
  useAiModels,
  useRegionalSettingsProfiles,
  useRoles,
  useSuppliers,
  useSupplierProviders,
  useTestMarketplaceAccountConnection,
  useUniversalListingList,
  useWarehouseOptions,
  useWorkspaceCurrencyConfig,
  useWorkspaceMembers,
} from '@/hooks';
import { formatDate } from '@/lib/utils';
import { ROUTES } from '@/constants';
import type { CreateWarehousePayload, WarehouseType, WorkspaceMemberRole } from '@/types';

type StepId =
  | 'organization' | 'workspace' | 'region' | 'brand' | 'warehouse' | 'marketplace'
  | 'supplier-provider' | 'ai-provider' | 'notification' | 'payment' | 'tax-compliance'
  | 'team' | 'plan' | 'first-product' | 'first-supplier' | 'first-listing' | 'summary';

interface StepDef {
  id: StepId;
  title: string;
  icon: React.ElementType;
  required: boolean;
  help: string;
}

const STEP_DEFS: StepDef[] = [
  { id: 'organization', title: 'Organization profile', icon: Building2, required: true, help: 'Your company details, used across invoices, compliance and marketplace listings.' },
  { id: 'workspace', title: 'Workspace', icon: Boxes, required: true, help: 'A workspace isolates your catalog, orders and settings — most teams only need one to start.' },
  { id: 'region', title: 'Region & currency', icon: Globe2, required: true, help: 'Country, timezone, locale and currency defaults used for pricing, tax and reporting.' },
  { id: 'brand', title: 'Brand', icon: Palette, required: false, help: 'Optional — set up if you sell under a registered brand (useful for Amazon Brand Registry).' },
  { id: 'warehouse', title: 'Warehouse', icon: WarehouseIcon, required: true, help: 'Where your inventory physically lives — needed before you can receive or ship stock.' },
  { id: 'marketplace', title: 'Marketplace connection', icon: Store, required: true, help: 'Connect at least one marketplace (e.g. Amazon) so ATLAS can sync listings, orders and inventory.' },
  { id: 'supplier-provider', title: 'Supplier providers', icon: Truck, required: false, help: 'Optional — connect B2B sourcing providers for supplier discovery.' },
  { id: 'ai-provider', title: 'AI provider & model', icon: Bot, required: false, help: 'Powers AI content generation, SEO and image generation. Skip if you don’t plan to use AI features yet.' },
  { id: 'notification', title: 'Notifications', icon: Bell, required: false, help: 'Configure how ATLAS notifies your team about orders, sync issues and approvals.' },
  { id: 'payment', title: 'Payment provider', icon: CreditCard, required: false, help: 'Only required if you process payments directly through ATLAS.' },
  { id: 'tax-compliance', title: 'Tax & compliance', icon: ScrollText, required: false, help: 'GST/VAT registrations and compliance checklist for the regions you sell in.' },
  { id: 'team', title: 'Invite your team', icon: Users, required: false, help: 'Bring in teammates and assign roles so work can be shared safely.' },
  { id: 'plan', title: 'Plan & subscription', icon: Coins, required: false, help: 'Confirm your subscription plan and usage limits are in place.' },
  { id: 'first-product', title: 'First product', icon: Package, required: false, help: 'Add your first product to the catalog to unlock listing and AI content workflows.' },
  { id: 'first-supplier', title: 'First supplier', icon: Truck, required: false, help: 'Add a supplier record to start sourcing and procurement workflows.' },
  { id: 'first-listing', title: 'First listing', icon: FileText, required: false, help: 'Generate your first marketplace listing from a product in your catalog.' },
  { id: 'summary', title: 'Setup summary', icon: CheckCircle2, required: false, help: 'Review blockers, warnings and optional steps before you consider setup complete.' },
];

const STORAGE_KEY = 'atlas.onboarding.wizard.v1';

function loadStoredState(): { activeStepId: StepId; skipped: StepId[] } {
  if (typeof window === 'undefined') return { activeStepId: 'organization', skipped: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { activeStepId: 'organization', skipped: [] };
    const parsed = JSON.parse(raw);
    return { activeStepId: parsed.activeStepId ?? 'organization', skipped: Array.isArray(parsed.skipped) ? parsed.skipped : [] };
  } catch {
    return { activeStepId: 'organization', skipped: [] };
  }
}

function count(result: unknown): number {
  if (!result) return 0;
  if (Array.isArray(result)) return result.length;
  const r = result as { total?: number; data?: unknown[]; items?: unknown[] };
  if (typeof r.total === 'number') return r.total;
  if (Array.isArray(r.data)) return r.data.length;
  if (Array.isArray(r.items)) return r.items.length;
  return 0;
}

export default function OnboardingWizardPage() {
  const workspaceId = useAuthStore((s) => s.user?.workspaceId);
  const stored = useMemo(loadStoredState, []);
  const [activeStepId, setActiveStepId] = useState<StepId>(stored.activeStepId);
  const [skipped, setSkipped] = useState<StepId[]>(stored.skipped);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ activeStepId, skipped }));
  }, [activeStepId, skipped]);

  // ── Status-check queries (one lightweight existence check per step) ──
  const orgProfile = useOrganizationProfile();
  const myWorkspaces = useMyWorkspaces();
  const regionalProfiles = useRegionalSettingsProfiles({ limit: 1 });
  const currencyConfig = useWorkspaceCurrencyConfig(workspaceId);
  const brands = useMultiBrands({ limit: 1 });
  const warehouses = useWarehouseOptions({ limit: 5 });
  const marketplaceAccounts = useMarketplaceAccounts({ limit: 10 });
  const marketplaceProviders = useMarketplaceProviders();
  const supplierProviders = useSupplierProviders();
  const supplierProviderHealth = useCachedSupplierProviderHealth();
  const aiProviders = useProviderRegistryEntries({ limit: 5 });
  const aiModels = useAiModels({ status: 'ACTIVE', limit: 100 });
  const notificationProviders = useNotificationProviderRegistry({ limit: 1 });
  const paymentAccounts = usePaymentProviderAccounts();
  const gstRegistrations = useGstVatRegistrations({ limit: 1 });
  const complianceRules = useComplianceRules({ limit: 1 });
  const workspaceMembers = useWorkspaceMembers(workspaceId, { limit: 5 });
  const subscription = useEffectiveSubscription();
  const products = useProducts({ limit: 1 });
  const suppliers = useSuppliers({ limit: 1 });
  const listings = useUniversalListingList({ limit: 1 });

  const statusLoading = orgProfile.isLoading || myWorkspaces.isLoading || warehouses.isLoading || marketplaceAccounts.isLoading;

  const isComplete: Record<StepId, boolean> = {
    organization: Object.keys(orgProfile.data ?? {}).length > 0,
    workspace: count(myWorkspaces.data) > 0,
    region: count(regionalProfiles.data) > 0 || !!currencyConfig.data,
    brand: count(brands.data) > 0,
    warehouse: count(warehouses.data) > 0,
    marketplace: (marketplaceAccounts.data?.items ?? []).some((a) => a.status === 'ACTIVE' || a.lastTestSuccess),
    'supplier-provider': count(supplierProviders.data) > 0,
    'ai-provider': count(aiProviders.data) > 0,
    notification: count(notificationProviders.data) > 0,
    payment: count(paymentAccounts.data) > 0,
    'tax-compliance': count(gstRegistrations.data) > 0,
    team: count(workspaceMembers.data) > 1,
    plan: !!subscription.data,
    'first-product': count(products.data) > 0,
    'first-supplier': count(suppliers.data) > 0,
    'first-listing': count(listings.data) > 0,
    summary: false,
  };

  const requiredSteps = STEP_DEFS.filter((s) => s.required);
  const optionalSteps = STEP_DEFS.filter((s) => !s.required && s.id !== 'summary');
  const blockers = requiredSteps.filter((s) => !isComplete[s.id]);
  const warnings = optionalSteps.filter((s) => !isComplete[s.id] && !skipped.includes(s.id));
  const totalTracked = requiredSteps.length + optionalSteps.length;
  const doneCount = STEP_DEFS.filter((s) => s.id !== 'summary' && (isComplete[s.id] || skipped.includes(s.id))).length;
  const readinessScore = totalTracked > 0 ? Math.round((doneCount / totalTracked) * 100) : 0;

  const refetchAll = () => {
    [orgProfile, myWorkspaces, regionalProfiles, currencyConfig, brands, warehouses, marketplaceAccounts, marketplaceProviders, supplierProviders, supplierProviderHealth, aiProviders, aiModels, notificationProviders, paymentAccounts, gstRegistrations, complianceRules, workspaceMembers, subscription, products, suppliers, listings].forEach((q) => q.refetch?.());
  };

  const toggleSkip = (id: StepId) => setSkipped((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <div>
      <PageHeader
        title="Setup Wizard"
        description="Get ATLAS ready for your business — step by step, save automatically, resume anytime."
        actions={
          <Button variant="outline" onClick={refetchAll}>
            <RefreshCw className="h-4 w-4" />
            Recheck status
          </Button>
        }
      />

      <Card className="mb-6">
        <CardContent className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">Readiness score</span>
              <span className="text-muted-foreground">{readinessScore}%</span>
            </div>
            <Progress value={readinessScore} variant={blockers.length > 0 ? 'warning' : 'success'} />
          </div>
          <div className="flex gap-4 text-sm">
            <span className="text-danger">{blockers.length} blocker{blockers.length === 1 ? '' : 's'}</span>
            <span className="text-warning">{warnings.length} optional pending</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <nav className="space-y-1">
          {STEP_DEFS.map((step) => {
            const done = step.id === 'summary' ? false : isComplete[step.id];
            const isSkipped = skipped.includes(step.id);
            const active = activeStepId === step.id;
            return (
              <button
                key={step.id}
                onClick={() => setActiveStepId(step.id)}
                className={`flex w-full items-center gap-2.5 rounded-[var(--radius)] px-3 py-2 text-left text-sm transition-colors ${
                  active ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-secondary'
                }`}
              >
                {done ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                ) : isSkipped ? (
                  <SkipForward className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <step.icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate">{step.title}</span>
                {step.required && !done && <Badge variant="danger" className="text-[9px]">required</Badge>}
              </button>
            );
          })}
        </nav>

        <div>
          {statusLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : (
            <StepDetail
              step={STEP_DEFS.find((s) => s.id === activeStepId) as StepDef}
              isComplete={isComplete}
              skipped={skipped}
              toggleSkip={toggleSkip}
              workspaceId={workspaceId}
              data={{
                warehouses: warehouses.data,
                marketplaceAccounts: marketplaceAccounts.data,
                marketplaceProviders: marketplaceProviders.data,
                supplierProviders: supplierProviders.data,
                supplierProviderHealth: supplierProviderHealth.data,
                aiProviders: aiProviders.data,
                aiModels: aiModels.data,
                workspaceMembers: workspaceMembers.data,
                subscription: subscription.data,
                gstRegistrations: gstRegistrations.data,
                complianceRules: complianceRules.data,
              }}
              blockers={blockers}
              warnings={warnings}
              onNavigate={setActiveStepId}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Step detail dispatcher ───────────────────────── */

interface StepDetailProps {
  step: StepDef;
  isComplete: Record<StepId, boolean>;
  skipped: StepId[];
  toggleSkip: (id: StepId) => void;
  workspaceId: string | undefined;
  data: {
    warehouses: unknown;
    marketplaceAccounts: ReturnType<typeof useMarketplaceAccounts>['data'];
    marketplaceProviders: ReturnType<typeof useMarketplaceProviders>['data'];
    supplierProviders: ReturnType<typeof useSupplierProviders>['data'];
    supplierProviderHealth: ReturnType<typeof useCachedSupplierProviderHealth>['data'];
    aiProviders: ReturnType<typeof useProviderRegistryEntries>['data'];
    aiModels: ReturnType<typeof useAiModels>['data'];
    workspaceMembers: ReturnType<typeof useWorkspaceMembers>['data'];
    subscription: ReturnType<typeof useEffectiveSubscription>['data'];
    gstRegistrations: ReturnType<typeof useGstVatRegistrations>['data'];
    complianceRules: ReturnType<typeof useComplianceRules>['data'];
  };
  blockers: StepDef[];
  warnings: StepDef[];
  onNavigate: (id: StepId) => void;
}

function StepShell({ step, complete, skippedNow, onSkip, children }: { step: StepDef; complete: boolean; skippedNow: boolean; onSkip?: () => void; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <step.icon className="h-4.5 w-4.5 text-primary" />
            {step.title}
            {!step.required && <Badge variant="secondary" className="text-[10px]">optional</Badge>}
          </span>
          <span className="flex items-center gap-2">
            {complete ? <StatusBadge status="COMPLETE" tone="success" /> : skippedNow ? <StatusBadge status="SKIPPED" tone="neutral" /> : <StatusBadge status="INCOMPLETE" tone="warning" />}
            <Tooltip content={step.help}>
              <HelpCircle className="h-4 w-4 cursor-help text-muted-foreground" />
            </Tooltip>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{step.help}</p>
        {children}
        {!step.required && !complete && onSkip && (
          <Button variant="ghost" size="sm" onClick={onSkip}>
            <SkipForward className="h-3.5 w-3.5" />
            {skippedNow ? 'Unskip this step' : 'Skip for now'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function DeepLinkAction({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href}>
      <Button variant="outline">
        {label}
        <ExternalLink className="h-3.5 w-3.5" />
      </Button>
    </Link>
  );
}

function StepDetail({ step, isComplete, skipped, toggleSkip, workspaceId, data, blockers, warnings, onNavigate }: StepDetailProps) {
  const shellProps = { step, complete: isComplete[step.id], skippedNow: skipped.includes(step.id), onSkip: () => toggleSkip(step.id) };

  switch (step.id) {
    case 'organization':
      return (
        <StepShell {...shellProps}>
          <DeepLinkAction href="/settings" label="Manage organization profile" />
        </StepShell>
      );

    case 'workspace':
      return <WorkspaceStep {...shellProps} />;

    case 'region':
      return (
        <StepShell {...shellProps}>
          <div className="flex flex-wrap gap-2">
            <DeepLinkAction href="/multi-country" label="Multi-Country Hub" />
            <DeepLinkAction href="/regional-settings" label="Regional settings" />
            <DeepLinkAction href="/currencies" label="Currencies" />
          </div>
        </StepShell>
      );

    case 'brand':
      return (
        <StepShell {...shellProps}>
          <DeepLinkAction href="/multi-brand" label="Manage brands" />
        </StepShell>
      );

    case 'warehouse':
      return <WarehouseStep {...shellProps} warehouses={data.warehouses} />;

    case 'marketplace':
      return <MarketplaceStep {...shellProps} accounts={data.marketplaceAccounts} providers={data.marketplaceProviders} />;

    case 'supplier-provider':
      return <SupplierProviderStep {...shellProps} providers={data.supplierProviders} health={data.supplierProviderHealth} />;

    case 'ai-provider':
      return <AiProviderStep {...shellProps} providers={data.aiProviders} models={data.aiModels} />;

    case 'notification':
      return (
        <StepShell {...shellProps}>
          <DeepLinkAction href="/notification-providers" label="Configure notifications" />
        </StepShell>
      );

    case 'payment':
      return (
        <StepShell {...shellProps}>
          <DeepLinkAction href="/payment-providers" label="Configure payment providers" />
        </StepShell>
      );

    case 'tax-compliance':
      return <TaxComplianceStep {...shellProps} gst={data.gstRegistrations} compliance={data.complianceRules} />;

    case 'team':
      return <TeamStep {...shellProps} workspaceId={workspaceId} members={data.workspaceMembers} />;

    case 'plan':
      return <PlanStep {...shellProps} subscription={data.subscription} />;

    case 'first-product':
      return (
        <StepShell {...shellProps}>
          <DeepLinkAction href="/products" label="Add your first product" />
        </StepShell>
      );

    case 'first-supplier':
      return (
        <StepShell {...shellProps}>
          <DeepLinkAction href={ROUTES.SUPPLIERS} label="Add your first supplier" />
        </StepShell>
      );

    case 'first-listing':
      return (
        <StepShell {...shellProps}>
          <DeepLinkAction href="/ai-content-studio" label="Generate your first listing" />
        </StepShell>
      );

    case 'summary':
      return <SummaryStep isComplete={isComplete} blockers={blockers} warnings={warnings} onNavigate={onNavigate} />;

    default:
      return null;
  }
}

/* ───────────────────────── Workspace step ───────────────────────── */

function WorkspaceStep(props: { step: StepDef; complete: boolean; skippedNow: boolean; onSkip: () => void }) {
  const create = useCreateWorkspace();
  const [name, setName] = useState('');

  return (
    <StepShell {...props}>
      <div className="flex items-end gap-2">
        <FormField label="Workspace name" htmlFor="onb-ws-name">
          <Input id="onb-ws-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. My Company" className="w-64" />
        </FormField>
        <Button onClick={() => create.mutate({ name }, { onSuccess: () => setName('') })} disabled={!name || create.isPending}>
          {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Create workspace
        </Button>
      </div>
      <DeepLinkAction href="/workspaces" label="Manage workspaces" />
    </StepShell>
  );
}

/* ───────────────────────── Warehouse step ───────────────────────── */

const WAREHOUSE_TYPES: WarehouseType[] = ['OWN', 'RENTED', 'THIRD_PARTY', 'MARKETPLACE', 'VIRTUAL'];

function WarehouseStep(props: { step: StepDef; complete: boolean; skippedNow: boolean; onSkip: () => void; warehouses: unknown }) {
  const create = useCreateWarehouse();
  const [form, setForm] = useState<{ code: string; name: string; type: WarehouseType; country: string; city: string }>({ code: '', name: '', type: 'OWN', country: '', city: '' });
  const list = (props.warehouses as { data?: { id: string; name: string; code: string; city?: string | null; country?: string | null; isDefault: boolean }[] } | undefined)?.data ?? [];

  const submit = () => {
    const payload: CreateWarehousePayload = { code: form.code, name: form.name, type: form.type, country: form.country || undefined, city: form.city || undefined };
    create.mutate(payload, { onSuccess: () => setForm({ code: '', name: '', type: 'OWN', country: '', city: '' }) });
  };

  return (
    <StepShell step={props.step} complete={props.complete} skippedNow={props.skippedNow} onSkip={props.onSkip}>
      {list.length > 0 && (
        <div className="space-y-1">
          {list.map((w) => (
            <div key={w.id} className="flex items-center justify-between rounded-[var(--radius)] border border-border px-3 py-2 text-sm">
              <span className="text-foreground">{w.name} <span className="text-xs text-muted-foreground">({w.code})</span></span>
              <span className="text-xs text-muted-foreground">{[w.city, w.country].filter(Boolean).join(', ') || '—'}</span>
            </div>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <FormField label="Code" htmlFor="onb-wh-code">
          <Input id="onb-wh-code" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
        </FormField>
        <FormField label="Name" htmlFor="onb-wh-name">
          <Input id="onb-wh-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </FormField>
        <FormField label="Type" htmlFor="onb-wh-type">
          <Select id="onb-wh-type" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as WarehouseType }))} options={WAREHOUSE_TYPES.map((t) => ({ value: t, label: t.replace(/_/g, ' ') }))} />
        </FormField>
        <FormField label="City" htmlFor="onb-wh-city">
          <Input id="onb-wh-city" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
        </FormField>
        <FormField label="Country" htmlFor="onb-wh-country">
          <Input id="onb-wh-country" value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} placeholder="ISO code" />
        </FormField>
      </div>
      <Button onClick={submit} disabled={!form.code || !form.name || create.isPending}>
        {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Add warehouse
      </Button>
      <DeepLinkAction href="/warehouses" label="Manage warehouses" />
    </StepShell>
  );
}

/* ───────────────────────── Marketplace step ───────────────────────── */

function MarketplaceStep(props: {
  step: StepDef; complete: boolean; skippedNow: boolean; onSkip: () => void;
  accounts: ReturnType<typeof useMarketplaceAccounts>['data'];
  providers: ReturnType<typeof useMarketplaceProviders>['data'];
}) {
  const accounts = props.accounts?.items ?? [];
  const providers = props.providers ?? [];
  const amazonProvider = providers.find((p) => p.providerKey.toLowerCase().includes('amazon') || p.displayName.toLowerCase().includes('amazon'));

  return (
    <StepShell step={props.step} complete={props.complete} skippedNow={props.skippedNow} onSkip={props.onSkip}>
      {accounts.length > 0 && (
        <div className="space-y-1">
          {accounts.map((a) => (
            <MarketplaceAccountRow key={a.id} account={a} />
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <DeepLinkAction href="/marketplace-accounts" label="Connect a marketplace account" />
        <DeepLinkAction href="/marketplace-providers" label="Marketplace providers" />
        <DeepLinkAction href="/marketplace-connection-tests" label="Connection test history" />
      </div>

      <div className="rounded-[var(--radius)] border border-border bg-secondary/30 p-4">
        <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Store className="h-4 w-4" />
          Connecting Amazon{amazonProvider ? '' : ' (when available)'}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">You do this in Seller Central</p>
            <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
              <li>Create and verify your Amazon Seller account (legal identity, bank details, tax interview)</li>
              <li>Authorize ATLAS as an SP-API developer application from Seller Central and obtain the resulting refresh token/credentials</li>
              <li>Enroll in FBA and Brand Registry directly with Amazon, if you plan to use them</li>
            </ul>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">ATLAS automates once connected</p>
            <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
              <li>Storing your SP-API credentials securely and running a connection test</li>
              <li>Validating account status and marketplace capabilities</li>
              <li>Syncing catalog, inventory, orders and FBA readiness signals reported by Amazon</li>
            </ul>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">ATLAS cannot complete Seller Central's legal/KYC verification or FBA enrollment on your behalf — those steps happen directly with Amazon.</p>
      </div>
    </StepShell>
  );
}

function MarketplaceAccountRow({ account }: { account: { id: string; accountName: string; providerKey: string; status: string; lastTestSuccess?: boolean | null; lastTestedAt?: string | null } }) {
  const test = useTestMarketplaceAccountConnection(account.id);
  return (
    <div className="flex items-center justify-between rounded-[var(--radius)] border border-border px-3 py-2 text-sm">
      <div>
        <span className="text-foreground">{account.accountName}</span>
        <span className="ml-1.5 text-xs text-muted-foreground">({account.providerKey})</span>
      </div>
      <div className="flex items-center gap-2">
        {account.lastTestedAt && <span className="text-xs text-muted-foreground">Tested {formatDate(account.lastTestedAt)}</span>}
        <StatusBadge status={account.status} />
        <Button variant="ghost" size="icon-sm" title="Recheck connection" onClick={() => test.mutate()} disabled={test.isPending}>
          {test.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
  );
}

/* ───────────────────────── Supplier provider step ───────────────────────── */

function SupplierProviderStep(props: {
  step: StepDef; complete: boolean; skippedNow: boolean; onSkip: () => void;
  providers: ReturnType<typeof useSupplierProviders>['data'];
  health: ReturnType<typeof useCachedSupplierProviderHealth>['data'];
}) {
  const providers = props.providers ?? [];
  const healthByCode = new Map((props.health ?? []).map((h) => [h.providerCode, h]));

  return (
    <StepShell step={props.step} complete={props.complete} skippedNow={props.skippedNow} onSkip={props.onSkip}>
      {providers.length === 0 ? (
        <EmptyState title="No supplier providers registered yet" className="border-none py-6" />
      ) : (
        <div className="space-y-1">
          {providers.map((p) => {
            const h = healthByCode.get(p.code);
            return (
              <div key={p.code} className="flex items-center justify-between rounded-[var(--radius)] border border-border px-3 py-2 text-sm">
                <span className="text-foreground">{p.displayName}</span>
                {h && <StatusBadge status={h.status} />}
              </div>
            );
          })}
        </div>
      )}
      <DeepLinkAction href="/supplier-providers" label="View supplier providers" />
    </StepShell>
  );
}

/* ───────────────────────── AI provider step ───────────────────────── */

function AiProviderStep(props: {
  step: StepDef; complete: boolean; skippedNow: boolean; onSkip: () => void;
  providers: ReturnType<typeof useProviderRegistryEntries>['data'];
  models: ReturnType<typeof useAiModels>['data'];
}) {
  const providers = props.providers?.data ?? [];
  const models = props.models?.data ?? [];
  const defaultModel = models.find((m) => m.isDefault);

  return (
    <StepShell step={props.step} complete={props.complete} skippedNow={props.skippedNow} onSkip={props.onSkip}>
      {providers.length > 0 && (
        <div className="space-y-1">
          {providers.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-[var(--radius)] border border-border px-3 py-2 text-sm">
              <span className="text-foreground">{p.displayName}</span>
              <StatusBadge status={p.status} />
            </div>
          ))}
        </div>
      )}
      <p className="text-sm text-muted-foreground">
        Default model: {defaultModel ? <span className="text-foreground">{defaultModel.displayName}</span> : 'not set'}
      </p>
      <div className="flex flex-wrap gap-2">
        <DeepLinkAction href="/ai-providers" label="Configure AI providers" />
        <DeepLinkAction href="/ai-models" label="Choose default model" />
      </div>
    </StepShell>
  );
}

/* ───────────────────────── Tax & compliance step ───────────────────────── */

function TaxComplianceStep(props: {
  step: StepDef; complete: boolean; skippedNow: boolean; onSkip: () => void;
  gst: ReturnType<typeof useGstVatRegistrations>['data'];
  compliance: ReturnType<typeof useComplianceRules>['data'];
}) {
  const gstCount = count(props.gst);
  const complianceCount = count(props.compliance);

  return (
    <StepShell step={props.step} complete={props.complete} skippedNow={props.skippedNow} onSkip={props.onSkip}>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-[var(--radius)] border border-border p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">GST/VAT registrations</p>
          <p className="text-lg font-semibold text-foreground">{gstCount}</p>
        </div>
        <div className="rounded-[var(--radius)] border border-border p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Compliance rules tracked</p>
          <p className="text-lg font-semibold text-foreground">{complianceCount}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <DeepLinkAction href="/gst-vat" label="Manage GST/VAT" />
        <DeepLinkAction href="/tax" label="Tax engine" />
        <DeepLinkAction href="/compliance" label="Compliance checklist" />
      </div>
    </StepShell>
  );
}

/* ───────────────────────── Team step ───────────────────────── */

const MEMBER_ROLES: WorkspaceMemberRole[] = ['ADMIN', 'MEMBER'];

function TeamStep(props: { step: StepDef; complete: boolean; skippedNow: boolean; onSkip: () => void; workspaceId: string | undefined; members: ReturnType<typeof useWorkspaceMembers>['data'] }) {
  const invite = useInviteMember(props.workspaceId ?? '');
  const { data: roles } = useRoles({ limit: 50 });
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<WorkspaceMemberRole>('MEMBER');
  const members = (props.members as { items?: unknown[] } | undefined)?.items ?? [];

  return (
    <StepShell step={props.step} complete={props.complete} skippedNow={props.skippedNow} onSkip={props.onSkip}>
      <p className="text-sm text-muted-foreground">{members.length} member{members.length === 1 ? '' : 's'} currently in this workspace.</p>
      <div className="flex flex-wrap items-end gap-2">
        <FormField label="Email" htmlFor="onb-invite-email">
          <Input id="onb-invite-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@company.com" className="w-64" />
        </FormField>
        <FormField label="Role" htmlFor="onb-invite-role">
          <Select id="onb-invite-role" value={role} onChange={(e) => setRole(e.target.value as WorkspaceMemberRole)} options={MEMBER_ROLES.map((r) => ({ value: r, label: r }))} />
        </FormField>
        <Button onClick={() => invite.mutate({ email, role }, { onSuccess: () => setEmail('') })} disabled={!email || !props.workspaceId || invite.isPending}>
          {invite.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Send invite
        </Button>
      </div>
      {roles && roles.data && roles.data.length > 0 && (
        <p className="text-xs text-muted-foreground">Need finer-grained permissions? Assign a custom role after inviting via Roles & Permissions.</p>
      )}
      <div className="flex flex-wrap gap-2">
        <DeepLinkAction href="/users" label="Manage users" />
        <DeepLinkAction href="/roles-permissions" label="Roles & permissions" />
      </div>
    </StepShell>
  );
}

/* ───────────────────────── Plan step ───────────────────────── */

function PlanStep(props: { step: StepDef; complete: boolean; skippedNow: boolean; onSkip: () => void; subscription: ReturnType<typeof useEffectiveSubscription>['data'] }) {
  return (
    <StepShell step={props.step} complete={props.complete} skippedNow={props.skippedNow} onSkip={props.onSkip}>
      {props.subscription ? (
        <div className="flex items-center gap-3 text-sm">
          <span className="text-foreground">{props.subscription.planKey}</span>
          <StatusBadge status={props.subscription.status} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No active subscription found for this workspace.</p>
      )}
      <DeepLinkAction href="/billing" label="Manage billing & plan" />
    </StepShell>
  );
}

/* ───────────────────────── Summary step ───────────────────────── */

function SummaryStep({ isComplete, blockers, warnings, onNavigate }: { isComplete: Record<StepId, boolean>; blockers: StepDef[]; warnings: StepDef[]; onNavigate: (id: StepId) => void }) {
  const optionalDone = STEP_DEFS.filter((s) => !s.required && s.id !== 'summary' && isComplete[s.id]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Setup validation summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <p className="mb-2 text-sm font-semibold text-danger">Blockers ({blockers.length})</p>
          {blockers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No required steps are blocking setup.</p>
          ) : (
            <ul className="space-y-1">
              {blockers.map((b) => (
                <li key={b.id}>
                  <button onClick={() => onNavigate(b.id)} className="text-sm text-primary hover:underline">{b.title}</button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold text-warning">Optional steps pending ({warnings.length})</p>
          {warnings.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing pending — everything is either done or skipped.</p>
          ) : (
            <ul className="space-y-1">
              {warnings.map((w) => (
                <li key={w.id}>
                  <button onClick={() => onNavigate(w.id)} className="text-sm text-primary hover:underline">{w.title}</button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold text-success">Completed ({optionalDone.length + STEP_DEFS.filter((s) => s.required && isComplete[s.id]).length})</p>
          <div className="flex flex-wrap gap-1.5">
            {STEP_DEFS.filter((s) => s.id !== 'summary' && isComplete[s.id]).map((s) => (
              <Badge key={s.id} variant="success" className="text-[10px]">{s.title}</Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
