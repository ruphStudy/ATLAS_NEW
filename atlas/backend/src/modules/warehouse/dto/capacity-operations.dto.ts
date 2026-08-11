import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { CapacityLevel, CapacityMeasure } from '../interfaces';

export class ReserveCapacityDto {
  @IsEnum(CapacityLevel)
  level!: CapacityLevel;

  @IsString()
  entityId!: string;

  @IsOptional()
  @IsEnum(CapacityMeasure)
  measure?: CapacityMeasure;

  @IsNumber()
  @Min(0)
  quantity!: number;

  @IsString()
  referenceType!: string;

  @IsString()
  referenceId!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  expiresInSeconds?: number;
}

export class ReleaseCapacityDto {
  @IsString()
  referenceType!: string;

  @IsString()
  referenceId!: string;
}

export class RecalculateCapacityDto {
  @IsEnum(CapacityLevel)
  level!: CapacityLevel;

  @IsString()
  entityId!: string;
}
