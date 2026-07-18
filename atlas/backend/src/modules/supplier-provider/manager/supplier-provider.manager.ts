import { Injectable, Logger } from '@nestjs/common';
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
  ProviderAuditEvent,
  ProviderCapability,
  ProviderHealthResult,
  ProviderRequest,
  ProviderResponse,
  ProviderRetryPolicy,
  RequestQuotationParams,
  SearchProductsParams,
  SearchSuppliersParams,
  SupplierProviderCode,
  ValidateProductParams,
  ValidateSupplierParams,
  WorkspaceProviderConfig,
} from '../interfaces';
import { SupplierProviderRegistry } from '../registry/supplier-provider.registry';
import { SupplierProviderFactory } from '../registry/supplier-provider.factory';
import { SupplierProviderHealthMonitor } from '../health/supplier-provider-health.monitor';
import { ProviderErrorNormalizer } from '../errors/provider-error-normalizer';
import { SUPPLIER_PROVIDER_CONSTANTS } from '../constants';

/**
 * SupplierProviderManager
 *
 * The single facade that all business modules use to interact with supplier providers.
 * Handles: provider selection, failover, retry, timeout, audit logging.
 *
 * Business modules MUST NOT import concrete adapter classes.
 */
@Injectable()
export class SupplierProviderManager {
  private readonly logger = new Logger(SupplierProviderManager.name);

  constructor(
    private readonly registry: SupplierProviderRegistry,
    private readonly factory: SupplierProviderFactory,
    private readonly healthMonitor: SupplierProviderHealthMonitor,
    private readonly errorNormalizer: ProviderErrorNormalizer,
  ) {}

  // ── Public API ────────────────────────────────────────────────

  async *searchSuppliers(
    workspaceId: string,
    params: SearchSuppliersParams,
    options?: {
      providerCode?: SupplierProviderCode;
      configs?: WorkspaceProviderConfig[];
      timeoutMs?: number;
    },
  ): AsyncIterable<AtlasSupplier> {
    const adapter = this.selectAdapter(
      workspaceId,
      ProviderCapability.SEARCH_SUPPLIERS,
      options?.providerCode,
      options?.configs,
    );

    const request = this.buildRequest<SearchSuppliersParams>(
      workspaceId,
      adapter.metadata.code,
      params,
      options?.timeoutMs,
    );

    yield* this.withErrorHandling(adapter, ProviderCapability.SEARCH_SUPPLIERS, () =>
      adapter.searchSuppliers(request),
    );
  }

  async searchProducts(
    workspaceId: string,
    params: SearchProductsParams,
    options?: {
      providerCode?: SupplierProviderCode;
      configs?: WorkspaceProviderConfig[];
      timeoutMs?: number;
    },
  ): Promise<ProviderResponse<AtlasProduct[]>> {
    const adapter = this.selectAdapter(
      workspaceId,
      ProviderCapability.SEARCH_PRODUCTS,
      options?.providerCode,
      options?.configs,
    );
    const request = this.buildRequest<SearchProductsParams>(
      workspaceId, adapter.metadata.code, params, options?.timeoutMs,
    );
    return this.executeWithRetry(adapter, ProviderCapability.SEARCH_PRODUCTS, () =>
      adapter.searchProducts(request),
    );
  }

  async getSupplierDetails(
    workspaceId: string,
    params: GetSupplierDetailsParams,
    options?: {
      providerCode?: SupplierProviderCode;
      configs?: WorkspaceProviderConfig[];
      timeoutMs?: number;
    },
  ): Promise<ProviderResponse<AtlasSupplier>> {
    const adapter = this.selectAdapter(
      workspaceId,
      ProviderCapability.GET_SUPPLIER_DETAILS,
      options?.providerCode,
      options?.configs,
    );
    const request = this.buildRequest<GetSupplierDetailsParams>(
      workspaceId, adapter.metadata.code, params, options?.timeoutMs,
    );
    return this.executeWithRetry(adapter, ProviderCapability.GET_SUPPLIER_DETAILS, () =>
      adapter.getSupplierDetails(request),
    );
  }

  async getProductDetails(
    workspaceId: string,
    params: GetProductDetailsParams,
    options?: {
      providerCode?: SupplierProviderCode;
      configs?: WorkspaceProviderConfig[];
      timeoutMs?: number;
    },
  ): Promise<ProviderResponse<AtlasProduct>> {
    const adapter = this.selectAdapter(
      workspaceId,
      ProviderCapability.GET_PRODUCT_DETAILS,
      options?.providerCode,
      options?.configs,
    );
    const request = this.buildRequest<GetProductDetailsParams>(
      workspaceId, adapter.metadata.code, params, options?.timeoutMs,
    );
    return this.executeWithRetry(adapter, ProviderCapability.GET_PRODUCT_DETAILS, () =>
      adapter.getProductDetails(request),
    );
  }

  async requestQuotation(
    workspaceId: string,
    params: RequestQuotationParams,
    options?: {
      providerCode?: SupplierProviderCode;
      configs?: WorkspaceProviderConfig[];
      timeoutMs?: number;
    },
  ): Promise<ProviderResponse<AtlasQuotation>> {
    const adapter = this.selectAdapter(
      workspaceId,
      ProviderCapability.REQUEST_QUOTATION,
      options?.providerCode,
      options?.configs,
    );
    const request = this.buildRequest<RequestQuotationParams>(
      workspaceId, adapter.metadata.code, params, options?.timeoutMs,
    );
    return this.executeWithRetry(adapter, ProviderCapability.REQUEST_QUOTATION, () =>
      adapter.requestQuotation(request),
    );
  }

  async downloadCatalog(
    workspaceId: string,
    params: DownloadCatalogParams,
    options?: {
      providerCode?: SupplierProviderCode;
      configs?: WorkspaceProviderConfig[];
      timeoutMs?: number;
    },
  ): Promise<ProviderResponse<AtlasProduct[]>> {
    const adapter = this.selectAdapter(
      workspaceId,
      ProviderCapability.DOWNLOAD_CATALOG,
      options?.providerCode,
      options?.configs,
    );
    const request = this.buildRequest<DownloadCatalogParams>(
      workspaceId, adapter.metadata.code, params, options?.timeoutMs,
    );
    return this.executeWithRetry(adapter, ProviderCapability.DOWNLOAD_CATALOG, () =>
      adapter.downloadCatalog(request),
    );
  }

  async validateSupplier(
    workspaceId: string,
    params: ValidateSupplierParams,
    options?: {
      providerCode?: SupplierProviderCode;
      configs?: WorkspaceProviderConfig[];
      timeoutMs?: number;
    },
  ): Promise<ProviderResponse<AtlasValidationResult>> {
    const adapter = this.selectAdapter(
      workspaceId,
      ProviderCapability.VALIDATE_SUPPLIER,
      options?.providerCode,
      options?.configs,
    );
    const request = this.buildRequest<ValidateSupplierParams>(
      workspaceId, adapter.metadata.code, params, options?.timeoutMs,
    );
    return this.executeWithRetry(adapter, ProviderCapability.VALIDATE_SUPPLIER, () =>
      adapter.validateSupplier(request),
    );
  }

  async validateProduct(
    workspaceId: string,
    params: ValidateProductParams,
    options?: {
      providerCode?: SupplierProviderCode;
      configs?: WorkspaceProviderConfig[];
      timeoutMs?: number;
    },
  ): Promise<ProviderResponse<AtlasValidationResult>> {
    const adapter = this.selectAdapter(
      workspaceId,
      ProviderCapability.VALIDATE_PRODUCT,
      options?.providerCode,
      options?.configs,
    );
    const request = this.buildRequest<ValidateProductParams>(
      workspaceId, adapter.metadata.code, params, options?.timeoutMs,
    );
    return this.executeWithRetry(adapter, ProviderCapability.VALIDATE_PRODUCT, () =>
      adapter.validateProduct(request),
    );
  }

  async healthCheckAll(): Promise<ProviderHealthResult[]> {
    const snapshots = await this.healthMonitor.checkAll();
    return snapshots.map((s) => s.result);
  }

  async healthCheckProvider(providerCode: SupplierProviderCode): Promise<ProviderHealthResult> {
    const adapter = this.registry.get(providerCode);
    return this.healthMonitor.checkOne(adapter);
  }

  getCapabilities(providerCode: SupplierProviderCode): ProviderCapability[] {
    return this.registry.get(providerCode).metadata.capabilities;
  }

  getSupportedProviders(): SupplierProviderCode[] {
    return this.registry.getSupportedCodes();
  }

  // ── Internal Helpers ─────────────────────────────────────────

  private selectAdapter(
    workspaceId: string,
    capability: ProviderCapability,
    preferredCode?: SupplierProviderCode,
    configs?: WorkspaceProviderConfig[],
  ): ISupplierProviderAdapter {
    return this.factory.select({ workspaceId, capability, preferredCode, configs });
  }

  private buildRequest<T>(
    workspaceId: string,
    providerCode: SupplierProviderCode,
    params: T,
    timeoutMs?: number,
  ): ProviderRequest<T> {
    return {
      requestId: uuidv4(),
      workspaceId,
      providerCode,
      params,
      timeoutMs: timeoutMs ?? SUPPLIER_PROVIDER_CONSTANTS.DEFAULT_TIMEOUT_MS,
    };
  }

  private async executeWithRetry<T>(
    adapter: ISupplierProviderAdapter,
    capability: ProviderCapability,
    fn: () => Promise<ProviderResponse<T>>,
    retryPolicy?: ProviderRetryPolicy,
  ): Promise<ProviderResponse<T>> {
    const policy = retryPolicy ?? SUPPLIER_PROVIDER_CONSTANTS.DEFAULT_RETRY_POLICY;
    let lastError: NormalizedProviderError | undefined;

    for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
      const startedAt = Date.now();
      try {
        const response = await fn();
        this.emitAudit({
          workspaceId: '',
          providerCode: adapter.metadata.code,
          capability,
          requestId: response.requestId,
          success: response.success,
          durationMs: Date.now() - startedAt,
        });
        return response;
      } catch (error) {
        const normalized = this.errorNormalizer.normalize(error, adapter.metadata.code);
        lastError = normalized;

        this.logger.warn(
          `[${adapter.metadata.code}] ${capability} attempt ${attempt}/${policy.maxAttempts} failed: ${normalized.code} – ${normalized.message}`,
        );

        if (!normalized.retryable || attempt === policy.maxAttempts) {
          return {
            requestId: uuidv4(),
            providerCode: adapter.metadata.code,
            success: false,
            error: normalized,
            meta: { durationMs: Date.now() - startedAt },
          };
        }

        const delay = policy.backoffMs * Math.pow(policy.backoffMultiplier, attempt - 1);
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    return {
      requestId: uuidv4(),
      providerCode: adapter.metadata.code,
      success: false,
      error: lastError,
      meta: { durationMs: 0 },
    };
  }

  private async *withErrorHandling<T>(
    adapter: ISupplierProviderAdapter,
    _capability: ProviderCapability,
    fn: () => AsyncIterable<T>,
  ): AsyncIterable<T> {
    try {
      yield* fn();
    } catch (error) {
      const normalized = this.errorNormalizer.normalize(error, adapter.metadata.code);
      this.logger.error(
        `[${adapter.metadata.code}] AsyncIterable error: ${normalized.code} – ${normalized.message}`,
      );
      throw error;
    }
  }

  private emitAudit(partial: Omit<ProviderAuditEvent, 'timestamp'>): void {
    const event: ProviderAuditEvent = { ...partial, timestamp: new Date() };
    this.logger.debug(
      `AUDIT [${event.providerCode}] ${event.capability} success=${event.success} ${event.durationMs}ms`,
    );
    // In production: publish to audit queue or metrics.
  }
}
