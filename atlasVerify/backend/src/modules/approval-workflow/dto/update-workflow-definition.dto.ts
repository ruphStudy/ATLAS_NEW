import { IsString, IsOptional, IsArray, ArrayMinSize, ValidateNested, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApprovalStepConfigDto, ApprovalMatchCriteriaDto, ApprovalEscalationConfigDto } from './step-config.dto';

export class UpdateWorkflowDefinitionDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ApprovalStepConfigDto)
  @IsOptional()
  steps?: ApprovalStepConfigDto[];

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

  @IsString()
  @IsOptional()
  changeReason?: string;
}
