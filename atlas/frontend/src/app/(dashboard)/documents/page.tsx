'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { FilterBar } from '@/components/ui/filter-bar';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState } from '@/components/ui/states';
import { Pagination } from '@/components/ui/pagination';
import { StatusBadge } from '@/components/ui/status-badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCreateDocument, useDocuments } from '@/hooks';
import { formatDate } from '@/lib/utils';
import type { AtlasDocument, CreateDocumentPayload, DocumentFilterParams, DocumentStatus, DocumentType } from '@/types';

const TYPE_OPTIONS: { value: DocumentType; label: string }[] = [
  { value: 'SUPPLIER', label: 'Supplier' },
  { value: 'PROCUREMENT', label: 'Procurement' },
  { value: 'PURCHASE_ORDER', label: 'Purchase order' },
  { value: 'SHIPMENT', label: 'Shipment' },
  { value: 'QUALITY', label: 'Quality' },
  { value: 'PRODUCT', label: 'Product' },
  { value: 'MARKETPLACE', label: 'Marketplace' },
  { value: 'WAREHOUSE', label: 'Warehouse' },
  { value: 'FINANCE', label: 'Finance' },
  { value: 'SAAS', label: 'SaaS' },
  { value: 'OTHER', label: 'Other' },
];

const STATUS_OPTIONS: { value: DocumentStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'UNDER_REVIEW', label: 'Under review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'ARCHIVED', label: 'Archived' },
];

function isExpiringSoon(expiresAt: string | null | undefined) {
  if (!expiresAt) return false;
  const days = (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return days >= 0 && days <= 30;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1] ?? '');
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function DocumentsPage() {
  const router = useRouter();
  const [documentType, setDocumentType] = useState<DocumentType | ''>('');
  const [status, setStatus] = useState<DocumentStatus | ''>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [createOpen, setCreateOpen] = useState(false);

  const params = useMemo<DocumentFilterParams>(
    () => ({
      documentType: documentType || undefined,
      status: status || undefined,
      search: search || undefined,
      sortOrder: 'desc',
      page,
      limit,
    }),
    [documentType, status, search, page, limit],
  );

  const documents = useDocuments(params);
  const rows = documents.data?.data ?? [];
  const hasActiveFilters = !!(documentType || status || search);

  return (
    <div>
      <PageHeader
        title="Document Management"
        description="Document types, status, versions, approvals, expiry and entity linking."
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            New document
          </Button>
        }
      />

      <FilterBar
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Search documents…"
        hasActiveFilters={hasActiveFilters}
        onClearFilters={() => {
          setDocumentType('');
          setStatus('');
          setSearch('');
          setPage(1);
        }}
        className="mb-4"
      >
        <Select
          value={documentType}
          onChange={(e) => {
            setDocumentType(e.target.value as DocumentType | '');
            setPage(1);
          }}
          options={[{ value: '', label: 'All types' }, ...TYPE_OPTIONS]}
          className="h-9 w-44"
        />
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as DocumentStatus | '');
            setPage(1);
          }}
          options={[{ value: '', label: 'All statuses' }, ...STATUS_OPTIONS]}
          className="h-9 w-40"
        />
      </FilterBar>

      {documents.isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : documents.isError ? (
        <QueryErrorState refetch={documents.refetch} />
      ) : rows.length === 0 ? (
        <EmptyState title="No documents" description="Nothing matches these filters." />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((d: AtlasDocument) => (
                <TableRow key={d.id} className="cursor-pointer" onClick={() => router.push(`/documents/${d.id}`)}>
                  <TableCell>
                    <p className="text-sm font-medium text-foreground">{d.title}</p>
                    <p className="text-xs text-muted-foreground">{d.documentNumber ?? '—'}</p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground capitalize">{d.documentType.toLowerCase().replace('_', ' ')}</TableCell>
                  <TableCell>
                    <StatusBadge status={d.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">v{d.version}</TableCell>
                  <TableCell className="text-xs">
                    {d.expiresAt ? (
                      <span className={isExpiringSoon(d.expiresAt) ? 'flex items-center gap-1 text-warning' : 'text-muted-foreground'}>
                        {isExpiringSoon(d.expiresAt) && <AlertTriangle className="h-3 w-3" />}
                        {formatDate(d.expiresAt)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(d.updatedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination
            page={documents.data?.page ?? page}
            limit={documents.data?.limit ?? limit}
            total={documents.data?.total ?? 0}
            totalPages={documents.data?.totalPages ?? 0}
            onPageChange={setPage}
            onLimitChange={(l) => {
              setLimit(l);
              setPage(1);
            }}
          />
        </>
      )}

      <CreateDocumentDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function CreateDocumentDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const createDocument = useCreateDocument();
  const inputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [documentType, setDocumentType] = useState<DocumentType>('OTHER');
  const [documentNumber, setDocumentNumber] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  function reset() {
    setTitle('');
    setDocumentType('OTHER');
    setDocumentNumber('');
    setExpiresAt('');
    setSelectedFile(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  async function handleCreate() {
    if (!selectedFile) return;
    const contentBase64 = await fileToBase64(selectedFile);
    const payload: CreateDocumentPayload = {
      documentType,
      title,
      documentNumber: documentNumber || undefined,
      expiresAt: expiresAt || undefined,
      fileName: selectedFile.name,
      mimeType: selectedFile.type || 'application/octet-stream',
      contentBase64,
    };
    createDocument.mutate(payload, {
      onSuccess: () => {
        reset();
        onOpenChange(false);
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>New document</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <FormField label="Title" htmlFor="doc-title" required>
            <Input id="doc-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Type" htmlFor="doc-type">
              <Select id="doc-type" value={documentType} onChange={(e) => setDocumentType(e.target.value as DocumentType)} options={TYPE_OPTIONS} />
            </FormField>
            <FormField label="Document number" htmlFor="doc-number">
              <Input id="doc-number" value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} />
            </FormField>
          </div>
          <FormField label="Expires on" htmlFor="doc-expires">
            <Input id="doc-expires" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          </FormField>
          <FormField label="File" htmlFor="doc-file" required>
            <input
              ref={inputRef}
              id="doc-file"
              type="file"
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-foreground file:mr-3 file:rounded-[var(--radius)] file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm"
            />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!title || !selectedFile || createDocument.isPending}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
