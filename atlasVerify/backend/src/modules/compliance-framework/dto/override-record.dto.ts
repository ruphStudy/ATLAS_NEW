import { IsEnum, IsString, IsNotEmpty } from 'class-validator';
import { ComplianceRecordStatus } from '../interfaces';

/** Manual override of a compliance record's status — a reason is always required. */
export class OverrideComplianceRecordDto {
  @IsEnum(ComplianceRecordStatus)
  status: ComplianceRecordStatus;

  @IsString()
  @IsNotEmpty()
  reason: string;
}
