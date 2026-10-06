import { IsArray, IsBoolean, IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import {
  AdapterCompatibilityStatus,
  AiProviderRolloutState,
  EligibilityScope,
  IAiProviderExpansion,
  IAiProviderExpansionHistory,
} from '../interfaces';

// ── Onboard / Update ─────────────────────────────────────────────

export class OnboardAiProviderDto {
  @IsString()
  providerKey!: string;

  @IsString()
  @IsOptional()
  organizationId?: string;

  @IsString()
  @IsOptional()
  apiVersionLabel?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  backwardCompatibleApiVersions?: string[];

  @IsEnum(EligibilityScope)
  @IsOptional()
  eligibilityScope?: EligibilityScope;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  eligibleWorkspaceIds?: string[];

  @IsObject()
  @IsOptional()
  featureFlags?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  settings?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;

  @IsBoolean()
  @IsOptional()
  isGlobal?: boolean;
}

export class UpdateAiProviderExpansionDto {
  @IsString()
  @IsOptional()
  apiVersionLabel?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  backwardCompatibleApiVersions?: string[];

  @IsEnum(EligibilityScope)
  @IsOptional()
  eligibilityScope?: EligibilityScope;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  eligibleWorkspaceIds?: string[];

  @IsObject()
  @IsOptional()
  featureFlags?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  settings?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  changeReason?: string;
}

export class PromoteRolloutDto {
  @IsEnum(AiProviderRolloutState)
  targetState!: AiProviderRolloutState;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class AiProviderExpansionFilterDto extends PaginationDto {
  @IsString()
  @IsOptional()
  providerKey?: string;

  @IsString()
  @IsOptional()
  organizationId?: string;

  @IsEnum(AiProviderRolloutState)
  @IsOptional()
  rolloutState?: AiProviderRolloutState;

  @IsString()
  @IsOptional()
  search?: string;
}

export class CheckEligibilityDto {
  @IsString()
  workspaceId!: string;
}

// ── Response DTOs ──────────────────────────────────────────────

export class AiProviderExpansionResponseDto {
  id!: string;
  providerKey!: string;
  workspaceId?: string | null;
  organizationId?: string | null;
  rolloutState!: AiProviderRolloutState;
  version!: number;
  apiVersionLabel?: string | null;
  backwardCompatibleApiVersions!: string[];
  eligibilityScope!: EligibilityScope;
  eligibleWorkspaceIds!: string[];
  adapterCompatibilityStatus!: AdapterCompatibilityStatus;
  compatibilityIssues!: string[];
  featureFlags!: Record<string, unknown>;
  onboardedAt?: Date | null;
  betaAt?: Date | null;
  activatedAt?: Date | null;
  deprecatedAt?: Date | null;
  disabledAt?: Date | null;
  settings!: Record<string, unknown>;
  metadata!: Record<string, unknown>;
  createdAt!: Date;
  updatedAt!: Date;

  static from(raw: Record<string, unknown>): AiProviderExpansionResponseDto {
    const dto = new AiProviderExpansionResponseDto();
    Object.assign(dto, {
      id: raw['id'],
      providerKey: raw['providerKey'],
      workspaceId: raw['workspaceId'],
      organizationId: raw['organizationId'],
      rolloutState: raw['rolloutState'],
      version: raw['version'],
      apiVersionLabel: raw['apiVersionLabel'],
      backwardCompatibleApiVersions: raw['backwardCompatibleApiVersions'],
      eligibilityScope: raw['eligibilityScope'],
      eligibleWorkspaceIds: raw['eligibleWorkspaceIds'],
      adapterCompatibilityStatus: raw['adapterCompatibilityStatus'],
      compatibilityIssues: raw['compatibilityIssues'],
      featureFlags: raw['featureFlags'],
      onboardedAt: raw['onboardedAt'],
      betaAt: raw['betaAt'],
      activatedAt: raw['activatedAt'],
      deprecatedAt: raw['deprecatedAt'],
      disabledAt: raw['disabledAt'],
      settings: raw['settings'],
      metadata: raw['metadata'],
      createdAt: raw['createdAt'],
      updatedAt: raw['updatedAt'],
    });
    return dto;
  }
}

export class PaginatedAiProviderExpansionResponseDto {
  data!: AiProviderExpansionResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  hasMore!: boolean;

  static from(items: Record<string, unknown>[], total: number, page: number, limit: number): PaginatedAiProviderExpansionResponseDto {
    const dto = new PaginatedAiProviderExpansionResponseDto();
    dto.data = items.map((i) => AiProviderExpansionResponseDto.from(i));
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    dto.hasMore = page * limit < total;
    return dto;
  }
}

export class AiProviderExpansionHistoryResponseDto {
  id!: string;
  expansionId!: string;
  version!: number;
  rolloutState!: AiProviderRolloutState;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt!: Date;

  static from(entry: IAiProviderExpansionHistory): AiProviderExpansionHistoryResponseDto {
    const dto = new AiProviderExpansionHistoryResponseDto();
    dto.id = entry.id;
    dto.expansionId = entry.expansionId;
    dto.version = entry.version;
    dto.rolloutState = entry.rolloutState;
    dto.changeReason = entry.changeReason;
    dto.changedBy = entry.changedBy;
    dto.createdAt = entry.createdAt;
    return dto;
  }
}
