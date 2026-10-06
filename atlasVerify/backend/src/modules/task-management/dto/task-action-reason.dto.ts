import { IsString, IsOptional } from 'class-validator';

/** Shared by cancel/archive/restore — actions that only carry an optional free-text reason. */
export class TaskActionReasonDto {
  @IsString()
  @IsOptional()
  reason?: string;
}
