import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  IsArray,
  IsObject,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PushTargetType, PushPlatform } from './push-device-token.interfaces';
import { IPushAction } from './push-provider-adapter.interfaces';

class PushActionDto implements IPushAction {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  icon?: string;
}

export class SendPushNotificationDto {
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsEnum(PushTargetType)
  targetType: PushTargetType;

  /** Device token (DEVICE), userId (USER), topic/segment name (TOPIC/SEGMENT), or platform name (PLATFORM). */
  @IsString()
  @IsNotEmpty()
  targetValue: string;

  /** Additional platform filter for USER/TOPIC/SEGMENT targeting. */
  @IsEnum(PushPlatform)
  @IsOptional()
  platform?: PushPlatform;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  body?: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsString()
  @IsOptional()
  sound?: string;

  @IsInt()
  @IsOptional()
  badge?: number;

  @IsString()
  @IsOptional()
  deepLink?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PushActionDto)
  @IsOptional()
  actions?: PushActionDto[];

  @IsObject()
  @IsOptional()
  data?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  idempotencyKey?: string;

  @IsDateString()
  @IsOptional()
  scheduledAt?: string;

  @IsString()
  @IsOptional()
  preferredProviderKey?: string;

  @IsString()
  @IsOptional()
  notificationId?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
