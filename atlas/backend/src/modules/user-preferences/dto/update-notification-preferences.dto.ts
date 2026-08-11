import { IsObject, IsOptional, IsIn, IsString } from 'class-validator';

export class UpdateNotificationPreferencesDto {
  @IsObject()
  @IsOptional()
  channels?: Record<string, boolean>;

  @IsObject()
  @IsOptional()
  categories?: Record<string, boolean>;

  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  @IsOptional()
  priorityThreshold?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  @IsObject()
  @IsOptional()
  quietHours?: { enabled: boolean; start: string; end: string; timezone?: string };

  @IsString()
  @IsOptional()
  changeReason?: string;
}
