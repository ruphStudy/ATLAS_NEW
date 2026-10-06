import { IsString, IsOptional, IsDate, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export class ResolvePromptDto {
  @IsOptional()
  @IsString()
  workspaceId?: string;

  @IsOptional()
  @IsString()
  key?: string;

  @IsOptional()
  @IsString()
  useCase?: string;

  @IsOptional()
  @IsString()
  capability?: string;

  @IsOptional()
  @IsString()
  agentId?: string;

  @IsOptional()
  @IsString()
  locale?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  effectiveDate?: Date;
}

export class CompilePromptDto {
  @IsString()
  promptId!: string;

  @IsOptional()
  @IsString()
  workspaceId?: string;

  @IsObject()
  variables!: Record<string, unknown>;
}
