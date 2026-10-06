export enum FileCategory {
  DOCUMENT = 'DOCUMENT',
  IMAGE = 'IMAGE',
  SPREADSHEET = 'SPREADSHEET',
  PDF = 'PDF',
  EXPORT = 'EXPORT',
  REPORT = 'REPORT',
  GENERATED_ASSET = 'GENERATED_ASSET',
  OTHER = 'OTHER',
}

export enum FileStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  DELETED = 'DELETED',
}

export enum FileAccessPurpose {
  DOWNLOAD = 'DOWNLOAD',
  PREVIEW = 'PREVIEW',
}

export enum FileEvent {
  FILE_UPLOADED = 'file-management.uploaded',
  FILE_DOWNLOADED = 'file-management.downloaded',
  FILE_PREVIEWED = 'file-management.previewed',
  FILE_RENAMED = 'file-management.renamed',
  FILE_MOVED = 'file-management.moved',
  FILE_COPIED = 'file-management.copied',
  FILE_VERSION_ADDED = 'file-management.version_added',
  FILE_ARCHIVED = 'file-management.archived',
  FILE_RESTORED = 'file-management.restored',
  FILE_DELETED = 'file-management.deleted',
  FILE_ACCESS_TOKEN_ISSUED = 'file-management.access_token_issued',
  FILE_QUOTA_EXCEEDED = 'file-management.quota_exceeded',
}

export interface IFileRecord {
  id: string;
  workspaceId: string;
  name: string;
  originalName: string;
  extension?: string | null;
  mimeType: string;
  category: FileCategory;
  sizeBytes: number;
  checksum: string;
  storageProviderKey: string;
  storageReference: string;
  module?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  folderId?: string | null;
  tags: string[];
  version: number;
  status: FileStatus;
  ownerId?: string | null;
  downloadCount: number;
  lastAccessedAt?: Date | null;
  retentionExpiresAt?: Date | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date | null;
  deletedAt?: Date | null;
}

export interface IFileVersionRecord {
  id: string;
  fileId: string;
  workspaceId: string;
  version: number;
  storageProviderKey: string;
  storageReference: string;
  sizeBytes: number;
  checksum: string;
  changeReason?: string | null;
  createdBy?: string | null;
  createdAt: Date;
}

export interface IFileFolder {
  id: string;
  workspaceId: string;
  name: string;
  parentFolderId?: string | null;
  module?: string | null;
  createdBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IFileAccessToken {
  id: string;
  fileId: string;
  workspaceId: string;
  token: string;
  purpose: FileAccessPurpose;
  expiresAt: Date;
  createdBy?: string | null;
  usedCount: number;
  maxUses?: number | null;
  createdAt: Date;
}

export interface IWorkspaceStorageQuota {
  id: string;
  workspaceId: string;
  quotaBytes: number;
  updatedAt: Date;
  createdAt: Date;
}

export interface IFileEventPayload {
  event: FileEvent;
  workspaceId: string;
  fileId?: string;
  folderId?: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
}
