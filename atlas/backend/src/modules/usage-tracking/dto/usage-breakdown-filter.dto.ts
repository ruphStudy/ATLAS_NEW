import { IsDateString, IsIn, IsNotEmpty, IsString } from 'class-validator';
import { USAGE_BUCKET_GRANULARITIES } from '../constants';

export class UsageBreakdownFilterDto {
  @IsString()
  @IsNotEmpty()
  resourceKey!: string;

  @IsIn(USAGE_BUCKET_GRANULARITIES)
  bucket!: (typeof USAGE_BUCKET_GRANULARITIES)[number];

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;
}
