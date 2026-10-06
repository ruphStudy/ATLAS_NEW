export interface IAiProviderFoundationConfig {
  readonly defaultProviderKey: string | undefined;
  readonly requestTimeoutMs: number;
  readonly maxRetryAttempts: number;
  readonly retryBackoffMs: number;
  readonly maxRequestsPerMinute: number;
  readonly useCaseProviderMap: Readonly<Record<string, string>>;
}
