import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsDate,
  IsObject,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ApiVersion,
  ApiEndpoint,
  QueryMode,
  IApiFilter,
  IApiDimension,
  IApiMetric,
  IApiSort,
  IApiPagination,
  IAsyncOperation,
} from '../interfaces';

export class ApiFilterDto implements IApiFilter {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsString()
  @IsOptional()
  marketplaceId?: string;

  @IsString()
  @IsOptional()
  providerId?: string;

  @IsString()
  @IsOptional()
  accountId?: string;

  @IsString()
  @IsOptional()
  warehouseId?: string;

  @IsString()
  @IsOptional()
  productId?: string;

  @IsString()
  @IsOptional()
  supplierId?: string;

  @IsString()
  @IsOptional()
  countryCode?: string;

  @IsString()
  @IsOptional()
  currencyCode?: string;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  startDate?: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  endDate?: Date;
}

export class ApiDimensionDto implements IApiDimension {
  @IsString()
  @IsNotEmpty()
  field!: string;

  @IsString()
  @IsOptional()
  alias?: string;

  @IsBoolean()
  @IsOptional()
  groupBy?: boolean;
}

export class ApiMetricDto implements IApiMetric {
  @IsString()
  @IsNotEmpty()
  field!: string;

  @IsEnum(['sum', 'avg', 'count', 'min', 'max'])
  @IsNotEmpty()
  aggregation!: 'sum' | 'avg' | 'count' | 'min' | 'max';

  @IsString()
  @IsOptional()
  alias?: string;
}

export class ApiSortDto implements IApiSort {
  @IsString()
  @IsNotEmpty()
  field!: string;

  @IsEnum(['asc', 'desc'])
  @IsNotEmpty()
  order!: 'asc' | 'desc';
}

export class ApiPaginationDto implements IApiPagination {
  @IsNumber()
  @Min(1)
  @IsOptional()
  page: number = 1;

  @IsNumber()
  @Min(1)
  @Max(1000)
  @IsOptional()
  limit: number = 20;

  @IsNumber()
  @Min(0)
  @IsOptional()
  offset?: number;
}

export class DashboardQueryDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsString()
  @IsOptional()
  dashboardId?: string;

  @ValidateNested()
  @Type(() => ApiFilterDto)
  @IsOptional()
  filters?: ApiFilterDto;

  @IsEnum(QueryMode)
  @IsOptional()
  mode?: QueryMode;

  @IsString()
  @IsOptional()
  ifNoneMatch?: string;
}

export class KpiQueryDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsString()
  @IsOptional()
  kpiId?: string;

  @ValidateNested()
  @Type(() => ApiFilterDto)
  @IsOptional()
  filters?: ApiFilterDto;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  kpiKeys?: string[];

  @IsEnum(QueryMode)
  @IsOptional()
  mode?: QueryMode;

  @IsBoolean()
  @IsOptional()
  includeTargets?: boolean;

  @IsBoolean()
  @IsOptional()
  includeTrends?: boolean;
}

export class ReportQueryDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsString()
  @IsOptional()
  reportId?: string;

  @ValidateNested()
  @Type(() => ApiFilterDto)
  @IsOptional()
  filters?: ApiFilterDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApiDimensionDto)
  @IsOptional()
  dimensions?: ApiDimensionDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApiMetricDto)
  @IsOptional()
  metrics?: ApiMetricDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApiSortDto)
  @IsOptional()
  sort?: ApiSortDto[];

  @ValidateNested()
  @Type(() => ApiPaginationDto)
  @IsOptional()
  pagination?: ApiPaginationDto;

  @IsEnum(QueryMode)
  @IsOptional()
  mode?: QueryMode;

  @IsBoolean()
  @IsOptional()
  async?: boolean;
}

export class AnalyticsQueryDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsString()
  @IsNotEmpty()
  analysisType!: string;

  @ValidateNested()
  @Type(() => ApiFilterDto)
  @IsOptional()
  filters?: ApiFilterDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApiDimensionDto)
  @IsOptional()
  dimensions?: ApiDimensionDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApiMetricDto)
  @IsOptional()
  metrics?: ApiMetricDto[];

  @ValidateNested()
  @Type(() => ApiPaginationDto)
  @IsOptional()
  pagination?: ApiPaginationDto;

  @IsEnum(QueryMode)
  @IsOptional()
  mode?: QueryMode;
}

export class ForecastQueryDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsString()
  @IsOptional()
  forecastId?: string;

  @ValidateNested()
  @Type(() => ApiFilterDto)
  @IsOptional()
  filters?: ApiFilterDto;

  @IsString()
  @IsOptional()
  forecastType?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  periodsAhead?: number;
}

export class InsightQueryDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsString()
  @IsOptional()
  insightId?: string;

  @ValidateNested()
  @Type(() => ApiFilterDto)
  @IsOptional()
  filters?: ApiFilterDto;

  @IsString()
  @IsOptional()
  domain?: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  priority?: string;

  @ValidateNested()
  @Type(() => ApiPaginationDto)
  @IsOptional()
  pagination?: ApiPaginationDto;
}

export class ExportRequestDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsEnum(ApiEndpoint)
  @IsNotEmpty()
  endpoint!: ApiEndpoint;

  @IsString()
  @IsNotEmpty()
  resourceId!: string;

  @IsString()
  @IsNotEmpty()
  format!: string;

  @ValidateNested()
  @Type(() => ApiFilterDto)
  @IsOptional()
  filters?: ApiFilterDto;
}

export class AsyncOperationStatusDto {
  @IsString()
  @IsNotEmpty()
  operationId!: string;

  @IsString()
  @IsNotEmpty()
  workspaceId!: string;
}

export class BulkQueryDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsEnum(ApiEndpoint)
  @IsNotEmpty()
  endpoint!: ApiEndpoint;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  resourceIds!: string[];

  @ValidateNested()
  @Type(() => ApiFilterDto)
  @IsOptional()
  filters?: ApiFilterDto;
}

export class DrillDownQueryDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsEnum(ApiEndpoint)
  @IsNotEmpty()
  endpoint!: ApiEndpoint;

  @IsString()
  @IsNotEmpty()
  resourceId!: string;

  @IsString()
  @IsNotEmpty()
  dimension!: string;

  @IsString()
  @IsNotEmpty()
  value!: string;

  @ValidateNested()
  @Type(() => ApiFilterDto)
  @IsOptional()
  filters?: ApiFilterDto;

  @ValidateNested()
  @Type(() => ApiPaginationDto)
  @IsOptional()
  pagination?: ApiPaginationDto;
}

export class AsyncOperationResponseDto implements IAsyncOperation {
  id!: string;
  workspaceId!: string;
  endpoint!: ApiEndpoint;
  status!: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  resultUrl?: string;
  error?: string;
  createdAt!: Date;
  updatedAt!: Date;
  expiresAt!: Date;
}

export class ApiResponseDto<T> {
  version!: ApiVersion;
  data!: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    timestamp: Date;
    etag?: string;
  };
}
