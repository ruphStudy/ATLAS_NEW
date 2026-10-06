import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsDate, IsArray, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import {
  SalesMetricType,
  SalesTrendPeriod,
  SalesBreakdownDimension,
  SalesCustomerType,
  SalesComparisonType,
  ProductPerformanceCategory,
  ISalesSummary,
  ISalesTrend,
  ISalesBreakdown,
  ISalesComparison,
  IProductPerformance,
  ISalesTarget,
  ISalesTargetPerformance,
  ISavedView,
} from '../interfaces';

export class GetSalesSummaryDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsDate()
  @Type(() => Date)
  startDate!: Date;

  @IsDate()
  @Type(() => Date)
  endDate!: Date;

  @IsEnum(SalesTrendPeriod)
  @IsOptional()
  period?: SalesTrendPeriod;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  marketplaceIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  accountIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  providerKeys?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  productIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  skus?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  categories?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  brands?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  countries?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  regions?: string[];

  @IsString()
  @IsOptional()
  currency?: string;

  @IsEnum(SalesCustomerType)
  @IsOptional()
  customerType?: SalesCustomerType;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  orderStatuses?: string[];
}

export class GetSalesTrendsDto extends GetSalesSummaryDto {
  @IsEnum(SalesMetricType)
  @IsNotEmpty()
  metricType!: SalesMetricType;

  @IsEnum(SalesTrendPeriod)
  @IsNotEmpty()
  period!: SalesTrendPeriod;
}

export class GetSalesBreakdownDto extends GetSalesSummaryDto {
  @IsEnum(SalesBreakdownDimension)
  @IsNotEmpty()
  dimension!: SalesBreakdownDimension;

  @IsNumber()
  @IsOptional()
  limit?: number;

  @IsString()
  @IsOptional()
  sortBy?: string;

  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}

export class GetSalesComparisonDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsDate()
  @Type(() => Date)
  currentStartDate!: Date;

  @IsDate()
  @Type(() => Date)
  currentEndDate!: Date;

  @IsEnum(SalesComparisonType)
  @IsNotEmpty()
  comparisonType!: SalesComparisonType;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  comparisonStartDate?: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  comparisonEndDate?: Date;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  marketplaceIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  accountIds?: string[];

  @IsString()
  @IsOptional()
  currency?: string;
}

export class GetProductPerformanceDto extends GetSalesSummaryDto {
  @IsEnum(ProductPerformanceCategory)
  @IsNotEmpty()
  performanceCategory!: ProductPerformanceCategory;

  @IsNumber()
  @IsOptional()
  limit?: number;
}

export class CreateSalesTargetDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsString()
  @IsNotEmpty()
  targetKey!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEnum(SalesMetricType)
  @IsNotEmpty()
  metricType!: SalesMetricType;

  @IsNumber()
  @IsNotEmpty()
  targetValue!: number;

  @IsEnum(SalesTrendPeriod)
  @IsNotEmpty()
  period!: SalesTrendPeriod;

  @IsDate()
  @Type(() => Date)
  startDate!: Date;

  @IsDate()
  @Type(() => Date)
  endDate!: Date;

  @IsOptional()
  dimensions?: Record<string, any>;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsNotEmpty()
  createdBy!: string;
}

export class UpdateSalesTargetDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @IsOptional()
  targetValue?: number;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  startDate?: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  endDate?: Date;

  @IsOptional()
  dimensions?: Record<string, any>;

  @IsString()
  @IsOptional()
  currency?: string;
}

export class CreateSavedViewDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsString()
  @IsNotEmpty()
  viewKey!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNotEmpty()
  filters!: Record<string, any>;

  @IsArray()
  @IsEnum(SalesBreakdownDimension, { each: true })
  dimensions!: SalesBreakdownDimension[];

  @IsArray()
  @IsEnum(SalesMetricType, { each: true })
  metrics!: SalesMetricType[];

  @IsEnum(SalesTrendPeriod)
  @IsNotEmpty()
  period!: SalesTrendPeriod;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsString()
  @IsNotEmpty()
  createdBy!: string;
}

export class UpdateSavedViewDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsOptional()
  filters?: Record<string, any>;

  @IsArray()
  @IsEnum(SalesBreakdownDimension, { each: true })
  @IsOptional()
  dimensions?: SalesBreakdownDimension[];

  @IsArray()
  @IsEnum(SalesMetricType, { each: true })
  @IsOptional()
  metrics?: SalesMetricType[];

  @IsEnum(SalesTrendPeriod)
  @IsOptional()
  period?: SalesTrendPeriod;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

export class SalesSummaryResponseDto implements ISalesSummary {
  workspaceId!: string;
  period!: SalesTrendPeriod;
  startDate!: Date;
  endDate!: Date;
  revenue!: number;
  grossSales!: number;
  netSales!: number;
  unitsSold!: number;
  orderCount!: number;
  averageOrderValue!: number;
  discountAmount!: number;
  taxAmount!: number;
  shippingAmount!: number;
  refundAmount!: number;
  cancellationAmount!: number;
  returnAmount!: number;
  feeAmount!: number;
  currency!: string;
  metadata?: Record<string, any>;
}

export class SalesTrendResponseDto implements ISalesTrend {
  workspaceId!: string;
  period!: SalesTrendPeriod;
  periodStart!: Date;
  periodEnd!: Date;
  metricType!: SalesMetricType;
  value!: number;
  previousValue?: number;
  changeAmount?: number;
  changePercent?: number;
  currency?: string;
  metadata?: Record<string, any>;
}

export class SalesBreakdownResponseDto implements ISalesBreakdown {
  workspaceId!: string;
  dimension!: SalesBreakdownDimension;
  dimensionValue!: string;
  dimensionLabel?: string;
  period!: SalesTrendPeriod;
  startDate!: Date;
  endDate!: Date;
  revenue!: number;
  grossSales!: number;
  netSales!: number;
  unitsSold!: number;
  orderCount!: number;
  averageOrderValue!: number;
  sharePercent?: number;
  rank?: number;
  currency!: string;
  metadata?: Record<string, any>;
}

export class SalesComparisonResponseDto implements ISalesComparison {
  workspaceId!: string;
  comparisonType!: SalesComparisonType;
  currentPeriod!: {
    startDate: Date;
    endDate: Date;
    revenue: number;
    grossSales: number;
    netSales: number;
    unitsSold: number;
    orderCount: number;
    averageOrderValue: number;
  };
  comparisonPeriod!: {
    startDate: Date;
    endDate: Date;
    revenue: number;
    grossSales: number;
    netSales: number;
    unitsSold: number;
    orderCount: number;
    averageOrderValue: number;
  };
  variance!: {
    revenueAmount: number;
    revenuePercent: number;
    grossSalesAmount: number;
    grossSalesPercent: number;
    netSalesAmount: number;
    netSalesPercent: number;
    unitsSoldAmount: number;
    unitsSoldPercent: number;
    orderCountAmount: number;
    orderCountPercent: number;
    aovAmount: number;
    aovPercent: number;
  };
  currency!: string;
  metadata?: Record<string, any>;
}

export class ProductPerformanceResponseDto implements IProductPerformance {
  workspaceId!: string;
  productId!: string;
  sku!: string;
  productName!: string;
  category?: string;
  brand?: string;
  performanceCategory!: ProductPerformanceCategory;
  revenue!: number;
  unitsSold!: number;
  orderCount!: number;
  averagePrice!: number;
  revenueShare!: number;
  growthPercent?: number;
  rank?: number;
  currency!: string;
  period!: SalesTrendPeriod;
  startDate!: Date;
  endDate!: Date;
  metadata?: Record<string, any>;
}

export class SalesTargetResponseDto implements ISalesTarget {
  id!: string;
  workspaceId!: string;
  targetKey!: string;
  name!: string;
  metricType!: SalesMetricType;
  targetValue!: number;
  period!: SalesTrendPeriod;
  startDate!: Date;
  endDate!: Date;
  dimensions?: Record<string, any>;
  currency?: string;
  createdBy!: string;
  createdAt!: Date;
  updatedAt!: Date;
}

export class SalesTargetPerformanceResponseDto implements ISalesTargetPerformance {
  targetId!: string;
  workspaceId!: string;
  targetKey!: string;
  name!: string;
  metricType!: SalesMetricType;
  targetValue!: number;
  actualValue!: number;
  variance!: number;
  variancePercent!: number;
  achievementPercent!: number;
  period!: SalesTrendPeriod;
  startDate!: Date;
  endDate!: Date;
  currency?: string;
}

export class SavedViewResponseDto implements ISavedView {
  id!: string;
  workspaceId!: string;
  viewKey!: string;
  name!: string;
  description?: string;
  filters!: Record<string, any>;
  dimensions!: SalesBreakdownDimension[];
  metrics!: SalesMetricType[];
  period!: SalesTrendPeriod;
  isDefault!: boolean;
  createdBy!: string;
  createdAt!: Date;
  updatedAt!: Date;
}

export class DrillDownRequestDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsDate()
  @Type(() => Date)
  startDate!: Date;

  @IsDate()
  @Type(() => Date)
  endDate!: Date;

  @IsString()
  @IsOptional()
  productId?: string;

  @IsString()
  @IsOptional()
  sku?: string;

  @IsString()
  @IsOptional()
  marketplace?: string;

  @IsString()
  @IsOptional()
  account?: string;

  @IsNumber()
  @IsOptional()
  page?: number;

  @IsNumber()
  @IsOptional()
  limit?: number;
}

export class ExportSalesDataDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsDate()
  @Type(() => Date)
  startDate!: Date;

  @IsDate()
  @Type(() => Date)
  endDate!: Date;

  @IsString()
  @IsNotEmpty()
  format!: 'csv' | 'xlsx' | 'json';

  @IsArray()
  @IsEnum(SalesMetricType, { each: true })
  @IsOptional()
  metrics?: SalesMetricType[];

  @IsArray()
  @IsEnum(SalesBreakdownDimension, { each: true })
  @IsOptional()
  dimensions?: SalesBreakdownDimension[];

  @IsOptional()
  filters?: Record<string, any>;
}
