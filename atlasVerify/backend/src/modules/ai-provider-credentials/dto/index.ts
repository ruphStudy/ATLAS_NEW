import { IsDateString, IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { CredentialStatus, CredentialType } from '../interfaces';

// ── Create / Update / Rotate / Refresh ────────────────────────
// `fields` carries PLAINTEXT credential material for exactly one request
// cycle — it is encrypted immediately and never echoed back in any
// response DTO below.

export class CreateAiProviderCredentialDto {
  @IsString()
  providerKey!: string;

  @IsString()
  @IsOptional()
  modelId?: string;

  @IsString()
  @IsOptional()
  accountId?: string;

  @IsString()
  credentialSetName!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(CredentialType)
  type!: CredentialType;

  @IsObject()
  fields!: Record<string, string>;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}

export class UpdateAiProviderCredentialDto {
  @IsString()
  @IsOptional()
  credentialSetName?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsOptional()
  fields?: Record<string, string>;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}

export class RotateAiProviderCredentialDto {
  @IsObject()
  fields!: Record<string, string>;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class RefreshAiProviderCredentialDto {
  @IsObject()
  fields!: Record<string, string>;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @IsString()
  @IsOptional()
  reason?: string;
}

// ── Filter ─────────────────────────────────────────────────────

export class AiProviderCredentialFilterDto extends PaginationDto {
  @IsString()
  @IsOptional()
  providerKey?: string;

  @IsString()
  @IsOptional()
  modelId?: string;

  @IsString()
  @IsOptional()
  accountId?: string;

  @IsEnum(CredentialStatus)
  @IsOptional()
  status?: CredentialStatus;

  @IsEnum(CredentialType)
  @IsOptional()
  type?: CredentialType;
}

// ── Response DTOs ──────────────────────────────────────────────
// `encryptedFields` is deliberately excluded — ciphertext blobs never
// leave this module through an API response.

export class AiProviderCredentialResponseDto {
  id!: string;
  workspaceId!: string;
  providerKey!: string;
  modelId?: string | null;
  accountId?: string | null;
  credentialSetName!: string;
  description?: string | null;
  type!: CredentialType;
  status!: CredentialStatus;
  version!: number;
  expiresAt?: Date | null;
  lastValidatedAt?: Date | null;
  lastRotatedAt?: Date | null;
  lastRefreshedAt?: Date | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  static from(raw: Record<string, unknown>): AiProviderCredentialResponseDto {
    const dto = new AiProviderCredentialResponseDto();
    Object.assign(dto, {
      id: raw['id'],
      workspaceId: raw['workspaceId'],
      providerKey: raw['providerKey'],
      modelId: raw['modelId'],
      accountId: raw['accountId'],
      credentialSetName: raw['credentialSetName'],
      description: raw['description'],
      type: raw['type'],
      status: raw['status'],
      version: raw['version'],
      expiresAt: raw['expiresAt'],
      lastValidatedAt: raw['lastValidatedAt'],
      lastRotatedAt: raw['lastRotatedAt'],
      lastRefreshedAt: raw['lastRefreshedAt'],
      createdBy: raw['createdBy'],
      updatedBy: raw['updatedBy'],
      createdAt: raw['createdAt'],
      updatedAt: raw['updatedAt'],
    });
    return dto;
  }
}

export class AiProviderCredentialHistoryResponseDto {
  id!: string;
  credentialId!: string;
  providerKey!: string;
  version!: number;
  status!: CredentialStatus;
  expiresAt?: Date | null;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt!: Date;

  static from(raw: Record<string, unknown>): AiProviderCredentialHistoryResponseDto {
    const dto = new AiProviderCredentialHistoryResponseDto();
    Object.assign(dto, {
      id: raw['id'],
      credentialId: raw['credentialId'],
      providerKey: raw['providerKey'],
      version: raw['version'],
      status: raw['status'],
      expiresAt: raw['expiresAt'],
      changeReason: raw['changeReason'],
      changedBy: raw['changedBy'],
      createdAt: raw['createdAt'],
    });
    return dto;
  }
}

export class PaginatedAiProviderCredentialResponseDto {
  data!: AiProviderCredentialResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  hasMore!: boolean;

  static from(
    items: Record<string, unknown>[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedAiProviderCredentialResponseDto {
    const dto = new PaginatedAiProviderCredentialResponseDto();
    dto.data = items.map((i) => AiProviderCredentialResponseDto.from(i));
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    dto.hasMore = page * limit < total;
    return dto;
  }
}

export class ConnectionValidationResponseDto {
  valid!: boolean;
  checkedAt!: Date;
  message?: string;
  latencyMs?: number;
}
