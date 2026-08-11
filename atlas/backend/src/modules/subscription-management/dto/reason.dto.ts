import { IsOptional, IsString } from 'class-validator';

export class SubscriptionReasonDto {
  @IsString()
  @IsOptional()
  reason?: string;
}
