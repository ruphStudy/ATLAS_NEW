import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { SubscriptionStatus } from '@modules/subscription-management/interfaces';

/** Thin pass-through to `SubscriptionManagementService.adminOverride()` — this module never re-implements subscription state rules. */
export class SubscriptionOverrideDto {
  @IsString()
  @IsNotEmpty()
  subscriptionId!: string;

  @IsEnum(SubscriptionStatus)
  toStatus!: SubscriptionStatus;

  @IsString()
  @IsNotEmpty()
  reason!: string;
}
