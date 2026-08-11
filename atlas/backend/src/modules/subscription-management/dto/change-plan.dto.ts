import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { SubscriptionBillingCycle, PlanChangeEffective, PlanChangeDirection } from '../interfaces';

export class ChangePlanDto {
  @IsString()
  @IsNotEmpty()
  toPlanKey: string;

  @IsEnum(SubscriptionBillingCycle)
  @IsOptional()
  toBillingCycle?: SubscriptionBillingCycle;

  /** Caller states the direction explicitly — this module never compares plan tiers, since it does not own the Plan Management catalog. */
  @IsEnum(PlanChangeDirection)
  changeType: PlanChangeDirection;

  @IsEnum(PlanChangeEffective)
  effective: PlanChangeEffective;

  @IsString()
  @IsOptional()
  reason?: string;
}
