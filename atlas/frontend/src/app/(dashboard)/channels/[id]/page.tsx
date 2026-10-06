'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { isAxiosError } from 'axios';
import { CheckCircle2, Plus, RotateCcw, Star, Trash2, X } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/action-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState, UnauthorizedState } from '@/components/ui/states';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  useArchiveChannel,
  useChannel,
  useChannelHealth,
  useChannelHistory,
  useChannelMappings,
  useConfirm,
  useCreateChannelMapping,
  useDeleteChannelMapping,
  useDisableChannel,
  useEnableChannel,
  useRestoreChannel,
  useSetDefaultChannel,
} from '@/hooks';
import { formatDate } from '@/lib/utils';

export default function ChannelDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const confirm = useConfirm();
  const { data: channel, isLoading, isError, error, refetch } = useChannel(id);
  const enable = useEnableChannel(id);
  const disable = useDisableChannel(id);
  const archive = useArchiveChannel(id);
  const restore = useRestoreChannel(id);
  const setDefault = useSetDefaultChannel(id);

  const isForbidden = isAxiosError(error) && error.response?.status === 403;

  if (isForbidden) return <UnauthorizedState />;
  if (isError) return <QueryErrorState refetch={refetch} description="We couldn't load this channel." />;
  if (isLoading || !channel) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const actions: ActionMenuItem[] = [];
  if (channel.status !== 'ACTIVE' && channel.status !== 'ARCHIVED') {
    actions.push({ label: 'Enable', icon: CheckCircle2, onSelect: () => enable.mutate(undefined) });
  }
  if (channel.status === 'ACTIVE') {
    actions.push({ label: 'Disable', icon: X, onSelect: () => disable.mutate(undefined) });
    if (!channel.isDefault) {
      actions.push({ label: 'Set as default', icon: Star, onSelect: () => setDefault.mutate() });
    }
  }
  if (channel.status !== 'ARCHIVED') {
    actions.push({ label: 'Archive', icon: Trash2, onSelect: () => archive.mutate(undefined), destructive: true, separatorBefore: true });
  } else {
    actions.push({ label: 'Restore', icon: RotateCcw, onSelect: () => restore.mutate(undefined) });
  }

  return (
    <div>
      <PageHeader
        title={channel.name}
        breadcrumbs={[{ label: 'Channels', href: '/channels' }, { label: channel.name }]}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={channel.status} />
            <ActionMenu items={actions} />
          </div>
        }
      />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="mappings">Product mappings</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 text-sm">
              <Field label="Type" value={channel.channelType.replace(/_/g, ' ')} />
              <Field label="Channel key" value={channel.channelKey} />
              <Field label="Provider" value={channel.providerKey ?? '—'} />
              <Field label="Priority" value={String(channel.priority)} />
              <Field label="Capabilities" value={channel.capabilities.join(', ') || '—'} />
              <Field label="Tax jurisdiction" value={channel.taxJurisdictionCode ?? '—'} />
              <Field label="Regional settings profile" value={channel.regionalSettingsProfileKey ?? '—'} />
              <Field label="Compliance profile" value={channel.complianceProfileKey ?? '—'} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mappings">
          <MappingsTab channelId={channel.id} />
        </TabsContent>

        <TabsContent value="health">
          <HealthTab channelId={channel.id} />
        </TabsContent>

        <TabsContent value="history">
          <HistoryTab channelId={channel.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm capitalize text-foreground">{value}</p>
    </div>
  );
}

function MappingsTab({ channelId }: { channelId: string }) {
  const { data: mappings, isLoading } = useChannelMappings(channelId);
  const createMapping = useCreateChannelMapping(channelId);
  const deleteMapping = useDeleteChannelMapping(channelId);
  const [createOpen, setCreateOpen] = useState(false);
  const [internalProductId, setInternalProductId] = useState('');
  const [externalSku, setExternalSku] = useState('');
  const [externalUrl, setExternalUrl] = useState('');

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  return (
    <>
      <div className="mb-3 flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          Add mapping
        </Button>
      </div>
      {!mappings || mappings.length === 0 ? (
        <EmptyState title="No product mappings" description="Map internal products to this channel's external SKUs." className="border-none py-8" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Internal product</TableHead>
              <TableHead>External SKU</TableHead>
              <TableHead>Sync status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {mappings.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="text-sm text-foreground">{m.internalProductId}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{m.externalSku ?? '—'}</TableCell>
                <TableCell>
                  <StatusBadge status={m.syncStatus} />
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => deleteMapping.mutate(m.id)} disabled={deleteMapping.isPending}>
                    Remove
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Add product mapping</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <FormField label="Internal product ID" htmlFor="map-internal" required>
              <Input id="map-internal" value={internalProductId} onChange={(e) => setInternalProductId(e.target.value)} />
            </FormField>
            <FormField label="External SKU" htmlFor="map-sku">
              <Input id="map-sku" value={externalSku} onChange={(e) => setExternalSku(e.target.value)} />
            </FormField>
            <FormField label="External URL" htmlFor="map-url">
              <Input id="map-url" value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                createMapping.mutate(
                  { internalProductId, externalSku: externalSku || undefined, externalUrl: externalUrl || undefined },
                  { onSuccess: () => { setCreateOpen(false); setInternalProductId(''); setExternalSku(''); setExternalUrl(''); } },
                )
              }
              disabled={!internalProductId || createMapping.isPending}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function HealthTab({ channelId }: { channelId: string }) {
  const { data: health, isLoading } = useChannelHealth(channelId);
  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (!health || Object.keys(health).length === 0) {
    return <EmptyState title="No health data" description="No health information is available for this channel yet." className="border-none py-8" />;
  }
  return (
    <Card>
      <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
        {Object.entries(health).map(([key, value]) => (
          <div key={key}>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
            <p className="mt-0.5 text-sm text-foreground">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function HistoryTab({ channelId }: { channelId: string }) {
  const { data: history, isLoading } = useChannelHistory(channelId);
  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (!history || history.length === 0) {
    return <EmptyState title="No history yet" className="border-none py-8" />;
  }
  return (
    <ul className="space-y-2">
      {history.map((h) => (
        <li key={h.id} className="rounded-[var(--radius)] border border-border p-2 text-sm">
          <div className="flex items-center justify-between">
            <StatusBadge status={h.status} />
            <span className="text-xs text-muted-foreground">{formatDate(h.createdAt)}</span>
          </div>
          {h.changeReason && <p className="mt-1 text-xs text-muted-foreground">{h.changeReason}</p>}
        </li>
      ))}
    </ul>
  );
}
