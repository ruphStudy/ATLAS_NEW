import { IsNotEmpty, IsString } from 'class-validator';

export class BillingReasonDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}
