import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AiJobType, AiJobTaskType, AiJobStatus, AiJobPriority } from '../interfaces';

export class AiJobFilterDto {
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsString()
  @IsOptional()
  key?: string;

  @IsEnum(AiJobType)
  @IsOptional()
  type?: AiJobType;

  @IsEnum(AiJobTaskType)
  @IsOptional()
  taskType?: AiJobTaskType;

  @IsEnum(AiJobStatus)
  @IsOptional()
  status?: AiJobStatus;

  @IsEnum(AiJobPriority)
  @IsOptional()
  priority?: AiJobPriority;

  @IsString()
  @IsOptional()
  tag?: string;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(1)
  page?: number;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number;
}
