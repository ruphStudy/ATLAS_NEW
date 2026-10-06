export enum AiContextType {
  REQUEST = 'REQUEST',
  SESSION = 'SESSION',
  WORKFLOW = 'WORKFLOW',
  AGENT = 'AGENT',
  TASK = 'TASK',
  WORKSPACE = 'WORKSPACE',
}

export enum AiContextStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  ARCHIVED = 'ARCHIVED',
  SUMMARIZED = 'SUMMARIZED',
}

export enum AiContextPriority {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  NORMAL = 'NORMAL',
  LOW = 'LOW',
}

export enum AiContextEvent {
  CONTEXT_CREATED = 'ai-context.created',
  CONTEXT_UPDATED = 'ai-context.updated',
  CONTEXT_MERGED = 'ai-context.merged',
  CONTEXT_SUMMARIZED = 'ai-context.summarized',
  CONTEXT_TRIMMED = 'ai-context.trimmed',
  CONTEXT_EXPIRED = 'ai-context.expired',
  CONTEXT_ARCHIVED = 'ai-context.archived',
  CONTEXT_BRANCHED = 'ai-context.branched',
  CONTEXT_HANDED_OFF = 'ai-context.handed_off',
  CONTEXT_ACCESSED = 'ai-context.accessed',
  CONTEXT_INVALIDATED = 'ai-context.invalidated',
  VERSION_CREATED = 'ai-context.version_created',
}

export interface IAiContext {
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
  deletedAt?: Date | null;
}

export interface IAiContextVersion {
  id: string;
  contextId: string;
  workspaceId: string;
  version: number;
  variables?: unknown | null;
  conversationHistory?: unknown | null;
  toolResults?: unknown | null;
  businessReferences?: unknown | null;
  executionMetadata?: unknown | null;
  summary?: string | null;
  sizeBytes?: number | null;
  tokenEstimate?: number | null;
  changeReason?: string | null;
  changedBy?: string | null;
  metadata: unknown;
  createdAt: Date;
}

export interface IAiContextCache {
  id: string;
  contextId: string;
  workspaceId: string;
  cacheKey: string;
  cachedData: unknown;
  ttl?: number | null;
  expiresAt?: Date | null;
  hits: number;
  lastHitAt?: Date | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAiContextEventRecord {
  id: string;
  contextId: string;
  workspaceId: string;
  eventType: string;
  version?: number | null;
  oldStatus?: string | null;
  newStatus?: string | null;
  changesSummary?: string | null;
  triggeredBy?: string | null;
  metadata: unknown;
  createdAt: Date;
}

export interface IContextEventPayload {
  event: AiContextEvent;
  workspaceId: string;
  contextId: string;
  version?: number;
  status?: string;
  metadata?: unknown;
}

export interface IContextResolveParams {
  workspaceId: string;
  userId?: string;
  sessionId?: string;
  workflowExecutionId?: string;
  agentExecutionId?: string;
  taskId?: string;
  correlationId?: string;
}

export interface IContextMergeResult {
  contextId: string;
  version: number;
  mergedVariables: unknown;
  tokensAdded: number;
  tokenEstimate: number;
}

export interface IContextSummaryResult {
  contextId: string;
  summary: string;
  originalTokens: number;
  summaryTokens: number;
  compressionRatio: number;
}

export interface IConversationMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  timestamp?: Date;
  metadata?: unknown;
}

export interface IContextWindow {
  maxTokens: number;
  currentTokens: number;
  messages: IConversationMessage[];
  trimmed: boolean;
}

export interface IRetentionPolicy {
  maxAge?: number;
  maxSizeBytes?: number;
  maxTokens?: number;
  autoSummarize?: boolean;
  autoArchive?: boolean;
}
