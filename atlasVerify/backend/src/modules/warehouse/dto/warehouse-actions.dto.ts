import { IsOptional, IsString } from 'class-validator';

export class ActivateWarehouseDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class DeactivateWarehouseDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class SuspendWarehouseDto {
  @IsString()
  reason!: string;
}

export class CloseWarehouseDto {
  @IsString()
  reason!: string;
}

export class ArchiveWarehouseDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class RestoreWarehouseDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
