import { IsString, IsOptional, IsObject } from 'class-validator';

export class ExecuteAgentDto {
  @IsString()
  workspaceId!: string;

  @IsString()
  agentId!: string;

  @IsString()
  input!: string;

  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
