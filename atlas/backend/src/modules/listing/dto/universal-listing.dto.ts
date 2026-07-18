import { IsString, IsOptional, IsArray, IsEnum } from 'class-validator';
import { ListingSection } from '../interfaces';
import { PaginationDto } from '@common/dto/pagination.dto';

export class CreateUniversalListingDto {
  @IsString()
  catalogProductId!: string;

  @IsOptional()
  @IsString()
  aiDescriptionId?: string;

  @IsOptional()
  @IsString()
  aiImageSetId?: string;

  @IsOptional()
  @IsString()
  aiSeoId?: string;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(ListingSection, { each: true })
  sections?: ListingSection[];
}

export class RegenerateUniversalListingDto {
  @IsArray()
  @IsEnum(ListingSection, { each: true })
  sections!: ListingSection[];

  @IsOptional()
  @IsString()
  aiDescriptionId?: string;

  @IsOptional()
  @IsString()
  aiImageSetId?: string;

  @IsOptional()
  @IsString()
  aiSeoId?: string;
}

export class UniversalListingFilterDto extends PaginationDto {
  @IsOptional()
  @IsString()
  catalogProductId?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class UniversalListingResponseDto {
  id!: string;
  workspaceId!: string;
  catalogProductId!: string;
  status!: string;
  version!: number;
  aiDescriptionId?: string | null;
  aiImageSetId?: string | null;
  aiSeoId?: string | null;
  templateId?: string | null;
  content!: Record<string, unknown>;
  qualityScore?: number | null;
  validationResult?: Record<string, unknown> | null;
  errorMessage?: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  static from(raw: Record<string, unknown>): UniversalListingResponseDto {
    const dto = new UniversalListingResponseDto();
    dto.id = raw['id'] as string;
    dto.workspaceId = raw['workspaceId'] as string;
    dto.catalogProductId = raw['catalogProductId'] as string;
    dto.status = raw['status'] as string;
    dto.version = raw['version'] as number;
    dto.aiDescriptionId = (raw['aiDescriptionId'] as string | null) ?? null;
    dto.aiImageSetId = (raw['aiImageSetId'] as string | null) ?? null;
    dto.aiSeoId = (raw['aiSeoId'] as string | null) ?? null;
    dto.templateId = (raw['templateId'] as string | null) ?? null;
    dto.content = (raw['content'] as Record<string, unknown>) ?? {};
    dto.qualityScore = (raw['qualityScore'] as number | null) ?? null;
    dto.validationResult = (raw['validationResult'] as Record<string, unknown> | null) ?? null;
    dto.errorMessage = (raw['errorMessage'] as string | null) ?? null;
    dto.createdAt = raw['createdAt'] as Date;
    dto.updatedAt = raw['updatedAt'] as Date;
    return dto;
  }
}

export class UniversalListingListResponseDto {
  data!: UniversalListingResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;

  static from(
    items: Record<string, unknown>[],
    total: number,
    page: number,
    limit: number,
  ): UniversalListingListResponseDto {
    const dto = new UniversalListingListResponseDto();
    dto.data = items.map(UniversalListingResponseDto.from);
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    dto.totalPages = Math.ceil(total / limit);
    return dto;
  }
}
