import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { NotificationChannel, NotificationPriority } from '../interfaces';

export class CreateNotificationPreferenceDto {
  @IsString()
  @IsOptional()
  category?: string;

  @IsEnum(NotificationChannel)
  @IsOptional()
  channel?: NotificationChannel;

  @IsEnum(NotificationPriority)
  @IsOptional()
  minPriority?: NotificationPriority;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}
