import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsObject,
  IsDateString,
  IsIn,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class NotificationRecipientDto {
  @IsString()
  @IsNotEmpty()
  address!: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class NotificationTemplateDto {
  @IsString()
  @IsNotEmpty()
  templateId!: string;

  @IsObject()
  @IsOptional()
  variables?: Record<string, unknown>;

  /**
   * 'ATLAS' (default when `subject`/`body` are also provided): `subject`/`body`
   * are rendered here via `{{var}}` substitution against `variables` before
   * sending. 'PROVIDER': `templateId`/`variables` are passed through as-is
   * for the provider's own template engine to render.
   */
  @IsIn(['ATLAS', 'PROVIDER'])
  @IsOptional()
  source?: 'ATLAS' | 'PROVIDER';
}

export class NotificationAttachmentDto {
  @IsString()
  @IsNotEmpty()
  filename!: string;

  @IsString()
  @IsNotEmpty()
  contentType!: string;

  @IsString()
  @IsOptional()
  url?: string;

  @IsString()
  @IsOptional()
  contentBase64?: string;
}

export class SendNotificationDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsString()
  @IsNotEmpty()
  channel!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => NotificationRecipientDto)
  recipients!: NotificationRecipientDto[];

  @IsString()
  @IsOptional()
  subject?: string;

  @IsString()
  @IsOptional()
  body?: string;

  @IsString()
  @IsOptional()
  html?: string;

  @IsString()
  @IsOptional()
  text?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  cc?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  bcc?: string[];

  @IsString()
  @IsOptional()
  replyTo?: string;

  @IsString()
  @IsOptional()
  fromAddress?: string;

  @IsString()
  @IsOptional()
  fromName?: string;

  /** SMS sender id (short code / alphanumeric sender name). */
  @IsString()
  @IsOptional()
  senderId?: string;

  /** SMS destination country code (e.g. 'IN', '+91') used to normalize recipient numbers lacking one. */
  @IsString()
  @IsOptional()
  countryCode?: string;

  @ValidateNested()
  @Type(() => NotificationTemplateDto)
  @IsOptional()
  template?: NotificationTemplateDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NotificationAttachmentDto)
  @IsOptional()
  attachments?: NotificationAttachmentDto[];

  @IsString()
  @IsOptional()
  idempotencyKey?: string;

  @IsIn(['LOW', 'NORMAL', 'HIGH', 'URGENT'])
  @IsOptional()
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

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
