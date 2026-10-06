'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { FilterBar } from '@/components/ui/filter-bar';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState } from '@/components/ui/states';
import { Pagination } from '@/components/ui/pagination';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { useRules } from '@/hooks';
import type { Rule, RuleFilterParams, RuleScope, RuleStatus, RuleTriggerType } from '@/types';

const SCOPE_OPTIONS: { value: RuleScope; label: string }[] = [
  { value: 'GLOBAL', label: 'Global' },
  { value: 'ORGANIZATION', label: 'Organization' },
  { value: 'WORKSPACE', label: 'Workspace' },
];

const STATUS_OPTIONS: { value: RuleStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'DISABLED', label: 'Disabled' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const TRIGGER_OPTIONS: { value: RuleTriggerType; label: string }[] = [
  { value: 'API', label: 'API' },
  { value: 'EVENT', label: 'Event' },
  { value: 'SCHEDULE', label: 'Schedule' },
  { value: 'WORKFLOW', label: 'Workflow' },
];

export default function BusinessRulesPage() {
  const router = useRouter();
  const [module, setModule] = useState('');
  const [scope, setScope] = useState<RuleScope | ''>('');
  const [status, setStatus] = useState<RuleStatus | ''>('');
  const [triggerType, setTriggerType] = useState<RuleTriggerType | ''>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const params = useMemo<RuleFilterParams>(
    () => ({ module: module || undefined, scope: scope || undefined, status: status || undefined, triggerType: triggerType || undefined, search: search || undefined, page, limit }),
    [module, scope, status, triggerType, search, page, limit],
  );

  const rules = useRules(params);
  const rows = rules.data?.data ?? [];
  const hasActiveFilters = !!(module || scope || status || triggerType || search);

  return (
    <div>
      <PageHeader
        title="Business Rules"
        description="Conditions, actions, priorities and execution order for automated decisions."
        actions={
          <Button size="sm" onClick={() => router.push('/dashboard/settings/rules/new')}>
            <Plus className="h-3.5 w-3.5" />
            New rule
          </Button>
        }
      />

      <FilterBar
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Search rules…"
        hasActiveFilters={hasActiveFilters}
        onClearFilters={() => {
          setModule('');
          setScope('');
          setStatus('');
          setTriggerType('');
          setSearch('');
          setPage(1);
        }}
        className="mb-4"
      >
        <Input value={module} onChange={(e) => setModule(e.target.value)} placeholder="Module" className="h-9 w-36" />
        <Select value={scope} onChange={(e) => setScope(e.target.value as RuleScope | '')} options={[{ value: '', label: 'All scopes' }, ...SCOPE_OPTIONS]} className="h-9 w-40" />
        <Select value={status} onChange={(e) => setStatus(e.target.value as RuleStatus | '')} options={[{ value: '', label: 'All statuses' }, ...STATUS_OPTIONS]} className="h-9 w-40" />
        <Select value={triggerType} onChange={(e) => setTriggerType(e.target.value as RuleTriggerType | '')} options={[{ value: '', label: 'All triggers' }, ...TRIGGER_OPTIONS]} className="h-9 w-36" />
      </FilterBar>

      {rules.isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : rules.isError ? (
        <QueryErrorState refetch={rules.refetch} />
      ) : rows.length === 0 ? (
        <EmptyState title="No rules yet" description="Create a rule to automate decisions across ATLAS." />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rule</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r: Rule) => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => router.push(`/dashboard/settings/rules/${r.id}`)}>
                  <TableCell>
                    <p className="text-sm font-medium text-foreground">{r.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{r.key}</p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.module}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px]">
                      {r.triggerType}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.priority}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.executionOrder}</TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination
            page={rules.data?.page ?? page}
            limit={rules.data?.limit ?? limit}
            total={rules.data?.total ?? 0}
            totalPages={rules.data?.totalPages ?? 0}
            onPageChange={setPage}
            onLimitChange={(l) => {
              setLimit(l);
              setPage(1);
            }}
          />
        </>
      )}
    </div>
  );
}
