import { IsString, IsOptional, IsEnum, IsInt, Min, Max, IsIn, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { InvoiceStatus, InvoiceType } from '../interfaces';
import { INVOICE_SORT_FIELDS } from '../constants';

export class InvoiceFilterDto {
  @IsString()
  @IsOptional()
  subscriptionId?: string;

  @IsEnum(InvoiceStatus)
  @IsOptional()
  status?: InvoiceStatus;

  @IsEnum(InvoiceType)
  @IsOptional()
  type?: InvoiceType;

  @IsString()
  @IsOptional()
  search?: string;

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  includeArchived?: boolean;

  @IsIn(INVOICE_SORT_FIELDS)
  @IsOptional()
  sortBy?: (typeof INVOICE_SORT_FIELDS)[number];

  @IsIn(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc';

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(1)
  page?: number;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(200)
  limit?: number;
}
