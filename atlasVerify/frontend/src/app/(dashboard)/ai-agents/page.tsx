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
import {
  useActivateAiAgent,
  useAgentExecutions,
  useAiAgent,
  useAiAgents,
  useArchiveAiAgent,
  useCreateAiAgent,
  useDeactivateAiAgent,
} from '@/hooks';
import { useAuthStore } from '@/stores';
import { formatDate } from '@/lib/utils';
import type { AiAgentStatus, AiAgentType, CreateAiAgentPayload } from '@/types';

const TYPE_OPTIONS: { value: AiAgentType; label: string }[] = [
  { value: 'CONVERSATIONAL', label: 'Conversational' },
  { value: 'TASK', label: 'Task' },
  { value: 'WORKFLOW', label: 'Workflow' },
  { value: 'AUTONOMOUS', label: 'Autonomous' },
  { value: 'SPECIALIST', label: 'Specialist' },
  { value: 'ORCHESTRATOR', label: 'Orchestrator' },
];

const STATUS_OPTIONS: { value: AiAgentStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'DEPRECATED', label: 'Deprecated' },
  { value: 'ARCHIVED', label: 'Archived' },
];

export default function AiAgentsPage() {
  const workspaceId = useAuthStore((s) => s.user?.workspaceId);
  const [type, setType] = useState<AiAgentType | ''>('');
  const [status, setStatus] = useState<AiAgentStatus | ''>('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useAiAgents({ workspaceId, type: type || undefined, status: status || undefined, page, limit: 20 });
  const isForbidden = isAxiosError(error) && error.response?.status === 403;

  return (
    <div>
      <PageHeader title="AI Agents" description="Goals, models, tools, prompts, status and execution history." />

      <div className="mb-4 flex items-center justify-between gap-3">
        <FilterBar hasActiveFilters={!!type || !!status} onClearFilters={() => { setType(''); setStatus(''); setPage(1); }}>
          <Select value={type} onChange={(e) => { setType(e.target.value as AiAgentType | ''); setPage(1); }} placeholder="All types" options={TYPE_OPTIONS} className="h-9 w-44" />
          <Select value={status} onChange={(e) => { setStatus(e.target.value as AiAgentStatus | ''); setPage(1); }} placeholder="All statuses" options={STATUS_OPTIONS} className="h-9 w-40" />
        </FilterBar>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          New agent
        </Button>
      </div>

      {isForbidden ? (
        <UnauthorizedState />
      ) : isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load agents." />
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No agents yet" description="Create an agent with a goal, model and tools to automate a use case." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agent</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Primary capability</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((a) => (
              <TableRow key={a.id} clickable onClick={() => setSelectedId(a.id)}>
                <TableCell className="text-sm font-medium text-foreground">{a.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{a.type}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{a.primaryCapability}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{a.modelId ?? '—'}</TableCell>
                <TableCell>
                  <StatusBadge status={a.status} />
                </TableCell>
                <TableCell />
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <CreateAgentDialog open={createOpen} onOpenChange={setCreateOpen} workspaceId={workspaceId} />
      <AgentDetailDialog id={selectedId} workspaceId={workspaceId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function CreateAgentDialog({ open, onOpenChange, workspaceId }: { open: boolean; onOpenChange: (o: boolean) => void; workspaceId: string | undefined }) {
  const createAgent = useCreateAiAgent();
  const [form, setForm] = useState<CreateAiAgentPayload>({ key: '', name: '', type: 'TASK', capabilities: [], primaryCapability: '' });

  const reset = () => setForm({ key: '', name: '', type: 'TASK', capabilities: [], primaryCapability: '' });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>New agent</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Key" htmlFor="agent-key" required>
              <Input id="agent-key" value={form.key} onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))} />
            </FormField>
            <FormField label="Name" htmlFor="agent-name" required>
              <Input id="agent-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </FormField>
          </div>
          <FormField label="Description" htmlFor="agent-description">
            <Textarea id="agent-description" value={form.description ?? ''} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Type" htmlFor="agent-type" required>
              <Select id="agent-type" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as AiAgentType }))} options={TYPE_OPTIONS} />
            </FormField>
            <FormField label="Primary capability" htmlFor="agent-primary" required>
              <Input id="agent-primary" value={form.primaryCapability} onChange={(e) => setForm((f) => ({ ...f, primaryCapability: e.target.value }))} />
            </FormField>
          </div>
          <FormField label="Capabilities" htmlFor="agent-capabilities" required hint="Comma-separated">
            <Input id="agent-capabilities" value={form.capabilities.join(', ')} onChange={(e) => setForm((f) => ({ ...f, capabilities: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) }))} />
          </FormField>
          <FormField label="System prompt" htmlFor="agent-system-prompt">
            <Textarea id="agent-system-prompt" value={form.systemPrompt ?? ''} onChange={(e) => setForm((f) => ({ ...f, systemPrompt: e.target.value }))} rows={3} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              createAgent.mutate(
                { ...form, workspaceId },
                { onSuccess: () => { onOpenChange(false); reset(); } },
              )
            }
            disabled={!form.key || !form.name || !form.primaryCapability || form.capabilities.length === 0 || createAgent.isPending}
          >
            {createAgent.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AgentDetailDialog({ id, workspaceId, onClose }: { id: string | null; workspaceId: string | undefined; onClose: () => void }) {
  const { data: agent, isLoading } = useAiAgent(id ?? undefined, workspaceId);
  const { data: executions } = useAgentExecutions(id ? { workspaceId, agentId: id, limit: 20 } : {});
  const activate = useActivateAiAgent(id ?? '');
  const deactivate = useDeactivateAiAgent(id ?? '');
  const archive = useArchiveAiAgent(id ?? '');

  const actions: ActionMenuItem[] = [];
  if (agent && agent.status !== 'ACTIVE') actions.push({ label: 'Activate', onSelect: () => activate.mutate() });
  if (agent && agent.status === 'ACTIVE') actions.push({ label: 'Deactivate', onSelect: () => deactivate.mutate() });
  if (agent && agent.status !== 'ARCHIVED') actions.push({ label: 'Archive', onSelect: () => archive.mutate(), destructive: true, separatorBefore: true });

  return (
    <Dialog open={!!id} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>{agent?.name ?? 'Agent'}</span>
            {agent && (
              <div className="flex items-center gap-2">
                <StatusBadge status={agent.status} />
                <ActionMenu items={actions} />
              </div>
            )}
          </DialogTitle>
        </DialogHeader>
        {isLoading || !agent ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="executions">Executions</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              <Card>
                <CardContent className="grid grid-cols-2 gap-4 pt-6 text-sm sm:grid-cols-3">
                  <Field label="Type" value={agent.type} />
                  <Field label="Primary capability" value={agent.primaryCapability} />
                  <Field label="Capabilities" value={agent.capabilities.join(', ') || '—'} />
                  <Field label="Model" value={agent.modelId ?? '—'} />
                  <Field label="Temperature" value={agent.temperature != null ? String(agent.temperature) : '—'} />
                  <Field label="Max tokens" value={agent.maxTokens != null ? String(agent.maxTokens) : '—'} />
                  <Field label="Max turns" value={agent.maxTurns != null ? String(agent.maxTurns) : '—'} />
                  <Field label="Memory / Context" value={`${agent.enableMemory ? 'Memory on' : 'Memory off'} · ${agent.enableContext ? 'Context on' : 'Context off'}`} />
                  <Field label="Public" value={agent.isPublic ? 'Yes' : 'No'} />
                </CardContent>
              </Card>
              {agent.instructions && (
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle className="text-sm">Instructions</CardTitle>
                  </CardHeader>
                  <CardContent className="whitespace-pre-wrap text-sm text-muted-foreground">{agent.instructions}</CardContent>
                </Card>
              )}
              {agent.systemPrompt && (
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle className="text-sm">System prompt</CardTitle>
                  </CardHeader>
                  <CardContent className="whitespace-pre-wrap text-sm text-muted-foreground">{agent.systemPrompt}</CardContent>
                </Card>
              )}
            </TabsContent>
            <TabsContent value="executions">
              {!executions || executions.data.length === 0 ? (
                <EmptyState title="No executions yet" className="border-none py-8" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Input</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Turns</TableHead>
                      <TableHead>Tokens / Cost</TableHead>
                      <TableHead>Started</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {executions.data.map((ex) => (
                      <TableRow key={ex.id}>
                        <TableCell className="max-w-xs truncate text-sm text-foreground">{ex.input}</TableCell>
                        <TableCell>
                          <StatusBadge status={ex.status} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{ex.turns}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{ex.totalTokens ?? '—'} / {ex.totalCost != null ? `$${ex.totalCost.toFixed(4)}` : '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(ex.startTime)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
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
