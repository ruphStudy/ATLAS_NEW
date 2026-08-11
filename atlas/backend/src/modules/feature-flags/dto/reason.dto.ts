import { IsOptional, IsString } from 'class-validator';

export class FeatureFlagReasonDto {
  @IsString()
  @IsOptional()
  reason?: string;
}
