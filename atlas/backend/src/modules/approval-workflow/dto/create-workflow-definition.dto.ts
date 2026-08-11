import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  ArrayMinSize,
  ValidateNested,
  IsInt,
  Min,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApprovalWorkflowMode } from '../interfaces';
import { ApprovalStepConfigDto, ApprovalMatchCriteriaDto, ApprovalEscalationConfigDto } from './step-config.dto';

export class CreateWorkflowDefinitionDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message: 'key must be a lowercase, hyphen-separated identifier (e.g. "purchase-order-approval")',
  })
  key: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  module: string;

  @IsString()
  @IsOptional()
  entityType?: string;

  @IsEnum(ApprovalWorkflowMode)
  mode: ApprovalWorkflowMode;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ApprovalStepConfigDto)
  steps: ApprovalStepConfigDto[];

  @ValidateNested()
  @Type(() => ApprovalMatchCriteriaDto)
  @IsOptional()
  matchCriteria?: ApprovalMatchCriteriaDto;

  @IsInt()
  @Min(1)
  @IsOptional()
  slaHours?: number;

  @ValidateNested()
  @Type(() => ApprovalEscalationConfigDto)
  @IsOptional()
  escalation?: ApprovalEscalationConfigDto;
}
