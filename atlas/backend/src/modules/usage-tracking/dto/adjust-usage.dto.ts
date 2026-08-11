import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class AdjustUsageDto {
  /** Positive to add, negative to subtract. */
  @IsNumber()
  quantityDelta: number;

  @IsString()
  @IsNotEmpty()
  reason: string;
}
