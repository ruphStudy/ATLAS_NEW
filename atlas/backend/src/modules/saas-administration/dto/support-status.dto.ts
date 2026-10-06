import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SupportStatus } from '../interfaces';

export class UpdateSupportStatusDto {
  @IsEnum(SupportStatus)
  supportStatus!: SupportStatus;

  @IsString()
  @IsOptional()
  reason?: string;
}
