import { IsString, IsNotEmpty, IsOptional, IsEnum, IsArray, IsInt, Min, IsIn, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApproverType } from '../interfaces';

export class ApprovalConditionDto {
  @IsIn(['amount', 'riskLevel', 'entityType'])
  field: 'amount' | 'riskLevel' | 'entityType';

  @IsIn(['eq', 'neq', 'gte', 'lte', 'in'])
  operator: 'eq' | 'neq' | 'gte' | 'lte' | 'in';

  @IsNotEmpty()
  value: unknown;
}

export class ApprovalStepConfigDto {
  @IsInt()
  @Min(0)
  stepOrder: number;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(ApproverType)
  approverType: ApproverType;

  @IsArray()
  @IsString({ each: true })
  approverRefs: string[];

  @IsInt()
  @Min(1)
  @IsOptional()
  requiredApprovals?: number;

  @ValidateNested()
  @Type(() => ApprovalConditionDto)
  @IsOptional()
  condition?: ApprovalConditionDto;

  @IsInt()
  @Min(1)
  @IsOptional()
  slaHours?: number;
}

export class ApprovalMatchCriteriaDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  entityTypes?: string[];

  @IsNumber()
  @IsOptional()
  minAmount?: number;

  @IsNumber()
  @IsOptional()
  maxAmount?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  riskLevels?: string[];
}

export class ApprovalEscalationConfigDto {
  @IsInt()
  @Min(1)
  afterHours: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  escalateToRoleKeys?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  escalateToUserIds?: string[];
}
