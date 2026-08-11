import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsDateString,
  IsObject,
  ValidateIf,
} from 'class-validator';
import {
  NotificationType,
  NotificationPriority,
  NotificationTargetType,
} from '../interfaces';

export class CreateNotificationDto {
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsEnum(NotificationTargetType)
  targetType: NotificationTargetType;

  @ValidateIf((dto) => dto.targetType === NotificationTargetType.USER)
  @IsString()
  @IsNotEmpty()
  targetUserId?: string;

  @ValidateIf((dto) => dto.targetType === NotificationTargetType.ROLE)
  @IsString()
  @IsNotEmpty()
  targetRole?: string;

  @ValidateIf((dto) => dto.targetType === NotificationTargetType.TEAM)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  targetUserIds?: string[];

  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType;

  @IsString()
  @IsOptional()
  category?: string;

  @IsEnum(NotificationPriority)
  @IsOptional()
  priority?: NotificationPriority;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsString()
  @IsOptional()
  sourceModule?: string;

  @IsString()
  @IsOptional()
  entityType?: string;

  @IsString()
  @IsOptional()
  entityId?: string;

  @IsString()
  @IsOptional()
  actionLink?: string;

  @IsBoolean()
  @IsOptional()
  actionRequired?: boolean;

  @IsString()
  @IsOptional()
  dedupeKey?: string;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
