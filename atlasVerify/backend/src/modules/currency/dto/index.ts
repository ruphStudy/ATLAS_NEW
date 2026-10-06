import { CurrencyStatus, ICurrency, IExchangeRate, RateSource, RateStatus, RateType, RoundingMode } from '../interfaces';

// ── Create / Update Currency ──────────────────────────────────────

export class CreateCurrencyDto {
  code!: string;
  name!: string;
  symbol!: string;
  decimals?: number;
  roundingMode?: RoundingMode;
  metadata?: Record<string, unknown>;
}

export class UpdateCurrencyDto {
  name?: string;
  symbol?: string;
  decimals?: number;
  roundingMode?: RoundingMode;
  metadata?: Record<string, unknown>;
  changeReason?: string;
}

// ── Workspace Currency Config ─────────────────────────────────────

export class UpsertWorkspaceCurrencyConfigDto {
  baseCurrency!: string;
  reportingCurrency?: string;
  staleToleranceMinutes?: number;
  configuration?: Record<string, unknown>;
}

// ── Rate Recording ─────────────────────────────────────────────────

export class RecordRateDto {
  baseCurrency!: string;
  quoteCurrency!: string;
  rate!: number;
  rateType?: RateType;
  effectiveAt?: string;
  workspaceId?: string;
  requiresApproval?: boolean;
  metadata?: Record<string, unknown>;
}

export class RefreshRateFromProviderDto {
  providerKey!: string;
  baseCurrency!: string;
  quoteCurrency!: string;
  workspaceId?: string;
  requiresApproval?: boolean;
}

export class ResolveWithFallbackDto {
  baseCurrency!: string;
  quoteCurrency!: string;
  workspaceId?: string;
  requiresApproval?: boolean;
}

// ── Rate Update / Lifecycle ─────────────────────────────────────────

export class UpdateRateDto {
  rate!: number;
  effectiveAt?: string;
  changeReason?: string;
  metadata?: Record<string, unknown>;
}

export class RejectRateDto {
  reason!: string;
}

// ── Bulk Import ───────────────────────────────────────────────────

export class BulkImportRateItemDto {
  baseCurrency!: string;
  quoteCurrency!: string;
  rate!: number;
  rateType?: RateType;
  effectiveAt?: string;
  workspaceId?: string;
  metadata?: Record<string, unknown>;
}

export class BulkImportRatesDto {
  items!: BulkImportRateItemDto[];
  requiresApproval?: boolean;
}

// ── Provider Priority / Fallback ─────────────────────────────────

export class ConfigureProviderPriorityDto {
  providerKey!: string;
  workspaceId?: string;
  isEnabled?: boolean;
  priority?: number;
}

// ── Scheduled Sync ────────────────────────────────────────────────

export class ScheduleRateSyncDto {
  baseCurrency!: string;
  quoteCurrency!: string;
  providerKey!: string;
  workspaceId?: string;
  intervalMs?: number;
}

// ── Conversion ────────────────────────────────────────────────────

export class ConvertAmountDto {
  workspaceId?: string;
  amount!: number;
  fromCurrency!: string;
  toCurrency!: string;
  asOfDate?: string;
  allowStale?: boolean;
}

// ── Filters ───────────────────────────────────────────────────────

export class CurrencyFilterDto {
  code?: string;
  status?: CurrencyStatus;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class ExchangeRateFilterDto {
  baseCurrency?: string;
  quoteCurrency?: string;
  source?: RateSource;
  workspaceId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

// ── Response DTOs ─────────────────────────────────────────────────

export class CurrencyResponseDto {
  id!: string;
  code!: string;
  name!: string;
  symbol!: string;
  decimals!: number;
  roundingMode!: RoundingMode;
  status!: CurrencyStatus;
  version!: number;
  createdAt!: Date;
  updatedAt!: Date;

  static from(currency: ICurrency): CurrencyResponseDto {
    const dto = new CurrencyResponseDto();
    dto.id = currency.id;
    dto.code = currency.code;
    dto.name = currency.name;
    dto.symbol = currency.symbol;
    dto.decimals = currency.decimals;
    dto.roundingMode = currency.roundingMode;
    dto.status = currency.status;
    dto.version = currency.version;
    dto.createdAt = currency.createdAt;
    dto.updatedAt = currency.updatedAt;
    return dto;
  }
}

export class PaginatedCurrencyResponseDto {
  items!: CurrencyResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

export class ExchangeRateResponseDto {
  id!: string;
  baseCurrency!: string;
  quoteCurrency!: string;
  rate!: number;
  rateType!: RateType;
  source!: string;
  providerKey?: string | null;
  effectiveAt!: Date;
  fetchedAt!: Date;
  status!: RateStatus;
  approvedBy?: string | null;
  approvedAt?: Date | null;
  publishedAt?: Date | null;
  isAbnormal!: boolean;
  supersedesId?: string | null;
  version!: number;
  workspaceId?: string | null;
  createdAt!: Date;

  static from(rate: IExchangeRate): ExchangeRateResponseDto {
    const dto = new ExchangeRateResponseDto();
    dto.id = rate.id;
    dto.baseCurrency = rate.baseCurrency;
    dto.quoteCurrency = rate.quoteCurrency;
    dto.rate = rate.rate;
    dto.rateType = rate.rateType;
    dto.source = rate.source as string;
    dto.providerKey = rate.providerKey;
    dto.effectiveAt = rate.effectiveAt;
    dto.fetchedAt = rate.fetchedAt;
    dto.status = rate.status;
    dto.approvedBy = rate.approvedBy;
    dto.approvedAt = rate.approvedAt;
    dto.publishedAt = rate.publishedAt;
    dto.isAbnormal = rate.isAbnormal;
    dto.supersedesId = rate.supersedesId;
    dto.version = rate.version;
    dto.workspaceId = rate.workspaceId;
    dto.createdAt = rate.createdAt;
    return dto;
  }
}
