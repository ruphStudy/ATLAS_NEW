export class BackupPolicyResponseDto {
  id!: string;
  workspaceId?: string | null;
  organizationId?: string | null;
  environment!: string;
  service!: string;
  dataType!: string;
  backupType!: string;
  scope!: string;
  frequencyMinutes?: number | null;
  cronExpression?: string | null;
  retentionDays!: number;
  maxVersions?: number | null;
  encryptionEnabled!: boolean;
  compressionEnabled!: boolean;
  preferredProviderKey?: string | null;
  version!: number;
  status!: string;
  metadata: unknown;
  createdAt!: Date;
  updatedAt!: Date;

  static from(raw: Record<string, unknown>): BackupPolicyResponseDto {
    const dto = new BackupPolicyResponseDto();
    Object.assign(dto, raw);
    return dto;
  }
}

export class PaginatedBackupPolicyResponseDto {
  data!: BackupPolicyResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  hasMore!: boolean;

  static from(items: Record<string, unknown>[], total: number, page: number, limit: number): PaginatedBackupPolicyResponseDto {
    const dto = new PaginatedBackupPolicyResponseDto();
    dto.data = items.map((i) => BackupPolicyResponseDto.from(i));
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    dto.hasMore = page * limit < total;
    return dto;
  }
}

export class BackupPolicyHistoryResponseDto {
  id!: string;
  policyId!: string;
  version!: number;
  status!: string;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt!: Date;

  static from(raw: Record<string, unknown>): BackupPolicyHistoryResponseDto {
    const dto = new BackupPolicyHistoryResponseDto();
    Object.assign(dto, raw);
    return dto;
  }
}

export class BackupJobResponseDto {
  id!: string;
  policyId!: string;
  workspaceId?: string | null;
  triggerType!: string;
  triggeredBy?: string | null;
  scope!: string;
  targetType!: string;
  backupType!: string;
  status!: string;
  retryCount!: number;
  maxRetries!: number;
  backupRecordId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  startedAt!: Date;
  endedAt?: Date | null;

  static from(raw: Record<string, unknown>): BackupJobResponseDto {
    const dto = new BackupJobResponseDto();
    Object.assign(dto, raw);
    return dto;
  }
}

export class PaginatedBackupJobResponseDto {
  data!: BackupJobResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  hasMore!: boolean;

  static from(items: Record<string, unknown>[], total: number, page: number, limit: number): PaginatedBackupJobResponseDto {
    const dto = new PaginatedBackupJobResponseDto();
    dto.data = items.map((i) => BackupJobResponseDto.from(i));
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    dto.hasMore = page * limit < total;
    return dto;
  }
}

export class BackupRecordResponseDto {
  id!: string;
  workspaceId?: string | null;
  policyId?: string | null;
  jobId?: string | null;
  targetType!: string;
  backupType!: string;
  providerKey!: string;
  externalRef!: string;
  sizeBytes?: string | null;
  checksum?: string | null;
  version!: number;
  status!: string;
  encryptionEnabled!: boolean;
  compressionEnabled!: boolean;
  integrityStatus!: string;
  restorable!: boolean;
  capturedAt!: Date;
  verifiedAt?: Date | null;
  expiresAt?: Date | null;

  static from(raw: Record<string, unknown>): BackupRecordResponseDto {
    const dto = new BackupRecordResponseDto();
    Object.assign(dto, raw);
    if (typeof raw.sizeBytes === 'bigint') {
      dto.sizeBytes = raw.sizeBytes.toString();
    }
    return dto;
  }
}

export class PaginatedBackupRecordResponseDto {
  data!: BackupRecordResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  hasMore!: boolean;

  static from(items: Record<string, unknown>[], total: number, page: number, limit: number): PaginatedBackupRecordResponseDto {
    const dto = new PaginatedBackupRecordResponseDto();
    dto.data = items.map((i) => BackupRecordResponseDto.from(i));
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    dto.hasMore = page * limit < total;
    return dto;
  }
}
