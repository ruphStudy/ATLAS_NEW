import {
  IsDateString,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  CredentialFilterOptions,
  CredentialStatus,
  IMarketplaceProviderCredential,
} from '../interfaces';

// ── Create / Update ───────────────────────────────────────────

export class CreateCredentialDto {
  @IsString()
  providerKey!: string;

  @IsString()
  credentialSetName!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  accountId?: string;

  @IsString()
  @IsOptional()
  marketplaceKey?: string;

  /**
   * Plain-text field map — encrypted before persistence.
   * Example: { apiKey: 'AKIAXXXXX', secretKey: 'abc123...' }
   */
  @IsObject()
  fields!: Record<string, string>;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}

export class UpdateCredentialDto {
  @IsString()
  @IsOptional()
  credentialSetName?: string;

  @IsString()
  @IsOptional()
  description?: string;

  /** Partial field update — only provided keys will be re-encrypted and updated. */
  @IsObject()
  @IsOptional()
  fields?: Record<string, string>;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}

export class RotateCredentialDto {
  /** Full new plain-text field map to replace all existing fields. */
  @IsObject()
  newFields!: Record<string, string>;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsDateString()
  @IsOptional()
  scheduleAt?: string;
}

export class CredentialFilterDto implements CredentialFilterOptions {
  @IsString()
  @IsOptional()
  providerKey?: string;

  @IsString()
  @IsOptional()
  accountId?: string;

  @IsString()
  @IsOptional()
  marketplaceKey?: string;

  @IsOptional()
  status?: CredentialStatus | CredentialStatus[];

  @IsString()
  @IsOptional()
  search?: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;

  @IsString()
  @IsOptional()
  sortBy?: string;

  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}

// ── Response DTOs ─────────────────────────────────────────────

export class CredentialResponseDto {
  id!: string;
  workspaceId!: string;
  providerKey!: string;
  accountId?: string | null;
  marketplaceKey?: string | null;
  credentialSetName!: string;
  description?: string | null;
  status!: CredentialStatus;
  version!: number;
  publishedVersion?: number | null;
  encryptionVersion!: string;
  expiresAt?: Date | null;
  lastValidatedAt?: Date | null;
  lastRotatedAt?: Date | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  static from(raw: IMarketplaceProviderCredential): CredentialResponseDto {
    const dto = new CredentialResponseDto();
    // encryptedFields is deliberately excluded from the response
    Object.assign(dto, {
      id: raw.id,
      workspaceId: raw.workspaceId,
      providerKey: raw.providerKey,
      accountId: raw.accountId,
      marketplaceKey: raw.marketplaceKey,
      credentialSetName: raw.credentialSetName,
      description: raw.description,
      status: raw.status,
      version: raw.version,
      publishedVersion: raw.publishedVersion,
      encryptionVersion: raw.encryptionVersion,
      expiresAt: raw.expiresAt,
      lastValidatedAt: raw.lastValidatedAt,
      lastRotatedAt: raw.lastRotatedAt,
      createdBy: raw.createdBy,
      updatedBy: raw.updatedBy,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
    return dto;
  }
}

export class PaginatedCredentialResponseDto {
  items!: CredentialResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  hasMore!: boolean;

  static from(
    items: IMarketplaceProviderCredential[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedCredentialResponseDto {
    const dto = new PaginatedCredentialResponseDto();
    dto.items = items.map((i) => CredentialResponseDto.from(i));
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    dto.hasMore = page * limit < total;
    return dto;
  }
}

export class CredentialHistoryResponseDto {
  id!: string;
  credentialId!: string;
  providerKey!: string;
  version!: number;
  status!: CredentialStatus;
  encryptionVersion!: string;
  expiresAt?: Date | null;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt!: Date;

  static from(raw: Record<string, unknown>): CredentialHistoryResponseDto {
    const dto = new CredentialHistoryResponseDto();
    // encryptedFields snapshot is deliberately excluded
    Object.assign(dto, {
      id: raw['id'],
      credentialId: raw['credentialId'],
      providerKey: raw['providerKey'],
      version: raw['version'],
      status: raw['status'],
      encryptionVersion: raw['encryptionVersion'],
      expiresAt: raw['expiresAt'],
      changeReason: raw['changeReason'],
      changedBy: raw['changedBy'],
      createdAt: raw['createdAt'],
    });
    return dto;
  }
}
