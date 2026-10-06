import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { SubscriptionStatus } from '../interfaces';

export class AdminOverrideDto {
  @IsEnum(SubscriptionStatus)
  toStatus!: SubscriptionStatus;

  @IsString()
  @IsNotEmpty()
  reason!: string;
}
