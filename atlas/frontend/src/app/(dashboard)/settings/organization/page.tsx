'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useOrganizationOperational,
  useOrganizationPolicies,
  useOrganizationProfile,
  useOrganizationRegional,
  useUpdateOrganizationOperational,
  useUpdateOrganizationPolicies,
  useUpdateOrganizationProfile,
  useUpdateOrganizationRegional,
} from '@/hooks';
import type { ResolvedSetting } from '@/types';

function SourceBadge({ setting }: { setting: ResolvedSetting | undefined }) {
  if (!setting || !setting.source) return null;
  return (
    <Badge variant={setting.source === 'DEFAULT' ? 'secondary' : 'info'} className="text-[9px]">
      {setting.source === 'DEFAULT' ? 'default' : `inherited: ${setting.source.toLowerCase()}`}
    </Badge>
  );
}

export default function OrganizationSettingsPage() {
  return (
    <div>
      <PageHeader title="Organization Settings" description="Profile, regional defaults, operational defaults and business policies." />
      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="regional">Regional</TabsTrigger>
          <TabsTrigger value="operational">Operational</TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <ProfileTab />
        </TabsContent>
        <TabsContent value="regional">
          <RegionalTab />
        </TabsContent>
        <TabsContent value="operational">
          <OperationalTab />
        </TabsContent>
        <TabsContent value="policies">
          <PoliciesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProfileTab() {
  const profile = useOrganizationProfile();
  const update = useUpdateOrganizationProfile();
  const [name, setName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  useEffect(() => {
    if (!profile.data) return;
    setName((profile.data['name']?.value as string) ?? '');
    setLegalName((profile.data['legalName']?.value as string) ?? '');
    setLogoUrl((profile.data['logoUrl']?.value as string) ?? '');
    setContactEmail((profile.data['contactEmail']?.value as string) ?? '');
    setContactPhone((profile.data['contactPhone']?.value as string) ?? '');
  }, [profile.data]);

  if (profile.isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Name" htmlFor="org-name">
            <div className="flex items-center gap-2">
              <Input id="org-name" value={name} onChange={(e) => setName(e.target.value)} />
              <SourceBadge setting={profile.data?.['name']} />
            </div>
          </FormField>
          <FormField label="Legal name" htmlFor="org-legal-name">
            <div className="flex items-center gap-2">
              <Input id="org-legal-name" value={legalName} onChange={(e) => setLegalName(e.target.value)} />
              <SourceBadge setting={profile.data?.['legalName']} />
            </div>
          </FormField>
          <FormField label="Logo URL" htmlFor="org-logo">
            <Input id="org-logo" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
          </FormField>
          <FormField label="Contact email" htmlFor="org-email">
            <Input id="org-email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
          </FormField>
          <FormField label="Contact phone" htmlFor="org-phone">
            <Input id="org-phone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
          </FormField>
        </div>
        <Button onClick={() => update.mutate({ name, legalName, logoUrl, contactEmail, contactPhone })} disabled={update.isPending}>
          Save profile
        </Button>
      </CardContent>
    </Card>
  );
}

function RegionalTab() {
  const regional = useOrganizationRegional();
  const update = useUpdateOrganizationRegional();
  const [timezone, setTimezone] = useState('');
  const [locale, setLocale] = useState('');
  const [currency, setCurrency] = useState('');
  const [dateFormat, setDateFormat] = useState('');
  const [numberFormat, setNumberFormat] = useState('');
  const [measurementSystem, setMeasurementSystem] = useState('');

  useEffect(() => {
    if (!regional.data) return;
    setTimezone((regional.data['timezone']?.value as string) ?? '');
    setLocale((regional.data['locale']?.value as string) ?? '');
    setCurrency((regional.data['currency']?.value as string) ?? '');
    setDateFormat((regional.data['dateFormat']?.value as string) ?? '');
    setNumberFormat((regional.data['numberFormat']?.value as string) ?? '');
    setMeasurementSystem((regional.data['measurementSystem']?.value as string) ?? '');
  }, [regional.data]);

  if (regional.isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Timezone" htmlFor="org-tz">
            <div className="flex items-center gap-2">
              <Input id="org-tz" value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="e.g. America/New_York" />
              <SourceBadge setting={regional.data?.['timezone']} />
            </div>
          </FormField>
          <FormField label="Locale" htmlFor="org-locale">
            <div className="flex items-center gap-2">
              <Input id="org-locale" value={locale} onChange={(e) => setLocale(e.target.value)} placeholder="e.g. en-US" />
              <SourceBadge setting={regional.data?.['locale']} />
            </div>
          </FormField>
          <FormField label="Currency" htmlFor="org-currency">
            <Input id="org-currency" value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="e.g. USD" />
          </FormField>
          <FormField label="Date format" htmlFor="org-date-format">
            <Input id="org-date-format" value={dateFormat} onChange={(e) => setDateFormat(e.target.value)} placeholder="e.g. MM/DD/YYYY" />
          </FormField>
          <FormField label="Number format" htmlFor="org-number-format">
            <Input id="org-number-format" value={numberFormat} onChange={(e) => setNumberFormat(e.target.value)} />
          </FormField>
          <FormField label="Measurement system" htmlFor="org-measurement">
            <Input id="org-measurement" value={measurementSystem} onChange={(e) => setMeasurementSystem(e.target.value)} placeholder="METRIC or IMPERIAL" />
          </FormField>
        </div>
        <Button
          onClick={() => update.mutate({ payload: { timezone, locale, currency, dateFormat, numberFormat, measurementSystem } })}
          disabled={update.isPending}
        >
          Save regional settings
        </Button>
      </CardContent>
    </Card>
  );
}

function OperationalTab() {
  const operational = useOrganizationOperational();
  const update = useUpdateOrganizationOperational();
  const [defaultWorkspaceId, setDefaultWorkspaceId] = useState('');
  const [defaultMarketplace, setDefaultMarketplace] = useState('');
  const [defaultWarehouseId, setDefaultWarehouseId] = useState('');
  const [defaultSupplierId, setDefaultSupplierId] = useState('');

  useEffect(() => {
    if (!operational.data) return;
    setDefaultWorkspaceId((operational.data['defaultWorkspaceId']?.value as string) ?? '');
    setDefaultMarketplace((operational.data['defaultMarketplace']?.value as string) ?? '');
    setDefaultWarehouseId((operational.data['defaultWarehouseId']?.value as string) ?? '');
    setDefaultSupplierId((operational.data['defaultSupplierId']?.value as string) ?? '');
  }, [operational.data]);

  if (operational.isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Default workspace ID" htmlFor="org-default-workspace">
            <Input id="org-default-workspace" value={defaultWorkspaceId} onChange={(e) => setDefaultWorkspaceId(e.target.value)} />
          </FormField>
          <FormField label="Default marketplace" htmlFor="org-default-marketplace">
            <Input id="org-default-marketplace" value={defaultMarketplace} onChange={(e) => setDefaultMarketplace(e.target.value)} />
          </FormField>
          <FormField label="Default warehouse ID" htmlFor="org-default-warehouse">
            <Input id="org-default-warehouse" value={defaultWarehouseId} onChange={(e) => setDefaultWarehouseId(e.target.value)} />
          </FormField>
          <FormField label="Default supplier ID" htmlFor="org-default-supplier">
            <Input id="org-default-supplier" value={defaultSupplierId} onChange={(e) => setDefaultSupplierId(e.target.value)} />
          </FormField>
        </div>
        <Button
          onClick={() => update.mutate({ payload: { defaultWorkspaceId, defaultMarketplace, defaultWarehouseId, defaultSupplierId } })}
          disabled={update.isPending}
        >
          Save operational settings
        </Button>
      </CardContent>
    </Card>
  );
}

function PoliciesTab() {
  const policies = useOrganizationPolicies();
  const update = useUpdateOrganizationPolicies();
  const [approvalThreshold, setApprovalThreshold] = useState('');
  const [autoReorderEnabled, setAutoReorderEnabled] = useState(false);
  const [lowStockThresholdPercent, setLowStockThresholdPercent] = useState('');
  const [autoPublishEnabled, setAutoPublishEnabled] = useState(false);
  const [minMarginPercent, setMinMarginPercent] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState('');
  const [auditLogRetentionDays, setAuditLogRetentionDays] = useState('');
  const [fileRetentionDays, setFileRetentionDays] = useState('');

  useEffect(() => {
    if (!policies.data) return;
    setApprovalThreshold(String(policies.data['approvalThreshold']?.value ?? ''));
    setAutoReorderEnabled(!!policies.data['autoReorderEnabled']?.value);
    setLowStockThresholdPercent(String(policies.data['lowStockThresholdPercent']?.value ?? ''));
    setAutoPublishEnabled(!!policies.data['autoPublishEnabled']?.value);
    setMinMarginPercent(String(policies.data['minMarginPercent']?.value ?? ''));
    setMfaRequired(!!policies.data['mfaRequired']?.value);
    setSessionTimeoutMinutes(String(policies.data['sessionTimeoutMinutes']?.value ?? ''));
    setAuditLogRetentionDays(String(policies.data['auditLogRetentionDays']?.value ?? ''));
    setFileRetentionDays(String(policies.data['fileRetentionDays']?.value ?? ''));
  }, [policies.data]);

  if (policies.isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Approval threshold ($)" htmlFor="pol-approval-threshold">
            <Input id="pol-approval-threshold" type="number" value={approvalThreshold} onChange={(e) => setApprovalThreshold(e.target.value)} />
          </FormField>
          <FormField label="Low stock threshold (%)" htmlFor="pol-low-stock">
            <Input id="pol-low-stock" type="number" value={lowStockThresholdPercent} onChange={(e) => setLowStockThresholdPercent(e.target.value)} />
          </FormField>
          <FormField label="Minimum margin (%)" htmlFor="pol-min-margin">
            <Input id="pol-min-margin" type="number" value={minMarginPercent} onChange={(e) => setMinMarginPercent(e.target.value)} />
          </FormField>
          <FormField label="Session timeout (minutes)" htmlFor="pol-session-timeout">
            <Input id="pol-session-timeout" type="number" value={sessionTimeoutMinutes} onChange={(e) => setSessionTimeoutMinutes(e.target.value)} />
          </FormField>
          <FormField label="Audit log retention (days)" htmlFor="pol-audit-retention">
            <Input id="pol-audit-retention" type="number" value={auditLogRetentionDays} onChange={(e) => setAuditLogRetentionDays(e.target.value)} />
          </FormField>
          <FormField label="File retention (days)" htmlFor="pol-file-retention">
            <Input id="pol-file-retention" type="number" value={fileRetentionDays} onChange={(e) => setFileRetentionDays(e.target.value)} />
          </FormField>
        </div>
        <div className="space-y-3">
          <label className="flex items-center gap-3 text-sm text-foreground">
            <Switch checked={autoReorderEnabled} onChange={(e) => setAutoReorderEnabled(e.target.checked)} />
            Auto-reorder enabled
          </label>
          <label className="flex items-center gap-3 text-sm text-foreground">
            <Switch checked={autoPublishEnabled} onChange={(e) => setAutoPublishEnabled(e.target.checked)} />
            Auto-publish enabled
          </label>
          <label className="flex items-center gap-3 text-sm text-foreground">
            <Switch checked={mfaRequired} onChange={(e) => setMfaRequired(e.target.checked)} />
            MFA required
          </label>
        </div>
        <Button
          onClick={() =>
            update.mutate({
              payload: {
                approvalThreshold: Number(approvalThreshold) || undefined,
                autoReorderEnabled,
                lowStockThresholdPercent: Number(lowStockThresholdPercent) || undefined,
                autoPublishEnabled,
                minMarginPercent: Number(minMarginPercent) || undefined,
                mfaRequired,
                sessionTimeoutMinutes: Number(sessionTimeoutMinutes) || undefined,
                auditLogRetentionDays: Number(auditLogRetentionDays) || undefined,
                fileRetentionDays: Number(fileRetentionDays) || undefined,
              },
            })
          }
          disabled={update.isPending}
        >
          Save policies
        </Button>
      </CardContent>
    </Card>
  );
}
