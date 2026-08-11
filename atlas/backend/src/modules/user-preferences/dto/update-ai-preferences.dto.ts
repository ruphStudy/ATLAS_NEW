import { IsString, IsOptional, IsIn, IsNumber } from 'class-validator';

export class UpdateAiPreferencesDto {
  @IsString()
  @IsOptional()
  defaultProvider?: string;

  @IsString()
  @IsOptional()
  defaultModel?: string;

  @IsIn(['CONCISE', 'DETAILED', 'TECHNICAL'])
  @IsOptional()
  responseStyle?: 'CONCISE' | 'DETAILED' | 'TECHNICAL';

  @IsNumber()
  @IsOptional()
  approvalThreshold?: number;

  @IsString()
  @IsOptional()
  changeReason?: string;
}
