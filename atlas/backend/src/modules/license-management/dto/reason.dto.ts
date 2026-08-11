import { IsOptional, IsString } from 'class-validator';

export class LicenseReasonDto {
  @IsString()
  @IsOptional()
  reason?: string;
}
