import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
} from 'class-validator';

export class ExecuteJobDto {
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsString()
  @IsNotEmpty()
  jobId: string;

  @IsObject()
  @IsOptional()
  input?: unknown;

  @IsString()
  @IsOptional()
  triggeredBy?: string;

  @IsObject()
  @IsOptional()
  metadata?: unknown;
}
