export enum OpenAiModel {
  GPT_4_TURBO = 'gpt-4-turbo',
  GPT_4 = 'gpt-4',
  GPT_4_32K = 'gpt-4-32k',
  GPT_35_TURBO = 'gpt-3.5-turbo',
  GPT_4_O = 'gpt-4o',
  GPT_4_O_MINI = 'gpt-4o-mini',
  O1_PREVIEW = 'o1-preview',
  O1_MINI = 'o1-mini',
  DALL_E_3 = 'dall-e-3',
  DALL_E_2 = 'dall-e-2',
  TEXT_EMBEDDING_3_LARGE = 'text-embedding-3-large',
  TEXT_EMBEDDING_3_SMALL = 'text-embedding-3-small',
  TEXT_EMBEDDING_ADA_002 = 'text-embedding-ada-002',
}

export enum OpenAiCapability {
  TEXT_GENERATION = 'text_generation',
  REASONING = 'reasoning',
  VISION = 'vision',
  IMAGE_GENERATION = 'image_generation',
  EMBEDDINGS = 'embeddings',
  STRUCTURED_OUTPUT = 'structured_output',
  STREAMING = 'streaming',
  TOOL_CALLING = 'tool_calling',
}

export enum OpenAiExecutionMode {
  SYNC = 'sync',
  ASYNC = 'async',
  STREAMING = 'streaming',
}

export interface IOpenAiRequest {
  model: string;
  messages?: Array<{
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
    name?: string;
    tool_calls?: any[];
    tool_call_id?: string;
  }>;
  prompt?: string;
  input?: string | string[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  n?: number;
  stream?: boolean;
  stop?: string | string[];
  response_format?: { type: 'text' | 'json_object' };
  tools?: any[];
  tool_choice?: string | object;
  size?: string;
  quality?: string;
  style?: string;
  encoding_format?: string;
  dimensions?: number;
}

export interface IOpenAiResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices?: Array<{
    index: number;
    message?: {
      role: string;
      content: string;
      tool_calls?: any[];
    };
    finish_reason: string;
    logprobs?: any;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  data?: Array<{
    embedding: number[];
    index: number;
  }>;
  url?: string;
  revised_prompt?: string;
}

export interface IOpenAiError {
  error: {
    message: string;
    type: string;
    param?: string;
    code?: string;
  };
}

export interface IOpenAiExecutionContext {
  workspaceId: string;
  orchestratorRequestId?: string;
  agentExecutionId?: string;
  workflowExecutionId?: string;
  userId?: string;
  capability: string;
  useCase?: string;
  idempotencyKey?: string;
  timeout?: number;
  retryAttempt?: number;
}

export interface IOpenAiExecutionResult {
  content: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  latencyMs: number;
  model: string;
  finishReason?: string;
  providerId: string;
  metadata: Record<string, unknown>;
}

export interface IOpenAiHealthCheckResult {
  available: boolean;
  latencyMs?: number;
  error?: string;
  modelsAvailable: string[];
  rateLimit?: {
    limit: number;
    remaining: number;
    reset: Date;
  };
}

export interface IOpenAiModelInfo {
  id: string;
  name: string;
  capabilities: OpenAiCapability[];
  contextWindow: number;
  maxOutputTokens: number;
  inputPricePer1k: number;
  outputPricePer1k: number;
  supportsVision: boolean;
  supportsTools: boolean;
  supportsStreaming: boolean;
  supportsJson: boolean;
}
