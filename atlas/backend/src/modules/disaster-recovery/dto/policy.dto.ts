import { IsArray, IsBoolean, IsEnum, IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { DrEnvironment, DrPolicyStatus } from '../interfaces';

export class CreateDrPolicyDto {
  @IsEnum(DrEnvironment)
  environment!: DrEnvironment;

  @IsString()
  criticalService!: string;

  @IsInt()
  @Min(1)
  rpoMinutes!: number;

  @IsInt()
  @Min(1)
  rtoMinutes!: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  recoveryPriority?: number;

  @IsArray()
  @IsString({ each: true })
  coverageTargets!: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  dependencyOrder?: string[];

  @IsObject()
  @IsOptional()
  regionFailoverConfig?: Record<string, unknown>;

  @IsBoolean()
  @IsOptional()
  autoTriggerOnDetection?: boolean;

  @IsString()
  @IsOptional()
  organizationId?: string;

  @IsBoolean()
  @IsOptional()
  isGlobal?: boolean;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class UpdateDrPolicyDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  rpoMinutes?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  rtoMinutes?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  recoveryPriority?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  coverageTargets?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  dependencyOrder?: string[];

  @IsObject()
  @IsOptional()
  regionFailoverConfig?: Record<string, unknown>;

  @IsBoolean()
  @IsOptional()
  autoTriggerOnDetection?: boolean;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  changeReason?: string;
}

export class DrPolicyFilterDto extends PaginationDto {
  @IsEnum(DrEnvironment)
  @IsOptional()
  environment?: DrEnvironment;

  @IsEnum(DrPolicyStatus)
  @IsOptional()
  status?: DrPolicyStatus;

  @IsString()
  @IsOptional()
  search?: string;
}
