import { ApiPropertyOptional } from '@nestjs/swagger';
import { SeoProvider, SeoSection, SeoStatus } from '../interfaces';

export class SeoHistoryResponseDto {
  id!: string;
  seoId!: string;
  workspaceId!: string;
  fromStatus!: SeoStatus;
  toStatus!: SeoStatus;
  version!: number;
  @ApiPropertyOptional({ enum: SeoSection, isArray: true, nullable: true })
  sectionsOptimized?: SeoSection[] | null;
  reason?: string | null;
  changedBy?: string | null;
  snapshotContent?: unknown;
  createdAt!: Date;

  static from(raw: Record<string, unknown>): SeoHistoryResponseDto {
    const dto = new SeoHistoryResponseDto();
    dto.id = raw['id'] as string;
    dto.seoId = raw['seoId'] as string;
    dto.workspaceId = raw['workspaceId'] as string;
    dto.fromStatus = raw['fromStatus'] as SeoStatus;
    dto.toStatus = raw['toStatus'] as SeoStatus;
    dto.version = raw['version'] as number;
    dto.sectionsOptimized = (raw['sectionsOptimized'] as SeoSection[]) ?? null;
    dto.reason = (raw['reason'] as string | null) ?? null;
    dto.changedBy = (raw['changedBy'] as string | null) ?? null;
    dto.snapshotContent = raw['snapshotContent'] ?? null;
    dto.createdAt = raw['createdAt'] as Date;
    return dto;
  }
}

export class SeoOptimizationResponseDto {
  id!: string;
  workspaceId!: string;
  catalogProductId!: string;
  status!: SeoStatus;
  version!: number;
  provider!: SeoProvider;
  model?: string | null;
  marketplace?: string | null;
  targetKeywords?: string[] | null;
  promptTemplateId?: string | null;
  originalContent?: unknown | null;
  optimizedContent!: unknown;
  analysis?: unknown | null;
  seoScore?: number | null;
  tokensUsed?: number | null;
  optimizationCostUsd?: number | null;
  errorMessage?: string | null;
  failedAt?: Date | null;
  optimizationStartedAt?: Date | null;
  optimizationCompletedAt?: Date | null;
  createdAt!: Date;
  updatedAt!: Date;

  static from(raw: Record<string, unknown>): SeoOptimizationResponseDto {
    const dto = new SeoOptimizationResponseDto();
    dto.id = raw['id'] as string;
    dto.workspaceId = raw['workspaceId'] as string;
    dto.catalogProductId = raw['catalogProductId'] as string;
    dto.status = raw['status'] as SeoStatus;
    dto.version = raw['version'] as number;
    dto.provider = raw['provider'] as SeoProvider;
    dto.model = (raw['model'] as string | null) ?? null;
    dto.marketplace = (raw['marketplace'] as string | null) ?? null;
    dto.targetKeywords = (raw['targetKeywords'] as string[]) ?? null;
    dto.promptTemplateId = (raw['promptTemplateId'] as string | null) ?? null;
    dto.originalContent = raw['originalContent'] ?? null;
    dto.optimizedContent = raw['optimizedContent'] ?? {};
    dto.analysis = raw['analysis'] ?? null;
    dto.seoScore = (raw['seoScore'] as number | null) ?? null;
    dto.tokensUsed = (raw['tokensUsed'] as number | null) ?? null;
    dto.optimizationCostUsd = (raw['optimizationCostUsd'] as number | null) ?? null;
    dto.errorMessage = (raw['errorMessage'] as string | null) ?? null;
    dto.failedAt = (raw['failedAt'] as Date | null) ?? null;
    dto.optimizationStartedAt = (raw['optimizationStartedAt'] as Date | null) ?? null;
    dto.optimizationCompletedAt = (raw['optimizationCompletedAt'] as Date | null) ?? null;
    dto.createdAt = raw['createdAt'] as Date;
    dto.updatedAt = raw['updatedAt'] as Date;
    return dto;
  }
}

export class SeoOptimizationListResponseDto {
  data!: SeoOptimizationResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;

  static from(
    items: Record<string, unknown>[],
    total: number,
    page: number,
    limit: number,
  ): SeoOptimizationListResponseDto {
    const dto = new SeoOptimizationListResponseDto();
    dto.data = items.map(SeoOptimizationResponseDto.from);
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    dto.totalPages = Math.ceil(total / limit);
    return dto;
  }
}

export class SeoStatsDto {
  total!: number;
  byStatus!: Record<string, number>;
  byProvider!: Record<string, number>;
  byMarketplace!: Record<string, number>;
  averageSeoScore!: number;
  totalTokensUsed!: number;
  totalCostUsd!: number;
}
