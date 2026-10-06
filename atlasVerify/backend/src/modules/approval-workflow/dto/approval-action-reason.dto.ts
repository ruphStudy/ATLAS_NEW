import { IsString, IsOptional } from 'class-validator';

/** Shared by cancel/recall/resubmit — actions that only carry an optional free-text reason. */
export class ApprovalActionReasonDto {
  @IsString()
  @IsOptional()
  reason?: string;
}
