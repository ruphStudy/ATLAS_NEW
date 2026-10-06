import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UsageBreakdownQueryDto {
  @IsString()
  @IsOptional()
  resourceKey?: string;

  @IsDateString()
  @IsOptional()
  start?: string;

  @IsDateString()
  @IsOptional()
  end?: string;
}
