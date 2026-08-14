import { IsString, IsNotEmpty } from 'class-validator';

/** Generic reason-only payload — used for waive, mark-non-applicable and archive actions. */
export class ComplianceReasonDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}
