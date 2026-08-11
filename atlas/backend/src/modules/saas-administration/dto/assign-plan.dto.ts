import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PlanChangeDirection, PlanChangeEffective } from '@modules/subscription-management/interfaces';

/** Thin pass-through to `SubscriptionManagementService.changePlan()` — this module never compares plan tiers or computes proration itself. */
export class AssignPlanDto {
  @IsString()
  @IsNotEmpty()
  planKey: string;

  @IsEnum(PlanChangeDirection)
  changeType: PlanChangeDirection;

  @IsEnum(PlanChangeEffective)
  @IsOptional()
  effective?: PlanChangeEffective;

  @IsString()
  @IsNotEmpty()
  reason: string;
}
