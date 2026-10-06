'use client';

import { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FilterBar } from '@/components/ui/filter-bar';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/states';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/action-menu';
import {
  useApproveTaxRule,
  useArchiveTaxRule,
  useCreateTaxRule,
  usePublishTaxRule,
  useRegisterJurisdiction,
  useSubmitTaxRuleForApproval,
  useTaxCalculationRecords,
  useTaxJurisdiction,
  useTaxJurisdictions,
  useTaxRule,
  useTaxRuleHistory,
  useTaxRules,
  useUpdateJurisdiction,
} from '@/hooks';
import { formatDate } from '@/lib/utils';
import type { CalculationMode, CreateJurisdictionPayload, CreateTaxRulePayload, JurisdictionLevel, TaxRuleStatus, TaxTransactionType, TaxType } from '@/types';

const TAX_TYPE_OPTIONS: { value: TaxType; label: string }[] = [
  { value: 'SALES_TAX', label: 'Sales tax' },
  { value: 'GST', label: 'GST' },
  { value: 'VAT', label: 'VAT' },
  { value: 'SERVICE_TAX', label: 'Service tax' },
  { value: 'WITHHOLDING', label: 'Withholding' },
  { value: 'CUSTOM', label: 'Custom' },
];

const JURISDICTION_LEVEL_OPTIONS: { value: JurisdictionLevel; label: string }[] = [
  { value: 'COUNTRY', label: 'Country' },
  { value: 'STATE', label: 'State' },
  { value: 'REGION', label: 'Region' },
  { value: 'CITY', label: 'City' },
];

const RULE_STATUS_OPTIONS: { value: TaxRuleStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PENDING_APPROVAL', label: 'Pending approval' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'ARCHIVED', label: 'Archived' },
];

export default function TaxPage() {
  return (
    <div>
      <PageHeader title="Tax Engine" description="Manage tax jurisdictions, rules, rates, thresholds and applicability, and review calculation records." />
      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules">Tax Rules</TabsTrigger>
          <TabsTrigger value="jurisdictions">Jurisdictions</TabsTrigger>
          <TabsTrigger value="calculations">Calculation Records</TabsTrigger>
        </TabsList>
        <TabsContent value="rules">
          <RulesTab />
        </TabsContent>
        <TabsContent value="jurisdictions">
          <JurisdictionsTab />
        </TabsContent>
        <TabsContent value="calculations">
          <CalculationsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RulesTab() {
  const [taxType, setTaxType] = useState<TaxType | ''>('');
  const [status, setStatus] = useState<TaxRuleStatus | ''>('');
  const [jurisdictionCode, setJurisdictionCode] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading } = useTaxRules({ taxType: taxType || undefined, status: status || undefined, jurisdictionCode: jurisdictionCode || undefined, page, limit: 20 });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <FilterBar hasActiveFilters={!!taxType || !!status || !!jurisdictionCode} onClearFilters={() => { setTaxType(''); setStatus(''); setJurisdictionCode(''); setPage(1); }}>
          <Select value={taxType} onChange={(e) => { setTaxType(e.target.value as TaxType | ''); setPage(1); }} placeholder="All tax types" options={TAX_TYPE_OPTIONS} className="h-9 w-40" />
          <Select value={status} onChange={(e) => { setStatus(e.target.value as TaxRuleStatus | ''); setPage(1); }} placeholder="All statuses" options={RULE_STATUS_OPTIONS} className="h-9 w-44" />
          <Input value={jurisdictionCode} onChange={(e) => { setJurisdictionCode(e.target.value); setPage(1); }} placeholder="Jurisdiction code" className="h-9 w-40" />
        </FilterBar>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Create rule
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No tax rules found" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rule</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Jurisdiction</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Effective</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((r) => (
                <TableRow key={r.id} clickable onClick={() => setSelectedId(r.id)}>
                  <TableCell className="text-sm font-medium text-foreground">{r.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.taxType}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.jurisdictionCode}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.rate}%</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.priority}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(r.effectiveFrom)}</TableCell>
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

      <CreateTaxRuleDialog open={createOpen} onOpenChange={setCreateOpen} />
      <TaxRuleDetailDialog id={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function CreateTaxRuleDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const create = useCreateTaxRule();
  const [form, setForm] = useState<CreateTaxRulePayload>({
    ruleKey: '',
    name: '',
    taxType: 'SALES_TAX',
    jurisdictionCode: '',
    rate: 0,
    effectiveFrom: new Date().toISOString().slice(0, 10),
  });
  const reset = () => setForm({ ruleKey: '', name: '', taxType: 'SALES_TAX', jurisdictionCode: '', rate: 0, effectiveFrom: new Date().toISOString().slice(0, 10) });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Create tax rule</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Rule key" htmlFor="tr-key" required>
            <Input id="tr-key" value={form.ruleKey} onChange={(e) => setForm((f) => ({ ...f, ruleKey: e.target.value }))} />
          </FormField>
          <FormField label="Name" htmlFor="tr-name" required>
            <Input id="tr-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </FormField>
          <FormField label="Tax type" htmlFor="tr-type" required>
            <Select id="tr-type" value={form.taxType} onChange={(e) => setForm((f) => ({ ...f, taxType: e.target.value as TaxType }))} options={TAX_TYPE_OPTIONS} />
          </FormField>
          <FormField label="Jurisdiction code" htmlFor="tr-jurisdiction" required>
            <Input id="tr-jurisdiction" value={form.jurisdictionCode} onChange={(e) => setForm((f) => ({ ...f, jurisdictionCode: e.target.value }))} />
          </FormField>
          <FormField label="Rate (%)" htmlFor="tr-rate" required>
            <Input id="tr-rate" type="number" step="any" value={form.rate || ''} onChange={(e) => setForm((f) => ({ ...f, rate: Number(e.target.value) }))} />
          </FormField>
          <FormField label="Priority" htmlFor="tr-priority">
            <Input id="tr-priority" type="number" value={form.priority ?? ''} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value ? Number(e.target.value) : undefined }))} />
          </FormField>
          <FormField label="Calculation mode" htmlFor="tr-mode">
            <Select
              id="tr-mode"
              value={form.calculationMode ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, calculationMode: (e.target.value || undefined) as CalculationMode | undefined }))}
              placeholder="Default"
              options={[{ value: 'INCLUSIVE', label: 'Inclusive' }, { value: 'EXCLUSIVE', label: 'Exclusive' }]}
            />
          </FormField>
          <FormField label="Effective from" htmlFor="tr-effective" required>
            <Input id="tr-effective" type="date" value={form.effectiveFrom.slice(0, 10)} onChange={(e) => setForm((f) => ({ ...f, effectiveFrom: e.target.value }))} />
          </FormField>
          <div className="col-span-2 flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-foreground">
              <Checkbox checked={!!form.reverseCharge} onChange={(e) => setForm((f) => ({ ...f, reverseCharge: e.target.checked }))} />
              Reverse charge
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <Checkbox checked={!!form.isCompound} onChange={(e) => setForm((f) => ({ ...f, isCompound: e.target.checked }))} />
              Compound
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => create.mutate(form, { onSuccess: () => { onOpenChange(false); reset(); } })}
            disabled={!form.ruleKey || !form.name || !form.jurisdictionCode || !form.effectiveFrom || create.isPending}
          >
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TaxRuleDetailDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: rule, isLoading } = useTaxRule(id ?? undefined);
  const { data: history } = useTaxRuleHistory(id ?? undefined);
  const submit = useSubmitTaxRuleForApproval(id ?? '');
  const approve = useApproveTaxRule(id ?? '');
  const publish = usePublishTaxRule(id ?? '');
  const archive = useArchiveTaxRule(id ?? '');

  const actions: ActionMenuItem[] = [];
  if (rule) {
    if (rule.status === 'DRAFT') actions.push({ label: 'Submit for approval', onSelect: () => submit.mutate() });
    if (rule.status === 'PENDING_APPROVAL') actions.push({ label: 'Approve', onSelect: () => approve.mutate() });
    if (rule.status === 'APPROVED') actions.push({ label: 'Publish', onSelect: () => publish.mutate() });
    if (rule.status !== 'ARCHIVED') actions.push({ label: 'Archive', onSelect: () => archive.mutate(), destructive: true, separatorBefore: true });
  }

  return (
    <Dialog open={!!id} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>{rule?.name ?? 'Tax rule'}</span>
            {rule && <ActionMenu items={actions} />}
          </DialogTitle>
        </DialogHeader>
        {isLoading || !rule ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <Field label="Rule key" value={rule.ruleKey} />
              <Field label="Tax type" value={String(rule.taxType)} />
              <Field label="Jurisdiction" value={rule.jurisdictionCode} />
              <Field label="Rate" value={`${rule.rate}%`} />
              <Field label="Calculation mode" value={rule.calculationMode} />
              <Field label="Compound" value={rule.isCompound ? 'Yes' : 'No'} />
              <Field label="Reverse charge" value={rule.reverseCharge ? 'Yes' : 'No'} />
              <Field label="Priority" value={String(rule.priority)} />
              <Field label="Status" value={rule.status} />
              <Field label="Version" value={String(rule.version)} />
              <Field label="Effective from" value={formatDate(rule.effectiveFrom)} />
              <Field label="Effective to" value={rule.effectiveTo ? formatDate(rule.effectiveTo) : '—'} />
            </div>
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
    </Dialog>
  );
}

function JurisdictionsTab() {
  const [countryCode, setCountryCode] = useState('');
  const [level, setLevel] = useState<JurisdictionLevel | ''>('');
  const [page, setPage] = useState(1);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading } = useTaxJurisdictions({ countryCode: countryCode || undefined, level: level || undefined, page, limit: 20 });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <FilterBar hasActiveFilters={!!countryCode || !!level} onClearFilters={() => { setCountryCode(''); setLevel(''); setPage(1); }}>
          <Input value={countryCode} onChange={(e) => { setCountryCode(e.target.value.toUpperCase()); setPage(1); }} placeholder="Country code" className="h-9 w-36" />
          <Select value={level} onChange={(e) => { setLevel(e.target.value as JurisdictionLevel | ''); setPage(1); }} placeholder="All levels" options={JURISDICTION_LEVEL_OPTIONS} className="h-9 w-36" />
        </FilterBar>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Register jurisdiction
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No jurisdictions found" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((j) => (
                <TableRow key={j.id} clickable onClick={() => setSelectedCode(j.code)}>
                  <TableCell className="text-sm font-medium text-foreground">{j.code}</TableCell>
                  <TableCell className="text-sm text-foreground">{j.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{j.countryCode}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{j.level}</TableCell>
                  <TableCell>
                    <StatusBadge status={j.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.total > 0 && <Pagination page={page} limit={20} total={data.total} totalPages={Math.ceil(data.total / 20)} onPageChange={setPage} onLimitChange={() => {}} />}
        </>
      )}

      <CreateJurisdictionDialog open={createOpen} onOpenChange={setCreateOpen} />
      <JurisdictionDetailDialog code={selectedCode} onClose={() => setSelectedCode(null)} />
    </div>
  );
}

function CreateJurisdictionDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const register = useRegisterJurisdiction();
  const [form, setForm] = useState<CreateJurisdictionPayload>({ code: '', name: '', countryCode: '' });
  const reset = () => setForm({ code: '', name: '', countryCode: '' });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Register jurisdiction</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Code" htmlFor="j-code" required>
            <Input id="j-code" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} />
          </FormField>
          <FormField label="Country code" htmlFor="j-country" required>
            <Input id="j-country" value={form.countryCode} onChange={(e) => setForm((f) => ({ ...f, countryCode: e.target.value.toUpperCase() }))} />
          </FormField>
          <div className="col-span-2">
            <FormField label="Name" htmlFor="j-name" required>
              <Input id="j-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </FormField>
          </div>
          <FormField label="Level" htmlFor="j-level">
            <Select id="j-level" value={form.level ?? ''} onChange={(e) => setForm((f) => ({ ...f, level: (e.target.value || undefined) as JurisdictionLevel | undefined }))} placeholder="Country" options={JURISDICTION_LEVEL_OPTIONS} />
          </FormField>
          <FormField label="Region" htmlFor="j-region">
            <Input id="j-region" value={form.region ?? ''} onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => register.mutate(form, { onSuccess: () => { onOpenChange(false); reset(); } })} disabled={!form.code || !form.name || !form.countryCode || register.isPending}>
            {register.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Register
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function JurisdictionDetailDialog({ code, onClose }: { code: string | null; onClose: () => void }) {
  const { data: jurisdiction, isLoading } = useTaxJurisdiction(code ?? undefined);
  const update = useUpdateJurisdiction(code ?? '');
  const [name, setName] = useState('');

  return (
    <Dialog open={!!code} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{jurisdiction?.name ?? 'Jurisdiction'}</DialogTitle>
        </DialogHeader>
        {isLoading || !jurisdiction ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <Field label="Code" value={jurisdiction.code} />
              <Field label="Country" value={jurisdiction.countryCode} />
              <Field label="Level" value={jurisdiction.level} />
              <Field label="Region" value={jurisdiction.region ?? '—'} />
              <Field label="Status" value={jurisdiction.status} />
            </div>
            <div className="flex items-end gap-2">
              <FormField label="Rename" htmlFor="j-rename">
                <Input id="j-rename" value={name} onChange={(e) => setName(e.target.value)} className="h-9 w-56" />
              </FormField>
              <Button size="sm" onClick={() => update.mutate({ name }, { onSuccess: () => setName('') })} disabled={!name || update.isPending}>
                Save
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CalculationsTab() {
  const [jurisdictionCode, setJurisdictionCode] = useState('');
  const [transactionType, setTransactionType] = useState<TaxTransactionType | ''>('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useTaxCalculationRecords({ jurisdictionCode: jurisdictionCode || undefined, transactionType: transactionType || undefined, page, limit: 20 });

  return (
    <div>
      <div className="mb-4">
        <FilterBar hasActiveFilters={!!jurisdictionCode || !!transactionType} onClearFilters={() => { setJurisdictionCode(''); setTransactionType(''); setPage(1); }}>
          <Input value={jurisdictionCode} onChange={(e) => { setJurisdictionCode(e.target.value.toUpperCase()); setPage(1); }} placeholder="Jurisdiction code" className="h-9 w-40" />
          <Select
            value={transactionType}
            onChange={(e) => { setTransactionType(e.target.value as TaxTransactionType | ''); setPage(1); }}
            placeholder="All transaction types"
            options={[
              { value: 'PROCUREMENT', label: 'Procurement' },
              { value: 'PRICING', label: 'Pricing' },
              { value: 'ORDER', label: 'Order' },
              { value: 'INVOICE', label: 'Invoice' },
              { value: 'REFUND', label: 'Refund' },
              { value: 'SETTLEMENT', label: 'Settlement' },
              { value: 'SAAS_BILLING', label: 'SaaS billing' },
            ]}
            className="h-9 w-48"
          />
        </FilterBar>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No calculation records found" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction</TableHead>
                <TableHead>Jurisdiction</TableHead>
                <TableHead>Base</TableHead>
                <TableHead>Tax amount</TableHead>
                <TableHead>Reverse charge</TableHead>
                <TableHead>Exempt</TableHead>
                <TableHead>Calculated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((rec) => (
                <TableRow key={rec.id}>
                  <TableCell className="text-sm text-foreground">{rec.transactionType} · {rec.transactionRef}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{rec.jurisdictionCode}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{rec.taxableBase} {rec.currency}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{rec.taxAmount} {rec.currency}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{rec.isReverseCharge ? 'Yes' : 'No'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{rec.isExempt ? 'Yes' : 'No'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(rec.calculatedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.total > 0 && <Pagination page={page} limit={20} total={data.total} totalPages={Math.ceil(data.total / 20)} onPageChange={setPage} onLimitChange={() => {}} />}
        </>
      )}
    </div>
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
