import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CancelSubscriptionDto {
  @IsBoolean()
  @IsOptional()
  immediate?: boolean;

  @IsString()
  @IsOptional()
  reason?: string;
}
