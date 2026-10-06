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
  ValidateProductParams,
  ValidateSupplierParams,
} from '../interfaces';
import { ProviderErrorNormalizer } from '../errors/provider-error-normalizer';

/**
 * AbstractSupplierProviderAdapter
 *
 * Base class all concrete provider adapters extend.
 * - Provides default not-implemented responses for optional capabilities.
 * - Exposes helpers for building responses and measuring latency.
 * - Concrete adapters only override the methods they support.
 */
export abstract class AbstractSupplierProviderAdapter implements ISupplierProviderAdapter {
  protected abstract readonly logger: Logger;
  abstract readonly metadata: ProviderMetadata;

  protected constructor(protected readonly errorNormalizer: ProviderErrorNormalizer) {}

  supportsCapability(capability: ProviderCapability): boolean {
    return this.metadata.capabilities.includes(capability);
  }

  supportsCountry(country: string): boolean {
    const all = this.metadata.supportedCountries;
    if (all.length === 0) return true; // global
    return all.includes(country.toUpperCase());
  }

  // ── Contracts with default not-implemented responses ─────────

  async *searchSuppliers(
    _request: ProviderRequest<SearchSuppliersParams>,
  ): AsyncIterable<AtlasSupplier> {
    throw this.notImplemented(ProviderCapability.SEARCH_SUPPLIERS);
  }

  async searchProducts(
    _request: ProviderRequest<SearchProductsParams>,
  ): Promise<ProviderResponse<AtlasProduct[]>> {
    return this.notImplementedResponse<AtlasProduct[]>(_request.requestId, ProviderCapability.SEARCH_PRODUCTS);
  }

  async getSupplierDetails(
    _request: ProviderRequest<GetSupplierDetailsParams>,
  ): Promise<ProviderResponse<AtlasSupplier>> {
    return this.notImplementedResponse<AtlasSupplier>(_request.requestId, ProviderCapability.GET_SUPPLIER_DETAILS);
  }

  async getProductDetails(
    _request: ProviderRequest<GetProductDetailsParams>,
  ): Promise<ProviderResponse<AtlasProduct>> {
    return this.notImplementedResponse<AtlasProduct>(_request.requestId, ProviderCapability.GET_PRODUCT_DETAILS);
  }

  async requestQuotation(
    _request: ProviderRequest<RequestQuotationParams>,
  ): Promise<ProviderResponse<AtlasQuotation>> {
    return this.notImplementedResponse<AtlasQuotation>(_request.requestId, ProviderCapability.REQUEST_QUOTATION);
  }

  async downloadCatalog(
    _request: ProviderRequest<DownloadCatalogParams>,
  ): Promise<ProviderResponse<AtlasProduct[]>> {
    return this.notImplementedResponse<AtlasProduct[]>(_request.requestId, ProviderCapability.DOWNLOAD_CATALOG);
  }

  async validateSupplier(
    _request: ProviderRequest<ValidateSupplierParams>,
  ): Promise<ProviderResponse<AtlasValidationResult>> {
    return this.notImplementedResponse<AtlasValidationResult>(_request.requestId, ProviderCapability.VALIDATE_SUPPLIER);
  }

  async validateProduct(
    _request: ProviderRequest<ValidateProductParams>,
  ): Promise<ProviderResponse<AtlasValidationResult>> {
    return this.notImplementedResponse<AtlasValidationResult>(_request.requestId, ProviderCapability.VALIDATE_PRODUCT);
  }

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

  // ── Helpers for subclasses ────────────────────────────────────

  /** Override in subclass to perform a real ping/connectivity check. */
  protected async pingCheck(): Promise<void> {
    // Default: no-op (healthy)
  }

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

  private notImplemented(capability: ProviderCapability): Error {
    return new Error(
      `Provider '${this.metadata.code}' does not support capability '${capability}'`,
    );
  }

  private notImplementedResponse<T>(requestId: string, capability: ProviderCapability): ProviderResponse<T> {
    return {
      requestId,
      providerCode: this.metadata.code,
      success: false,
      error: {
        code: ProviderErrorCode.INVALID_REQUEST,
        message: `Provider '${this.metadata.code}' does not support capability '${capability}'`,
        providerCode: this.metadata.code,
        retryable: false,
      },
      meta: { durationMs: 0 },
    };
  }
}
