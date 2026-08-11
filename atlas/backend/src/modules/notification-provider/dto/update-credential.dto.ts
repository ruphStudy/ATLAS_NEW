import { IsString, IsOptional, IsObject, IsDateString } from 'class-validator';

export class UpdateProviderCredentialDto {
  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsOptional()
  fields?: Record<string, string>;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @IsString()
  @IsOptional()
  changeReason?: string;

  @IsString()
  @IsOptional()
  changedBy?: string;
}
