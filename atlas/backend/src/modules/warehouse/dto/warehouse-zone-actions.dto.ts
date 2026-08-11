import { IsOptional, IsString } from 'class-validator';

export class ActivateZoneDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class DeactivateZoneDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class BlockZoneDto {
  @IsString()
  reason!: string;
}

export class ArchiveZoneDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class RestoreZoneDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
