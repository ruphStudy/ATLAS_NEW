import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  IsInt,
  Min,
  Max,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PushPlatform, PushDeviceTokenStatus } from './push-device-token.interfaces';

export class RegisterDeviceTokenDto {
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsEnum(PushPlatform)
  platform: PushPlatform;

  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @IsOptional()
  providerKey?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  topics?: string[];

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class RefreshDeviceTokenDto {
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsString()
  @IsNotEmpty()
  oldToken: string;

  @IsString()
  @IsNotEmpty()
  newToken: string;
}

export class DeviceTokenFilterDto {
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsEnum(PushPlatform)
  @IsOptional()
  platform?: PushPlatform;

  @IsEnum(PushDeviceTokenStatus)
  @IsOptional()
  status?: PushDeviceTokenStatus;

  @IsString()
  @IsOptional()
  topic?: string;

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
