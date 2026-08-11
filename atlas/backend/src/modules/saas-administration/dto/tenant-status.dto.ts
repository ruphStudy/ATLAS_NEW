import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SuspendTenantDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class TerminateTenantDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class ActivateTenantDto {
  @IsString()
  @IsOptional()
  reason?: string;
}
