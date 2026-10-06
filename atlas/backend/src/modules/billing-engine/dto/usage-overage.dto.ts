import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

/** Caller-supplied usage figures — Billing Engine does not query a Usage Tracking module (none exists) or compute usage itself. */
export class UsageOverageDto {
  @IsString()
  @IsNotEmpty()
  resourceKey!: string;

  @IsNumber()
  @Min(0)
  usageAmount!: number;

  @IsNumber()
  @Min(0)
  limit!: number;
}
