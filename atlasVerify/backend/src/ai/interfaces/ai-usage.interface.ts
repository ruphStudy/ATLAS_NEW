/**
 * IAiTokenUsage
 *
 * Standard token accounting, normalized across providers regardless of
 * how each provider reports usage natively.
 */
export interface IAiTokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * IAiCost
 *
 * Normalized monetary cost for a single request, derived from provider
 * token usage and the model's configured cost rates.
 */
export interface IAiCost {
  currency: string;
  amount: number;
  inputCost?: number;
  outputCost?: number;
}
