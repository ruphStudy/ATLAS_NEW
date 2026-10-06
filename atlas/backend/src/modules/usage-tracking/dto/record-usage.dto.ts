import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, Min } from 'class-validator';
import { UsageRecordSource } from '../interfaces';

export class RecordUsageDto {
  @IsString()
  @IsNotEmpty()
  module!: string;

  @IsString()
  @IsOptional()
  feature?: string;

  /** Open vocabulary — matches Plan Management's `IPlanLimit.resourceKey` (e.g. 'API_CALLS', 'STORAGE_GB'), never enum-constrained. */
  @IsString()
  @IsNotEmpty()
  resourceKey!: string;

  @IsNumber()
  @Min(0)
  quantity!: number;

  @IsString()
  @IsNotEmpty()
  unit!: string;

  @IsEnum(UsageRecordSource)
  @IsOptional()
  source?: UsageRecordSource;

  @IsString()
  @IsOptional()
  correlationId?: string;

  @IsString()
  @IsOptional()
  billingPeriodId?: string;

  @IsString()
  @IsOptional()
  subscriptionId?: string;

  @IsDateString()
  @IsOptional()
  occurredAt?: string;

  /** A repeat call with the same key returns the previously recorded row instead of double-counting. */
  @IsString()
  @IsOptional()
  idempotencyKey?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
