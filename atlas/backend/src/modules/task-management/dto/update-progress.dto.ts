import { IsInt, IsOptional, Min, Max } from 'class-validator';

export class UpdateProgressDto {
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  progressPercent?: number;

  /** Minutes to add to the task's running time-spent total (not an absolute value). */
  @IsInt()
  @Min(0)
  @IsOptional()
  timeSpentMinutesDelta?: number;
}
