import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
} from 'class-validator';
import {
  AiDecisionOutcome,
  AiDecisionOverrideReason,
} from '../interfaces';

export class OverrideDecisionDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsEnum(AiDecisionOverrideReason)
  @IsNotEmpty()
  overrideReason!: AiDecisionOverrideReason;

  @IsString()
  @IsOptional()
  reasonText?: string;

  @IsEnum(AiDecisionOutcome)
  @IsNotEmpty()
  newOutcome!: AiDecisionOutcome;

  @IsString()
  @IsOptional()
  newCandidateId?: string;

  @IsString()
  @IsNotEmpty()
  overriddenBy!: string;

  @IsString()
  @IsOptional()
  approvedBy?: string;
}
