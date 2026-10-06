import { IsString, IsOptional, IsEnum } from 'class-validator';
import { GuardrailIncidentStatus } from '../interfaces';

export class UpdateGuardrailIncidentDto {
  @IsEnum(GuardrailIncidentStatus)
  status: GuardrailIncidentStatus;

  @IsString()
  @IsOptional()
  assignedTo?: string;

  @IsString()
  @IsOptional()
  resolution?: string;

  @IsString()
  @IsOptional()
  performedBy?: string;
}
