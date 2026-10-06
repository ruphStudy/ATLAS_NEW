import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export class DecideApprovalDto {
  @IsIn(['APPROVE', 'REJECT', 'REQUEST_CHANGES', 'DEFER'])
  action!: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES' | 'DEFER';

  @IsString()
  @IsOptional()
  comment?: string;

  @IsObject()
  @IsOptional()
  evidence?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  sourceReference?: Record<string, unknown>;

  /** A repeat call with the same key on the same step returns the existing decision instead of double-processing. */
  @IsString()
  @IsOptional()
  idempotencyKey?: string;
}
