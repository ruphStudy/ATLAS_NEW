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

export class AccountFilterQueryDto {
  workspaceId!: string;
  providerKey?: string;
  marketplaceKey?: string;
  country?: string;
  status?: AccountStatus;
  isDefault?: boolean;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
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
