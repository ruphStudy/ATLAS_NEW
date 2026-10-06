'use client';

import { useState } from 'react';
import { Boxes, Clock, Eye, EyeOff, Loader2, Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { FilterBar } from '@/components/ui/filter-bar';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { KpiCard } from '@/components/ui/kpi-card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState } from '@/components/ui/states';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/action-menu';
import {
  useAiContext,
  useAiContextStats,
  useAiContexts,
  useAiContextVersions,
  useArchiveAiContext,
  useCreateAiContext,
  useDeleteAiContext,
  useExpireAiContext,
  useMergeAiContexts,
  useSummarizeAiContext,
  useTrimAiContext,
} from '@/hooks';
import { useAuthStore } from '@/stores';
import { formatDate } from '@/lib/utils';
import type { AiContextPriority, AiContextStatus, AiContextType, CreateAiContextPayload } from '@/types';

const TYPE_OPTIONS: { value: AiContextType; label: string }[] = [
  { value: 'REQUEST', label: 'Request' },
  { value: 'SESSION', label: 'Session' },
  { value: 'WORKFLOW', label: 'Workflow' },
  { value: 'AGENT', label: 'Agent' },
  { value: 'TASK', label: 'Task' },
  { value: 'WORKSPACE', label: 'Workspace' },
];

const STATUS_OPTIONS: { value: AiContextStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'ARCHIVED', label: 'Archived' },
  { value: 'SUMMARIZED', label: 'Summarized' },
];

export default function AiContextPage() {
  const workspaceId = useAuthStore((s) => s.user?.workspaceId);
  const [type, setType] = useState<AiContextType | ''>('');
  const [status, setStatus] = useState<AiContextStatus | ''>('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useAiContexts({ workspaceId: workspaceId ?? '', type: type || undefined, status: status || undefined, limit: 30 });
  const stats = useAiContextStats(workspaceId);
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div>
      <PageHeader title="AI Context" description="Session/context visibility using safe metadata only." />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Total contexts" value={stats.data?.totalContexts ?? 0} icon={Boxes} loading={stats.isLoading} />
        <KpiCard label="Active contexts" value={stats.data?.activeContexts ?? 0} icon={Clock} loading={stats.isLoading} />
        <KpiCard label="Avg token estimate" value={stats.data?.averageTokenEstimate?.toFixed(0) ?? '—'} loading={stats.isLoading} />
        <KpiCard label="Tokens saved" value={stats.data?.totalTokensSaved ?? 0} loading={stats.isLoading} />
      </div>

      <div className="mb-4 flex items-center justify-between gap-3">
        <FilterBar hasActiveFilters={!!type || !!status} onClearFilters={() => { setType(''); setStatus(''); }}>
          <Select value={type} onChange={(e) => setType(e.target.value as AiContextType | '')} placeholder="All types" options={TYPE_OPTIONS} className="h-9 w-40" />
          <Select value={status} onChange={(e) => setStatus(e.target.value as AiContextStatus | '')} placeholder="All statuses" options={STATUS_OPTIONS} className="h-9 w-40" />
        </FilterBar>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          New context
        </Button>
      </div>

      {isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load contexts." />
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No contexts yet" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Correlation</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tokens (est.)</TableHead>
              <TableHead>Last accessed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((c) => (
              <TableRow key={c.id} clickable onClick={() => setSelectedId(c.id)}>
                <TableCell className="text-sm font-medium text-foreground">{c.type}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.correlationId ?? c.sessionId ?? '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.priority}</TableCell>
                <TableCell>
                  <StatusBadge status={c.status} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.tokenEstimate ?? '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.lastAccessedAt ? formatDate(c.lastAccessedAt) : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <ContextDetailDialog id={selectedId} workspaceId={workspaceId} onClose={() => setSelectedId(null)} />
      <CreateContextDialog open={createOpen} onOpenChange={setCreateOpen} workspaceId={workspaceId} />
    </div>
  );
}

function CreateContextDialog({ open, onOpenChange, workspaceId }: { open: boolean; onOpenChange: (open: boolean) => void; workspaceId: string | undefined }) {
  const create = useCreateAiContext();
  const [form, setForm] = useState<Omit<CreateAiContextPayload, 'workspaceId'>>({ type: 'SESSION', priority: 'NORMAL', allowInheritance: true, allowBranching: false });

  const reset = () => setForm({ type: 'SESSION', priority: 'NORMAL', allowInheritance: true, allowBranching: false });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>New context</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Type" htmlFor="ctx-type" required>
            <Select id="ctx-type" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as AiContextType }))} options={TYPE_OPTIONS} />
          </FormField>
          <FormField label="Priority" htmlFor="ctx-priority">
            <Select id="ctx-priority" value={form.priority ?? 'NORMAL'} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as AiContextPriority }))} options={[{ value: 'CRITICAL', label: 'Critical' }, { value: 'HIGH', label: 'High' }, { value: 'NORMAL', label: 'Normal' }, { value: 'LOW', label: 'Low' }]} />
          </FormField>
          <FormField label="Parent context ID" htmlFor="ctx-parent" hint="Set to inherit from an existing context.">
            <Input id="ctx-parent" value={form.parentContextId ?? ''} onChange={(e) => setForm((f) => ({ ...f, parentContextId: e.target.value || undefined }))} />
          </FormField>
          <FormField label="Correlation ID" htmlFor="ctx-correlation">
            <Input id="ctx-correlation" value={form.correlationId ?? ''} onChange={(e) => setForm((f) => ({ ...f, correlationId: e.target.value || undefined }))} />
          </FormField>
          <FormField label="Max tokens" htmlFor="ctx-max-tokens">
            <Input id="ctx-max-tokens" type="number" min="0" value={form.maxTokens ?? ''} onChange={(e) => setForm((f) => ({ ...f, maxTokens: e.target.value ? Number(e.target.value) : undefined }))} />
          </FormField>
          <FormField label="Window size" htmlFor="ctx-window">
            <Input id="ctx-window" type="number" min="0" value={form.windowSize ?? ''} onChange={(e) => setForm((f) => ({ ...f, windowSize: e.target.value ? Number(e.target.value) : undefined }))} />
          </FormField>
          <div className="flex items-center gap-4 sm:col-span-2">
            <div className="flex items-center gap-2">
              <Switch checked={!!form.allowInheritance} onChange={(e) => setForm((f) => ({ ...f, allowInheritance: e.target.checked }))} />
              <span className="text-sm text-foreground">Allow inheritance</span>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={!!form.allowBranching} onChange={(e) => setForm((f) => ({ ...f, allowBranching: e.target.checked }))} />
              <span className="text-sm text-foreground">Allow branching</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => workspaceId && create.mutate({ ...form, workspaceId }, { onSuccess: () => { onOpenChange(false); reset(); } })}
            disabled={!workspaceId || create.isPending}
          >
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ContextDetailDialog({ id, workspaceId, onClose }: { id: string | null; workspaceId: string | undefined; onClose: () => void }) {
  const { data: context, isLoading } = useAiContext(id ?? undefined, workspaceId);
  const { data: versions } = useAiContextVersions(id ?? undefined, workspaceId);
  const [showRaw, setShowRaw] = useState(false);
  const [trimOpen, setTrimOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [maxTokens, setMaxTokens] = useState('');
  const [sourceIds, setSourceIds] = useState('');
  const summarize = useSummarizeAiContext(id ?? '', workspaceId ?? '');
  const expire = useExpireAiContext(id ?? '', workspaceId ?? '');
  const archive = useArchiveAiContext(id ?? '', workspaceId ?? '');
  const trim = useTrimAiContext(id ?? '', workspaceId ?? '');
  const remove = useDeleteAiContext(workspaceId ?? '');
  const merge = useMergeAiContexts();

  const actions: ActionMenuItem[] = [];
  if (context && context.status === 'ACTIVE') {
    actions.push({ label: 'Summarize', onSelect: () => summarize.mutate() });
    actions.push({ label: 'Trim', onSelect: () => setTrimOpen(true) });
    actions.push({ label: 'Merge from…', onSelect: () => setMergeOpen(true) });
    actions.push({ label: 'Expire', onSelect: () => expire.mutate() });
  }
  if (context && context.status !== 'ARCHIVED') actions.push({ label: 'Archive', onSelect: () => archive.mutate(), destructive: true, separatorBefore: true });
  if (context) actions.push({ label: 'Delete', onSelect: () => remove.mutate(context.id, { onSuccess: onClose }), destructive: true });

  return (
    <Dialog open={!!id} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>Context detail</span>
            {context && (
              <div className="flex items-center gap-2">
                <StatusBadge status={context.status} />
                <ActionMenu items={actions} />
              </div>
            )}
          </DialogTitle>
        </DialogHeader>
        {isLoading || !context ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <Field label="Type" value={context.type} />
              <Field label="Priority" value={context.priority} />
              <Field label="Version" value={String(context.version)} />
              <Field label="Session" value={context.sessionId ?? '—'} />
              <Field label="Correlation" value={context.correlationId ?? '—'} />
              <Field label="Source" value={context.source ?? '—'} />
              <Field label="Token estimate" value={context.tokenEstimate != null ? String(context.tokenEstimate) : '—'} />
              <Field label="Size (bytes)" value={context.sizeBytes != null ? String(context.sizeBytes) : '—'} />
              <Field label="Expires" value={context.expiresAt ? formatDate(context.expiresAt) : '—'} />
            </div>

            {context.summary && (
              <Card>
                <CardContent className="pt-4 text-sm">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Summary</p>
                  <p className="text-foreground">{context.summary}</p>
                </CardContent>
              </Card>
            )}

            <div className="flex items-center justify-between rounded-[var(--radius)] border border-warning/30 bg-warning/5 p-3 text-sm">
              <span className="text-warning">Raw conversation/variable content may contain sensitive data.</span>
              <Button variant="outline" size="sm" onClick={() => setShowRaw((v) => !v)}>
                {showRaw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {showRaw ? 'Hide raw content' : 'Show raw content'}
              </Button>
            </div>

            {showRaw && (
              <div className="space-y-3">
                {context.conversationHistory && context.conversationHistory.length > 0 && (
                  <Card>
                    <CardContent className="space-y-2 pt-4 text-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Conversation history</p>
                      {context.conversationHistory.map((m, i) => (
                        <div key={i} className="rounded-[var(--radius)] bg-muted/40 p-2">
                          <p className="text-xs font-semibold text-muted-foreground">{m.role}</p>
                          <p className="whitespace-pre-wrap text-foreground">{m.content}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
                {context.variables && Object.keys(context.variables).length > 0 && (
                  <Card>
                    <CardContent className="pt-4 text-sm">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Variables</p>
                      <pre className="whitespace-pre-wrap text-foreground">{JSON.stringify(context.variables, null, 2)}</pre>
                    </CardContent>
                  </Card>
                )}
                {!context.conversationHistory?.length && !context.variables && (
                  <EmptyState title="No raw content stored" className="border-none py-6" />
                )}
              </div>
            )}

            {versions && versions.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Versions</p>
                <ul className="space-y-1.5">
                  {versions.map((v) => (
                    <li key={v.id} className="flex items-center justify-between rounded-[var(--radius)] border border-border p-2 text-sm">
                      <span className="text-foreground">v{v.version}{v.changeReason ? ` — ${v.changeReason}` : ''}</span>
                      <span className="text-xs text-muted-foreground">{v.changedBy ?? 'System'} · {formatDate(v.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </DialogContent>

      <Dialog open={trimOpen} onOpenChange={setTrimOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Trim context</DialogTitle>
          </DialogHeader>
          <FormField label="Max tokens" htmlFor="trim-max-tokens" required hint="Trims the context down to this token budget.">
            <Input id="trim-max-tokens" type="number" min="1" value={maxTokens} onChange={(e) => setMaxTokens(e.target.value)} />
          </FormField>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTrimOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => trim.mutate(Number(maxTokens), { onSuccess: () => { setTrimOpen(false); setMaxTokens(''); } })}
              disabled={!maxTokens || trim.isPending}
            >
              {trim.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Trim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mergeOpen} onOpenChange={setMergeOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Merge contexts into this one</DialogTitle>
          </DialogHeader>
          <FormField label="Source context IDs" htmlFor="merge-sources" required hint="Comma-separated context IDs to merge into this context.">
            <Input id="merge-sources" value={sourceIds} onChange={(e) => setSourceIds(e.target.value)} placeholder="ctx_1, ctx_2" />
          </FormField>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMergeOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                context &&
                workspaceId &&
                merge.mutate(
                  { workspaceId, targetContextId: context.id, sourceContextIds: sourceIds.split(',').map((s) => s.trim()).filter(Boolean) },
                  { onSuccess: () => { setMergeOpen(false); setSourceIds(''); } },
                )
              }
              disabled={!sourceIds.trim() || merge.isPending}
            >
              {merge.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Merge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
