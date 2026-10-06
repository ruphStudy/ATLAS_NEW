import { IsOptional, IsEnum } from 'class-validator';
import { NotificationChannel } from '../interfaces';

export class PreferenceFilterDto {
  @IsEnum(NotificationChannel)
  @IsOptional()
  channel?: NotificationChannel;
}
