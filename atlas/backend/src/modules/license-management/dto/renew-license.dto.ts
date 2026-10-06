import { IsDateString, IsInt, IsNotEmpty, IsOptional, Min } from 'class-validator';

export class RenewLicenseDto {
  @IsDateString()
  @IsNotEmpty()
  expiresAt!: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  gracePeriodDays?: number;
}
