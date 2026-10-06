import { IsString, IsOptional, IsInt, Min } from 'class-validator';

export class CreatePromptVersionDto {
  @IsString()
  promptId!: string;

  @IsString()
  template!: string;

  @IsOptional()
  variables?: string[];

  @IsOptional()
  requiredVariables?: string[];

  @IsOptional()
  inputSchema?: unknown;

  @IsOptional()
  outputSchema?: unknown;

  @IsOptional()
  modelOverrides?: unknown;

  @IsOptional()
  @IsString()
  changeDescription?: string;

  @IsOptional()
  @IsString()
  createdBy?: string;
}

export class RollbackPromptDto {
  @IsString()
  promptId!: string;

  @IsInt()
  @Min(1)
  targetVersion!: number;

  @IsOptional()
  @IsString()
  workspaceId?: string;
}
