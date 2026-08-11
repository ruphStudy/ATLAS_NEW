export enum AnthropicModel {
  CLAUDE_3_5_SONNET = 'claude-3-5-sonnet-20241022',
  CLAUDE_3_5_HAIKU = 'claude-3-5-haiku-20241022',
  CLAUDE_3_OPUS = 'claude-3-opus-20240229',
  CLAUDE_3_SONNET = 'claude-3-sonnet-20240229',
  CLAUDE_3_HAIKU = 'claude-3-haiku-20240307',
}

export enum AnthropicCapability {
  TEXT_GENERATION = 'text_generation',
  VISION = 'vision',
  TOOL_CALLING = 'tool_calling',
  STRUCTURED_OUTPUT = 'structured_output',
  STREAMING = 'streaming',
  LONG_CONTEXT = 'long_context',
}

export enum AnthropicExecutionMode {
  SYNC = 'sync',
  ASYNC = 'async',
  STREAMING = 'streaming',
}

export interface IAnthropicMessage {
  role: 'user' | 'assistant';
  content: string | IAnthropicContentBlock[];
}

export interface IAnthropicContentBlock {
  type: 'text' | 'image' | 'tool_use' | 'tool_result';
  text?: string;
  source?: {
    type: 'base64' | 'url';
    media_type?: string;
    data?: string;
    url?: string;
  };
  id?: string;
  name?: string;
  input?: Record<string, any>;
  tool_use_id?: string;
  content?: string;
  is_error?: boolean;
}

export interface IAnthropicTool {
  name: string;
  description: string;
  input_schema: Record<string, any>;
}

export interface IAnthropicRequest {
  model: string;
  messages: IAnthropicMessage[];
  max_tokens: number;
  system?: string;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  stop_sequences?: string[];
  stream?: boolean;
  tools?: IAnthropicTool[];
  tool_choice?: { type: 'auto' | 'any' | 'tool'; name?: string };
  metadata?: {
    user_id?: string;
  };
}

export interface IAnthropicUsage {
  input_tokens: number;
  output_tokens: number;
}

export interface IAnthropicResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: IAnthropicContentBlock[];
  model: string;
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use' | null;
  stop_sequence: string | null;
  usage: IAnthropicUsage;
}

export interface IAnthropicError {
  type: 'error';
  error: {
    type: string;
    message: string;
  };
}

export interface IAnthropicExecutionContext {
  workspaceId: string;
  model: string;
  capability: string;
  messages: IAnthropicMessage[];
  maxTokens: number;
  system?: string;
  temperature?: number;
  topP?: number;
  topK?: number;
  stopSequences?: string[];
  stream?: boolean;
  tools?: IAnthropicTool[];
  toolChoice?: { type: 'auto' | 'any' | 'tool'; name?: string };
  timeout?: number;
  idempotencyKey?: string;
  userId?: string;
}

export interface IAnthropicExecutionResult {
  content: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  latencyMs: number;
  model: string;
  stopReason: string | null;
  providerId: string;
  toolUses?: Array<{
    id: string;
    name: string;
    input: Record<string, any>;
  }>;
  metadata?: Record<string, any>;
}

export interface IAnthropicHealthCheckResult {
  available: boolean;
  latencyMs?: number;
  modelsAvailable?: string[];
  error?: string;
}

export interface IAnthropicModelInfo {
  id: string;
  name: string;
  capabilities: AnthropicCapability[];
  contextWindow: number;
  maxOutputTokens: number;
  inputPricePer1k: number;
  outputPricePer1k: number;
  supportsVision: boolean;
  supportsTools: boolean;
  supportsStreaming: boolean;
}
