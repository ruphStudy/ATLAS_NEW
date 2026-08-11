import { IsOptional, IsString } from 'class-validator';

export class ActivateBinDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class DeactivateBinDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class BlockBinDto {
  @IsString()
  reason!: string;
}

export class ArchiveBinDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class RestoreBinDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
