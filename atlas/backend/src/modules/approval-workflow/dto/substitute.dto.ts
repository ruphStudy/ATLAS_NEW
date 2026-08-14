import { IsDateString, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApproverType } from '../interfaces';

export class CreateApprovalSubstituteDto {
  @IsIn([ApproverType.USER, ApproverType.ROLE])
  approverType: ApproverType.USER | ApproverType.ROLE;

  @IsString()
  @IsNotEmpty()
  approverRef: string;

  @IsString()
  @IsNotEmpty()
  substituteUserId: string;

  @IsDateString()
  @IsOptional()
  effectiveFrom?: string;

  @IsDateString()
  @IsOptional()
  effectiveTo?: string;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class ApprovalSubstituteResponseDto {
  id: string;
  workspaceId: string;
  approverType: ApproverType;
  approverRef: string;
  substituteUserId: string;
  effectiveFrom?: Date | null;
  effectiveTo?: Date | null;
  reason?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
