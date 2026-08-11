import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsBoolean, IsDate, IsArray, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import {
  ReportType,
  ReportStatus,
  ReportDataSource,
  ReportColumnType,
  ReportAggregationType,
  ReportSortDirection,
  ReportFilterOperator,
  IReportDefinition,
  IReportColumn,
  IReportFilter,
  IReportSort,
  IReportGrouping,
  IReportDateRange,
  IReportExecution,
  IReportResult,
  IReportVersion,
  IReportTemplate,
} from '../interfaces';

export class ReportColumnDto implements IReportColumn {
  @IsString()
  @IsNotEmpty()
  columnKey: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(ReportColumnType)
  @IsNotEmpty()
  type: ReportColumnType;

  @IsString()
  @IsNotEmpty()
  sourceKey: string;

  @IsEnum(ReportAggregationType)
  @IsOptional()
  aggregation?: ReportAggregationType;

  @IsString()
  @IsOptional()
  formula?: string;

  @IsNumber()
  @IsOptional()
  width?: number;

  @IsBoolean()
  @IsNotEmpty()
  sortable: boolean;

  @IsBoolean()
  @IsNotEmpty()
  filterable: boolean;

  @IsBoolean()
  @IsNotEmpty()
  visible: boolean;

  @IsNumber()
  @IsNotEmpty()
  order: number;

  @IsObject()
  @IsOptional()
  conditionalFormatting?: {
    rules: Array<{
      condition: string;
      style: Record<string, any>;
    }>;
  };
}

export class ReportFilterDto implements IReportFilter {
  @IsString()
  @IsNotEmpty()
  columnKey: string;

  @IsEnum(ReportFilterOperator)
  @IsNotEmpty()
  operator: ReportFilterOperator;

  @IsNotEmpty()
  value: any;

  @IsOptional()
  value2?: any;
}

export class ReportSortDto implements IReportSort {
  @IsString()
  @IsNotEmpty()
  columnKey: string;

  @IsEnum(ReportSortDirection)
  @IsNotEmpty()
  direction: ReportSortDirection;
}

export class ReportGroupingDto implements IReportGrouping {
  @IsString()
  @IsNotEmpty()
  columnKey: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object)
  aggregations: Array<{
    columnKey: string;
    aggregation: ReportAggregationType;
  }>;
}

export class ReportDateRangeDto implements IReportDateRange {
  @IsDate()
  @Type(() => Date)
  start: Date;

  @IsDate()
  @Type(() => Date)
  end: Date;

  @IsString()
  @IsOptional()
  presetKey?: string;
}

export class CreateReportDefinitionDto {
  @IsString()
  @IsOptional()
  workspaceId?: string;

  @IsString()
  @IsNotEmpty()
  reportKey: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ReportType)
  @IsNotEmpty()
  type: ReportType;

  @IsEnum(ReportDataSource)
  @IsNotEmpty()
  dataSource: ReportDataSource;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReportColumnDto)
  columns: ReportColumnDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReportFilterDto)
  @IsOptional()
  filters?: ReportFilterDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReportSortDto)
  @IsOptional()
  sorting?: ReportSortDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReportGroupingDto)
  @IsOptional()
  grouping?: ReportGroupingDto[];

  @ValidateNested()
  @Type(() => ReportDateRangeDto)
  @IsOptional()
  dateRange?: ReportDateRangeDto;

  @IsNumber()
  @IsOptional()
  limit?: number;

  @IsNumber()
  @IsOptional()
  offset?: number;

  @IsBoolean()
  @IsOptional()
  drillDownEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  cacheEnabled?: boolean;

  @IsNumber()
  @IsOptional()
  cacheTtlMinutes?: number;

  @IsString()
  @IsOptional()
  templateId?: string;

  @IsObject()
  @IsOptional()
  permissions?: {
    roles?: string[];
    userIds?: string[];
  };

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @IsString()
  @IsNotEmpty()
  createdBy: string;
}

export class UpdateReportDefinitionDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReportColumnDto)
  @IsOptional()
  columns?: ReportColumnDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReportFilterDto)
  @IsOptional()
  filters?: ReportFilterDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReportSortDto)
  @IsOptional()
  sorting?: ReportSortDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReportGroupingDto)
  @IsOptional()
  grouping?: ReportGroupingDto[];

  @ValidateNested()
  @Type(() => ReportDateRangeDto)
  @IsOptional()
  dateRange?: ReportDateRangeDto;

  @IsNumber()
  @IsOptional()
  limit?: number;

  @IsNumber()
  @IsOptional()
  offset?: number;

  @IsBoolean()
  @IsOptional()
  drillDownEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  cacheEnabled?: boolean;

  @IsNumber()
  @IsOptional()
  cacheTtlMinutes?: number;

  @IsObject()
  @IsOptional()
  permissions?: {
    roles?: string[];
    userIds?: string[];
  };

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @IsString()
  @IsNotEmpty()
  updatedBy: string;
}

export class ExecuteReportDto {
  @IsString()
  @IsNotEmpty()
  reportDefinitionId: string;

  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReportFilterDto)
  @IsOptional()
  filters?: ReportFilterDto[];

  @ValidateNested()
  @Type(() => ReportDateRangeDto)
  @IsOptional()
  dateRange?: ReportDateRangeDto;

  @IsNumber()
  @IsOptional()
  limit?: number;

  @IsNumber()
  @IsOptional()
  offset?: number;

  @IsString()
  @IsOptional()
  executedBy?: string;

  @IsBoolean()
  @IsOptional()
  forceRefresh?: boolean;
}

export class CreateReportTemplateDto {
  @IsString()
  @IsOptional()
  workspaceId?: string;

  @IsString()
  @IsNotEmpty()
  templateKey: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ReportType)
  @IsNotEmpty()
  type: ReportType;

  @IsEnum(ReportDataSource)
  @IsNotEmpty()
  dataSource: ReportDataSource;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReportColumnDto)
  columns: ReportColumnDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReportFilterDto)
  @IsOptional()
  filters?: ReportFilterDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReportSortDto)
  @IsOptional()
  sorting?: ReportSortDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReportGroupingDto)
  @IsOptional()
  grouping?: ReportGroupingDto[];

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @IsString()
  @IsNotEmpty()
  createdBy: string;
}

export class UpdateReportTemplateDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReportColumnDto)
  @IsOptional()
  columns?: ReportColumnDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReportFilterDto)
  @IsOptional()
  filters?: ReportFilterDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReportSortDto)
  @IsOptional()
  sorting?: ReportSortDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReportGroupingDto)
  @IsOptional()
  grouping?: ReportGroupingDto[];

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class ReportDefinitionResponseDto implements IReportDefinition {
  id: string;
  workspaceId?: string;
  reportKey: string;
  name: string;
  description?: string;
  type: ReportType;
  dataSource: ReportDataSource;
  status: ReportStatus;
  version: number;
  columns: IReportColumn[];
  filters?: IReportFilter[];
  sorting?: IReportSort[];
  grouping?: IReportGrouping[];
  dateRange?: IReportDateRange;
  limit?: number;
  offset?: number;
  drillDownEnabled: boolean;
  cacheEnabled: boolean;
  cacheTtlMinutes?: number;
  templateId?: string;
  isTemplate: boolean;
  permissions?: {
    roles?: string[];
    userIds?: string[];
  };
  metadata?: Record<string, any>;
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  archivedAt?: Date;
}

export class ReportExecutionResponseDto implements IReportExecution {
  id: string;
  reportDefinitionId: string;
  workspaceId: string;
  reportKey: string;
  status: ReportExecutionStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  resultCount?: number;
  errorCode?: string;
  errorMessage?: string;
  filters?: IReportFilter[];
  dateRange?: IReportDateRange;
  limit?: number;
  offset?: number;
  executedBy?: string;
  metadata?: Record<string, any>;
}

export class ReportResultResponseDto implements IReportResult {
  executionId: string;
  reportDefinitionId: string;
  workspaceId: string;
  columns: IReportColumn[];
  rows: Record<string, any>[];
  total: number;
  aggregations?: Record<string, any>;
  metadata?: Record<string, any>;
}

export class ReportVersionResponseDto implements IReportVersion {
  id: string;
  reportDefinitionId: string;
  version: number;
  definition: Partial<IReportDefinition>;
  changeDescription?: string;
  createdBy: string;
  createdAt: Date;
}

export class ReportTemplateResponseDto implements IReportTemplate {
  id: string;
  workspaceId?: string;
  templateKey: string;
  name: string;
  description?: string;
  type: ReportType;
  dataSource: ReportDataSource;
  columns: IReportColumn[];
  filters?: IReportFilter[];
  sorting?: IReportSort[];
  grouping?: IReportGrouping[];
  isGlobal: boolean;
  metadata?: Record<string, any>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export class ReportFilterDto2 {
  @IsString()
  @IsOptional()
  workspaceId?: string;

  @IsEnum(ReportType)
  @IsOptional()
  type?: ReportType;

  @IsEnum(ReportDataSource)
  @IsOptional()
  dataSource?: ReportDataSource;

  @IsEnum(ReportStatus)
  @IsOptional()
  status?: ReportStatus;

  @IsString()
  @IsOptional()
  createdBy?: string;

  @IsNumber()
  @IsOptional()
  page?: number;

  @IsNumber()
  @IsOptional()
  limit?: number;
}
