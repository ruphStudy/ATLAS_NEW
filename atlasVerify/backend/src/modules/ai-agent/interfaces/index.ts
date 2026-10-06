export enum AiAgentStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DEPRECATED = 'DEPRECATED',
  DRAFT = 'DRAFT',
  ARCHIVED = 'ARCHIVED',
}

export enum AiAgentType {
  CONVERSATIONAL = 'CONVERSATIONAL',
  TASK = 'TASK',
  WORKFLOW = 'WORKFLOW',
  AUTONOMOUS = 'AUTONOMOUS',
  SPECIALIST = 'SPECIALIST',
  ORCHESTRATOR = 'ORCHESTRATOR',
}

export enum AiAgentExecutionStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  PAUSED = 'PAUSED',
  TIMEOUT = 'TIMEOUT',
}

export enum AiAgentEvent {
  AGENT_CREATED = 'ai-agent.created',
  AGENT_UPDATED = 'ai-agent.updated',
  AGENT_ACTIVATED = 'ai-agent.activated',
  AGENT_DEACTIVATED = 'ai-agent.deactivated',
  AGENT_ARCHIVED = 'ai-agent.archived',
  EXECUTION_STARTED = 'ai-agent.execution_started',
  EXECUTION_COMPLETED = 'ai-agent.execution_completed',
  EXECUTION_FAILED = 'ai-agent.execution_failed',
  EXECUTION_CANCELLED = 'ai-agent.execution_cancelled',
  TURN_COMPLETED = 'ai-agent.turn_completed',
  WORKFLOW_STARTED = 'ai-agent.workflow_started',
  WORKFLOW_COMPLETED = 'ai-agent.workflow_completed',
}

export interface IAiAgent {
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

export interface IAiAgentConfiguration {
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

export interface IAiAgentExecution {
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

export interface IAiAgentContext {
  id: string;
  executionId: string;
  workspaceId: string;
  turnNumber: number;
  userMessage?: string | null;
  agentResponse?: string | null;
  toolCalls?: unknown | null;
  toolResults?: unknown | null;
  contextData?: Record<string, unknown> | null;
  tokens?: number | null;
  cost?: number | null;
  latency?: number | null;
  createdAt: Date;
}

export interface IAiAgentWorkflow {
  id: string;
  workspaceId: string;
  agentId: string;
  name: string;
  description?: string | null;
  steps: unknown;
  enabled: boolean;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IAgentExecutionResult {
  executionId: string;
  output: string;
  turns: number;
  totalTokens: number;
  totalCost: number;
  duration: number;
  metadata: Record<string, unknown>;
}

export interface IAgentEventPayload {
  event: AiAgentEvent;
  workspaceId: string;
  agentId?: string;
  executionId?: string;
  status?: string;
  metadata?: Record<string, unknown>;
}
