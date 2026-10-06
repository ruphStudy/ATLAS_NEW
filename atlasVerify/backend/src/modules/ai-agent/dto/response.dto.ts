import {
  IAiAgent,
  IAiAgentConfiguration,
  IAiAgentExecution,
  AiAgentStatus,
  AiAgentType,
  AiAgentExecutionStatus,
} from '../interfaces';

export class AiAgentResponseDto implements IAiAgent {
  id: string;
  workspaceId?: string | null;
  key: string;
  name: string;
  description?: string | null;
  type: AiAgentType;
  status: AiAgentStatus;
  capabilities: string[];
  primaryCapability: string;
  persona?: string | null;
  instructions?: string | null;
  systemPrompt?: string | null;
  modelId?: string | null;
  temperature?: number | null;
  maxTokens?: number | null;
  topP?: number | null;
  tools: unknown;
  toolChoice?: string | null;
  contextWindowSize?: number | null;
  maxTurns?: number | null;
  enableMemory: boolean;
  enableContext: boolean;
  timeout?: number | null;
  maxRetries: number;
  tags: string[];
  metadata: Record<string, unknown>;
  isDefault: boolean;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export class PaginatedAiAgentResponseDto {
  data: AiAgentResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class AgentConfigurationResponseDto implements IAiAgentConfiguration {
  id: string;
  workspaceId: string;
  agentId: string;
  useCase: string;
  overrideInstructions?: string | null;
  overrideSystemPrompt?: string | null;
  customModelId?: string | null;
  customParameters?: Record<string, unknown> | null;
  customTools?: unknown | null;
  enabled: boolean;
  priority: number;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export class AgentExecutionResponseDto implements IAiAgentExecution {
  id: string;
  workspaceId: string;
  agentId: string;
  sessionId?: string | null;
  workflowId?: string | null;
  input: string;
  context?: Record<string, unknown> | null;
  output?: string | null;
  status: AiAgentExecutionStatus;
  startTime: Date;
  endTime?: Date | null;
  totalTokens?: number | null;
  totalCost?: number | null;
  turns: number;
  stepsCompleted: number;
  errorCode?: string | null;
  errorMessage?: string | null;
  metadata: Record<string, unknown>;
  userId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class PaginatedExecutionResponseDto {
  data: AgentExecutionResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class AgentExecutionResultDto {
  executionId: string;
  output: string;
  turns: number;
  totalTokens: number;
  totalCost: number;
  duration: number;
  metadata: Record<string, unknown>;
}
