'use client';

import { useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { isAxiosError } from 'axios';
import { Check, X, MessageSquareWarning, Archive, ArchiveRestore, RotateCw, Send, Link2, Unlink, Download, Eye } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/ui/form-field';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState, UnauthorizedState } from '@/components/ui/states';
import { ActionMenu } from '@/components/ui/action-menu';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  useApproveDocument,
  useArchiveDocument,
  useAddDocumentComment,
  useDocument,
  useDocumentComments,
  useDocumentHistory,
  useDocumentLinks,
  useDocumentVersions,
  useIssueDocumentAccessToken,
  useLinkDocumentEntity,
  useRejectDocument,
  useRenewDocument,
  useRequestDocumentRevision,
  useRestoreDocument,
  useSubmitDocumentForReview,
  useUnlinkDocumentEntity,
} from '@/hooks';
import { API_URL } from '@/constants';
import { formatDate } from '@/lib/utils';
import type { CreateDocumentPayload } from '@/types';

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1] ?? '');
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: doc, isLoading, isError, error, refetch } = useDocument(id);

  const submit = useSubmitDocumentForReview(id);
  const approve = useApproveDocument(id);
  const reject = useRejectDocument(id);
  const requestRevision = useRequestDocumentRevision(id);
  const archive = useArchiveDocument(id);
  const restore = useRestoreDocument(id);
  const issueToken = useIssueDocumentAccessToken();

  const [dialog, setDialog] = useState<'approve' | 'reject' | 'revision' | null>(null);
  const [dialogText, setDialogText] = useState('');
  const [renewOpen, setRenewOpen] = useState(false);

  const isForbidden = isAxiosError(error) && error.response?.status === 403;
  const isNotFound = isAxiosError(error) && error.response?.status === 404;

  if (isForbidden) return <UnauthorizedState />;
  if (isError) return <QueryErrorState refetch={refetch} description={isNotFound ? 'This document could not be found.' : "We couldn't load this document."} />;
  if (isLoading || !doc) return <Skeleton className="h-96 w-full" />;

  const canSubmit = doc.status === 'DRAFT';
  const canReview = doc.status === 'UNDER_REVIEW';
  const canArchive = doc.status !== 'ARCHIVED';
  const canRestore = doc.status === 'ARCHIVED';
  const canRenew = doc.status === 'APPROVED' || doc.status === 'EXPIRED';

  async function openAccessLink(purpose: 'DOWNLOAD' | 'PREVIEW') {
    const token = await issueToken.mutateAsync({ id, purpose });
    window.open(`${API_URL}/file-management/access/${token.token}`, '_blank');
  }

  return (
    <div>
      <PageHeader
        title={doc.title}
        breadcrumbs={[{ label: 'Documents', href: '/dashboard/documents' }, { label: doc.title }]}
        actions={
          <>
            <StatusBadge status={doc.status} />
            <Button variant="outline" size="sm" onClick={() => openAccessLink('PREVIEW')}>
              <Eye className="h-3.5 w-3.5" />
              Preview
            </Button>
            <Button variant="outline" size="sm" onClick={() => openAccessLink('DOWNLOAD')}>
              <Download className="h-3.5 w-3.5" />
              Download
            </Button>
            <ActionMenu
              items={[
                ...(canSubmit ? [{ label: 'Submit for review', icon: Send, onSelect: () => submit.mutate() }] : []),
                ...(canReview ? [{ label: 'Approve', icon: Check, onSelect: () => setDialog('approve') }] : []),
                ...(canReview ? [{ label: 'Reject', icon: X, onSelect: () => setDialog('reject'), destructive: true }] : []),
                ...(canReview ? [{ label: 'Request revision', icon: MessageSquareWarning, onSelect: () => setDialog('revision') }] : []),
                ...(canRenew ? [{ label: 'Renew', icon: RotateCw, onSelect: () => setRenewOpen(true), separatorBefore: true }] : []),
                ...(canArchive ? [{ label: 'Archive', icon: Archive, onSelect: () => archive.mutate(), separatorBefore: !canRenew }] : []),
                ...(canRestore ? [{ label: 'Restore', icon: ArchiveRestore, onSelect: () => restore.mutate() }] : []),
              ]}
            />
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Field label="Type" value={doc.documentType.toLowerCase().replace('_', ' ')} />
        <Field label="Document number" value={doc.documentNumber ?? '—'} />
        <Field label="Source module" value={doc.sourceModule ?? '—'} />
        <Field label="Entity" value={doc.entityType ? `${doc.entityType} · ${doc.entityId}` : '—'} />
        <Field label="Version" value={`v${doc.version}`} />
        <Field label="Owner" value={doc.ownerId ?? '—'} />
        <Field label="Expires" value={doc.expiresAt ? formatDate(doc.expiresAt) : '—'} />
        <Field label="Updated" value={formatDate(doc.updatedAt)} />
      </div>

      {doc.rejectionReason && (
        <Card className="mb-6 border-danger/40">
          <CardContent className="pt-4 text-sm text-danger">Rejected: {doc.rejectionReason}</CardContent>
        </Card>
      )}
      {doc.revisionNotes && (
        <Card className="mb-6 border-warning/40">
          <CardContent className="pt-4 text-sm text-warning">Revision requested: {doc.revisionNotes}</CardContent>
        </Card>
      )}

      <Tabs defaultValue="history">
        <TabsList>
          <TabsTrigger value="history">Approval History</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
          <TabsTrigger value="links">Entity Links</TabsTrigger>
          <TabsTrigger value="versions">Versions</TabsTrigger>
        </TabsList>
        <TabsContent value="history">
          <HistoryTab id={id} />
        </TabsContent>
        <TabsContent value="comments">
          <CommentsTab id={id} />
        </TabsContent>
        <TabsContent value="links">
          <LinksTab id={id} />
        </TabsContent>
        <TabsContent value="versions">
          <VersionsTab id={id} />
        </TabsContent>
      </Tabs>

      <Dialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{dialog === 'approve' ? 'Approve document' : dialog === 'reject' ? 'Reject document' : 'Request revision'}</DialogTitle>
          </DialogHeader>
          <FormField label={dialog === 'approve' ? 'Comment (optional)' : dialog === 'reject' ? 'Reason' : 'Notes'} htmlFor="doc-action-text" required={dialog !== 'approve'}>
            <Textarea id="doc-action-text" value={dialogText} onChange={(e) => setDialogText(e.target.value)} rows={3} />
          </FormField>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const onSuccess = () => {
                  setDialog(null);
                  setDialogText('');
                };
                if (dialog === 'approve') approve.mutate(dialogText || undefined, { onSuccess });
                else if (dialog === 'reject') reject.mutate(dialogText, { onSuccess });
                else if (dialog === 'revision') requestRevision.mutate(dialogText, { onSuccess });
              }}
              disabled={(dialog !== 'approve' && !dialogText) || approve.isPending || reject.isPending || requestRevision.isPending}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RenewDocumentDialog id={id} title={doc.title} documentType={doc.documentType} open={renewOpen} onOpenChange={setRenewOpen} />
    </div>
  );
}

function RenewDocumentDialog({
  id,
  title,
  documentType,
  open,
  onOpenChange,
}: {
  id: string;
  title: string;
  documentType: CreateDocumentPayload['documentType'];
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const renew = useRenewDocument(id);
  const inputRef = useRef<HTMLInputElement>(null);
  const [expiresAt, setExpiresAt] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  async function handleRenew() {
    if (!selectedFile) return;
    const contentBase64 = await fileToBase64(selectedFile);
    const payload: CreateDocumentPayload = {
      documentType,
      title,
      expiresAt: expiresAt || undefined,
      fileName: selectedFile.name,
      mimeType: selectedFile.type || 'application/octet-stream',
      contentBase64,
    };
    renew.mutate(payload, {
      onSuccess: () => {
        setSelectedFile(null);
        setExpiresAt('');
        if (inputRef.current) inputRef.current.value = '';
        onOpenChange(false);
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Renew document</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <FormField label="New expiry date" htmlFor="renew-expires">
            <Input id="renew-expires" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          </FormField>
          <FormField label="Replacement file" htmlFor="renew-file" required>
            <input
              ref={inputRef}
              id="renew-file"
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
          <Button onClick={handleRenew} disabled={!selectedFile || renew.isPending}>
            Renew
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HistoryTab({ id }: { id: string }) {
  const history = useDocumentHistory(id);
  if (history.isLoading) return <Skeleton className="h-40 w-full" />;
  if (!history.data || history.data.length === 0) return <EmptyState title="No approval history yet" />;

  return (
    <div className="space-y-2">
      {history.data.map((h) => (
        <div key={h.id} className="rounded-[var(--radius)] border border-border p-3 text-sm">
          <p className="text-foreground">
            {h.fromStatus.toLowerCase()} → {h.toStatus.toLowerCase()}
          </p>
          {h.reason && <p className="mt-1 text-muted-foreground">{h.reason}</p>}
          <p className="mt-1 text-xs text-muted-foreground">
            {h.changedBy ?? 'System'} · {formatDate(h.createdAt)}
          </p>
        </div>
      ))}
    </div>
  );
}

function CommentsTab({ id }: { id: string }) {
  const comments = useDocumentComments(id);
  const addComment = useAddDocumentComment(id);
  const [comment, setComment] = useState('');

  return (
    <div className="space-y-4">
      {comments.isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : !comments.data || comments.data.length === 0 ? (
        <EmptyState title="No comments yet" className="border-none py-6" />
      ) : (
        <div className="space-y-2">
          {comments.data.map((c) => (
            <div key={c.id} className="rounded-[var(--radius)] border border-border p-3 text-sm">
              <p className="text-foreground">{c.comment}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {c.authorId ?? 'Unknown'} · {formatDate(c.createdAt)}
              </p>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment…" rows={2} />
      </div>
      <Button size="sm" variant="outline" onClick={() => addComment.mutate(comment, { onSuccess: () => setComment('') })} disabled={!comment || addComment.isPending}>
        Post comment
      </Button>
    </div>
  );
}

function LinksTab({ id }: { id: string }) {
  const links = useDocumentLinks(id);
  const linkEntity = useLinkDocumentEntity(id);
  const unlinkEntity = useUnlinkDocumentEntity(id);
  const [entityType, setEntityType] = useState('');
  const [entityId, setEntityId] = useState('');

  return (
    <div className="space-y-4">
      {links.isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : !links.data || links.data.length === 0 ? (
        <EmptyState title="No linked entities" className="border-none py-6" />
      ) : (
        <div className="space-y-1.5">
          {links.data.map((l) => (
            <div key={l.id} className="flex items-center justify-between rounded-[var(--radius)] border border-border p-2.5 text-sm">
              <span className="flex items-center gap-2 text-foreground">
                <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                {l.entityType} · {l.entityId}
              </span>
              <button onClick={() => unlinkEntity.mutate({ entityType: l.entityType, entityId: l.entityId })} className="text-muted-foreground hover:text-danger">
                <Unlink className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-end gap-2">
        <FormField label="Entity type" htmlFor="link-entity-type">
          <Input id="link-entity-type" value={entityType} onChange={(e) => setEntityType(e.target.value)} className="h-9 w-40" />
        </FormField>
        <FormField label="Entity ID" htmlFor="link-entity-id">
          <Input id="link-entity-id" value={entityId} onChange={(e) => setEntityId(e.target.value)} className="h-9 w-48" />
        </FormField>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            linkEntity.mutate({ entityType, entityId }, { onSuccess: () => { setEntityType(''); setEntityId(''); } });
          }}
          disabled={!entityType || !entityId || linkEntity.isPending}
        >
          <Link2 className="h-3.5 w-3.5" />
          Link
        </Button>
      </div>
    </div>
  );
}

function VersionsTab({ id }: { id: string }) {
  const versions = useDocumentVersions(id);
  if (versions.isLoading) return <Skeleton className="h-24 w-full" />;
  if (!versions.data || versions.data.length === 0) return <EmptyState title="No prior versions" />;

  return (
    <div className="space-y-2">
      {versions.data.map((v) => (
        <div key={v.id} className="rounded-[var(--radius)] border border-border p-3 text-sm">
          <p className="text-foreground">Version {v.version}</p>
          <p className="text-xs text-muted-foreground">{formatDate(v.createdAt)}</p>
          {v.changeReason && <p className="mt-1 text-xs text-muted-foreground">{v.changeReason}</p>}
        </div>
      ))}
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
