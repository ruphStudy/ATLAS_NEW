'use client';

import { useMemo, useRef, useState } from 'react';
import { Upload, FolderPlus, Download, Eye, Pencil, FolderInput, Copy, Archive, ArchiveRestore, Trash2, History } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { FilterBar } from '@/components/ui/filter-bar';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState } from '@/components/ui/states';
import { Pagination } from '@/components/ui/pagination';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { ActionMenu } from '@/components/ui/action-menu';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerBody, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import {
  useArchiveFile,
  useBulkArchiveFiles,
  useBulkDeleteFiles,
  useBulkRestoreFiles,
  useCopyFile,
  useCreateFolder,
  useDeleteFile,
  useFileFolders,
  useFileVersions,
  useFiles,
  useIssueFileAccessToken,
  useMoveFile,
  useRenameFile,
  useRestoreFile,
  useStorageQuota,
  useUploadFile,
} from '@/hooks';
import { API_URL } from '@/constants';
import { formatDate } from '@/lib/utils';
import type { FileCategory, FileFilterParams, FileRecord, FileStatus } from '@/types';

const CATEGORY_OPTIONS: { value: FileCategory; label: string }[] = [
  { value: 'DOCUMENT', label: 'Document' },
  { value: 'IMAGE', label: 'Image' },
  { value: 'SPREADSHEET', label: 'Spreadsheet' },
  { value: 'PDF', label: 'PDF' },
  { value: 'EXPORT', label: 'Export' },
  { value: 'REPORT', label: 'Report' },
  { value: 'GENERATED_ASSET', label: 'Generated asset' },
  { value: 'OTHER', label: 'Other' },
];

const STATUS_OPTIONS: { value: FileStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ARCHIVED', label: 'Archived' },
  { value: 'DELETED', label: 'Deleted' },
];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(1)} ${units[i]}`;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] ?? '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function FileManagementPage() {
  const [folderId, setFolderId] = useState<string | undefined>(undefined);
  const [category, setCategory] = useState<FileCategory | ''>('');
  const [status, setStatus] = useState<FileStatus | ''>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [uploadOpen, setUploadOpen] = useState(false);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [versionsFileId, setVersionsFileId] = useState<string | null>(null);

  const params = useMemo<FileFilterParams>(
    () => ({
      folderId,
      category: category || undefined,
      status: status || undefined,
      search: search || undefined,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      page,
      limit,
    }),
    [folderId, category, status, search, page, limit],
  );

  const files = useFiles(params);
  const folders = useFileFolders();
  const quota = useStorageQuota();
  const bulkArchive = useBulkArchiveFiles();
  const bulkRestore = useBulkRestoreFiles();
  const bulkDelete = useBulkDeleteFiles();

  const rows = files.data?.data ?? [];
  const hasActiveFilters = !!(folderId || category || status || search);

  function bulkAction(fn: (ids: string[]) => void) {
    fn(Array.from(selected));
    setSelected(new Set());
  }

  return (
    <div>
      <PageHeader
        title="File Management"
        description={quota.data ? `${formatBytes(quota.data.usedBytes)} of ${formatBytes(quota.data.quotaBytes)} used` : 'Upload, organize and share workspace files.'}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setFolderDialogOpen(true)}>
              <FolderPlus className="h-3.5 w-3.5" />
              New folder
            </Button>
            <Button size="sm" onClick={() => setUploadOpen(true)}>
              <Upload className="h-3.5 w-3.5" />
              Upload
            </Button>
          </>
        }
      />

      <FilterBar
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Search files…"
        hasActiveFilters={hasActiveFilters}
        onClearFilters={() => {
          setFolderId(undefined);
          setCategory('');
          setStatus('');
          setSearch('');
          setPage(1);
        }}
        className="mb-4"
      >
        <Select
          value={folderId ?? ''}
          onChange={(e) => {
            setFolderId(e.target.value || undefined);
            setPage(1);
          }}
          options={[{ value: '', label: 'All folders' }, ...(folders.data ?? []).map((f) => ({ value: f.id, label: f.name }))]}
          className="h-9 w-44"
        />
        <Select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value as FileCategory | '');
            setPage(1);
          }}
          options={[{ value: '', label: 'All categories' }, ...CATEGORY_OPTIONS]}
          className="h-9 w-44"
        />
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as FileStatus | '');
            setPage(1);
          }}
          options={[{ value: '', label: 'All statuses' }, ...STATUS_OPTIONS]}
          className="h-9 w-36"
        />
      </FilterBar>

      {selected.size > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-[var(--radius)] border border-border bg-secondary px-3 py-2">
          <p className="text-sm text-foreground">{selected.size} selected</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => bulkAction((ids) => bulkArchive.mutate(ids))}>
              <Archive className="h-3.5 w-3.5" />
              Archive
            </Button>
            <Button variant="outline" size="sm" onClick={() => bulkAction((ids) => bulkRestore.mutate(ids))}>
              <ArchiveRestore className="h-3.5 w-3.5" />
              Restore
            </Button>
            <Button variant="outline" size="sm" onClick={() => bulkAction((ids) => bulkDelete.mutate(ids))}>
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        </div>
      )}

      {files.isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : files.isError ? (
        <QueryErrorState refetch={files.refetch} />
      ) : rows.length === 0 ? (
        <EmptyState title="No files" description="Upload a file or adjust your filters." />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={rows.length > 0 && rows.every((f) => selected.has(f.id))}
                    onChange={() => setSelected(rows.every((f) => selected.has(f.id)) ? new Set() : new Set(rows.map((f) => f.id)))}
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((f) => (
                <FileRow
                  key={f.id}
                  file={f}
                  selected={selected.has(f.id)}
                  onToggle={() =>
                    setSelected((prev) => {
                      const next = new Set(prev);
                      if (next.has(f.id)) next.delete(f.id);
                      else next.add(f.id);
                      return next;
                    })
                  }
                  folders={folders.data ?? []}
                  onOpenVersions={() => setVersionsFileId(f.id)}
                />
              ))}
            </TableBody>
          </Table>
          <Pagination
            page={files.data?.page ?? page}
            limit={files.data?.limit ?? limit}
            total={files.data?.total ?? 0}
            totalPages={files.data?.totalPages ?? 0}
            onPageChange={setPage}
            onLimitChange={(l) => {
              setLimit(l);
              setPage(1);
            }}
          />
        </>
      )}

      <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} folderId={folderId} />
      <NewFolderDialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen} parentFolderId={folderId} />
      <VersionsDrawer fileId={versionsFileId} onClose={() => setVersionsFileId(null)} />
    </div>
  );
}

function FileRow({
  file,
  selected,
  onToggle,
  folders,
  onOpenVersions,
}: {
  file: FileRecord;
  selected: boolean;
  onToggle: () => void;
  folders: { id: string; name: string }[];
  onOpenVersions: () => void;
}) {
  const renameFile = useRenameFile();
  const moveFile = useMoveFile();
  const copyFile = useCopyFile();
  const archiveFile = useArchiveFile();
  const restoreFile = useRestoreFile();
  const deleteFile = useDeleteFile();
  const issueToken = useIssueFileAccessToken();

  const [renameOpen, setRenameOpen] = useState(false);
  const [newName, setNewName] = useState(file.name);
  const [moveOpen, setMoveOpen] = useState(false);
  const [targetFolder, setTargetFolder] = useState(file.folderId ?? '');

  async function openWithAccessToken(purpose: 'DOWNLOAD' | 'PREVIEW') {
    const token = await issueToken.mutateAsync({ id: file.id, purpose });
    window.open(`${API_URL}/file-management/access/${token.token}`, '_blank');
  }

  return (
    <TableRow>
      <TableCell>
        <Checkbox checked={selected} onChange={onToggle} />
      </TableCell>
      <TableCell>
        <p className="text-sm font-medium text-foreground">{file.name}</p>
        <p className="text-xs text-muted-foreground">{file.mimeType}</p>
      </TableCell>
      <TableCell>
        <Badge variant="secondary" className="text-[10px] capitalize">
          {file.category.toLowerCase().replace('_', ' ')}
        </Badge>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{formatBytes(file.sizeBytes)}</TableCell>
      <TableCell>
        <StatusBadge status={file.status} />
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">v{file.version}</TableCell>
      <TableCell className="text-xs text-muted-foreground">{formatDate(file.updatedAt)}</TableCell>
      <TableCell>
        <ActionMenu
          items={[
            { label: 'Preview', icon: Eye, onSelect: () => openWithAccessToken('PREVIEW') },
            { label: 'Download', icon: Download, onSelect: () => openWithAccessToken('DOWNLOAD') },
            { label: 'Version history', icon: History, onSelect: onOpenVersions },
            { label: 'Rename', icon: Pencil, onSelect: () => setRenameOpen(true), separatorBefore: true },
            { label: 'Move', icon: FolderInput, onSelect: () => setMoveOpen(true) },
            { label: 'Copy', icon: Copy, onSelect: () => copyFile.mutate({ id: file.id }) },
            ...(file.status === 'ARCHIVED'
              ? [{ label: 'Restore', icon: ArchiveRestore, onSelect: () => restoreFile.mutate(file.id), separatorBefore: true }]
              : [{ label: 'Archive', icon: Archive, onSelect: () => archiveFile.mutate(file.id), separatorBefore: true }]),
            { label: 'Delete', icon: Trash2, onSelect: () => deleteFile.mutate(file.id), destructive: true },
          ]}
        />
      </TableCell>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Rename file</DialogTitle>
          </DialogHeader>
          <FormField label="Name" htmlFor="file-rename" required>
            <Input id="file-rename" value={newName} onChange={(e) => setNewName(e.target.value)} />
          </FormField>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => renameFile.mutate({ id: file.id, name: newName }, { onSuccess: () => setRenameOpen(false) })} disabled={!newName || renameFile.isPending}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Move file</DialogTitle>
          </DialogHeader>
          <FormField label="Destination folder" htmlFor="file-move">
            <Select
              id="file-move"
              value={targetFolder}
              onChange={(e) => setTargetFolder(e.target.value)}
              options={[{ value: '', label: 'Workspace root' }, ...folders.map((f) => ({ value: f.id, label: f.name }))]}
            />
          </FormField>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => moveFile.mutate({ id: file.id, folderId: targetFolder || null }, { onSuccess: () => setMoveOpen(false) })} disabled={moveFile.isPending}>
              Move
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TableRow>
  );
}

function UploadDialog({ open, onOpenChange, folderId }: { open: boolean; onOpenChange: (o: boolean) => void; folderId: string | undefined }) {
  const upload = useUploadFile();
  const inputRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState<FileCategory>('DOCUMENT');
  const [tags, setTags] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  async function handleUpload() {
    if (!selectedFile) return;
    const contentBase64 = await fileToBase64(selectedFile);
    upload.mutate(
      {
        fileName: selectedFile.name,
        mimeType: selectedFile.type || 'application/octet-stream',
        contentBase64,
        category,
        folderId,
        tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
      },
      {
        onSuccess: () => {
          setSelectedFile(null);
          setTags('');
          if (inputRef.current) inputRef.current.value = '';
          onOpenChange(false);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Upload file</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <FormField label="File" htmlFor="file-upload-input" required>
            <input
              ref={inputRef}
              id="file-upload-input"
              type="file"
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-foreground file:mr-3 file:rounded-[var(--radius)] file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm"
            />
          </FormField>
          <FormField label="Category" htmlFor="file-upload-category">
            <Select id="file-upload-category" value={category} onChange={(e) => setCategory(e.target.value as FileCategory)} options={CATEGORY_OPTIONS} />
          </FormField>
          <FormField label="Tags (comma-separated)" htmlFor="file-upload-tags">
            <Input id="file-upload-tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g. invoice, q3" />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!selectedFile || upload.isPending}>
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewFolderDialog({ open, onOpenChange, parentFolderId }: { open: boolean; onOpenChange: (o: boolean) => void; parentFolderId: string | undefined }) {
  const createFolder = useCreateFolder();
  const [name, setName] = useState('');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>New folder</DialogTitle>
        </DialogHeader>
        <FormField label="Name" htmlFor="new-folder-name" required>
          <Input id="new-folder-name" value={name} onChange={(e) => setName(e.target.value)} />
        </FormField>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              createFolder.mutate(
                { name, parentFolderId },
                {
                  onSuccess: () => {
                    setName('');
                    onOpenChange(false);
                  },
                },
              )
            }
            disabled={!name || createFolder.isPending}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VersionsDrawer({ fileId, onClose }: { fileId: string | null; onClose: () => void }) {
  const versions = useFileVersions(fileId ?? undefined);

  return (
    <Drawer open={!!fileId} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent size="sm">
        <DrawerHeader>
          <DrawerTitle>Version history</DrawerTitle>
        </DrawerHeader>
        <DrawerBody>
          {versions.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : !versions.data || versions.data.length === 0 ? (
            <EmptyState title="No prior versions" className="border-none py-8" />
          ) : (
            <div className="space-y-2">
              {versions.data.map((v) => (
                <div key={v.id} className="rounded-[var(--radius)] border border-border p-2.5 text-sm">
                  <p className="text-foreground">Version {v.version}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(v.sizeBytes)} · {formatDate(v.createdAt)}
                  </p>
                  {v.changeReason && <p className="mt-1 text-xs text-muted-foreground">{v.changeReason}</p>}
                </div>
              ))}
            </div>
          )}
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
