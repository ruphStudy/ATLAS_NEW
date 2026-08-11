import { IsInt, IsOptional, Min } from 'class-validator';

export class RotateApiKeyDto {
  /** Milliseconds the OLD key stays valid after rotation — defaults to `DEFAULT_GRACE_PERIOD_MS` (24h). Pass 0 to revoke the old key immediately. */
  @IsInt()
  @IsOptional()
  @Min(0)
  gracePeriodMs?: number;
}
