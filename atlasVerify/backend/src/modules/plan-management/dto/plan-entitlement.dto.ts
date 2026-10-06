import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class PlanEntitlementDto {
  @IsString()
  @IsNotEmpty()
  module: string;

  @IsString()
  @IsNotEmpty()
  feature: string;

  @IsString()
  @IsOptional()
  capability?: string;

  @IsString()
  @IsOptional()
  resource?: string;

  @IsBoolean()
  included: boolean;

  @IsOptional()
  value?: unknown;
}
