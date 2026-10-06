import { Injectable, Logger } from '@nestjs/common';
import {
  AtlasProduct,
  AtlasQuotation,
  AtlasSupplier,
  AtlasValidationResult,
  DownloadCatalogParams,
  GetProductDetailsParams,
  GetSupplierDetailsParams,
  ProviderCapability,
  ProviderMetadata,
  ProviderRequest,
  ProviderResponse,
  ProviderVersion,
  RequestQuotationParams,
  SearchProductsParams,
  SearchSuppliersParams,
  SupplierProviderCode,
  ValidateProductParams,
  ValidateSupplierParams,
} from '../../../interfaces';
import { ProviderErrorNormalizer } from '../../../errors/provider-error-normalizer';
import { SupplierProviderCredentialService } from '../../../credentials/supplier-provider-credential.service';
import { AdapterCapabilityValidator } from '../../adapter-capability.validator';
import { AdapterIdempotencyService } from '../../adapter-idempotency.service';
import { AdapterRateLimitHandler } from '../../adapter-rate-limit.handler';
import { AdapterHealthChecker } from '../../adapter-health.checker';
import { AdapterMetricsRecorder } from '../../adapter-metrics.recorder';
import { AdapterAuditLogger } from '../../adapter-audit.logger';
import {
  AdapterCapability,
  AdapterMetadata,
  IntegrationStrategy,
} from '../../adapter.types';
import { BaseSupplierAdapter } from '../../base-supplier.adapter';
import { PrismaService } from '@database/prisma.service';
import {
  TradeIndiaRawCatalog,
  TradeIndiaRawProduct,
  TradeIndiaRawRfqResponse,
  TradeIndiaRawSupplier,
} from './tradeindia.types';
import { TradeIndiaHttpClient } from './tradeindia.http-client';
import {
  mapTradeIndiaCatalog,
  mapTradeIndiaProduct,
  mapTradeIndiaProductValidation,
  mapTradeIndiaRfqToQuotation,
  mapTradeIndiaSupplier,
  mapTradeIndiaSupplierValidation,
} from './tradeindia.mappers';
import {
  TRADEINDIA_ADAPTER_VERSION,
  TRADEINDIA_API_PATHS,
  TRADEINDIA_CREDENTIAL_CACHE_TTL_MS,
  TRADEINDIA_CREDENTIAL_KEYS,
  TRADEINDIA_DEFAULT_BASE_URL,
  TRADEINDIA_DEFAULT_MAX_RETRIES,
  TRADEINDIA_DEFAULT_PAGE_SIZE,
  TRADEINDIA_DEFAULT_TIMEOUT_MS,
  TRADEINDIA_DESCRIPTION,
  TRADEINDIA_DISPLAY_NAME,
  TRADEINDIA_MAX_PAGE_SIZE,
  TRADEINDIA_PROVIDER_CODE,
  TRADEINDIA_RATE_LIMIT_PER_MINUTE,
  TRADEINDIA_SETTING_KEYS,
  TRADEINDIA_SUPPORTED_COUNTRIES,
  TRADEINDIA_SUPPORTED_CURRENCIES,
  TRADEINDIA_SUPPORTED_REGIONS,
  TRADEINDIA_WEBSITE,
} from './tradeindia.constants';

// ── Capability Sets ───────────────────────────────────────────

/**
 * TradeIndia supports supplier/product search, RFQ, catalog, and validation
 * via REST API. Purchase orders and shipment tracking are NOT supported by
 * the TradeIndia public API.
 */
const TRADEINDIA_PROVIDER_CAPABILITIES: ProviderCapability[] = [
  ProviderCapability.SEARCH_SUPPLIERS,
  ProviderCapability.SEARCH_PRODUCTS,
  ProviderCapability.GET_SUPPLIER_DETAILS,
  ProviderCapability.GET_PRODUCT_DETAILS,
  ProviderCapability.REQUEST_QUOTATION,
  ProviderCapability.DOWNLOAD_CATALOG,
  ProviderCapability.VALIDATE_SUPPLIER,
  ProviderCapability.VALIDATE_PRODUCT,
  ProviderCapability.HEALTH_CHECK,
  ProviderCapability.TEST_CONNECTION,
];

const TRADEINDIA_ADAPTER_CAPABILITIES: AdapterCapability[] = [
  AdapterCapability.SEARCH_SUPPLIERS,
  AdapterCapability.SEARCH_PRODUCTS,
  AdapterCapability.GET_SUPPLIER_DETAILS,
  AdapterCapability.GET_PRODUCT_DETAILS,
  AdapterCapability.REQUEST_QUOTATION,
  AdapterCapability.DOWNLOAD_CATALOG,
  AdapterCapability.VALIDATE_SUPPLIER,
  AdapterCapability.VALIDATE_PRODUCT,
  AdapterCapability.HEALTH_CHECK,
  AdapterCapability.TEST_CONNECTION,
];

const TRADEINDIA_INTEGRATION_STRATEGIES: IntegrationStrategy[] = [
  IntegrationStrategy.REST_API,
  IntegrationStrategy.EMAIL_RFQ,
  IntegrationStrategy.FILE_IMPORT,
  IntegrationStrategy.FILE_EXPORT,
  IntegrationStrategy.MANUAL_WORKFLOW,
];

// ── Credential Cache ──────────────────────────────────────────

interface CachedCredentials {
  apiKey: string;
  userId: string | null;
  baseUrl: string;
  timeoutMs: number;
  resolvedAt: number;
}

// ─────────────────────────────────────────────────────────────

@Injectable()
export class TradeIndiaAdapter extends BaseSupplierAdapter {
  protected readonly logger = new Logger(TradeIndiaAdapter.name);

  readonly metadata: ProviderMetadata = {
    code: SupplierProviderCode.TRADEINDIA,
    displayName: TRADEINDIA_DISPLAY_NAME,
    description: TRADEINDIA_DESCRIPTION,
    version: TRADEINDIA_ADAPTER_VERSION as ProviderVersion,
    website: TRADEINDIA_WEBSITE,
    supportedCountries: TRADEINDIA_SUPPORTED_COUNTRIES,
    capabilities: TRADEINDIA_PROVIDER_CAPABILITIES,
    rateLimitPerMinute: TRADEINDIA_RATE_LIMIT_PER_MINUTE,
    timeoutMs: TRADEINDIA_DEFAULT_TIMEOUT_MS,
    maxRetries: TRADEINDIA_DEFAULT_MAX_RETRIES,
    requiresCredentials: true,
    credentialFields: [
      {
        key: TRADEINDIA_CREDENTIAL_KEYS.API_KEY,
        label: 'TradeIndia API Key',
        required: true,
        sensitive: true,
        placeholder: 'Your TradeIndia API key',
      },
      {
        key: TRADEINDIA_CREDENTIAL_KEYS.USER_ID,
        label: 'Registered User ID',
        required: false,
        sensitive: false,
        placeholder: 'Numeric user ID',
      },
    ],
  };

  readonly adapterMetadata: AdapterMetadata = {
    providerCode: TRADEINDIA_PROVIDER_CODE,
    displayName: TRADEINDIA_DISPLAY_NAME,
    description: TRADEINDIA_DESCRIPTION,
    version: TRADEINDIA_ADAPTER_VERSION,
    supportedRegions: TRADEINDIA_SUPPORTED_REGIONS,
    supportedCountries: TRADEINDIA_SUPPORTED_COUNTRIES,
    supportedCurrencies: TRADEINDIA_SUPPORTED_CURRENCIES,
    capabilities: TRADEINDIA_ADAPTER_CAPABILITIES,
    integrationStrategies: TRADEINDIA_INTEGRATION_STRATEGIES,
    rateLimitPerMinute: TRADEINDIA_RATE_LIMIT_PER_MINUTE,
    timeoutMs: TRADEINDIA_DEFAULT_TIMEOUT_MS,
    maxRetries: TRADEINDIA_DEFAULT_MAX_RETRIES,
    requiresCredentials: true,
    credentialFields: [
      { key: TRADEINDIA_CREDENTIAL_KEYS.API_KEY, label: 'TradeIndia API Key', required: true, sensitive: true },
      { key: TRADEINDIA_CREDENTIAL_KEYS.USER_ID, label: 'Registered User ID', required: false, sensitive: false },
    ],
  };

  private readonly credentialCache = new Map<string, CachedCredentials>();

  constructor(
    errorNormalizer: ProviderErrorNormalizer,
    credentialService: SupplierProviderCredentialService,
    capabilityValidator: AdapterCapabilityValidator,
    idempotency: AdapterIdempotencyService,
    rateLimitHandler: AdapterRateLimitHandler,
    healthChecker: AdapterHealthChecker,
    metricsRecorder: AdapterMetricsRecorder,
    auditLogger: AdapterAuditLogger,
    private readonly prisma: PrismaService,
  ) {
    super(
      errorNormalizer,
      credentialService,
      capabilityValidator,
      idempotency,
      rateLimitHandler,
      healthChecker,
      metricsRecorder,
      auditLogger,
    );
  }

  // ══════════════════════════════════════════════════════════════
  // Search Suppliers
  // ══════════════════════════════════════════════════════════════

  async *searchSuppliers(
    request: ProviderRequest<SearchSuppliersParams>,
  ): AsyncIterable<AtlasSupplier> {
    const context = this.buildRequestContext(request.workspaceId, AdapterCapability.SEARCH_SUPPLIERS);
    this.capabilityValidator.validateCapability(this.adapterMetadata, AdapterCapability.SEARCH_SUPPLIERS);
    this.logRequest(context, request.params as unknown as Record<string, unknown>);

    const client = this.resolveHttpClient(request.workspaceId);
    const page = request.pagination?.page ?? 1;
    const limit = Math.min(request.pagination?.limit ?? TRADEINDIA_DEFAULT_PAGE_SIZE, TRADEINDIA_MAX_PAGE_SIZE);

    const result = await this.executeWithInfrastructure(context, AdapterCapability.SEARCH_SUPPLIERS, async () => {
      const envelope = await client.request<TradeIndiaRawSupplier[]>({
        path: TRADEINDIA_API_PATHS.SUPPLIER_SEARCH,
        params: {
          keyword: request.params.keyword,
          country: request.params.country,
          category: request.params.category,
          page,
          per_page: limit,
        },
        timeoutMs: this.resolveTimeoutMs(request.workspaceId),
      });

      const raw = envelope.DATA ?? envelope.data ?? envelope.RESULT ?? envelope.result ?? [];
      return Array.isArray(raw) ? raw : [raw];
    });

    for (const raw of result) {
      yield mapTradeIndiaSupplier(raw as TradeIndiaRawSupplier);
    }
  }

  // ══════════════════════════════════════════════════════════════
  // Search Products
  // ══════════════════════════════════════════════════════════════

  async searchProducts(
    request: ProviderRequest<SearchProductsParams>,
  ): Promise<ProviderResponse<AtlasProduct[]>> {
    const start = Date.now();
    const context = this.buildRequestContext(request.workspaceId, AdapterCapability.SEARCH_PRODUCTS);
    this.capabilityValidator.validateCapability(this.adapterMetadata, AdapterCapability.SEARCH_PRODUCTS);
    this.logRequest(context, request.params as unknown as Record<string, unknown>);

    try {
      const client = this.resolveHttpClient(request.workspaceId);
      const page = request.pagination?.page ?? 1;
      const limit = Math.min(request.pagination?.limit ?? TRADEINDIA_DEFAULT_PAGE_SIZE, TRADEINDIA_MAX_PAGE_SIZE);

      const products = await this.executeWithInfrastructure(context, AdapterCapability.SEARCH_PRODUCTS, async () => {
        const envelope = await client.request<TradeIndiaRawProduct[]>({
          path: TRADEINDIA_API_PATHS.PRODUCT_SEARCH,
          params: {
            keyword: request.params.keyword,
            category: request.params.category,
            country: request.params.country,
            seller_id: request.params.supplierId,
            page,
            per_page: limit,
          },
          timeoutMs: this.resolveTimeoutMs(request.workspaceId),
        });

        const raw = envelope.DATA ?? envelope.data ?? envelope.RESULT ?? envelope.result ?? [];
        return (Array.isArray(raw) ? raw : [raw]).map((r) => mapTradeIndiaProduct(r as TradeIndiaRawProduct));
      });

      return this.buildSuccessResponse(request.requestId, products, Date.now() - start, products.length, page, limit);
    } catch (error) {
      return this.buildErrorResponse(request.requestId, error, Date.now() - start);
    }
  }

  // ══════════════════════════════════════════════════════════════
  // Get Supplier Details
  // ══════════════════════════════════════════════════════════════

  async getSupplierDetails(
    request: ProviderRequest<GetSupplierDetailsParams>,
  ): Promise<ProviderResponse<AtlasSupplier>> {
    const start = Date.now();
    const context = this.buildRequestContext(request.workspaceId, AdapterCapability.GET_SUPPLIER_DETAILS);
    this.capabilityValidator.validateCapability(this.adapterMetadata, AdapterCapability.GET_SUPPLIER_DETAILS);
    this.logRequest(context, request.params as unknown as Record<string, unknown>);

    try {
      const client = this.resolveHttpClient(request.workspaceId);

      const supplier = await this.executeWithInfrastructure(context, AdapterCapability.GET_SUPPLIER_DETAILS, async () => {
        const envelope = await client.request<TradeIndiaRawSupplier>({
          path: TRADEINDIA_API_PATHS.SUPPLIER_DETAIL,
          params: { seller_id: request.params.providerSupplierId },
          timeoutMs: this.resolveTimeoutMs(request.workspaceId),
        });

        const raw = envelope.DATA ?? envelope.data ?? envelope.RESULT ?? envelope.result;
        if (!raw) throw { status: 404, message: 'Supplier not found on TradeIndia' };
        return mapTradeIndiaSupplier(Array.isArray(raw) ? (raw[0] as TradeIndiaRawSupplier) : raw as TradeIndiaRawSupplier);
      });

      return this.buildSuccessResponse(request.requestId, supplier, Date.now() - start);
    } catch (error) {
      return this.buildErrorResponse(request.requestId, error, Date.now() - start);
    }
  }

  // ══════════════════════════════════════════════════════════════
  // Get Product Details
  // ══════════════════════════════════════════════════════════════

  async getProductDetails(
    request: ProviderRequest<GetProductDetailsParams>,
  ): Promise<ProviderResponse<AtlasProduct>> {
    const start = Date.now();
    const context = this.buildRequestContext(request.workspaceId, AdapterCapability.GET_PRODUCT_DETAILS);
    this.capabilityValidator.validateCapability(this.adapterMetadata, AdapterCapability.GET_PRODUCT_DETAILS);
    this.logRequest(context, request.params as unknown as Record<string, unknown>);

    try {
      const client = this.resolveHttpClient(request.workspaceId);

      const product = await this.executeWithInfrastructure(context, AdapterCapability.GET_PRODUCT_DETAILS, async () => {
        const envelope = await client.request<TradeIndiaRawProduct>({
          path: TRADEINDIA_API_PATHS.PRODUCT_DETAIL,
          params: { product_id: request.params.providerProductId },
          timeoutMs: this.resolveTimeoutMs(request.workspaceId),
        });

        const raw = envelope.DATA ?? envelope.data ?? envelope.RESULT ?? envelope.result;
        if (!raw) throw { status: 404, message: 'Product not found on TradeIndia' };
        return mapTradeIndiaProduct(Array.isArray(raw) ? (raw[0] as TradeIndiaRawProduct) : raw as TradeIndiaRawProduct);
      });

      return this.buildSuccessResponse(request.requestId, product, Date.now() - start);
    } catch (error) {
      return this.buildErrorResponse(request.requestId, error, Date.now() - start);
    }
  }

  // ══════════════════════════════════════════════════════════════
  // Request Quotation
  // ══════════════════════════════════════════════════════════════

  async requestQuotation(
    request: ProviderRequest<RequestQuotationParams>,
  ): Promise<ProviderResponse<AtlasQuotation>> {
    const start = Date.now();
    const idempotencyParams = {
      supplierId: request.params.providerSupplierId,
      productId: request.params.providerProductId ?? null,
      quantity: request.params.quantity,
      workspaceId: request.workspaceId,
    };
    const context = this.buildRequestContext(
      request.workspaceId,
      AdapterCapability.REQUEST_QUOTATION,
      { idempotencyKey: this.idempotency.buildKey(request.workspaceId, TRADEINDIA_PROVIDER_CODE, 'REQUEST_QUOTATION', idempotencyParams) },
    );
    this.capabilityValidator.validateCapability(this.adapterMetadata, AdapterCapability.REQUEST_QUOTATION);
    this.logRequest(context, { supplierId: request.params.providerSupplierId, quantity: request.params.quantity });

    try {
      const client = this.resolveHttpClient(request.workspaceId);

      const quotation = await this.executeWithInfrastructure(
        context,
        AdapterCapability.REQUEST_QUOTATION,
        async () => {
          const envelope = await client.request<TradeIndiaRawRfqResponse>({
            path: TRADEINDIA_API_PATHS.RFQ_CREATE,
            method: 'POST',
            body: {
              seller_id: request.params.providerSupplierId,
              product_id: request.params.providerProductId ?? undefined,
              quantity: request.params.quantity,
              requirements: request.params.requirements ?? undefined,
            },
            timeoutMs: this.resolveTimeoutMs(request.workspaceId),
          });

          const raw = envelope.DATA ?? envelope.data ?? envelope.RESULT ?? envelope.result;
          if (!raw) throw new Error('TradeIndia RFQ submission returned empty response');
          return mapTradeIndiaRfqToQuotation(
            raw as TradeIndiaRawRfqResponse,
            request.params.providerSupplierId,
          );
        },
        { isWriteOperation: true, idempotencyParams },
      );

      return this.buildSuccessResponse(request.requestId, quotation, Date.now() - start);
    } catch (error) {
      return this.buildErrorResponse(request.requestId, error, Date.now() - start);
    }
  }

  // ══════════════════════════════════════════════════════════════
  // Download Catalog
  // ══════════════════════════════════════════════════════════════

  async downloadCatalog(
    request: ProviderRequest<DownloadCatalogParams>,
  ): Promise<ProviderResponse<AtlasProduct[]>> {
    const start = Date.now();
    const context = this.buildRequestContext(request.workspaceId, AdapterCapability.DOWNLOAD_CATALOG);
    this.capabilityValidator.validateCapability(this.adapterMetadata, AdapterCapability.DOWNLOAD_CATALOG);
    this.logRequest(context, request.params as unknown as Record<string, unknown>);

    try {
      const client = this.resolveHttpClient(request.workspaceId);

      const products = await this.executeWithInfrastructure(context, AdapterCapability.DOWNLOAD_CATALOG, async () => {
        const envelope = await client.request<TradeIndiaRawCatalog>({
          path: TRADEINDIA_API_PATHS.CATALOG_DOWNLOAD,
          params: {
            seller_id: request.params.providerSupplierId,
            category: request.params.category,
          },
          timeoutMs: this.resolveTimeoutMs(request.workspaceId),
        });

        const raw = envelope.DATA ?? envelope.data ?? envelope.RESULT ?? envelope.result;
        if (!raw) return [];
        return mapTradeIndiaCatalog(raw as TradeIndiaRawCatalog);
      });

      return this.buildSuccessResponse(request.requestId, products, Date.now() - start, products.length);
    } catch (error) {
      return this.buildErrorResponse(request.requestId, error, Date.now() - start);
    }
  }

  // ══════════════════════════════════════════════════════════════
  // Validate Supplier
  // ══════════════════════════════════════════════════════════════

  async validateSupplier(
    request: ProviderRequest<ValidateSupplierParams>,
  ): Promise<ProviderResponse<AtlasValidationResult>> {
    const start = Date.now();
    const context = this.buildRequestContext(request.workspaceId, AdapterCapability.VALIDATE_SUPPLIER);
    this.capabilityValidator.validateCapability(this.adapterMetadata, AdapterCapability.VALIDATE_SUPPLIER);

    try {
      const client = this.resolveHttpClient(request.workspaceId);

      const result = await this.executeWithInfrastructure(context, AdapterCapability.VALIDATE_SUPPLIER, async () => {
        const envelope = await client.request<TradeIndiaRawSupplier>({
          path: TRADEINDIA_API_PATHS.SUPPLIER_DETAIL,
          params: { seller_id: request.params.providerSupplierId },
          timeoutMs: this.resolveTimeoutMs(request.workspaceId),
        });

        const raw = envelope.DATA ?? envelope.data ?? envelope.RESULT ?? envelope.result;
        if (!raw) {
          return {
            isValid: false,
            score: 0,
            checks: [{ checkName: 'supplier_exists', passed: false, score: 0, notes: 'Supplier not found on TradeIndia' }],
            summary: 'Supplier not found on TradeIndia',
          } satisfies AtlasValidationResult;
        }
        const rawSupplier = Array.isArray(raw) ? (raw[0] as TradeIndiaRawSupplier) : raw as TradeIndiaRawSupplier;
        return mapTradeIndiaSupplierValidation(rawSupplier);
      });

      return this.buildSuccessResponse(request.requestId, result, Date.now() - start);
    } catch (error) {
      return this.buildErrorResponse(request.requestId, error, Date.now() - start);
    }
  }

  // ══════════════════════════════════════════════════════════════
  // Validate Product
  // ══════════════════════════════════════════════════════════════

  async validateProduct(
    request: ProviderRequest<ValidateProductParams>,
  ): Promise<ProviderResponse<AtlasValidationResult>> {
    const start = Date.now();
    const context = this.buildRequestContext(request.workspaceId, AdapterCapability.VALIDATE_PRODUCT);
    this.capabilityValidator.validateCapability(this.adapterMetadata, AdapterCapability.VALIDATE_PRODUCT);

    try {
      const client = this.resolveHttpClient(request.workspaceId);

      const result = await this.executeWithInfrastructure(context, AdapterCapability.VALIDATE_PRODUCT, async () => {
        const envelope = await client.request<TradeIndiaRawProduct>({
          path: TRADEINDIA_API_PATHS.PRODUCT_DETAIL,
          params: { product_id: request.params.providerProductId },
          timeoutMs: this.resolveTimeoutMs(request.workspaceId),
        });

        const raw = envelope.DATA ?? envelope.data ?? envelope.RESULT ?? envelope.result;
        if (!raw) {
          return {
            isValid: false,
            score: 0,
            checks: [{ checkName: 'product_exists', passed: false, score: 0, notes: 'Product not found on TradeIndia' }],
            summary: 'Product not found on TradeIndia',
          } satisfies AtlasValidationResult;
        }
        const rawProduct = Array.isArray(raw) ? (raw[0] as TradeIndiaRawProduct) : raw as TradeIndiaRawProduct;
        return mapTradeIndiaProductValidation(rawProduct);
      });

      return this.buildSuccessResponse(request.requestId, result, Date.now() - start);
    } catch (error) {
      return this.buildErrorResponse(request.requestId, error, Date.now() - start);
    }
  }

  // ══════════════════════════════════════════════════════════════
  // Unsupported: Submit Purchase Order / Track Shipment
  // TradeIndia does not expose PO submission or shipment tracking via API.
  // BaseSupplierAdapter returns notImplementedResponse for these.
  // ══════════════════════════════════════════════════════════════

  // ══════════════════════════════════════════════════════════════
  // Health / Ping
  // ══════════════════════════════════════════════════════════════

  protected override async pingCheck(): Promise<void> {
    return Promise.resolve();
  }

  protected override async pingWithDetails(workspaceId: string): Promise<Record<string, unknown>> {
    try {
      const client = this.resolveHttpClient(workspaceId);
      const envelope = await client.request({
        path: TRADEINDIA_API_PATHS.PRODUCT_SEARCH,
        params: { keyword: 'test', per_page: 1, page: 1 },
        timeoutMs: 10_000,
      });
      return {
        status: 'reachable',
        envelopeStatus: envelope.STATUS ?? envelope.status ?? null,
        providerCode: TRADEINDIA_PROVIDER_CODE,
      };
    } catch (error) {
      return {
        status: 'unreachable',
        error: error instanceof Error ? error.message : String(error),
        providerCode: TRADEINDIA_PROVIDER_CODE,
      };
    }
  }

  // ══════════════════════════════════════════════════════════════
  // Credential Resolution
  // ══════════════════════════════════════════════════════════════

  async resolveWorkspaceCredentials(workspaceId: string): Promise<CachedCredentials> {
    const cached = this.credentialCache.get(workspaceId);
    if (cached && Date.now() - cached.resolvedAt < TRADEINDIA_CREDENTIAL_CACHE_TTL_MS) {
      return cached;
    }

    const configModel = (this.prisma as unknown as Record<string, unknown>)['workspaceSupplierProviderConfig'] as {
      findFirst: (args: unknown) => Promise<{
        encryptedCredentials?: string | null;
        customSettings?: unknown | null;
        isEnabled?: boolean;
      } | null>;
    };

    const config = await configModel.findFirst({
      where: {
        workspaceId,
        providerCode: SupplierProviderCode.TRADEINDIA,
        isEnabled: true,
        deletedAt: null,
      },
    });

    if (!config) {
      throw new Error(`No enabled TradeIndia configuration found for workspace ${workspaceId}`);
    }

    const customSettings = (config.customSettings ?? {}) as Record<string, unknown>;
    let apiKey = '';
    let userId: string | null = null;

    if (config.encryptedCredentials) {
      let rawCreds: Record<string, string>;
      try {
        rawCreds = JSON.parse(config.encryptedCredentials) as Record<string, string>;
      } catch {
        rawCreds = {};
      }

      for (const [k, v] of Object.entries(rawCreds)) {
        rawCreds[k] = this.credentialService.decrypt(v, workspaceId, SupplierProviderCode.TRADEINDIA);
      }

      const { valid, missing } = this.credentialService.validateRequiredFields(rawCreds, [
        TRADEINDIA_CREDENTIAL_KEYS.API_KEY,
      ]);
      if (!valid) {
        throw new Error(`TradeIndia missing required credential fields for workspace ${workspaceId}: ${missing.join(', ')}`);
      }

      apiKey = rawCreds[TRADEINDIA_CREDENTIAL_KEYS.API_KEY] ?? '';
      userId = rawCreds[TRADEINDIA_CREDENTIAL_KEYS.USER_ID] ?? null;
    }

    const resolved: CachedCredentials = {
      apiKey,
      userId,
      baseUrl: (customSettings[TRADEINDIA_SETTING_KEYS.BASE_URL] as string) ?? TRADEINDIA_DEFAULT_BASE_URL,
      timeoutMs: (customSettings[TRADEINDIA_SETTING_KEYS.TIMEOUT_MS] as number) ?? TRADEINDIA_DEFAULT_TIMEOUT_MS,
      resolvedAt: Date.now(),
    };

    this.credentialCache.set(workspaceId, resolved);
    return resolved;
  }

  evictCredentialCache(workspaceId: string): void {
    this.credentialCache.delete(workspaceId);
  }

  private resolveHttpClient(workspaceId: string): TradeIndiaHttpClient {
    const cached = this.credentialCache.get(workspaceId);
    if (cached && Date.now() - cached.resolvedAt < TRADEINDIA_CREDENTIAL_CACHE_TTL_MS) {
      return new TradeIndiaHttpClient(cached.baseUrl, cached.apiKey, cached.userId);
    }
    // No cached creds — return a client with empty key (will fail on first real call).
    // Concrete credential resolution happens via resolveWorkspaceCredentials on first call.
    return new TradeIndiaHttpClient(TRADEINDIA_DEFAULT_BASE_URL, '', null);
  }

  private resolveTimeoutMs(workspaceId: string): number {
    return this.credentialCache.get(workspaceId)?.timeoutMs ?? TRADEINDIA_DEFAULT_TIMEOUT_MS;
  }
}
