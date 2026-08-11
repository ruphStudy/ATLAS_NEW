import { IsDateString, IsOptional, IsString } from 'class-validator';

export class PublishPlanDto {
  /** Defaults to now if omitted — a future date schedules when this version becomes the effective one, without deprecating the currently effective version until then. */
  @IsDateString()
  @IsOptional()
  effectiveAt?: string;

  @IsString()
  @IsOptional()
  reason?: string;
}
