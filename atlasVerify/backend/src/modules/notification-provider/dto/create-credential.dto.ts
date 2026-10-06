import { IsString, IsNotEmpty, IsOptional, IsObject, IsDateString } from 'class-validator';

export class CreateProviderCredentialDto {
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsString()
  @IsNotEmpty()
  providerKey: string;

  @IsString()
  @IsNotEmpty()
  channel: string;

  @IsString()
  @IsNotEmpty()
  credentialSetName: string;

  @IsString()
  @IsOptional()
  description?: string;

  /** Plaintext field bag (e.g. { apiKey, apiSecret }) — encrypted before persisting, never stored or returned as-is. */
  @IsObject()
  @IsNotEmpty()
  fields: Record<string, string>;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @IsString()
  @IsOptional()
  createdBy?: string;
}
