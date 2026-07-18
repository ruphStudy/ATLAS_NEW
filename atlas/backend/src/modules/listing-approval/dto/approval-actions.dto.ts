import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApprovalCheckArea } from '../interfaces';

export class ApprovalCheckResultDto {
  @IsEnum(ApprovalCheckArea)
  area!: ApprovalCheckArea;

  @IsBoolean()
  passed!: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ApproveListingApprovalDto {
  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApprovalCheckResultDto)
  checkResults?: ApprovalCheckResultDto[];
}

export class RejectListingApprovalDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApprovalCheckResultDto)
  checkResults?: ApprovalCheckResultDto[];
}

export class RequestRevisionDto {
  @IsString()
  @IsNotEmpty()
  notes!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApprovalCheckResultDto)
  checkResults?: ApprovalCheckResultDto[];
}

export class MarkReadyToPublishDto {
  @IsOptional()
  @IsString()
  comment?: string;
}

export class ResubmitForApprovalDto {
  @IsOptional()
  @IsString()
  comment?: string;
}
