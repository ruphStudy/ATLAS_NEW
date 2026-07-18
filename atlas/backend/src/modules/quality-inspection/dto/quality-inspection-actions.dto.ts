import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsEnum,
  IsDateString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  DefectDetailDto,
  ChecklistItemDto,
  InspectionAttachmentDto,
} from './create-quality-inspection.dto';

export class ScheduleInspectionDto {
  @IsDateString()
  scheduledDate!: string;

  @IsOptional()
  @IsString()
  inspector?: string;

  @IsOptional()
  @IsString()
  inspectorName?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class StartInspectionDto {
  @IsDateString()
  inspectionDate!: string;

  @IsOptional()
  @IsString()
  inspector?: string;

  @IsOptional()
  @IsString()
  inspectorName?: string;
}

export class CompleteInspectionDto {
  @IsNumber()
  @Min(0)
  quantityInspected!: number;

  @IsNumber()
  @Min(0)
  quantityPassed!: number;

  @IsNumber()
  @Min(0)
  quantityFailed!: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DefectDetailDto)
  defects?: DefectDetailDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistItemDto)
  checklist?: ChecklistItemDto[];

  @IsOptional()
  @IsArray()
  images?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InspectionAttachmentDto)
  attachments?: InspectionAttachmentDto[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  internalNotes?: string;
}

export class ConditionalApprovalDto {
  @IsString()
  conditionsForApproval!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class RejectInspectionDto {
  @IsString()
  rejectionReason!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CloseInspectionDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RequestReInspectionDto {
  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
