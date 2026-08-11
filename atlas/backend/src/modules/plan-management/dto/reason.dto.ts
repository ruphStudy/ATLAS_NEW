import { IsOptional, IsString } from 'class-validator';

export class PlanReasonDto {
  @IsString()
  @IsOptional()
  reason?: string;
}
