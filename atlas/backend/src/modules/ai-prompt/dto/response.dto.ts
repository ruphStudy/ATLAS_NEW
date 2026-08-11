import {
  IAiPrompt,
  IAiPromptVersion,
  IAiPromptUsage,
  AiPromptType,
  AiPromptStatus,
} from '../interfaces';

export class AiPromptResponseDto implements IAiPrompt {
  id: string;
  workspaceId?: string | null;
  key: string;
  name: string;
  description?: string | null;
  type: AiPromptType;
  useCase: string;
  capability?: string | null;
  agentId?: string | null;
  version: number;
  status: AiPromptStatus;
  template: string;
  variables: unknown;
  requiredVariables: unknown;
  inputSchema?: unknown | null;
  outputSchema?: unknown | null;
  locale: string;
  modelOverrides?: unknown | null;
  effectiveFrom?: Date | null;
  effectiveUntil?: Date | null;
  parentPromptId?: string | null;
  usageCount: number;
  qualityScore?: number | null;
  failureCount: number;
  tags: string[];
  metadata: Record<string, unknown>;
  publishedAt?: Date | null;
  publishedBy?: string | null;
  createdBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export class PaginatedAiPromptResponseDto {
  data: AiPromptResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class PromptVersionResponseDto implements IAiPromptVersion {
  id: string;
  promptId: string;
  version: number;
  template: string;
  variables: unknown;
  requiredVariables: unknown;
  inputSchema?: unknown | null;
  outputSchema?: unknown | null;
  modelOverrides?: unknown | null;
  changeDescription?: string | null;
  createdBy?: string | null;
  createdAt: Date;
}

export class ResolvedPromptResponseDto {
  prompt: AiPromptResponseDto;
  compiledTemplate: string;
  variables: string[];
  requiredVariables: string[];
  resolvedFrom: 'workspace' | 'global' | 'default';
}

export class CompiledPromptResponseDto {
  promptId: string;
  version: number;
  compiled: string;
  variables: Record<string, unknown>;
}

export class PromptUsageResponseDto implements IAiPromptUsage {
  id: string;
  workspaceId: string;
  promptId: string;
  version: number;
  executionId?: string | null;
  agentExecutionId?: string | null;
  variables?: unknown | null;
  success: boolean;
  inputTokens?: number | null;
  outputTokens?: number | null;
  cost?: number | null;
  latency?: number | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export class PromptStatsResponseDto {
  totalUsage: number;
  successRate: number;
  averageTokens: number;
  totalCost: number;
  qualityScore: number;
}
