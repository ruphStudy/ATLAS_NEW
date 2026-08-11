import {
  AiContextType,
  AiContextStatus,
  AiContextPriority,
} from '../interfaces';

export class AiContextResponseDto {
  id: string;
  workspaceId: string;
  type: AiContextType;
  status: AiContextStatus;
  priority: AiContextPriority;
  correlationId?: string | null;
  parentContextId?: string | null;
  userId?: string | null;
  sessionId?: string | null;
  workflowExecutionId?: string | null;
  agentExecutionId?: string | null;
  taskId?: string | null;
  variables?: unknown | null;
  conversationHistory?: unknown | null;
  toolResults?: unknown | null;
  businessReferences?: unknown | null;
  executionMetadata?: unknown | null;
  summary?: string | null;
  version: number;
  sizeBytes?: number | null;
  tokenEstimate?: number | null;
  maxTokens?: number | null;
  windowSize?: number | null;
  source?: string | null;
  expiresAt?: Date | null;
  lastAccessedAt?: Date | null;
  allowInheritance: boolean;
  allowBranching: boolean;
  tags: string[];
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export class PaginatedContextResponseDto {
  data: AiContextResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class ContextMergeResultDto {
  contextId: string;
  version: number;
  mergedVariables: unknown;
  tokensAdded: number;
  tokenEstimate: number;
}

export class ContextSummaryResultDto {
  contextId: string;
  summary: string;
  originalTokens: number;
  summaryTokens: number;
  compressionRatio: number;
}
