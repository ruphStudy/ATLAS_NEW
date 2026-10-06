'use client';

import { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FilterBar } from '@/components/ui/filter-bar';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { FormField } from '@/components/ui/form-field';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/states';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/action-menu';
import { ReasonDialog } from '@/components/suppliers/reason-dialog';
import {
  useActivateComplianceRule,
  useArchiveComplianceRule,
  useComplianceRecord,
  useComplianceRecordHistory,
  useComplianceRecords,
  useComplianceRule,
  useComplianceRuleHistory,
  useComplianceRules,
  useCreateComplianceRule,
  useMarkComplianceRecordNonApplicable,
  useOverrideComplianceRecordStatus,
  useReviewComplianceRecord,
  useSubmitComplianceEvidence,
  useWaiveComplianceRecord,
} from '@/hooks';
import { formatDate } from '@/lib/utils';
import type {
  ComplianceAction,
  ComplianceRecordStatus,
  ComplianceRequirementType,
  ComplianceRuleStatus,
  ComplianceSubjectType,
  CreateComplianceRulePayload,
} from '@/types';

const REQUIREMENT_TYPE_OPTIONS: { value: ComplianceRequirementType; label: string }[] = [
  { value: 'REGISTRATION', label: 'Registration' },
  { value: 'LICENSE', label: 'License' },
  { value: 'CERTIFICATION', label: 'Certification' },
  { value: 'DECLARATION', label: 'Declaration' },
  { value: 'DOCUMENT', label: 'Document' },
  { value: 'POLICY', label: 'Policy' },
];

const ACTION_OPTIONS: { value: ComplianceAction; label: string }[] = [
  { value: 'SUPPLIER_APPROVAL', label: 'Supplier approval' },
  { value: 'PROCUREMENT', label: 'Procurement' },
  { value: 'LISTING', label: 'Listing' },
  { value: 'MARKETPLACE_PUBLISHING', label: 'Marketplace publishing' },
  { value: 'WAREHOUSE_OPERATION', label: 'Warehouse operation' },
  { value: 'OTHER', label: 'Other' },
];

const RULE_STATUS_OPTIONS: { value: ComplianceRuleStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const RECORD_STATUS_OPTIONS: { value: ComplianceRecordStatus; label: string }[] = [
  { value: 'REQUIRED', label: 'Required' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'COMPLIANT', label: 'Compliant' },
  { value: 'EXPIRING', label: 'Expiring' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'WAIVED', label: 'Waived' },
  { value: 'NON_APPLICABLE', label: 'Non-applicable' },
];

const RECORD_STATUS_TONE: Record<ComplianceRecordStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  REQUIRED: 'warning',
  PENDING: 'warning',
  COMPLIANT: 'success',
  EXPIRING: 'warning',
  EXPIRED: 'danger',
  REJECTED: 'danger',
  WAIVED: 'neutral',
  NON_APPLICABLE: 'neutral',
};

export default function CompliancePage() {
  return (
    <div>
      <PageHeader title="Compliance" description="Compliance requirement rules, records, evidence, review and waiver/override workflows." />
      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="records">Records</TabsTrigger>
        </TabsList>
        <TabsContent value="rules">
          <RulesTab />
        </TabsContent>
        <TabsContent value="records">
          <RecordsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RulesTab() {
  const [requirementType, setRequirementType] = useState<ComplianceRequirementType | ''>('');
  const [status, setStatus] = useState<ComplianceRuleStatus | ''>('');
  const [countryCode, setCountryCode] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading } = useComplianceRules({ requirementType: requirementType || undefined, status: status || undefined, countryCode: countryCode || undefined, page, limit: 20 });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <FilterBar hasActiveFilters={!!requirementType || !!status || !!countryCode} onClearFilters={() => { setRequirementType(''); setStatus(''); setCountryCode(''); setPage(1); }}>
          <Select value={requirementType} onChange={(e) => { setRequirementType(e.target.value as ComplianceRequirementType | ''); setPage(1); }} placeholder="All types" options={REQUIREMENT_TYPE_OPTIONS} className="h-9 w-40" />
          <Select value={status} onChange={(e) => { setStatus(e.target.value as ComplianceRuleStatus | ''); setPage(1); }} placeholder="All statuses" options={RULE_STATUS_OPTIONS} className="h-9 w-36" />
          <Input value={countryCode} onChange={(e) => { setCountryCode(e.target.value.toUpperCase()); setPage(1); }} placeholder="Country code" className="h-9 w-36" />
        </FilterBar>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Create rule
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No compliance rules found" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rule</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Mandatory</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((r) => (
                <TableRow key={r.id} clickable onClick={() => setSelectedId(r.id)}>
                  <TableCell className="text-sm font-medium text-foreground">{r.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.requirementType}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.countryCode ?? r.marketplaceKey ?? 'Global'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.mandatory ? 'Yes' : 'No'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.priority}</TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.total > 0 && <Pagination page={page} limit={20} total={data.total} totalPages={data.totalPages} onPageChange={setPage} onLimitChange={() => {}} />}
        </>
      )}

      <CreateRuleDialog open={createOpen} onOpenChange={setCreateOpen} />
      <RuleDetailDialog id={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function CreateRuleDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const create = useCreateComplianceRule();
  const [form, setForm] = useState<CreateComplianceRulePayload>({ key: '', name: '', requirementType: 'REGISTRATION', actions: [] });
  const reset = () => setForm({ key: '', name: '', requirementType: 'REGISTRATION', actions: [] });

  const toggleAction = (action: ComplianceAction) => {
    setForm((f) => ({
      ...f,
      actions: f.actions.includes(action) ? f.actions.filter((a) => a !== action) : [...f.actions, action],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Create compliance rule</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Key" htmlFor="cr-key" required>
            <Input id="cr-key" value={form.key} onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))} />
          </FormField>
          <FormField label="Name" htmlFor="cr-name" required>
            <Input id="cr-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </FormField>
          <FormField label="Requirement type" htmlFor="cr-type" required>
            <Select id="cr-type" value={form.requirementType} onChange={(e) => setForm((f) => ({ ...f, requirementType: e.target.value as ComplianceRequirementType }))} options={REQUIREMENT_TYPE_OPTIONS} />
          </FormField>
          <FormField label="Country code" htmlFor="cr-country">
            <Input id="cr-country" value={form.countryCode ?? ''} onChange={(e) => setForm((f) => ({ ...f, countryCode: e.target.value.toUpperCase() }))} />
          </FormField>
          <FormField label="Marketplace key" htmlFor="cr-marketplace">
            <Input id="cr-marketplace" value={form.marketplaceKey ?? ''} onChange={(e) => setForm((f) => ({ ...f, marketplaceKey: e.target.value }))} />
          </FormField>
          <FormField label="Renewal period (days)" htmlFor="cr-renewal">
            <Input id="cr-renewal" type="number" value={form.renewalPeriodDays ?? ''} onChange={(e) => setForm((f) => ({ ...f, renewalPeriodDays: e.target.value ? Number(e.target.value) : undefined }))} />
          </FormField>
          <div className="col-span-2">
            <p className="mb-2 text-sm text-foreground">Applicable actions</p>
            <div className="flex flex-wrap gap-3">
              {ACTION_OPTIONS.map((a) => (
                <label key={a.value} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox checked={form.actions.includes(a.value)} onChange={() => toggleAction(a.value)} />
                  {a.label}
                </label>
              ))}
            </div>
          </div>
          <label className="col-span-2 flex items-center gap-2 text-sm text-foreground">
            <Checkbox checked={!!form.mandatory} onChange={(e) => setForm((f) => ({ ...f, mandatory: e.target.checked }))} />
            Mandatory
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => create.mutate(form, { onSuccess: () => { onOpenChange(false); reset(); } })}
            disabled={!form.key || !form.name || form.actions.length === 0 || create.isPending}
          >
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RuleDetailDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: rule, isLoading } = useComplianceRule(id ?? undefined);
  const { data: history } = useComplianceRuleHistory(id ?? undefined);
  const activate = useActivateComplianceRule(id ?? '');
  const archive = useArchiveComplianceRule(id ?? '');
  const [archiveOpen, setArchiveOpen] = useState(false);

  const actions: ActionMenuItem[] = [];
  if (rule) {
    if (rule.status === 'DRAFT') actions.push({ label: 'Activate', onSelect: () => activate.mutate() });
    if (rule.status !== 'ARCHIVED') actions.push({ label: 'Archive', onSelect: () => setArchiveOpen(true), destructive: true, separatorBefore: true });
  }

  return (
    <Dialog open={!!id} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>{rule?.name ?? 'Rule'}</span>
            {rule && <ActionMenu items={actions} />}
          </DialogTitle>
        </DialogHeader>
        {isLoading || !rule ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <Field label="Key" value={rule.key} />
              <Field label="Requirement type" value={String(rule.requirementType)} />
              <Field label="Country" value={rule.countryCode ?? '—'} />
              <Field label="Marketplace" value={rule.marketplaceKey ?? '—'} />
              <Field label="Mandatory" value={rule.mandatory ? 'Yes' : 'No'} />
              <Field label="Priority" value={String(rule.priority)} />
              <Field label="Status" value={rule.status} />
              <Field label="Version" value={String(rule.version)} />
              <Field label="Renewal period" value={rule.renewalPeriodDays ? `${rule.renewalPeriodDays} days` : '—'} />
            </div>
            {rule.actions.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actions</p>
                <p className="text-sm text-foreground">{rule.actions.join(', ')}</p>
              </div>
            )}
            {rule.exemptionCodes.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Exemption codes</p>
                <p className="text-sm text-foreground">{rule.exemptionCodes.join(', ')}</p>
              </div>
            )}
            {history && history.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">History</p>
                <ul className="space-y-2">
                  {history.map((h) => (
                    <li key={h.id} className="rounded-[var(--radius)] border border-border p-2 text-sm">
                      <span className="font-medium text-foreground">v{h.version} · {h.status}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{formatDate(h.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </DialogContent>
      <ReasonDialog open={archiveOpen} onOpenChange={setArchiveOpen} title="Archive this rule" confirmLabel="Archive" variant="danger" pending={archive.isPending} onSubmit={(reason) => archive.mutate({ reason }, { onSuccess: () => setArchiveOpen(false) })} />
    </Dialog>
  );
}

function RecordsTab() {
  const [subjectType, setSubjectType] = useState<ComplianceSubjectType | ''>('');
  const [status, setStatus] = useState<ComplianceRecordStatus | ''>('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data, isLoading } = useComplianceRecords({ subjectType: subjectType || undefined, status: status || undefined, page, limit: 20 });

  return (
    <div>
      <div className="mb-4">
        <FilterBar hasActiveFilters={!!subjectType || !!status} onClearFilters={() => { setSubjectType(''); setStatus(''); setPage(1); }}>
          <Select
            value={subjectType}
            onChange={(e) => { setSubjectType(e.target.value as ComplianceSubjectType | ''); setPage(1); }}
            placeholder="All subject types"
            options={[
              { value: 'SUPPLIER', label: 'Supplier' },
              { value: 'WAREHOUSE', label: 'Warehouse' },
              { value: 'MARKETPLACE_LISTING', label: 'Marketplace listing' },
              { value: 'PRODUCT', label: 'Product' },
              { value: 'ORGANIZATION', label: 'Organization' },
              { value: 'PROCUREMENT_ORDER', label: 'Procurement order' },
              { value: 'OTHER', label: 'Other' },
            ]}
            className="h-9 w-48"
          />
          <Select value={status} onChange={(e) => { setStatus(e.target.value as ComplianceRecordStatus | ''); setPage(1); }} placeholder="All statuses" options={RECORD_STATUS_OPTIONS} className="h-9 w-40" />
        </FilterBar>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No compliance records found" />
      ) : (
        <>
          <div className="space-y-2">
            {data.data.map((rec) => (
              <div key={rec.id} className="cursor-pointer rounded-[var(--radius)] border border-border p-3 text-sm hover:bg-muted/40" onClick={() => setSelectedId(rec.id)}>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{rec.ruleKey}</span>
                  <StatusBadge status={rec.status} tone={RECORD_STATUS_TONE[rec.status]} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {rec.subjectType} · {rec.subjectId} {rec.expiresAt ? `· expires ${formatDate(rec.expiresAt)}` : ''}
                </p>
              </div>
            ))}
          </div>
          {data.total > 0 && <Pagination page={page} limit={20} total={data.total} totalPages={data.totalPages} onPageChange={setPage} onLimitChange={() => {}} />}
        </>
      )}

      <RecordDetailDialog id={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function RecordDetailDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: record, isLoading } = useComplianceRecord(id ?? undefined);
  const { data: history } = useComplianceRecordHistory(id ?? undefined);
  const submitEvidence = useSubmitComplianceEvidence(id ?? '');
  const review = useReviewComplianceRecord(id ?? '');
  const waive = useWaiveComplianceRecord(id ?? '');
  const markNonApplicable = useMarkComplianceRecordNonApplicable(id ?? '');
  const override = useOverrideComplianceRecordStatus(id ?? '');

  const [evidenceRef, setEvidenceRef] = useState('');
  const [waiveOpen, setWaiveOpen] = useState(false);
  const [naOpen, setNaOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideStatus, setOverrideStatus] = useState<ComplianceRecordStatus>('COMPLIANT');

  const actions: ActionMenuItem[] = [];
  if (record) {
    if (record.status === 'PENDING') {
      actions.push({ label: 'Approve', onSelect: () => review.mutate({ decision: 'APPROVE' }) });
      actions.push({ label: 'Reject', onSelect: () => setRejectOpen(true), destructive: true });
    }
    if (record.status !== 'WAIVED') actions.push({ label: 'Waive', onSelect: () => setWaiveOpen(true) });
    if (record.status !== 'NON_APPLICABLE') actions.push({ label: 'Mark non-applicable', onSelect: () => setNaOpen(true) });
    actions.push({ label: 'Override status', onSelect: () => setOverrideOpen(true), separatorBefore: true });
  }

  return (
    <Dialog open={!!id} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>{record?.ruleKey ?? 'Compliance record'}</span>
            {record && <ActionMenu items={actions} />}
          </DialogTitle>
        </DialogHeader>
        {isLoading || !record ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <Field label="Subject" value={`${record.subjectType} · ${record.subjectId}`} />
              <Field label="Status" value={record.status} />
              <Field label="Reference #" value={record.referenceNumber ?? '—'} />
              <Field label="Issued" value={record.issuedAt ? formatDate(record.issuedAt) : '—'} />
              <Field label="Expires" value={record.expiresAt ? formatDate(record.expiresAt) : '—'} />
              <Field label="Reviewed by" value={record.reviewedBy ?? '—'} />
              <Field label="Override" value={record.isOverride ? 'Yes' : 'No'} />
            </div>
            {record.decisionReason && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Decision reason</p>
                <p className="text-sm text-foreground">{record.decisionReason}</p>
              </div>
            )}
            <div className="flex items-end gap-2">
              <FormField label="Submit evidence reference #" htmlFor="rec-evidence">
                <Input id="rec-evidence" value={evidenceRef} onChange={(e) => setEvidenceRef(e.target.value)} className="h-9 w-56" />
              </FormField>
              <Button size="sm" onClick={() => submitEvidence.mutate({ referenceNumber: evidenceRef }, { onSuccess: () => setEvidenceRef('') })} disabled={!evidenceRef || submitEvidence.isPending}>
                Submit
              </Button>
            </div>
            {history && history.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">History</p>
                <ul className="space-y-2">
                  {history.map((h) => (
                    <li key={h.id} className="rounded-[var(--radius)] border border-border p-2 text-sm">
                      <span className="font-medium text-foreground">{h.fromStatus ?? '—'} → {h.toStatus}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{formatDate(h.createdAt)}</span>
                      {h.reason && <p className="mt-1 text-muted-foreground">{h.reason}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </DialogContent>
      <ReasonDialog open={rejectOpen} onOpenChange={setRejectOpen} title="Reject this record" confirmLabel="Reject" variant="danger" pending={review.isPending} onSubmit={(reason) => review.mutate({ decision: 'REJECT', reason }, { onSuccess: () => setRejectOpen(false) })} />
      <ReasonDialog open={waiveOpen} onOpenChange={setWaiveOpen} title="Waive this requirement" confirmLabel="Waive" pending={waive.isPending} onSubmit={(reason) => waive.mutate({ reason }, { onSuccess: () => setWaiveOpen(false) })} />
      <ReasonDialog open={naOpen} onOpenChange={setNaOpen} title="Mark as non-applicable" confirmLabel="Mark non-applicable" pending={markNonApplicable.isPending} onSubmit={(reason) => markNonApplicable.mutate({ reason }, { onSuccess: () => setNaOpen(false) })} />

      <Dialog open={overrideOpen} onOpenChange={setOverrideOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Override status</DialogTitle>
          </DialogHeader>
          <FormField label="New status" htmlFor="override-status" required>
            <Select id="override-status" value={overrideStatus} onChange={(e) => setOverrideStatus(e.target.value as ComplianceRecordStatus)} options={RECORD_STATUS_OPTIONS} />
          </FormField>
          <ReasonInline
            pending={override.isPending}
            onSubmit={(reason) => override.mutate({ status: overrideStatus, reason }, { onSuccess: () => setOverrideOpen(false) })}
            onCancel={() => setOverrideOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

function ReasonInline({ pending, onSubmit, onCancel }: { pending?: boolean; onSubmit: (reason: string) => void; onCancel: () => void }) {
  const [reason, setReason] = useState('');
  return (
    <>
      <FormField label="Reason" htmlFor="override-reason" required>
        <Input id="override-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
      </FormField>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={() => onSubmit(reason)} disabled={!reason.trim() || pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Override
        </Button>
      </DialogFooter>
    </>
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
