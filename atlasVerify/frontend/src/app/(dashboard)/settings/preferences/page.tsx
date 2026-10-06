'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useAiPreferences,
  useAppearancePreferences,
  useDefaultsPreferences,
  useDisplayPreferences,
  useNotificationPreferences,
  useUpdateAiPreferences,
  useUpdateAppearancePreferences,
  useUpdateDefaultsPreferences,
  useUpdateDisplayPreferences,
  useUpdateNotificationPreferences,
} from '@/hooks';
import type { AppearanceDensity, AppearanceThemeMode, NotificationPriorityThreshold } from '@/types';

export default function UserPreferencesPage() {
  return (
    <div>
      <PageHeader title="My Preferences" description="Locale, timezone, currency, notifications, defaults and appearance — personal to you." />
      <Tabs defaultValue="display">
        <TabsList>
          <TabsTrigger value="display">Display</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="defaults">Defaults</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="ai">AI</TabsTrigger>
        </TabsList>
        <TabsContent value="display">
          <DisplayTab />
        </TabsContent>
        <TabsContent value="notifications">
          <NotificationsTab />
        </TabsContent>
        <TabsContent value="defaults">
          <DefaultsTab />
        </TabsContent>
        <TabsContent value="appearance">
          <AppearanceTab />
        </TabsContent>
        <TabsContent value="ai">
          <AiTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DisplayTab() {
  const display = useDisplayPreferences();
  const update = useUpdateDisplayPreferences();
  const [language, setLanguage] = useState('');
  const [timezone, setTimezone] = useState('');
  const [dateFormat, setDateFormat] = useState('');
  const [numberFormat, setNumberFormat] = useState('');
  const [currency, setCurrency] = useState('');
  const [measurementSystem, setMeasurementSystem] = useState('');

  useEffect(() => {
    if (!display.data) return;
    setLanguage((display.data['language']?.value as string) ?? '');
    setTimezone((display.data['timezone']?.value as string) ?? '');
    setDateFormat((display.data['dateFormat']?.value as string) ?? '');
    setNumberFormat((display.data['numberFormat']?.value as string) ?? '');
    setCurrency((display.data['currency']?.value as string) ?? '');
    setMeasurementSystem((display.data['measurementSystem']?.value as string) ?? '');
  }, [display.data]);

  if (display.isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Language" htmlFor="pref-language">
            <Input id="pref-language" value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="e.g. en-US" />
          </FormField>
          <FormField label="Timezone" htmlFor="pref-timezone">
            <Input id="pref-timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="e.g. America/New_York" />
          </FormField>
          <FormField label="Currency" htmlFor="pref-currency">
            <Input id="pref-currency" value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="e.g. USD" />
          </FormField>
          <FormField label="Date format" htmlFor="pref-date-format">
            <Input id="pref-date-format" value={dateFormat} onChange={(e) => setDateFormat(e.target.value)} />
          </FormField>
          <FormField label="Number format" htmlFor="pref-number-format">
            <Input id="pref-number-format" value={numberFormat} onChange={(e) => setNumberFormat(e.target.value)} />
          </FormField>
          <FormField label="Measurement system" htmlFor="pref-measurement">
            <Input id="pref-measurement" value={measurementSystem} onChange={(e) => setMeasurementSystem(e.target.value)} placeholder="METRIC or IMPERIAL" />
          </FormField>
        </div>
        <Button onClick={() => update.mutate({ language, timezone, dateFormat, numberFormat, currency, measurementSystem })} disabled={update.isPending}>
          Save display preferences
        </Button>
      </CardContent>
    </Card>
  );
}

const PRIORITY_OPTIONS: { value: NotificationPriorityThreshold; label: string }[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

function NotificationsTab() {
  const notifications = useNotificationPreferences();
  const update = useUpdateNotificationPreferences();
  const [priorityThreshold, setPriorityThreshold] = useState<NotificationPriorityThreshold>('LOW');
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietStart, setQuietStart] = useState('22:00');
  const [quietEnd, setQuietEnd] = useState('08:00');

  useEffect(() => {
    if (!notifications.data) return;
    setPriorityThreshold((notifications.data['priorityThreshold']?.value as NotificationPriorityThreshold) ?? 'LOW');
    const qh = notifications.data['quietHours']?.value as { enabled?: boolean; start?: string; end?: string } | undefined;
    if (qh) {
      setQuietHoursEnabled(!!qh.enabled);
      setQuietStart(qh.start ?? '22:00');
      setQuietEnd(qh.end ?? '08:00');
    }
  }, [notifications.data]);

  if (notifications.isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <FormField label="Minimum priority to notify" htmlFor="pref-priority-threshold">
          <Select id="pref-priority-threshold" value={priorityThreshold} onChange={(e) => setPriorityThreshold(e.target.value as NotificationPriorityThreshold)} options={PRIORITY_OPTIONS} className="w-56" />
        </FormField>

        <label className="flex items-center gap-3 text-sm text-foreground">
          <Switch checked={quietHoursEnabled} onChange={(e) => setQuietHoursEnabled(e.target.checked)} />
          Quiet hours
        </label>
        {quietHoursEnabled && (
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Start" htmlFor="pref-quiet-start">
              <Input id="pref-quiet-start" type="time" value={quietStart} onChange={(e) => setQuietStart(e.target.value)} />
            </FormField>
            <FormField label="End" htmlFor="pref-quiet-end">
              <Input id="pref-quiet-end" type="time" value={quietEnd} onChange={(e) => setQuietEnd(e.target.value)} />
            </FormField>
          </div>
        )}

        <Button
          onClick={() =>
            update.mutate({
              priorityThreshold,
              quietHours: { enabled: quietHoursEnabled, start: quietStart, end: quietEnd },
            })
          }
          disabled={update.isPending}
        >
          Save notification preferences
        </Button>
      </CardContent>
    </Card>
  );
}

function DefaultsTab() {
  const defaults = useDefaultsPreferences();
  const update = useUpdateDefaultsPreferences();
  const [marketplace, setMarketplace] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [reportFormat, setReportFormat] = useState<'PDF' | 'CSV' | 'XLSX'>('PDF');
  const [analyticsDateRange, setAnalyticsDateRange] = useState('');

  useEffect(() => {
    if (!defaults.data) return;
    setMarketplace((defaults.data['marketplace']?.value as string) ?? '');
    setWarehouseId((defaults.data['warehouseId']?.value as string) ?? '');
    setReportFormat((defaults.data['reportFormat']?.value as 'PDF' | 'CSV' | 'XLSX') ?? 'PDF');
    setAnalyticsDateRange((defaults.data['analyticsDateRange']?.value as string) ?? '');
  }, [defaults.data]);

  if (defaults.isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Default marketplace" htmlFor="pref-default-marketplace">
            <Input id="pref-default-marketplace" value={marketplace} onChange={(e) => setMarketplace(e.target.value)} />
          </FormField>
          <FormField label="Default warehouse ID" htmlFor="pref-default-warehouse">
            <Input id="pref-default-warehouse" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} />
          </FormField>
          <FormField label="Report format" htmlFor="pref-report-format">
            <Select
              id="pref-report-format"
              value={reportFormat}
              onChange={(e) => setReportFormat(e.target.value as 'PDF' | 'CSV' | 'XLSX')}
              options={[
                { value: 'PDF', label: 'PDF' },
                { value: 'CSV', label: 'CSV' },
                { value: 'XLSX', label: 'XLSX' },
              ]}
            />
          </FormField>
          <FormField label="Analytics date range" htmlFor="pref-analytics-range">
            <Input id="pref-analytics-range" value={analyticsDateRange} onChange={(e) => setAnalyticsDateRange(e.target.value)} placeholder="e.g. last_30_days" />
          </FormField>
        </div>
        <Button onClick={() => update.mutate({ marketplace, warehouseId, reportFormat, analyticsDateRange })} disabled={update.isPending}>
          Save defaults
        </Button>
      </CardContent>
    </Card>
  );
}

function AppearanceTab() {
  const appearance = useAppearancePreferences();
  const update = useUpdateAppearancePreferences();
  const [theme, setTheme] = useState<AppearanceThemeMode>('SYSTEM');
  const [density, setDensity] = useState<AppearanceDensity>('COMFORTABLE');
  const [reduceMotion, setReduceMotion] = useState(false);
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    if (!appearance.data) return;
    setTheme((appearance.data['theme']?.value as AppearanceThemeMode) ?? 'SYSTEM');
    setDensity((appearance.data['density']?.value as AppearanceDensity) ?? 'COMFORTABLE');
    const a11y = appearance.data['accessibility']?.value as Record<string, unknown> | undefined;
    setReduceMotion(!!a11y?.['reduceMotion']);
    setHighContrast(!!a11y?.['highContrast']);
  }, [appearance.data]);

  if (appearance.isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Theme" htmlFor="pref-theme">
            <Select
              id="pref-theme"
              value={theme}
              onChange={(e) => setTheme(e.target.value as AppearanceThemeMode)}
              options={[
                { value: 'LIGHT', label: 'Light' },
                { value: 'DARK', label: 'Dark' },
                { value: 'SYSTEM', label: 'System' },
              ]}
            />
          </FormField>
          <FormField label="Density" htmlFor="pref-density">
            <Select
              id="pref-density"
              value={density}
              onChange={(e) => setDensity(e.target.value as AppearanceDensity)}
              options={[
                { value: 'COMFORTABLE', label: 'Comfortable' },
                { value: 'COMPACT', label: 'Compact' },
                { value: 'SPACIOUS', label: 'Spacious' },
              ]}
            />
          </FormField>
        </div>
        <div className="space-y-3">
          <label className="flex items-center gap-3 text-sm text-foreground">
            <Switch checked={reduceMotion} onChange={(e) => setReduceMotion(e.target.checked)} />
            Reduce motion
          </label>
          <label className="flex items-center gap-3 text-sm text-foreground">
            <Switch checked={highContrast} onChange={(e) => setHighContrast(e.target.checked)} />
            High contrast
          </label>
        </div>
        <Button
          onClick={() => update.mutate({ theme, density, accessibility: { reduceMotion, highContrast } })}
          disabled={update.isPending}
        >
          Save appearance
        </Button>
      </CardContent>
    </Card>
  );
}

function AiTab() {
  const ai = useAiPreferences();
  const update = useUpdateAiPreferences();
  const [defaultProvider, setDefaultProvider] = useState('');
  const [defaultModel, setDefaultModel] = useState('');
  const [responseStyle, setResponseStyle] = useState<'CONCISE' | 'DETAILED' | 'TECHNICAL'>('CONCISE');
  const [approvalThreshold, setApprovalThreshold] = useState('');

  useEffect(() => {
    if (!ai.data) return;
    setDefaultProvider((ai.data['defaultProvider']?.value as string) ?? '');
    setDefaultModel((ai.data['defaultModel']?.value as string) ?? '');
    setResponseStyle((ai.data['responseStyle']?.value as 'CONCISE' | 'DETAILED' | 'TECHNICAL') ?? 'CONCISE');
    setApprovalThreshold(String(ai.data['approvalThreshold']?.value ?? ''));
  }, [ai.data]);

  if (ai.isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Default provider" htmlFor="pref-ai-provider">
            <Input id="pref-ai-provider" value={defaultProvider} onChange={(e) => setDefaultProvider(e.target.value)} />
          </FormField>
          <FormField label="Default model" htmlFor="pref-ai-model">
            <Input id="pref-ai-model" value={defaultModel} onChange={(e) => setDefaultModel(e.target.value)} />
          </FormField>
          <FormField label="Response style" htmlFor="pref-ai-style">
            <Select
              id="pref-ai-style"
              value={responseStyle}
              onChange={(e) => setResponseStyle(e.target.value as 'CONCISE' | 'DETAILED' | 'TECHNICAL')}
              options={[
                { value: 'CONCISE', label: 'Concise' },
                { value: 'DETAILED', label: 'Detailed' },
                { value: 'TECHNICAL', label: 'Technical' },
              ]}
            />
          </FormField>
          <FormField label="Approval threshold" htmlFor="pref-ai-approval">
            <Input id="pref-ai-approval" type="number" value={approvalThreshold} onChange={(e) => setApprovalThreshold(e.target.value)} />
          </FormField>
        </div>
        <Button
          onClick={() => update.mutate({ defaultProvider, defaultModel, responseStyle, approvalThreshold: Number(approvalThreshold) || undefined })}
          disabled={update.isPending}
        >
          Save AI preferences
        </Button>
      </CardContent>
    </Card>
  );
}
