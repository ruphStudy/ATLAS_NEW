import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { AiDecisionOutcome } from '../interfaces';

export class ApproveDecisionDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsString()
  @IsNotEmpty()
  approvedBy!: string;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class RejectDecisionDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsString()
  @IsNotEmpty()
  rejectedBy!: string;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class ReviewDecisionDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsString()
  @IsNotEmpty()
  reviewedBy!: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
