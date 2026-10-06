import { IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { NotificationPriority } from '../interfaces';

export class UpdateNotificationPreferenceDto {
  @IsEnum(NotificationPriority)
  @IsOptional()
  minPriority?: NotificationPriority;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}
