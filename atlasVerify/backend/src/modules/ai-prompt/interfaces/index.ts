export enum AiPromptType {
  SYSTEM = 'SYSTEM',
  USER = 'USER',
  AGENT = 'AGENT',
  VALIDATION = 'VALIDATION',
  TRANSFORMATION = 'TRANSFORMATION',
  FORMATTING = 'FORMATTING',
}

export enum AiPromptStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  DEPRECATED = 'DEPRECATED',
  ARCHIVED = 'ARCHIVED',
}

export enum AiPromptEvent {
  PROMPT_CREATED = 'ai-prompt.created',
  PROMPT_UPDATED = 'ai-prompt.updated',
  PROMPT_PUBLISHED = 'ai-prompt.published',
  PROMPT_DEPRECATED = 'ai-prompt.deprecated',
  PROMPT_ARCHIVED = 'ai-prompt.archived',
  PROMPT_RESOLVED = 'ai-prompt.resolved',
  VERSION_CREATED = 'ai-prompt.version_created',
  ROLLBACK_EXECUTED = 'ai-prompt.rollback_executed',
  CACHE_INVALIDATED = 'ai-prompt.cache_invalidated',
  USAGE_TRACKED = 'ai-prompt.usage_tracked',
}

export interface IAiPrompt {
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

export interface IAiPromptVersion {
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

export interface IAiPromptUsage {
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

export interface IPromptResolutionCriteria {
  workspaceId?: string;
  key?: string;
  useCase?: string;
  capability?: string;
  agentId?: string;
  locale?: string;
  effectiveDate?: Date;
}

export interface IResolvedPrompt {
  prompt: IAiPrompt;
  compiledTemplate: string;
  variables: string[];
  requiredVariables: string[];
  resolvedFrom: 'workspace' | 'global' | 'default';
}

export interface IPromptEventPayload {
  event: AiPromptEvent;
  workspaceId?: string;
  promptId?: string;
  version?: number;
  status?: string;
  metadata?: Record<string, unknown>;
}
