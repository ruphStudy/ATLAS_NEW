import { IsString, IsOptional, IsEnum, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentTransactionStatus, PaymentTransactionType } from '../interfaces';
import { PAYMENT_SORT_FIELDS } from '../constants';

export class TransactionFilterDto {
  @IsString()
  @IsOptional()
  accountId?: string;

  @IsString()
  @IsOptional()
  invoiceId?: string;

  @IsEnum(PaymentTransactionStatus)
  @IsOptional()
  status?: PaymentTransactionStatus;

  @IsEnum(PaymentTransactionType)
  @IsOptional()
  type?: PaymentTransactionType;

  @IsIn(PAYMENT_SORT_FIELDS)
  @IsOptional()
  sortBy?: (typeof PAYMENT_SORT_FIELDS)[number];

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
