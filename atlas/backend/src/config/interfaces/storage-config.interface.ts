export interface IStorageFoundationConfig {
  readonly basePath: string;
  readonly maxFileSizeBytes: number;
  readonly defaultWorkspaceQuotaBytes: number;
  readonly accessTokenDefaultTtlMs: number;
}
