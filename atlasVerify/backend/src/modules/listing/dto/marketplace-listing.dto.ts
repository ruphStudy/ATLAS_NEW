import { IsString, IsOptional, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '@common/dto/pagination.dto';
import { MarketplaceListingStatus } from '../interfaces';

export class TransformToMarketplaceDto {
  @IsString()
  marketplaceKey!: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsBoolean()
  isDryRun?: boolean;
}

export class TransformToMultipleMarketplacesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransformToMarketplaceDto)
  targets!: TransformToMarketplaceDto[];
}

export class MarketplaceListingFilterDto extends PaginationDto {
  @IsOptional()
  @IsString()
  universalListingId?: string;

  @IsOptional()
  @IsString()
  marketplaceKey?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class MarketplaceListingResponseDto {
  id!: string;
  workspaceId!: string;
  universalListingId!: string;
  catalogProductId!: string;
  marketplaceKey!: string;
  country!: string;
  status!: MarketplaceListingStatus;
  version!: number;
  schemaId?: string | null;
  schemaVersion?: string | null;
  transformedPayload?: Record<string, unknown> | null;
  fieldTrace?: unknown[] | null;
  warnings?: unknown[] | null;
  errors?: unknown[] | null;
  readinessScore?: number | null;
  readinessStatus?: string | null;
  validationResult?: Record<string, unknown> | null;
  isDryRun!: boolean;
  errorMessage?: string | null;
  externalListingId?: string | null;
  publishedAt?: Date | null;
  createdAt!: Date;
  updatedAt!: Date;

  static from(raw: Record<string, unknown>): MarketplaceListingResponseDto {
    const dto = new MarketplaceListingResponseDto();
    dto.id = raw['id'] as string;
    dto.workspaceId = raw['workspaceId'] as string;
    dto.universalListingId = raw['universalListingId'] as string;
    dto.catalogProductId = raw['catalogProductId'] as string;
    dto.marketplaceKey = raw['marketplaceKey'] as string;
    dto.country = (raw['country'] as string) ?? 'GLOBAL';
    dto.status = raw['status'] as MarketplaceListingStatus;
    dto.version = raw['version'] as number;
    dto.schemaId = (raw['schemaId'] as string | null) ?? null;
    dto.schemaVersion = (raw['schemaVersion'] as string | null) ?? null;
    dto.transformedPayload = (raw['transformedPayload'] as Record<string, unknown> | null) ?? null;
    dto.fieldTrace = (raw['fieldTrace'] as unknown[] | null) ?? null;
    dto.warnings = (raw['warnings'] as unknown[] | null) ?? null;
    dto.errors = (raw['errors'] as unknown[] | null) ?? null;
    dto.readinessScore = (raw['readinessScore'] as number | null) ?? null;
    dto.readinessStatus = (raw['readinessStatus'] as string | null) ?? null;
    dto.validationResult = (raw['validationResult'] as Record<string, unknown> | null) ?? null;
    dto.isDryRun = (raw['isDryRun'] as boolean) ?? false;
    dto.errorMessage = (raw['errorMessage'] as string | null) ?? null;
    dto.externalListingId = (raw['externalListingId'] as string | null) ?? null;
    dto.publishedAt = (raw['publishedAt'] as Date | null) ?? null;
    dto.createdAt = raw['createdAt'] as Date;
    dto.updatedAt = raw['updatedAt'] as Date;
    return dto;
  }
}
