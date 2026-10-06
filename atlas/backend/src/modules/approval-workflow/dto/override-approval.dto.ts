import { IsIn, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class OverrideApprovalDto {
  @IsIn(['APPROVED', 'REJECTED'])
  status!: 'APPROVED' | 'REJECTED';

  /** Explicit justification — mandatory for every manual override, distinct from the optional comment on a normal decision. */
  @IsString()
  @IsNotEmpty()
  reason!: string;

  @IsObject()
  @IsOptional()
  evidence?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  idempotencyKey?: string;
}
