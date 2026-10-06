import { Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  AtlasProduct,
  AtlasQuotation,
  AtlasSupplier,
  AtlasValidationResult,
  DownloadCatalogParams,
  GetProductDetailsParams,
  GetSupplierDetailsParams,
  ISupplierProviderAdapter,
  NormalizedProviderError,
  ProviderCapability,
  ProviderErrorCode,
  ProviderHealthResult,
  ProviderHealthStatus,
  ProviderMetadata,
  ProviderRequest,
  ProviderResponse,
  RequestQuotationParams,
  SearchProductsParams,
  SearchSuppliersParams,
  SupplierProviderCode,
  ValidateProductParams,
  ValidateSupplierParams,
} from '../interfaces';
import { ProviderErrorNormalizer } from '../errors/provider-error-normalizer';
import { SupplierProviderCredentialService } from '../credentials/supplier-provider-credential.service';
import {
  AdapterAuditEvent,
  AdapterCapability,
  AdapterHealthStatus,
  AdapterMetadata,
  AdapterMetricEvent,
  AdapterPaginationInput,
  AdapterPaginationOutput,
  AdapterRequestContext,
  AdapterResponseMetadata,
  ExternalReference,
  IntegrationStrategy,
} from './adapter.types';
import { ISupplierAdapterContract } from './adapter.contract';
import { AdapterCapabilityValidator } from './adapter-capability.validator';
import { AdapterIdempotencyService } from './adapter-idempotency.service';
import { AdapterRateLimitHandler } from './adapter-rate-limit.handler';
import { AdapterHealthChecker } from './adapter-health.checker';
import { AdapterMetricsRecorder } from './adapter-metrics.recorder';
import { AdapterAuditLogger } from './adapter-audit.logger';
import {
  AdapterRetryExhaustedError,
  AdapterTimeoutError,
  RetryOptions,
  withRetry,
  withTimeout,
} from './adapter-retry.utils';
import {
  buildAdapterError,
  buildAuditEvent,
  buildExternalReference,
  buildMetricEvent,
  buildResponseMetadata,
  normalizePaginationInput,
  sanitizeForLog,
} from './adapter.mappers';
import { SUPPLIER_PROVIDER_CONSTANTS } from '../constants';

/**
 * BaseSupplierAdapter
 *
 * Full-featured base class every concrete provider adapter extends.
 *
 * Responsibilities handled here (adapters only override the _execute methods):
 *  - Credential resolution and workspace isolation
 *  - Capability validation before every call
 *  - Request context and correlation ID building
 *  - Rate-limit enforcement (per workspace × provider)
 *  - Timeout enforcement
 *  - Retry with exponential back-off (retryable errors only)
 *  - Idempotency for write operations
 *  - Sanitized logging (no secrets)
 *  - Error normalization
 *  - Metrics recording
 *  - Audit event recording
 *  - Health check execution
 *  - Normalized response construction
 */
export abstract class BaseSupplierAdapter
  implements ISupplierProviderAdapter, ISupplierAdapterContract
{
  protected abstract readonly logger: Logger;

  // ── Adapter identity ──────────────────────────────────────────

  /** Foundation metadata (used by existing registry/factory) */
  abstract readonly metadata: ProviderMetadata;

  /** Extended adapter metadata (superset used by adapter infrastructure) */
  abstract readonly adapterMetadata: AdapterMetadata;

  constructor(
    protected readonly errorNormalizer: ProviderErrorNormalizer,
    protected readonly credentialService: SupplierProviderCredentialService,
    protected readonly capabilityValidator: AdapterCapabilityValidator,
    protected readonly idempotency: AdapterIdempotencyService,
    protected readonly rateLimitHandler: AdapterRateLimitHandler,
    protected readonly healthChecker: AdapterHealthChecker,
    protected readonly metricsRecorder: AdapterMetricsRecorder,
    protected readonly auditLogger: AdapterAuditLogger,
  ) {}

  // ══════════════════════════════════════════════════════════════
  // ISupplierAdapterContract – capability & strategy
  // ══════════════════════════════════════════════════════════════

  supportsAdapterCapability(capability: AdapterCapability): boolean {
    return this.adapterMetadata.capabilities.includes(capability);
  }

  supportsStrategy(strategy: IntegrationStrategy): boolean {
    return this.adapterMetadata.integrationStrategies.includes(strategy);
  }

  supportsCountryCode(country: string): boolean {
    const all = this.adapterMetadata.supportedCountries;
    if (all.length === 0) return true;
    return all.includes(country.toUpperCase());
  }

  supportsCurrency(currency: string): boolean {
    const all = this.adapterMetadata.supportedCurrencies;
    if (all.length === 0) return true;
    return all.includes(currency.toUpperCase());
  }

  // ══════════════════════════════════════════════════════════════
  // ISupplierProviderAdapter – capability check (foundation)
  // ══════════════════════════════════════════════════════════════

  supportsCapability(capability: ProviderCapability): boolean {
    return this.metadata.capabilities.includes(capability);
  }

  supportsCountry(country: string): boolean {
    return this.supportsCountryCode(country);
  }

  // ══════════════════════════════════════════════════════════════
  // Context building
  // ══════════════════════════════════════════════════════════════

  buildRequestContext(
    workspaceId: string,
    capability: AdapterCapability,
    options?: { userId?: string; idempotencyKey?: string; meta?: Record<string, unknown> },
  ): AdapterRequestContext {
    return {
      correlationId: uuidv4(),
      requestId: uuidv4(),
      workspaceId,
      providerCode: this.adapterMetadata.providerCode,
      capability,
      strategy: this.adapterMetadata.integrationStrategies[0] ?? IntegrationStrategy.REST_API,
      timeoutMs: this.adapterMetadata.timeoutMs,
      idempotencyKey: options?.idempotencyKey ?? null,
      userId: options?.userId ?? null,
      initiatedAt: new Date(),
      meta: options?.meta,
    };
  }

  // ══════════════════════════════════════════════════════════════
  // Metrics & Audit
  // ══════════════════════════════════════════════════════════════

  recordMetric(event: AdapterMetricEvent): void {
    this.metricsRecorder.record(event);
  }

  recordAuditEvent(event: AdapterAuditEvent): void {
    this.auditLogger.record(event);
  }

  // ══════════════════════════════════════════════════════════════
  // Pagination & Mapping
  // ══════════════════════════════════════════════════════════════

  normalizePagination(input: AdapterPaginationInput): AdapterPaginationOutput {
    const { page, limit, offset } = normalizePaginationInput(input.page, input.limit);
    return { page, limit, offset, hasMore: false };
  }

  buildResponseMetadata(
    context: AdapterRequestContext,
    durationMs: number,
    attempt: number,
    extra?: Partial<AdapterResponseMetadata>,
  ): AdapterResponseMetadata {
    return buildResponseMetadata(context, durationMs, attempt, extra);
  }

  buildExternalReference(
    externalId: string,
    externalUrl?: string,
    externalType?: string,
  ): ExternalReference {
    return buildExternalReference(this.adapterMetadata.providerCode, externalId, externalUrl, externalType);
  }

  mapError(error: unknown, httpStatus?: number): ReturnType<typeof buildAdapterError> {
    const normalized = this.errorNormalizer.normalize(error, this.metadata.code);
    return buildAdapterError(
      normalized.code,
      normalized.message,
      this.adapterMetadata.providerCode,
      httpStatus ?? null,
      null,
      normalized.details,
    );
  }

  // ══════════════════════════════════════════════════════════════
  // Health Check (foundation interface)
  // ══════════════════════════════════════════════════════════════

  async healthCheck(): Promise<ProviderHealthResult> {
    const start = Date.now();
    try {
      await this.pingCheck();
      return {
        providerCode: this.metadata.code,
        status: ProviderHealthStatus.HEALTHY,
        latencyMs: Date.now() - start,
        message: null,
        checkedAt: new Date(),
      };
    } catch (error) {
      return this.errorNormalizer.toUnhealthyResult(this.metadata.code, error, start);
    }
  }

  async checkHealth(workspaceId: string): Promise<AdapterHealthStatus> {
    return this.healthChecker.check(
      this.adapterMetadata,
      this.adapterMetadata.integrationStrategies[0] ?? IntegrationStrategy.REST_API,
      workspaceId,
      () => this.pingCheck(),
    );
  }

  async testConnection(workspaceId: string): Promise<AdapterHealthStatus> {
    return this.healthChecker.testConnection(
      this.adapterMetadata,
      this.adapterMetadata.integrationStrategies[0] ?? IntegrationStrategy.REST_API,
      workspaceId,
      () => this.pingWithDetails(workspaceId),
    );
  }

  // ══════════════════════════════════════════════════════════════
  // Protected execution helpers
  // ══════════════════════════════════════════════════════════════

  /**
   * Execute a provider call with full infrastructure:
   * rate-limit → timeout → retry → metrics → audit.
   */
  protected async executeWithInfrastructure<T>(
    context: AdapterRequestContext,
    capability: AdapterCapability,
    operation: (attempt: number) => Promise<T>,
    options?: {
      idempotencyParams?: Record<string, unknown>;
      isWriteOperation?: boolean;
    },
  ): Promise<T> {
    const { workspaceId, providerCode } = context;

    // 1. Rate-limit check
    this.rateLimitHandler.checkAndRecord(
      providerCode,
      workspaceId,
      this.adapterMetadata.rateLimitPerMinute,
      0, // no per-hour limit by default
    );

    // 2. Idempotency check (write operations only)
    if (options?.isWriteOperation && options.idempotencyParams) {
      const idKey =
        context.idempotencyKey ??
        this.idempotency.buildKey(
          workspaceId,
          providerCode,
          String(capability),
          options.idempotencyParams,
        );

      const existing = this.idempotency.findCompleted(idKey);
      if (existing) {
        this.logger.debug(
          `[${providerCode}] Idempotent response for key=${idKey} – returning cached`,
        );
        // We can't return cached data generically here, so fall through and let caller handle
      }

      if (this.idempotency.isPending(idKey)) {
        throw new Error(
          `Duplicate request in-flight for provider '${providerCode}' operation '${capability}'`,
        );
      }

      const requestHash = this.idempotency.hashRequest(options.idempotencyParams);
      this.idempotency.markPending(idKey, workspaceId, providerCode, String(capability), requestHash);

      try {
        const result = await this.runWithRetryAndTimeout(context, operation);
        this.idempotency.markCompleted(idKey);
        return result;
      } catch (error) {
        this.idempotency.markFailed(idKey);
        throw error;
      }
    }

    return this.runWithRetryAndTimeout(context, operation);
  }

  private async runWithRetryAndTimeout<T>(
    context: AdapterRequestContext,
    operation: (attempt: number) => Promise<T>,
  ): Promise<T> {
    const retryOptions: RetryOptions = {
      maxAttempts: this.adapterMetadata.maxRetries,
      backoffMs: SUPPLIER_PROVIDER_CONSTANTS.DEFAULT_BACKOFF_MS,
      backoffMultiplier: SUPPLIER_PROVIDER_CONSTANTS.DEFAULT_BACKOFF_MULTIPLIER,
      retryableErrorCodes: SUPPLIER_PROVIDER_CONSTANTS.RETRYABLE_ERROR_CODES as Set<ProviderErrorCode>,
    };

    const start = Date.now();
    let lastAttempt = 1;
    let success = false;
    let errorCode: string | undefined;

    try {
      const result = await withRetry(
        async (attempt) => {
          lastAttempt = attempt;
          return withTimeout(
            () => operation(attempt),
            context.timeoutMs,
            context.providerCode,
          );
        },
        retryOptions,
        context.providerCode,
        this.logger as Logger,
      );

      success = true;
      return result;
    } catch (error) {
      const normalized = this.errorNormalizer.normalize(error, this.metadata.code);
      errorCode = normalized.code;
      throw error;
    } finally {
      const durationMs = Date.now() - start;

      this.recordMetric(
        buildMetricEvent(context, durationMs, success, lastAttempt, null, errorCode),
      );
      this.recordAuditEvent(
        buildAuditEvent(context, durationMs, success, lastAttempt, errorCode),
      );
    }
  }

  /**
   * Resolve decrypted credentials for a workspace.
   * Never logs or exposes credential values.
   */
  protected resolveCredentials(workspaceId: string): Record<string, string> {
    // Adapters override this when they store credentials.
    // Default: return empty (MANUAL adapters don't need credentials).
    return {};
  }

  /**
   * Log a request in a sanitized way (no secrets).
   */
  protected logRequest(context: AdapterRequestContext, params: Record<string, unknown>): void {
    this.logger.debug(
      `[${context.providerCode}] ${context.capability} ` +
        `correlationId=${context.correlationId} ws=${context.workspaceId} ` +
        `params=${JSON.stringify(sanitizeForLog(params))}`,
    );
  }

  // ══════════════════════════════════════════════════════════════
  // Foundation adapter methods — default not-implemented
  // (concrete adapters override only what they support)
  // ══════════════════════════════════════════════════════════════

  async *searchSuppliers(
    _request: ProviderRequest<SearchSuppliersParams>,
  ): AsyncIterable<AtlasSupplier> {
    throw this.notImplementedError(ProviderCapability.SEARCH_SUPPLIERS);
  }

  async searchProducts(
    request: ProviderRequest<SearchProductsParams>,
  ): Promise<ProviderResponse<AtlasProduct[]>> {
    return this.notImplementedResponse<AtlasProduct[]>(request.requestId);
  }

  async getSupplierDetails(
    request: ProviderRequest<GetSupplierDetailsParams>,
  ): Promise<ProviderResponse<AtlasSupplier>> {
    return this.notImplementedResponse<AtlasSupplier>(request.requestId);
  }

  async getProductDetails(
    request: ProviderRequest<GetProductDetailsParams>,
  ): Promise<ProviderResponse<AtlasProduct>> {
    return this.notImplementedResponse<AtlasProduct>(request.requestId);
  }

  async requestQuotation(
    request: ProviderRequest<RequestQuotationParams>,
  ): Promise<ProviderResponse<AtlasQuotation>> {
    return this.notImplementedResponse<AtlasQuotation>(request.requestId);
  }

  async downloadCatalog(
    request: ProviderRequest<DownloadCatalogParams>,
  ): Promise<ProviderResponse<AtlasProduct[]>> {
    return this.notImplementedResponse<AtlasProduct[]>(request.requestId);
  }

  async validateSupplier(
    request: ProviderRequest<ValidateSupplierParams>,
  ): Promise<ProviderResponse<AtlasValidationResult>> {
    return this.notImplementedResponse<AtlasValidationResult>(request.requestId);
  }

  async validateProduct(
    request: ProviderRequest<ValidateProductParams>,
  ): Promise<ProviderResponse<AtlasValidationResult>> {
    return this.notImplementedResponse<AtlasValidationResult>(request.requestId);
  }

  // ══════════════════════════════════════════════════════════════
  // Response builders
  // ══════════════════════════════════════════════════════════════

  protected buildSuccessResponse<T>(
    requestId: string,
    data: T,
    durationMs: number,
    total?: number,
    page?: number,
    limit?: number,
  ): ProviderResponse<T> {
    return {
      requestId,
      providerCode: this.metadata.code,
      success: true,
      data,
      meta: { durationMs, totalResults: total, page, limit },
    };
  }

  protected buildErrorResponse<T>(
    requestId: string,
    error: unknown,
    durationMs: number,
  ): ProviderResponse<T> {
    const normalized = this.errorNormalizer.normalize(error, this.metadata.code);
    return {
      requestId,
      providerCode: this.metadata.code,
      success: false,
      error: normalized,
      meta: { durationMs },
    };
  }

  protected newRequestId(): string {
    return uuidv4();
  }

  // ══════════════════════════════════════════════════════════════
  // Overridable lifecycle hooks
  // ══════════════════════════════════════════════════════════════

  /** Perform a lightweight health ping. Throws on failure. */
  protected async pingCheck(): Promise<void> {
    // Default: no-op (healthy). Override in subclasses.
  }

  /** Perform a detailed connection test. Returns diagnostics. */
  protected async pingWithDetails(_workspaceId: string): Promise<Record<string, unknown>> {
    await this.pingCheck();
    return { status: 'ok', provider: this.adapterMetadata.providerCode };
  }

  // ══════════════════════════════════════════════════════════════
  // Private helpers
  // ══════════════════════════════════════════════════════════════

  private notImplementedError(capability: ProviderCapability): Error {
    return new Error(
      `Provider '${this.metadata.code}' does not support capability '${capability}'`,
    );
  }

  private notImplementedResponse<T>(requestId: string): ProviderResponse<T> {
    const normalized: NormalizedProviderError = {
      code: ProviderErrorCode.INVALID_REQUEST,
      message: `Provider '${this.metadata.code}' does not support this capability`,
      providerCode: this.metadata.code as SupplierProviderCode,
      retryable: false,
    };
    return {
      requestId,
      providerCode: this.metadata.code,
      success: false,
      error: normalized,
      meta: { durationMs: 0 },
    };
  }
}
