'use client';

import { useState } from 'react';
import { isAxiosError } from 'axios';
import { Loader2, Plus, ScanLine } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FilterBar } from '@/components/ui/filter-bar';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState, UnauthorizedState } from '@/components/ui/states';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  useBarcodes,
  useCreateLabelTemplate,
  useDeactivateBarcode,
  useGenerateBarcode,
  useLabelTemplates,
  usePrintLabel,
  useReplaceBarcode,
  useScanBarcode,
} from '@/hooks';
import type { Barcode, BarcodeEntityType, BarcodeStatus, BarcodeType, LabelSize } from '@/types';

const ENTITY_TYPE_OPTIONS: { value: BarcodeEntityType; label: string }[] = [
  { value: 'SKU', label: 'SKU' },
  { value: 'PRODUCT', label: 'Product' },
  { value: 'VARIANT', label: 'Variant' },
  { value: 'BATCH', label: 'Batch' },
  { value: 'SERIAL', label: 'Serial' },
  { value: 'WAREHOUSE', label: 'Warehouse' },
  { value: 'ZONE', label: 'Zone' },
  { value: 'LOCATION', label: 'Location' },
  { value: 'BIN', label: 'Bin' },
  { value: 'PACKAGE', label: 'Package' },
  { value: 'SHIPMENT', label: 'Shipment' },
];

const BARCODE_TYPE_OPTIONS: { value: BarcodeType; label: string }[] = [
  { value: 'UPC', label: 'UPC' },
  { value: 'EAN', label: 'EAN' },
  { value: 'GTIN', label: 'GTIN' },
  { value: 'CODE_128', label: 'Code 128' },
  { value: 'CODE_39', label: 'Code 39' },
  { value: 'QR', label: 'QR' },
  { value: 'CUSTOM', label: 'Custom' },
];

const STATUS_OPTIONS: { value: BarcodeStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'REPLACED', label: 'Replaced' },
  { value: 'DEACTIVATED', label: 'Deactivated' },
];

const LABEL_SIZE_OPTIONS: { value: LabelSize; label: string }[] = [
  { value: 'SMALL', label: 'Small' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LARGE', label: 'Large' },
  { value: 'CUSTOM', label: 'Custom' },
];

export default function BarcodesPage() {
  return (
    <div>
      <PageHeader title="Barcodes & Labels" description="Generate, assign, scan and print barcodes and labels." />
      <Tabs defaultValue="barcodes">
        <TabsList>
          <TabsTrigger value="barcodes">Barcodes</TabsTrigger>
          <TabsTrigger value="scan">Scan</TabsTrigger>
          <TabsTrigger value="templates">Label templates</TabsTrigger>
        </TabsList>
        <TabsContent value="barcodes">
          <BarcodesTab />
        </TabsContent>
        <TabsContent value="scan">
          <ScanTab />
        </TabsContent>
        <TabsContent value="templates">
          <TemplatesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BarcodesTab() {
  const [entityType, setEntityType] = useState<BarcodeEntityType | ''>('');
  const [status, setStatus] = useState<BarcodeStatus | ''>('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [genType, setGenType] = useState<BarcodeType>('CODE_128');
  const [genEntityType, setGenEntityType] = useState<BarcodeEntityType>('SKU');
  const [genEntityId, setGenEntityId] = useState('');

  const { data, isLoading, isError, error, refetch } = useBarcodes({ entityType: entityType || undefined, status: status || undefined, page, limit });
  const generateBarcode = useGenerateBarcode();
  const isForbidden = isAxiosError(error) && error.response?.status === 403;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <FilterBar hasActiveFilters={!!entityType || !!status} onClearFilters={() => { setEntityType(''); setStatus(''); setPage(1); }}>
          <Select value={entityType} onChange={(e) => { setEntityType(e.target.value as BarcodeEntityType | ''); setPage(1); }} placeholder="All entity types" options={ENTITY_TYPE_OPTIONS} className="h-9 w-40" />
          <Select value={status} onChange={(e) => { setStatus(e.target.value as BarcodeStatus | ''); setPage(1); }} placeholder="All statuses" options={STATUS_OPTIONS} className="h-9 w-36" />
        </FilterBar>
        <Button onClick={() => setGenerateOpen(true)}>
          <Plus className="h-4 w-4" />
          Generate barcode
        </Button>
      </div>

      {isForbidden ? (
        <UnauthorizedState />
      ) : isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load barcodes." />
      ) : isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No barcodes yet" description="Generate a barcode for a SKU, batch, bin or other entity." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Value</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((b) => (
              <BarcodeRow key={b.id} barcode={b} />
            ))}
          </TableBody>
        </Table>
      )}

      {data && data.total > 0 && (
        <Pagination page={page} limit={limit} total={data.total} totalPages={Math.ceil(data.total / limit)} onPageChange={setPage} onLimitChange={(l) => { setLimit(l); setPage(1); }} />
      )}

      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Generate barcode</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <FormField label="Barcode type" htmlFor="gen-type" required>
              <Select id="gen-type" value={genType} onChange={(e) => setGenType(e.target.value as BarcodeType)} options={BARCODE_TYPE_OPTIONS} />
            </FormField>
            <FormField label="Entity type" htmlFor="gen-entity-type" required>
              <Select id="gen-entity-type" value={genEntityType} onChange={(e) => setGenEntityType(e.target.value as BarcodeEntityType)} options={ENTITY_TYPE_OPTIONS} />
            </FormField>
            <FormField label="Entity ID" htmlFor="gen-entity-id" required>
              <Input id="gen-entity-id" value={genEntityId} onChange={(e) => setGenEntityId(e.target.value)} />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => generateBarcode.mutate({ type: genType, entityType: genEntityType, entityId: genEntityId }, { onSuccess: () => { setGenerateOpen(false); setGenEntityId(''); } })}
              disabled={!genEntityId || generateBarcode.isPending}
            >
              {generateBarcode.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BarcodeRow({ barcode }: { barcode: Barcode }) {
  const replaceBarcode = useReplaceBarcode(barcode.id);
  const deactivateBarcode = useDeactivateBarcode(barcode.id);
  const printLabel = usePrintLabel();

  return (
    <TableRow>
      <TableCell className="text-sm font-medium text-foreground">{barcode.value}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{barcode.type}</TableCell>
      <TableCell className="text-sm capitalize text-muted-foreground">{barcode.entityType.toLowerCase()} · {barcode.entityId}</TableCell>
      <TableCell>
        <StatusBadge status={barcode.status} />
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => printLabel.mutate({ barcodeId: barcode.id })} disabled={printLabel.isPending}>
            Print
          </Button>
          {barcode.status === 'ACTIVE' && (
            <>
              <Button variant="ghost" size="sm" onClick={() => replaceBarcode.mutate(undefined)} disabled={replaceBarcode.isPending}>
                Replace
              </Button>
              <Button variant="ghost" size="sm" onClick={() => deactivateBarcode.mutate()} disabled={deactivateBarcode.isPending}>
                Deactivate
              </Button>
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

function ScanTab() {
  const [value, setValue] = useState('');
  const scanBarcode = useScanBarcode();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Scan a barcode</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Scan or type a barcode value…" className="flex-1" />
          <Button onClick={() => value && scanBarcode.mutate({ value })} disabled={!value || scanBarcode.isPending}>
            {scanBarcode.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
            Scan
          </Button>
        </div>
        {scanBarcode.data && (
          <div className="rounded-[var(--radius)] border border-border p-3 text-sm">
            <StatusBadge status={scanBarcode.data.result} />
            {scanBarcode.data.barcode && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">Entity type</span>
                <span className="text-foreground">{scanBarcode.data.barcode.entityType}</span>
                <span className="text-muted-foreground">Entity ID</span>
                <span className="text-foreground">{scanBarcode.data.barcode.entityId}</span>
              </div>
            )}
            {scanBarcode.data.message && <p className="mt-2 text-muted-foreground">{scanBarcode.data.message}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TemplatesTab() {
  const { data, isLoading } = useLabelTemplates();
  const createTemplate = useCreateLabelTemplate();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [entityType, setEntityType] = useState<BarcodeEntityType>('SKU');
  const [size, setSize] = useState<LabelSize>('MEDIUM');

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  const templates = data?.items ?? [];

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          New template
        </Button>
      </div>
      {templates.length === 0 ? (
        <EmptyState title="No label templates yet" className="border-none py-8" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <Card key={t.id}>
              <CardHeader>
                <CardTitle className="text-sm">{t.name}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p className="capitalize">{t.entityType.toLowerCase()} · {t.size.toLowerCase()}</p>
                {t.isDefault && <StatusBadge status="DEFAULT" tone="info" className="mt-2" />}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>New label template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <FormField label="Name" htmlFor="tpl-name" required>
              <Input id="tpl-name" value={name} onChange={(e) => setName(e.target.value)} />
            </FormField>
            <FormField label="Entity type" htmlFor="tpl-entity" required>
              <Select id="tpl-entity" value={entityType} onChange={(e) => setEntityType(e.target.value as BarcodeEntityType)} options={ENTITY_TYPE_OPTIONS} />
            </FormField>
            <FormField label="Size" htmlFor="tpl-size" required>
              <Select id="tpl-size" value={size} onChange={(e) => setSize(e.target.value as LabelSize)} options={LABEL_SIZE_OPTIONS} />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createTemplate.mutate({ name, entityType, size }, { onSuccess: () => { setCreateOpen(false); setName(''); } })}
              disabled={!name || createTemplate.isPending}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
