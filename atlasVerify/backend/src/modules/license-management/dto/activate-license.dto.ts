import { IsOptional, IsString } from 'class-validator';

export class ActivateLicenseDto {
  @IsString()
  @IsOptional()
  deploymentId?: string;

  @IsString()
  @IsOptional()
  environment?: string;
}
