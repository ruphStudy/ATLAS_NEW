import { AiDescriptionStatus, AiProvider, DescriptionSection, GenerationTone } from '../interfaces';

export class AiDescriptionHistoryResponseDto {
  id!: string;
  descriptionId!: string;
  workspaceId!: string;
  fromStatus!: AiDescriptionStatus;
  toStatus!: AiDescriptionStatus;
  version!: number;
  sectionsRegenerated?: DescriptionSection[] | null;
  reason?: string | null;
  changedBy?: string | null;
  snapshotContent?: unknown;
  createdAt!: Date;

  static from(raw: Record<string, unknown>): AiDescriptionHistoryResponseDto {
    const dto = new AiDescriptionHistoryResponseDto();
    dto.id = raw['id'] as string;
    dto.descriptionId = raw['descriptionId'] as string;
    dto.workspaceId = raw['workspaceId'] as string;
    dto.fromStatus = raw['fromStatus'] as AiDescriptionStatus;
    dto.toStatus = raw['toStatus'] as AiDescriptionStatus;
    dto.version = raw['version'] as number;
    dto.sectionsRegenerated = (raw['sectionsRegenerated'] as DescriptionSection[]) ?? null;
    dto.reason = (raw['reason'] as string | null) ?? null;
    dto.changedBy = (raw['changedBy'] as string | null) ?? null;
    dto.snapshotContent = raw['snapshotContent'] ?? null;
    dto.createdAt = raw['createdAt'] as Date;
    return dto;
  }
}

export class AiDescriptionResponseDto {
  id!: string;
  workspaceId!: string;
  catalogProductId!: string;
  status!: AiDescriptionStatus;
  version!: number;
  provider!: AiProvider;
  model?: string | null;
  tone!: GenerationTone;
  language!: string;
  promptTemplateId?: string | null;
  content!: unknown;
  aiQualityScore?: number | null;
  tokensUsed?: number | null;
  generationCostUsd?: number | null;
  errorMessage?: string | null;
  failedAt?: Date | null;
  generationStartedAt?: Date | null;
  generationCompletedAt?: Date | null;
  createdAt!: Date;
  updatedAt!: Date;

  static from(raw: Record<string, unknown>): AiDescriptionResponseDto {
    const dto = new AiDescriptionResponseDto();
    dto.id = raw['id'] as string;
    dto.workspaceId = raw['workspaceId'] as string;
    dto.catalogProductId = raw['catalogProductId'] as string;
    dto.status = raw['status'] as AiDescriptionStatus;
    dto.version = raw['version'] as number;
    dto.provider = raw['provider'] as AiProvider;
    dto.model = (raw['model'] as string | null) ?? null;
    dto.tone = raw['tone'] as GenerationTone;
    dto.language = raw['language'] as string;
    dto.promptTemplateId = (raw['promptTemplateId'] as string | null) ?? null;
    dto.content = raw['content'] ?? {};
    dto.aiQualityScore = (raw['aiQualityScore'] as number | null) ?? null;
    dto.tokensUsed = (raw['tokensUsed'] as number | null) ?? null;
    dto.generationCostUsd = (raw['generationCostUsd'] as number | null) ?? null;
    dto.errorMessage = (raw['errorMessage'] as string | null) ?? null;
    dto.failedAt = (raw['failedAt'] as Date | null) ?? null;
    dto.generationStartedAt = (raw['generationStartedAt'] as Date | null) ?? null;
    dto.generationCompletedAt = (raw['generationCompletedAt'] as Date | null) ?? null;
    dto.createdAt = raw['createdAt'] as Date;
    dto.updatedAt = raw['updatedAt'] as Date;
    return dto;
  }
}

export class AiDescriptionListResponseDto {
  data!: AiDescriptionResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;

  static from(
    items: Record<string, unknown>[],
    total: number,
    page: number,
    limit: number,
  ): AiDescriptionListResponseDto {
    const dto = new AiDescriptionListResponseDto();
    dto.data = items.map(AiDescriptionResponseDto.from);
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    dto.totalPages = Math.ceil(total / limit);
    return dto;
  }
}

export class AiDescriptionStatsDto {
  total!: number;
  byStatus!: Record<string, number>;
  byProvider!: Record<string, number>;
  byTone!: Record<string, number>;
  averageQualityScore!: number;
  totalTokensUsed!: number;
  totalCostUsd!: number;
}
