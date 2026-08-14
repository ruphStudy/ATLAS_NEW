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
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/ui/form-field';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState, UnauthorizedState } from '@/components/ui/states';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/action-menu';
import { ReasonDialog } from '@/components/suppliers/reason-dialog';
import {
  useAiPrompt,
  useAiPrompts,
  useArchiveAiPrompt,
  useCompilePrompt,
  useCreateAiPrompt,
  useCreatePromptVersion,
  useDeprecateAiPrompt,
  usePromptStats,
  usePromptVersions,
  usePublishAiPrompt,
  useRollbackPrompt,
} from '@/hooks';
import { useAuthStore } from '@/stores';
import { formatDate } from '@/lib/utils';
import type { AiPromptStatus, AiPromptType, CreateAiPromptPayload } from '@/types';

const TYPE_OPTIONS: { value: AiPromptType; label: string }[] = [
  { value: 'SYSTEM', label: 'System' },
  { value: 'USER', label: 'User' },
  { value: 'AGENT', label: 'Agent' },
  { value: 'VALIDATION', label: 'Validation' },
  { value: 'TRANSFORMATION', label: 'Transformation' },
  { value: 'FORMATTING', label: 'Formatting' },
];

const STATUS_OPTIONS: { value: AiPromptStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DEPRECATED', label: 'Deprecated' },
  { value: 'ARCHIVED', label: 'Archived' },
];

export default function AiPromptsPage() {
  const workspaceId = useAuthStore((s) => s.user?.workspaceId);
  const [type, setType] = useState<AiPromptType | ''>('');
  const [status, setStatus] = useState<AiPromptStatus | ''>('');
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useAiPrompts({ workspaceId, type: type || undefined, status: status || undefined, limit: 30 });
  const isForbidden = isAxiosError(error) && error.response?.status === 403;

  return (
    <div>
      <PageHeader title="AI Prompts" description="Create, version, publish, roll back and preview prompt templates." />

      <div className="mb-4 flex items-center justify-between gap-3">
        <FilterBar hasActiveFilters={!!type || !!status} onClearFilters={() => { setType(''); setStatus(''); }}>
          <Select value={type} onChange={(e) => setType(e.target.value as AiPromptType | '')} placeholder="All types" options={TYPE_OPTIONS} className="h-9 w-40" />
          <Select value={status} onChange={(e) => setStatus(e.target.value as AiPromptStatus | '')} placeholder="All statuses" options={STATUS_OPTIONS} className="h-9 w-40" />
        </FilterBar>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          New prompt
        </Button>
      </div>

      {isForbidden ? (
        <UnauthorizedState />
      ) : isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load prompts." />
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No prompts yet" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Prompt</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Use case</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Usage</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((p) => (
              <TableRow key={p.id} clickable onClick={() => setSelectedId(p.id)}>
                <TableCell className="text-sm font-medium text-foreground">{p.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{p.type}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{p.useCase}</TableCell>
                <TableCell className="text-sm text-muted-foreground">v{p.version}</TableCell>
                <TableCell>
                  <StatusBadge status={p.status} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{p.usageCount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <CreatePromptDialog open={createOpen} onOpenChange={setCreateOpen} workspaceId={workspaceId} />
      <PromptDetailDialog id={selectedId} workspaceId={workspaceId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function CreatePromptDialog({ open, onOpenChange, workspaceId }: { open: boolean; onOpenChange: (o: boolean) => void; workspaceId: string | undefined }) {
  const createPrompt = useCreateAiPrompt();
  const [form, setForm] = useState<CreateAiPromptPayload>({ key: '', name: '', type: 'USER', useCase: '', template: '' });

  const reset = () => setForm({ key: '', name: '', type: 'USER', useCase: '', template: '' });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>New prompt</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Key" htmlFor="prompt-key" required>
              <Input id="prompt-key" value={form.key} onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))} />
            </FormField>
            <FormField label="Name" htmlFor="prompt-name" required>
              <Input id="prompt-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Type" htmlFor="prompt-type" required>
              <Select id="prompt-type" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as AiPromptType }))} options={TYPE_OPTIONS} />
            </FormField>
            <FormField label="Use case" htmlFor="prompt-usecase" required>
              <Input id="prompt-usecase" value={form.useCase} onChange={(e) => setForm((f) => ({ ...f, useCase: e.target.value }))} />
            </FormField>
          </div>
          <FormField label="Template" htmlFor="prompt-template" required hint="Use {{variable}} placeholders.">
            <Textarea id="prompt-template" value={form.template} onChange={(e) => setForm((f) => ({ ...f, template: e.target.value }))} rows={6} />
          </FormField>
          <FormField label="Variables" htmlFor="prompt-vars" hint="Comma-separated variable names">
            <Input id="prompt-vars" value={(form.variables ?? []).join(', ')} onChange={(e) => setForm((f) => ({ ...f, variables: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) }))} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => createPrompt.mutate({ ...form, workspaceId }, { onSuccess: () => { onOpenChange(false); reset(); } })}
            disabled={!form.key || !form.name || !form.useCase || !form.template || createPrompt.isPending}
          >
            {createPrompt.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PromptDetailDialog({ id, workspaceId, onClose }: { id: string | null; workspaceId: string | undefined; onClose: () => void }) {
  const { data: prompt, isLoading } = useAiPrompt(id ?? undefined, workspaceId);
  const { data: versions } = usePromptVersions(id ?? undefined);
  const { data: stats } = usePromptStats(id ?? undefined);
  const publish = usePublishAiPrompt(id ?? '', workspaceId);
  const deprecate = useDeprecateAiPrompt(id ?? '');
  const archive = useArchiveAiPrompt(id ?? '');
  const createVersion = useCreatePromptVersion();
  const rollback = useRollbackPrompt();
  const compile = useCompilePrompt();

  const [versionOpen, setVersionOpen] = useState(false);
  const [compileVars, setCompileVars] = useState('{}');

  const actions: ActionMenuItem[] = [];
  if (prompt && prompt.status !== 'ACTIVE') actions.push({ label: 'Publish', onSelect: () => publish.mutate(undefined) });
  if (prompt && prompt.status !== 'DEPRECATED') actions.push({ label: 'Deprecate', onSelect: () => deprecate.mutate() });
  if (prompt && prompt.status !== 'ARCHIVED') actions.push({ label: 'Archive', onSelect: () => archive.mutate(), destructive: true, separatorBefore: true });

  return (
    <Dialog open={!!id} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>{prompt?.name ?? 'Prompt'}</span>
            {prompt && (
              <div className="flex items-center gap-2">
                <StatusBadge status={prompt.status} />
                <ActionMenu items={actions} />
              </div>
            )}
          </DialogTitle>
        </DialogHeader>
        {isLoading || !prompt ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <Tabs defaultValue="preview">
            <TabsList>
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="versions">Versions</TabsTrigger>
              <TabsTrigger value="stats">Stats</TabsTrigger>
            </TabsList>
            <TabsContent value="preview">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Template (v{prompt.version})</CardTitle>
                </CardHeader>
                <CardContent className="whitespace-pre-wrap rounded-[var(--radius)] bg-muted/40 p-3 text-sm text-foreground">{prompt.template}</CardContent>
              </Card>
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <Field label="Variables" value={prompt.variables.join(', ') || '—'} />
                <Field label="Required variables" value={prompt.requiredVariables.join(', ') || '—'} />
              </div>
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-sm">Compile preview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <FormField label="Variables (JSON)" htmlFor="compile-vars">
                    <Textarea id="compile-vars" value={compileVars} onChange={(e) => setCompileVars(e.target.value)} rows={3} />
                  </FormField>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      try {
                        const variables = JSON.parse(compileVars);
                        compile.mutate({ promptId: prompt.id, workspaceId, variables });
                      } catch {
                        // invalid JSON — surfaced via mutation error state below
                      }
                    }}
                    disabled={compile.isPending}
                  >
                    Compile
                  </Button>
                  {compile.data && <pre className="whitespace-pre-wrap rounded-[var(--radius)] bg-muted/40 p-3 text-sm text-foreground">{compile.data.compiled}</pre>}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="versions">
              <div className="mb-3 flex justify-end">
                <Button variant="outline" size="sm" onClick={() => setVersionOpen(true)}>
                  New version
                </Button>
              </div>
              {!versions || versions.length === 0 ? (
                <EmptyState title="No versions yet" className="border-none py-8" />
              ) : (
                <div className="space-y-2">
                  {versions.map((v) => (
                    <div key={v.id} className="flex items-center justify-between rounded-[var(--radius)] border border-border p-3 text-sm">
                      <div>
                        <p className="text-foreground">v{v.version}{v.changeDescription ? ` — ${v.changeDescription}` : ''}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(v.createdAt)}</p>
                      </div>
                      {v.version !== prompt.version && (
                        <Button variant="ghost" size="sm" onClick={() => rollback.mutate({ promptId: prompt.id, targetVersion: v.version, workspaceId })} disabled={rollback.isPending}>
                          Roll back to this version
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="stats">
              {!stats ? (
                <EmptyState title="No usage stats yet" className="border-none py-8" />
              ) : (
                <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                  <Field label="Total usage" value={String(stats.totalUsage)} />
                  <Field label="Success rate" value={`${stats.successRate.toFixed(1)}%`} />
                  <Field label="Avg tokens" value={stats.averageTokens.toFixed(0)} />
                  <Field label="Total cost" value={`$${stats.totalCost.toFixed(4)}`} />
                  <Field label="Quality score" value={stats.qualityScore.toFixed(2)} />
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
      <ReasonDialog
        open={versionOpen}
        onOpenChange={setVersionOpen}
        title="New prompt version"
        label="Template"
        confirmLabel="Create version"
        pending={createVersion.isPending}
        onSubmit={(template) => {
          if (!id) return;
          createVersion.mutate({ promptId: id, template }, { onSuccess: () => setVersionOpen(false) });
        }}
      />
    </Dialog>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-foreground">{value}</p>
    </div>
  );
}
