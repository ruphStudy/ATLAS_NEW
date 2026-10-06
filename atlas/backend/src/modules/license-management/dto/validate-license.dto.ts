import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ValidateLicenseDto {
  @IsString()
  @IsNotEmpty()
  licenseKeyId!: string;

  @IsString()
  @IsOptional()
  deploymentId?: string;

  @IsString()
  @IsOptional()
  environment?: string;
}

export class VerifyLicenseTokenOfflineDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsString()
  @IsNotEmpty()
  publicKey!: string;
}
