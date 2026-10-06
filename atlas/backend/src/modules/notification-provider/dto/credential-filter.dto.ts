import { IsString, IsNotEmpty, IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { NotificationProviderCredentialStatus } from '../interfaces';

export class ProviderCredentialFilterDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsString()
  @IsOptional()
  providerKey?: string;

  @IsString()
  @IsOptional()
  channel?: string;

  @IsEnum(NotificationProviderCredentialStatus)
  @IsOptional()
  status?: NotificationProviderCredentialStatus;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(1)
  page?: number;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number;
}
