import { FileCategory, FileStatus, FileAccessPurpose } from '../interfaces';

export class FileResponseDto {
  id: string;
  workspaceId: string;
  name: string;
  originalName: string;
  extension?: string | null;
  mimeType: string;
  category: FileCategory;
  sizeBytes: number;
  checksum: string;
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
}

export class PaginatedFileResponseDto {
  data: FileResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class FileVersionResponseDto {
  id: string;
  fileId: string;
  version: number;
  sizeBytes: number;
  checksum: string;
  changeReason?: string | null;
  createdBy?: string | null;
  createdAt: Date;
}

export class FileFolderResponseDto {
  id: string;
  workspaceId: string;
  name: string;
  parentFolderId?: string | null;
  module?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** `token` is only ever present on the response to the issuance call itself — never returned by any read/list endpoint. */
export class FileAccessTokenResponseDto {
  id: string;
  fileId: string;
  token: string;
  purpose: FileAccessPurpose;
  expiresAt: Date;
  maxUses?: number | null;
  createdAt: Date;
}

export class StorageQuotaResponseDto {
  workspaceId: string;
  quotaBytes: number;
  usedBytes: number;
  availableBytes: number;
}
