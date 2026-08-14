'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FilterBar } from '@/components/ui/filter-bar';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState } from '@/components/ui/states';
import { Pagination } from '@/components/ui/pagination';
import { StatusBadge } from '@/components/ui/status-badge';
import { useApprovalRequests } from '@/hooks';
import { formatDistanceToNow } from '@/lib/utils';
import type { ApprovalRequest, ApprovalRequestListParams, ApprovalRequestStatus } from '@/types';

const STATUS_OPTIONS: { value: ApprovalRequestStatus; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CHANGES_REQUESTED', label: 'Changes requested' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'RECALLED', label: 'Recalled' },
  { value: 'EXPIRED', label: 'Expired' },
];

export default function ApprovalWorkflowPage() {
  return (
    <div>
      <PageHeader title="Approval Inbox" description="Requests awaiting your decision, and every approval request across the workspace." />
      <Tabs defaultValue="mine">
        <TabsList>
          <TabsTrigger value="mine">My Approvals</TabsTrigger>
          <TabsTrigger value="all">All Requests</TabsTrigger>
        </TabsList>
        <TabsContent value="mine">
          <RequestsTab assignedToMe />
        </TabsContent>
        <TabsContent value="all">
          <RequestsTab assignedToMe={false} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RequestsTab({ assignedToMe }: { assignedToMe: boolean }) {
  const router = useRouter();
  const [status, setStatus] = useState<ApprovalRequestStatus | ''>('');
  const [module, setModule] = useState('');
  const [entityType, setEntityType] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const params = useMemo<ApprovalRequestListParams>(
    () => ({
      assignedToMe,
      status: status || undefined,
      module: module || undefined,
      entityType: entityType || undefined,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      page,
      limit,
    }),
    [assignedToMe, status, module, entityType, page, limit],
  );

  const requests = useApprovalRequests(params);
  const rows = requests.data?.data ?? [];
  const hasActiveFilters = !!(status || module || entityType);

  return (
    <div>
      <FilterBar
        hasActiveFilters={hasActiveFilters}
        onClearFilters={() => {
          setStatus('');
          setModule('');
          setEntityType('');
          setPage(1);
        }}
        className="mb-4"
      >
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as ApprovalRequestStatus | '');
            setPage(1);
          }}
          options={[{ value: '', label: 'All statuses' }, ...STATUS_OPTIONS]}
          className="h-9 w-48"
        />
        <Input value={module} onChange={(e) => setModule(e.target.value)} placeholder="Module" className="h-9 w-36" />
        <Input value={entityType} onChange={(e) => setEntityType(e.target.value)} placeholder="Entity type" className="h-9 w-36" />
      </FilterBar>

      {requests.isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : requests.isError ? (
        <QueryErrorState refetch={requests.refetch} />
      ) : rows.length === 0 ? (
        <EmptyState title="No approval requests" description="Nothing matches these filters." />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>SLA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r: ApprovalRequest) => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => router.push(`/dashboard/approval-workflow/${r.id}`)}>
                  <TableCell>
                    <p className="text-sm font-medium text-foreground">{r.title}</p>
                    <p className="text-xs text-muted-foreground">{r.module}</p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.entityType} · {r.entityId}
                  </TableCell>
                  <TableCell className="text-sm text-foreground">{r.amount != null ? r.amount.toLocaleString() : '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.riskLevel ?? '—'}</TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.slaDueAt ? formatDistanceToNow(r.slaDueAt) : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination
            page={requests.data?.page ?? page}
            limit={requests.data?.limit ?? limit}
            total={requests.data?.total ?? 0}
            totalPages={requests.data?.totalPages ?? 0}
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
