import { IsOptional, IsString } from 'class-validator';

export class QuotaReasonDto {
  @IsString()
  @IsOptional()
  reason?: string;
}
