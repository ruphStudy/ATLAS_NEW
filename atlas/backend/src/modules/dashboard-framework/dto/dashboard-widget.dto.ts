import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  IsNumber,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  WidgetType,
  ChartType,
  RefreshInterval,
  IWidgetPosition,
  IWidgetDataSource,
} from '../interfaces';

export class AddWidgetDto {
  @IsString()
  dashboardId!: string;

  @IsString()
  widgetKey!: string;

  @IsObject()
  position!: IWidgetPosition;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(WidgetType)
  widgetType!: WidgetType;

  @IsOptional()
  @IsEnum(ChartType)
  chartType?: ChartType;

  @IsObject()
  dataSource!: IWidgetDataSource;

  @IsObject()
  displayOptions!: Record<string, any>;

  @IsOptional()
  @IsEnum(RefreshInterval)
  refreshInterval?: RefreshInterval;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cacheTtl?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateWidgetDto {
  @IsOptional()
  @IsObject()
  position?: IWidgetPosition;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  dataSource?: IWidgetDataSource;

  @IsOptional()
  @IsObject()
  displayOptions?: Record<string, any>;

  @IsOptional()
  @IsEnum(RefreshInterval)
  refreshInterval?: RefreshInterval;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cacheTtl?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class DashboardWidgetResponseDto {
  id!: string;
  dashboardId!: string;
  widgetKey!: string;
  position!: IWidgetPosition;
  config!: {
    title: string;
    description?: string;
    widgetType: WidgetType;
    chartType?: ChartType;
    dataSource: IWidgetDataSource;
    displayOptions: Record<string, any>;
    refreshInterval?: RefreshInterval;
  };
  cacheKey?: string;
  cacheTtl?: number;
  metadata?: Record<string, any>;
  createdAt!: Date;
  updatedAt!: Date;
}
