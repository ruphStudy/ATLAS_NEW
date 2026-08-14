'use client';

import { useState } from 'react';
import { isAxiosError } from 'axios';
import { Loader2, Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FilterBar } from '@/components/ui/filter-bar';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState, UnauthorizedState } from '@/components/ui/states';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/action-menu';
import {
  useAiModels,
  useArchiveAiModel,
  useCapabilityDefinitions,
  useCapabilityOverrides,
  useDeprecateAiModel,
  useDisableAiModel,
  useEnableAiModel,
  useRegisterAiModel,
} from '@/hooks';
import { formatCurrency } from '@/lib/utils';
import type { AiModel, AiModelStatus, RegisterAiModelPayload } from '@/types';

const STATUS_OPTIONS: { value: AiModelStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'BETA', label: 'Beta' },
  { value: 'PREVIEW', label: 'Preview' },
  { value: 'DEPRECATED', label: 'Deprecated' },
  { value: 'DISABLED', label: 'Disabled' },
  { value: 'ARCHIVED', label: 'Archived' },
];

export default function AiModelsPage() {
  return (
    <div>
      <PageHeader title="AI Models & Capabilities" description="Model capabilities, status, limits, cost, latency, quality and the capability matrix." />
      <Tabs defaultValue="models">
        <TabsList>
          <TabsTrigger value="models">Models</TabsTrigger>
          <TabsTrigger value="capabilities">Capability Definitions</TabsTrigger>
          <TabsTrigger value="overrides">Capability Overrides</TabsTrigger>
        </TabsList>
        <TabsContent value="models">
          <ModelsTab />
        </TabsContent>
        <TabsContent value="capabilities">
          <CapabilityDefinitionsTab />
        </TabsContent>
        <TabsContent value="overrides">
          <CapabilityOverridesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ModelsTab() {
  const [provider, setProvider] = useState('');
  const [status, setStatus] = useState<AiModelStatus | ''>('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading, isError, error, refetch } = useAiModels({ provider: provider || undefined, status: status || undefined, page, limit: 20 });
  const registerModel = useRegisterAiModel();
  const isForbidden = isAxiosError(error) && error.response?.status === 403;

  const [form, setForm] = useState<RegisterAiModelPayload>({ provider: '', modelKey: '', displayName: '', capabilities: [], modalities: ['TEXT'] });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <FilterBar hasActiveFilters={!!provider || !!status} onClearFilters={() => { setProvider(''); setStatus(''); setPage(1); }}>
          <Input value={provider} onChange={(e) => { setProvider(e.target.value); setPage(1); }} placeholder="Provider…" className="h-9 w-40" />
          <Select value={status} onChange={(e) => { setStatus(e.target.value as AiModelStatus | ''); setPage(1); }} placeholder="All statuses" options={STATUS_OPTIONS} className="h-9 w-40" />
        </FilterBar>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Register model
        </Button>
      </div>

      {isForbidden ? (
        <UnauthorizedState />
      ) : isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load models." />
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No models registered yet" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Model</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Capabilities</TableHead>
              <TableHead>Context / Output</TableHead>
              <TableHead>Cost / 1k</TableHead>
              <TableHead>Quality</TableHead>
              <TableHead>Latency</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((m) => (
              <ModelRow key={m.id} model={m} />
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Register model</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Provider" htmlFor="model-provider" required>
                <Input id="model-provider" value={form.provider} onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))} />
              </FormField>
              <FormField label="Model key" htmlFor="model-key" required>
                <Input id="model-key" value={form.modelKey} onChange={(e) => setForm((f) => ({ ...f, modelKey: e.target.value }))} />
              </FormField>
            </div>
            <FormField label="Display name" htmlFor="model-display" required>
              <Input id="model-display" value={form.displayName} onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))} />
            </FormField>
            <FormField label="Capabilities" htmlFor="model-caps" required hint="Comma-separated, e.g. TEXT_GENERATION, VISION">
              <Input id="model-caps" value={form.capabilities.join(', ')} onChange={(e) => setForm((f) => ({ ...f, capabilities: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) }))} />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Input price / 1k" htmlFor="model-in-price">
                <Input id="model-in-price" type="number" step="0.0001" value={form.pricingInputPer1k ?? ''} onChange={(e) => setForm((f) => ({ ...f, pricingInputPer1k: e.target.value ? Number(e.target.value) : undefined }))} />
              </FormField>
              <FormField label="Output price / 1k" htmlFor="model-out-price">
                <Input id="model-out-price" type="number" step="0.0001" value={form.pricingOutputPer1k ?? ''} onChange={(e) => setForm((f) => ({ ...f, pricingOutputPer1k: e.target.value ? Number(e.target.value) : undefined }))} />
              </FormField>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                registerModel.mutate(form, {
                  onSuccess: () => { setCreateOpen(false); setForm({ provider: '', modelKey: '', displayName: '', capabilities: [], modalities: ['TEXT'] }); },
                })
              }
              disabled={!form.provider || !form.modelKey || !form.displayName || form.capabilities.length === 0 || registerModel.isPending}
            >
              {registerModel.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Register
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ModelRow({ model }: { model: AiModel }) {
  const enable = useEnableAiModel(model.id);
  const disable = useDisableAiModel(model.id);
  const deprecate = useDeprecateAiModel(model.id);
  const archive = useArchiveAiModel(model.id);

  const actions: ActionMenuItem[] = [];
  if (model.status !== 'ACTIVE') actions.push({ label: 'Enable', onSelect: () => enable.mutate() });
  if (model.status === 'ACTIVE') actions.push({ label: 'Disable', onSelect: () => disable.mutate() });
  if (model.status !== 'DEPRECATED') actions.push({ label: 'Deprecate', onSelect: () => deprecate.mutate() });
  if (model.status !== 'ARCHIVED') actions.push({ label: 'Archive', onSelect: () => archive.mutate(), destructive: true, separatorBefore: true });

  return (
    <TableRow>
      <TableCell className="text-sm font-medium text-foreground">
        {model.displayName}
        {model.isDefault && <Badge variant="info" className="ml-2">Default</Badge>}
        {model.isFallback && <Badge variant="secondary" className="ml-2">Fallback</Badge>}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{model.provider}</TableCell>
      <TableCell>
        <StatusBadge status={model.status} />
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{model.capabilities.slice(0, 3).join(', ')}{model.capabilities.length > 3 ? '…' : ''}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{model.contextLimit ?? '—'} / {model.outputLimit ?? '—'}</TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {model.pricingInputPer1k != null ? formatCurrency(model.pricingInputPer1k, 'USD') : '—'} in / {model.pricingOutputPer1k != null ? formatCurrency(model.pricingOutputPer1k, 'USD') : '—'} out
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{model.qualityScore != null ? model.qualityScore.toFixed(0) : '—'}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{model.averageLatency != null ? `${model.averageLatency}ms` : '—'}</TableCell>
      <TableCell className="text-right">
        <ActionMenu items={actions} />
      </TableCell>
    </TableRow>
  );
}

function CapabilityDefinitionsTab() {
  const { data, isLoading, isError, refetch } = useCapabilityDefinitions({ limit: 50 });

  return (
    <div>
      {isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load capability definitions." />
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No capability definitions yet" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.data.map((c) => (
            <Card key={c.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-sm">
                  <span>{c.displayName}</span>
                  <StatusBadge status={c.status} />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-muted-foreground">
                <p>{c.capabilityKey} · v{c.version}</p>
                {c.description && <p>{c.description}</p>}
                {c.dependencies.length > 0 && <p>Depends on: {c.dependencies.join(', ')}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CapabilityOverridesTab() {
  const { data, isLoading, isError, refetch } = useCapabilityOverrides({ limit: 50 });

  return (
    <div>
      {isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load capability overrides." />
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No capability overrides yet" description="Overrides let a specific provider/model report FULL, PARTIAL, or UNSUPPORTED for a capability, rather than falling back to global defaults." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Capability</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Provider / Model</TableHead>
              <TableHead>Support level</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="text-sm font-medium text-foreground">{o.capabilityKey}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{o.scope}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{o.providerKey ?? '—'} / {o.modelId ?? '—'}</TableCell>
                <TableCell>
                  <StatusBadge status={o.supportLevel} tone={o.supportLevel === 'FULL' ? 'success' : o.supportLevel === 'PARTIAL' ? 'warning' : 'neutral'} />
                </TableCell>
                <TableCell>
                  <StatusBadge status={o.status} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{o.priority}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
