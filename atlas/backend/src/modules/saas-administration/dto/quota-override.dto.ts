import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

/** Thin pass-through to `QuotaManagementService.createOverride()` against whichever policy already applies to this tenant/resource — this module never creates or evaluates quota policies itself. */
export class QuotaOverrideDto {
  @IsString()
  @IsNotEmpty()
  resourceKey: string;

  @IsNumber()
  @IsOptional()
  additionalHardLimit?: number;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}
