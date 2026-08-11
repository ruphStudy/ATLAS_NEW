import { IsDateString, IsOptional } from 'class-validator';

export class DateRangeDto {
  @IsDateString()
  @IsOptional()
  start?: string;

  @IsDateString()
  @IsOptional()
  end?: string;
}
