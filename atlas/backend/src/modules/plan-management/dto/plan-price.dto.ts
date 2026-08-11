import { IsEnum, IsNumber, IsString, Matches, Min } from 'class-validator';
import { PlanBillingCycle } from '../interfaces';

export class PlanPriceDto {
  @IsString()
  @Matches(/^[A-Z]{3}$/, { message: 'currency must be a 3-letter ISO 4217 code' })
  currency: string;

  @IsEnum(PlanBillingCycle)
  billingCycle: PlanBillingCycle;

  @IsNumber()
  @Min(0)
  amount: number;
}
