import { IsOptional, IsString } from 'class-validator';

export class ActivateLocationDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class DeactivateLocationDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class BlockLocationDto {
  @IsString()
  reason!: string;
}

export class ArchiveLocationDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class RestoreLocationDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
