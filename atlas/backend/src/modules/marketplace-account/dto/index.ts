import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '@common/dto/pagination.dto';
import { AccountStatus, IMarketplaceAccount, IMarketplaceAccountHistory } from '../interfaces';

// ── Request DTOs ──────────────────────────────────────────────

export class CreateAccountRequestDto {
  workspaceId!: string;
  providerKey!: string;
  marketplaceKey!: string;
  accountName!: string;
  externalAccountId!: string;
  sellerId?: string | null;
  merchantId?: string | null;
  country?: string | null;
  region?: string | null;
  currency?: string | null;
  locale?: string | null;
  configurationRef?: string | null;
  credentialRef?: string | null;
  priority?: number;
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
}

export class UpdateAccountRequestDto {
  accountName?: string;
  sellerId?: string | null;
  merchantId?: string | null;
  country?: string | null;
  region?: string | null;
  currency?: string | null;
  locale?: string | null;
  configurationRef?: string | null;
  credentialRef?: string | null;
  priority?: number;
  metadata?: Record<string, unknown> | null;
  updatedBy?: string | null;
  expectedVersion?: number;
}

export class SetPriorityRequestDto {
  priority!: number;
  updatedBy?: string | null;
}

export class StatusTransitionRequestDto {
  reason?: string;
  updatedBy?: string | null;
}

/**
 * Workspace identity is deliberately NOT a field here — the controller
 * resolves it from the authenticated request context (@WorkspaceId()), the
 * same pattern used by every other list endpoint in ATLAS. Never accept it
 * from the client.
 */
export class AccountFilterQueryDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  providerKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  marketplaceKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ enum: AccountStatus })
  @IsOptional()
  @IsEnum(AccountStatus)
  status?: AccountStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

// ── Response DTOs ─────────────────────────────────────────────

export class AccountResponseDto {
  id!: string;
  workspaceId!: string;
  providerKey!: string;
  marketplaceKey!: string;
  accountName!: string;
  externalAccountId!: string;
  sellerId?: string | null;
  merchantId?: string | null;
  country?: string | null;
  region?: string | null;
  currency?: string | null;
  locale?: string | null;
  configurationRef?: string | null;
  // credentialRef intentionally omitted — never expose
  status!: AccountStatus;
  priority!: number;
  isDefault!: boolean;
  lastTestedAt?: Date | null;
  lastTestSuccess?: boolean | null;
  lastTestCorrelationId?: string | null;
  metadata?: Record<string, unknown> | null;
  version!: number;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  static from(account: IMarketplaceAccount): AccountResponseDto {
    const dto = new AccountResponseDto();
    dto.id = account.id;
    dto.workspaceId = account.workspaceId;
    dto.providerKey = account.providerKey;
    dto.marketplaceKey = account.marketplaceKey;
    dto.accountName = account.accountName;
    dto.externalAccountId = account.externalAccountId;
    dto.sellerId = account.sellerId;
    dto.merchantId = account.merchantId;
    dto.country = account.country;
    dto.region = account.region;
    dto.currency = account.currency;
    dto.locale = account.locale;
    dto.configurationRef = account.configurationRef;
    // credentialRef not copied
    dto.status = account.status;
    dto.priority = account.priority;
    dto.isDefault = account.isDefault;
    dto.lastTestedAt = account.lastTestedAt;
    dto.lastTestSuccess = account.lastTestSuccess;
    dto.lastTestCorrelationId = account.lastTestCorrelationId;
    dto.metadata = account.metadata;
    dto.version = account.version;
    dto.createdBy = account.createdBy;
    dto.updatedBy = account.updatedBy;
    dto.createdAt = account.createdAt;
    dto.updatedAt = account.updatedAt;
    return dto;
  }
}

export class PaginatedAccountResponseDto {
  items!: AccountResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}
