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
import {
  useCreateGstVatRegistration,
  useCreateGstVatTaxCode,
  useGstVatRegistration,
  useGstVatRegistrationHistory,
  useGstVatRegistrations,
  useGstVatTaxCodes,
  useGstVatTransactions,
  useUpdateGstVatRegistration,
  useValidateGstVatConfiguration,
} from '@/hooks';
import { formatDate } from '@/lib/utils';
import { useAuthStore } from '@/stores';
import type {
  CreateGstVatRegistrationPayload,
  CreateGstVatTaxCodePayload,
  GstVatDirection,
  GstVatRegistrationStatus,
  TaxTransactionType,
  TaxType,
} from '@/types';

const TAX_TYPE_OPTIONS: { value: TaxType; label: string }[] = [
  { value: 'GST', label: 'GST' },
  { value: 'VAT', label: 'VAT' },
  { value: 'SALES_TAX', label: 'Sales tax' },
  { value: 'SERVICE_TAX', label: 'Service tax' },
  { value: 'WITHHOLDING', label: 'Withholding' },
  { value: 'CUSTOM', label: 'Custom' },
];

const REGISTRATION_STATUS_OPTIONS: { value: GstVatRegistrationStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

function useWorkspaceId() {
  return useAuthStore((s) => s.user?.workspaceId);
}

export default function GstVatPage() {
  return (
    <div>
      <PageHeader title="GST / VAT" description="Manage GST/VAT registrations, tax codes, applied transactions and adjustments." />
      <Tabs defaultValue="registrations">
        <TabsList>
          <TabsTrigger value="registrations">Registrations</TabsTrigger>
          <TabsTrigger value="tax-codes">Tax Codes</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="validate">Apply / Validate</TabsTrigger>
        </TabsList>
        <TabsContent value="registrations">
          <RegistrationsTab />
        </TabsContent>
        <TabsContent value="tax-codes">
          <TaxCodesTab />
        </TabsContent>
        <TabsContent value="transactions">
          <TransactionsTab />
        </TabsContent>
        <TabsContent value="validate">
          <ValidateTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RegistrationsTab() {
  const [taxType, setTaxType] = useState<TaxType | ''>('');
  const [status, setStatus] = useState<GstVatRegistrationStatus | ''>('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading } = useGstVatRegistrations({ taxType: taxType || undefined, status: status || undefined, page, limit: 20 });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <FilterBar hasActiveFilters={!!taxType || !!status} onClearFilters={() => { setTaxType(''); setStatus(''); setPage(1); }}>
          <Select value={taxType} onChange={(e) => { setTaxType(e.target.value as TaxType | ''); setPage(1); }} placeholder="All tax types" options={TAX_TYPE_OPTIONS} className="h-9 w-40" />
          <Select value={status} onChange={(e) => { setStatus(e.target.value as GstVatRegistrationStatus | ''); setPage(1); }} placeholder="All statuses" options={REGISTRATION_STATUS_OPTIONS} className="h-9 w-40" />
        </FilterBar>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          New registration
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No registrations found" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Registration #</TableHead>
                <TableHead>Jurisdiction</TableHead>
                <TableHead>Tax type</TableHead>
                <TableHead>Effective</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((r) => (
                <TableRow key={r.id} clickable onClick={() => setSelectedId(r.id)}>
                  <TableCell className="text-sm font-medium text-foreground">{r.registrationNumber}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.jurisdictionCode}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.taxType}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(r.effectiveFrom)}</TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.total > 0 && <Pagination page={page} limit={20} total={data.total} totalPages={Math.ceil(data.total / 20)} onPageChange={setPage} onLimitChange={() => {}} />}
        </>
      )}

      <CreateRegistrationDialog open={createOpen} onOpenChange={setCreateOpen} />
      <RegistrationDetailDialog id={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function CreateRegistrationDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const workspaceId = useWorkspaceId();
  const create = useCreateGstVatRegistration();
  const [form, setForm] = useState<Omit<CreateGstVatRegistrationPayload, 'workspaceId'>>({
    jurisdictionCode: '',
    taxType: 'GST',
    registrationNumber: '',
    effectiveFrom: new Date().toISOString().slice(0, 10),
  });
  const reset = () => setForm({ jurisdictionCode: '', taxType: 'GST', registrationNumber: '', effectiveFrom: new Date().toISOString().slice(0, 10) });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>New GST/VAT registration</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Jurisdiction code" htmlFor="reg-jurisdiction" required>
            <Input id="reg-jurisdiction" value={form.jurisdictionCode} onChange={(e) => setForm((f) => ({ ...f, jurisdictionCode: e.target.value.toUpperCase() }))} />
          </FormField>
          <FormField label="Tax type" htmlFor="reg-type" required>
            <Select id="reg-type" value={form.taxType} onChange={(e) => setForm((f) => ({ ...f, taxType: e.target.value as TaxType }))} options={TAX_TYPE_OPTIONS} />
          </FormField>
          <div className="col-span-2">
            <FormField label="Registration number" htmlFor="reg-number" required>
              <Input id="reg-number" value={form.registrationNumber} onChange={(e) => setForm((f) => ({ ...f, registrationNumber: e.target.value }))} />
            </FormField>
          </div>
          <FormField label="Effective from" htmlFor="reg-effective" required>
            <Input id="reg-effective" type="date" value={form.effectiveFrom.slice(0, 10)} onChange={(e) => setForm((f) => ({ ...f, effectiveFrom: e.target.value }))} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => workspaceId && create.mutate({ ...form, workspaceId }, { onSuccess: () => { onOpenChange(false); reset(); } })}
            disabled={!workspaceId || !form.jurisdictionCode || !form.registrationNumber || create.isPending}
          >
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RegistrationDetailDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: registration, isLoading } = useGstVatRegistration(id ?? undefined);
  const { data: history } = useGstVatRegistrationHistory(id ?? undefined);
  const update = useUpdateGstVatRegistration(id ?? '');

  return (
    <Dialog open={!!id} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{registration?.registrationNumber ?? 'Registration'}</DialogTitle>
        </DialogHeader>
        {isLoading || !registration ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <Field label="Jurisdiction" value={registration.jurisdictionCode} />
              <Field label="Tax type" value={String(registration.taxType)} />
              <Field label="Status" value={registration.status} />
              <Field label="Effective from" value={formatDate(registration.effectiveFrom)} />
              <Field label="Effective to" value={registration.effectiveTo ? formatDate(registration.effectiveTo) : '—'} />
            </div>
            <div className="flex gap-2">
              {registration.status === 'ACTIVE' && (
                <Button size="sm" variant="outline" onClick={() => update.mutate({ status: 'SUSPENDED' })} disabled={update.isPending}>
                  Suspend
                </Button>
              )}
              {registration.status === 'SUSPENDED' && (
                <Button size="sm" variant="outline" onClick={() => update.mutate({ status: 'ACTIVE' })} disabled={update.isPending}>
                  Reactivate
                </Button>
              )}
              {registration.status !== 'CANCELLED' && (
                <Button size="sm" variant="danger" onClick={() => update.mutate({ status: 'CANCELLED' })} disabled={update.isPending}>
                  Cancel
                </Button>
              )}
            </div>
            {history && history.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">History</p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {history.map((h, i) => (
                    <li key={i}>{JSON.stringify(h)}</li>
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

function TaxCodesTab() {
  const [taxType, setTaxType] = useState<TaxType | ''>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading } = useGstVatTaxCodes({ taxType: taxType || undefined, code: search || undefined, page, limit: 20 });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <FilterBar hasActiveFilters={!!taxType || !!search} onClearFilters={() => { setTaxType(''); setSearch(''); setPage(1); }} searchValue={search} onSearchChange={(v) => { setSearch(v); setPage(1); }}>
          <Select value={taxType} onChange={(e) => { setTaxType(e.target.value as TaxType | ''); setPage(1); }} placeholder="All tax types" options={TAX_TYPE_OPTIONS} className="h-9 w-40" />
        </FilterBar>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Create tax code
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No tax codes found" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Tax type</TableHead>
                <TableHead>Zero-rated</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="text-sm font-medium text-foreground">{t.code}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{t.description}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{t.taxType}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{t.isZeroRated ? 'Yes' : 'No'}</TableCell>
                  <TableCell>
                    <StatusBadge status={t.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.total > 0 && <Pagination page={page} limit={20} total={data.total} totalPages={Math.ceil(data.total / 20)} onPageChange={setPage} onLimitChange={() => {}} />}
        </>
      )}

      <CreateTaxCodeDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function CreateTaxCodeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const create = useCreateGstVatTaxCode();
  const [form, setForm] = useState<CreateGstVatTaxCodePayload>({ code: '', description: '', taxType: 'GST' });
  const reset = () => setForm({ code: '', description: '', taxType: 'GST' });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Create tax code</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <FormField label="Code" htmlFor="tc-code" required>
            <Input id="tc-code" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
          </FormField>
          <FormField label="Description" htmlFor="tc-desc" required>
            <Input id="tc-desc" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </FormField>
          <FormField label="Tax type" htmlFor="tc-type" required>
            <Select id="tc-type" value={form.taxType} onChange={(e) => setForm((f) => ({ ...f, taxType: e.target.value as TaxType }))} options={TAX_TYPE_OPTIONS} />
          </FormField>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <Checkbox checked={!!form.isZeroRated} onChange={(e) => setForm((f) => ({ ...f, isZeroRated: e.target.checked }))} />
            Zero-rated
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => create.mutate(form, { onSuccess: () => { onOpenChange(false); reset(); } })} disabled={!form.code || !form.description || create.isPending}>
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TransactionsTab() {
  const [direction, setDirection] = useState<GstVatDirection | ''>('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useGstVatTransactions({ direction: direction || undefined, page, limit: 20 });

  return (
    <div>
      <div className="mb-4">
        <FilterBar hasActiveFilters={!!direction} onClearFilters={() => { setDirection(''); setPage(1); }}>
          <Select value={direction} onChange={(e) => { setDirection(e.target.value as GstVatDirection | ''); setPage(1); }} placeholder="All directions" options={[{ value: 'INPUT', label: 'Input' }, { value: 'OUTPUT', label: 'Output' }]} className="h-9 w-36" />
        </FilterBar>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No transactions found" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>Treatment</TableHead>
                <TableHead>ITC eligible</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="text-sm text-foreground">{t.transactionType} · {t.transactionRef}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{t.direction}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{t.treatment}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{t.isItcEligible ? `Yes (${t.itcAmount ?? 0})` : 'No'}</TableCell>
                  <TableCell>
                    <StatusBadge status={t.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(t.createdAt)}</TableCell>
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

function ValidateTab() {
  const workspaceId = useWorkspaceId();
  const validate = useValidateGstVatConfiguration();
  const [taxType, setTaxType] = useState<TaxType>('GST');
  const [direction, setDirection] = useState<GstVatDirection>('OUTPUT');
  const [transactionType, setTransactionType] = useState<TaxTransactionType>('ORDER');
  const [destinationJurisdictionCode, setDestinationJurisdictionCode] = useState('');
  const [taxableBase, setTaxableBase] = useState('');
  const [currency, setCurrency] = useState('');

  return (
    <div className="max-w-xl space-y-4">
      <p className="text-sm text-muted-foreground">Validate a GST/VAT configuration without persisting a transaction.</p>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Tax type" htmlFor="v-type">
          <Select id="v-type" value={taxType} onChange={(e) => setTaxType(e.target.value as TaxType)} options={TAX_TYPE_OPTIONS} />
        </FormField>
        <FormField label="Direction" htmlFor="v-direction">
          <Select id="v-direction" value={direction} onChange={(e) => setDirection(e.target.value as GstVatDirection)} options={[{ value: 'INPUT', label: 'Input' }, { value: 'OUTPUT', label: 'Output' }]} />
        </FormField>
        <FormField label="Destination jurisdiction" htmlFor="v-dest" required>
          <Input id="v-dest" value={destinationJurisdictionCode} onChange={(e) => setDestinationJurisdictionCode(e.target.value.toUpperCase())} />
        </FormField>
        <FormField label="Transaction type" htmlFor="v-txn">
          <Select
            id="v-txn"
            value={transactionType}
            onChange={(e) => setTransactionType(e.target.value as TaxTransactionType)}
            options={[
              { value: 'ORDER', label: 'Order' },
              { value: 'INVOICE', label: 'Invoice' },
              { value: 'PROCUREMENT', label: 'Procurement' },
              { value: 'REFUND', label: 'Refund' },
            ]}
          />
        </FormField>
        <FormField label="Taxable base" htmlFor="v-base">
          <Input id="v-base" type="number" value={taxableBase} onChange={(e) => setTaxableBase(e.target.value)} />
        </FormField>
        <FormField label="Currency" htmlFor="v-currency">
          <Input id="v-currency" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} />
        </FormField>
      </div>
      <Button
        onClick={() =>
          workspaceId &&
          validate.mutate({
            workspaceId,
            taxType,
            direction,
            transactionType,
            transactionRef: `validate-${Date.now()}`,
            taxableBase: Number(taxableBase) || 0,
            currency,
            destinationJurisdictionCode,
            persist: false,
          })
        }
        disabled={!workspaceId || !destinationJurisdictionCode || !currency || validate.isPending}
      >
        {validate.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Validate
      </Button>
      {validate.data && (
        <div className="rounded-[var(--radius)] border border-border p-3 text-sm">
          <p className="font-medium text-foreground">{validate.data.valid ? 'Valid configuration' : 'Invalid configuration'}</p>
          {validate.data.issues.map((issue, i) => (
            <p key={i} className="mt-1 text-danger">
              {issue.type}: {issue.message}
            </p>
          ))}
          {validate.data.warnings.map((w, i) => (
            <p key={i} className="mt-1 text-warning">
              {w}
            </p>
          ))}
        </div>
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
