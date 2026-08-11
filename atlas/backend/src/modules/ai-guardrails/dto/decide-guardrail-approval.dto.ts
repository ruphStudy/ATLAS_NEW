import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';
import { GuardrailApprovalStatus } from '../interfaces';

export class DecideGuardrailApprovalDto {
  @IsIn([GuardrailApprovalStatus.APPROVED, GuardrailApprovalStatus.REJECTED])
  decision: GuardrailApprovalStatus.APPROVED | GuardrailApprovalStatus.REJECTED;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsNotEmpty()
  decidedBy: string;
}
