export enum GeminiModel {
  GEMINI_2_0_FLASH_EXP = 'gemini-2.0-flash-exp',
  GEMINI_1_5_PRO = 'gemini-1.5-pro',
  GEMINI_1_5_FLASH = 'gemini-1.5-flash',
  GEMINI_1_5_FLASH_8B = 'gemini-1.5-flash-8b',
  TEXT_EMBEDDING_004 = 'text-embedding-004',
  EMBEDDING_001 = 'embedding-001',
}

export enum GeminiCapability {
  TEXT_GENERATION = 'text_generation',
  VISION = 'vision',
  TOOL_CALLING = 'tool_calling',
  STRUCTURED_OUTPUT = 'structured_output',
  STREAMING = 'streaming',
  EMBEDDINGS = 'embeddings',
  LONG_CONTEXT = 'long_context',
  CODE_EXECUTION = 'code_execution',
}

export enum GeminiExecutionMode {
  SYNC = 'sync',
  ASYNC = 'async',
  STREAMING = 'streaming',
}

export interface IGeminiPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
  functionCall?: {
    name: string;
    args: Record<string, any>;
  };
  functionResponse?: {
    name: string;
    response: Record<string, any>;
  };
  executableCode?: {
    language: string;
    code: string;
  };
  codeExecutionResult?: {
    outcome: string;
    output: string;
  };
}

export interface IGeminiContent {
  role: 'user' | 'model';
  parts: IGeminiPart[];
}

export interface IGeminiTool {
  functionDeclarations?: Array<{
    name: string;
    description: string;
    parameters: Record<string, any>;
  }>;
  codeExecution?: Record<string, any>;
}

export interface IGeminiSafetySettings {
  category: string;
  threshold: string;
}

export interface IGeminiGenerationConfig {
  temperature?: number;
  topP?: number;
  topK?: number;
  candidateCount?: number;
  maxOutputTokens?: number;
  stopSequences?: string[];
  responseMimeType?: string;
  responseSchema?: Record<string, any>;
}

export interface IGeminiRequest {
  contents: IGeminiContent[];
  generationConfig?: IGeminiGenerationConfig;
  safetySettings?: IGeminiSafetySettings[];
  tools?: IGeminiTool[];
  systemInstruction?: {
    parts: IGeminiPart[];
  };
}

export interface IGeminiUsageMetadata {
  promptTokenCount: number;
  candidatesTokenCount: number;
  totalTokenCount: number;
}

export interface IGeminiCandidate {
  content: IGeminiContent;
  finishReason: string;
  safetyRatings?: Array<{
    category: string;
    probability: string;
  }>;
  citationMetadata?: {
    citations: Array<{
      startIndex: number;
      endIndex: number;
      uri: string;
      license: string;
    }>;
  };
}

export interface IGeminiResponse {
  candidates: IGeminiCandidate[];
  usageMetadata: IGeminiUsageMetadata;
  promptFeedback?: {
    blockReason?: string;
    safetyRatings?: Array<{
      category: string;
      probability: string;
    }>;
  };
}

export interface IGeminiError {
  error: {
    code: number;
    message: string;
    status: string;
  };
}

export interface IGeminiExecutionContext {
  workspaceId: string;
  model: string;
  capability: string;
  contents: IGeminiContent[];
  generationConfig?: IGeminiGenerationConfig;
  safetySettings?: IGeminiSafetySettings[];
  tools?: IGeminiTool[];
  systemInstruction?: string;
  timeout?: number;
  userId?: string;
}

export interface IGeminiExecutionResult {
  content: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  latencyMs: number;
  model: string;
  finishReason: string;
  functionCalls?: Array<{
    name: string;
    args: Record<string, any>;
  }>;
  safetyRatings?: Array<{
    category: string;
    probability: string;
  }>;
  metadata?: Record<string, any>;
}

export interface IGeminiHealthCheckResult {
  available: boolean;
  latencyMs?: number;
  modelsAvailable?: string[];
  error?: string;
}

export interface IGeminiModelInfo {
  id: string;
  name: string;
  capabilities: GeminiCapability[];
  contextWindow: number;
  maxOutputTokens: number;
  inputPricePer1k: number;
  outputPricePer1k: number;
  supportsVision: boolean;
  supportsTools: boolean;
  supportsStreaming: boolean;
  supportsCodeExecution: boolean;
}
