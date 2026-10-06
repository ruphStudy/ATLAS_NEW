import { IsNotEmpty, IsString } from 'class-validator';

export class SaasAuditRequiredReasonDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
