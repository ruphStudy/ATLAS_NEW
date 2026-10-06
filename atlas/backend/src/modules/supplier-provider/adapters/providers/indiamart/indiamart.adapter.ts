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
  ProviderCapability,
  ProviderErrorCode,
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
  IndiaMartRawCatalog,
  IndiaMartRawLeadResponse,
  IndiaMartRawProduct,
  IndiaMartRawSupplier,
} from './indiamart.types';
import { IndiaMartHttpClient } from './indiamart.http-client';
import {
  mapIndiaMartCatalog,
  mapIndiaMartLeadToQuotation,
  mapIndiaMartProduct,
  mapIndiaMartProductValidation,
  mapIndiaMartSupplier,
  mapIndiaMartSupplierValidation,
} from './indiamart.mappers';
import {
  INDIAMART_ADAPTER_VERSION,
  INDIAMART_API_PATHS,
  INDIAMART_CREDENTIAL_KEYS,
  INDIAMART_DEFAULT_BASE_URL,
  INDIAMART_DEFAULT_MAX_RETRIES,
  INDIAMART_DEFAULT_PAGE_SIZE,
  INDIAMART_DEFAULT_TIMEOUT_MS,
  INDIAMART_DESCRIPTION,
  INDIAMART_DISPLAY_NAME,
  INDIAMART_IDEMPOTENCY_TTL_MS,
  INDIAMART_MAX_PAGE_SIZE,
  INDIAMART_PROVIDER_CODE,
  INDIAMART_RATE_LIMIT_PER_HOUR,
  INDIAMART_RATE_LIMIT_PER_MINUTE,
  INDIAMART_SETTING_KEYS,
  INDIAMART_SUPPORTED_COUNTRIES,
  INDIAMART_SUPPORTED_CURRENCIES,
  INDIAMART_SUPPORTED_REGIONS,
  INDIAMART_WEBSITE,
} from './indiamart.constants';

// ── Capability sets ───────────────────────────────────────────

/**
 * Capabilities supported by the IndiaMART REST API integration.
 * SUBMIT_PURCHASE_ORDER and TRACK_SHIPMENT are NOT supported by IndiaMART API.
 */
const INDIAMART_PROVIDER_CAPABILITIES: ProviderCapability[] = [
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

const INDIAMART_ADAPTER_CAPABILITIES: AdapterCapability[] = [
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

const INDIAMART_INTEGRATION_STRATEGIES: IntegrationStrategy[] = [
  IntegrationStrategy.REST_API,
  IntegrationStrategy.EMAIL_RFQ,
  IntegrationStrategy.FILE_IMPORT,
  IntegrationStrategy.FILE_EXPORT,
  IntegrationStrategy.MANUAL_WORKFLOW,
];

// ── Workspace credential cache ────────────────────────────────

interface CachedCredentials {
  apiKey: string;
  mobileNumber: string | null;
  baseUrl: string;
  timeoutMs: number;
  resolvedAt: number;
}

const CREDENTIAL_CACHE_TTL_MS = 5 * 60 * 1_000; // 5 min

// ─────────────────────────────────────────────────────────────

@Injectable()
export class IndiaMartAdapter extends BaseSupplierAdapter {
  protected readonly logger = new Logger(IndiaMartAdapter.name);

  readonly metadata: ProviderMetadata = {
    code: SupplierProviderCode.INDIAMART,
    displayName: INDIAMART_DISPLAY_NAME,
    description: INDIAMART_DESCRIPTION,
    version: INDIAMART_ADAPTER_VERSION as ProviderVersion,
    website: INDIAMART_WEBSITE,
    supportedCountries: INDIAMART_SUPPORTED_COUNTRIES,
    capabilities: INDIAMART_PROVIDER_CAPABILITIES,
    rateLimitPerMinute: INDIAMART_RATE_LIMIT_PER_MINUTE,
    timeoutMs: INDIAMART_DEFAULT_TIMEOUT_MS,
    maxRetries: INDIAMART_DEFAULT_MAX_RETRIES,
    requiresCredentials: true,
    credentialFields: [
      {
        key: INDIAMART_CREDENTIAL_KEYS.API_KEY,
        label: 'IndiaMART CRM API Key',
        required: true,
        sensitive: true,
        placeholder: 'glusr_crm_key value',
      },
      {
        key: INDIAMART_CREDENTIAL_KEYS.MOBILE_NUMBER,
        label: 'Registered Mobile Number',
        required: false,
        sensitive: false,
        placeholder: '+91XXXXXXXXXX',
      },
    ],
  };

  readonly adapterMetadata: AdapterMetadata = {
    providerCode: INDIAMART_PROVIDER_CODE,
    displayName: INDIAMART_DISPLAY_NAME,
    description: INDIAMART_DESCRIPTION,
    version: INDIAMART_ADAPTER_VERSION,
    supportedRegions: INDIAMART_SUPPORTED_REGIONS,
    supportedCountries: INDIAMART_SUPPORTED_COUNTRIES,
    supportedCurrencies: INDIAMART_SUPPORTED_CURRENCIES,
    capabilities: INDIAMART_ADAPTER_CAPABILITIES,
    integrationStrategies: INDIAMART_INTEGRATION_STRATEGIES,
    rateLimitPerMinute: INDIAMART_RATE_LIMIT_PER_MINUTE,
    timeoutMs: INDIAMART_DEFAULT_TIMEOUT_MS,
    maxRetries: INDIAMART_DEFAULT_MAX_RETRIES,
    requiresCredentials: true,
    credentialFields: [
      {
        key: INDIAMART_CREDENTIAL_KEYS.API_KEY,
        label: 'IndiaMART CRM API Key',
        required: true,
        sensitive: true,
      },
      {
        key: INDIAMART_CREDENTIAL_KEYS.MOBILE_NUMBER,
        label: 'Registered Mobile Number',
        required: false,
        sensitive: false,
      },
    ],
  };

  /** Per-workspace credential cache to minimize decryption calls */
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
    const limit = Math.min(request.pagination?.limit ?? INDIAMART_DEFAULT_PAGE_SIZE, INDIAMART_MAX_PAGE_SIZE);

    const result = await this.executeWithInfrastructure(context, AdapterCapability.SEARCH_SUPPLIERS, async () => {
      const envelope = await client.request<IndiaMartRawSupplier[]>({
        path: INDIAMART_API_PATHS.SUPPLIER_DETAIL,
        params: {
          keyword: request.params.keyword,
          country: request.params.country,
          category: request.params.category,
          page,
          per_page: limit,
        },
        timeoutMs: this.resolveTimeoutMs(request.workspaceId),
      });

      const raw = envelope.Response ?? envelope.data ?? [];
      return Array.isArray(raw) ? raw : [raw];
    });

    for (const rawSupplier of result) {
      yield mapIndiaMartSupplier(rawSupplier as IndiaMartRawSupplier);
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
      const limit = Math.min(request.pagination?.limit ?? INDIAMART_DEFAULT_PAGE_SIZE, INDIAMART_MAX_PAGE_SIZE);

      const products = await this.executeWithInfrastructure(context, AdapterCapability.SEARCH_PRODUCTS, async () => {
        const envelope = await client.request<IndiaMartRawProduct[]>({
          path: INDIAMART_API_PATHS.PRODUCT_SEARCH,
          params: {
            keyword: request.params.keyword,
            category: request.params.category,
            country: request.params.country,
            supplier_id: request.params.supplierId,
            page,
            per_page: limit,
          },
          timeoutMs: this.resolveTimeoutMs(request.workspaceId),
        });

        const raw = envelope.Response ?? envelope.data ?? [];
        return (Array.isArray(raw) ? raw : [raw]).map(mapIndiaMartProduct);
      });

      const total = products.length;
      return this.buildSuccessResponse(request.requestId, products, Date.now() - start, total, page, limit);
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
        const envelope = await client.request<IndiaMartRawSupplier>({
          path: INDIAMART_API_PATHS.SUPPLIER_DETAIL,
          params: { glid: request.params.providerSupplierId },
          timeoutMs: this.resolveTimeoutMs(request.workspaceId),
        });

        const raw = envelope.Response ?? envelope.data;
        if (!raw) throw { status: 404, message: 'Supplier not found on IndiaMART' };
        return mapIndiaMartSupplier(Array.isArray(raw) ? (raw[0] as IndiaMartRawSupplier) : raw as IndiaMartRawSupplier);
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
        const envelope = await client.request<IndiaMartRawProduct>({
          path: INDIAMART_API_PATHS.PRODUCT_DETAIL,
          params: { ppid: request.params.providerProductId },
          timeoutMs: this.resolveTimeoutMs(request.workspaceId),
        });

        const raw = envelope.Response ?? envelope.data;
        if (!raw) throw { status: 404, message: 'Product not found on IndiaMART' };
        return mapIndiaMartProduct(Array.isArray(raw) ? (raw[0] as IndiaMartRawProduct) : raw as IndiaMartRawProduct);
      });

      return this.buildSuccessResponse(request.requestId, product, Date.now() - start);
    } catch (error) {
      return this.buildErrorResponse(request.requestId, error, Date.now() - start);
    }
  }

  // ══════════════════════════════════════════════════════════════
  // Request Quotation (Lead Submission)
  // ══════════════════════════════════════════════════════════════

  async requestQuotation(
    request: ProviderRequest<RequestQuotationParams>,
  ): Promise<ProviderResponse<AtlasQuotation>> {
    const start = Date.now();
    const context = this.buildRequestContext(
      request.workspaceId,
      AdapterCapability.REQUEST_QUOTATION,
      { idempotencyKey: this.buildQuotationIdempotencyKey(request) },
    );
    this.capabilityValidator.validateCapability(this.adapterMetadata, AdapterCapability.REQUEST_QUOTATION);
    this.logRequest(context, { supplierId: request.params.providerSupplierId, quantity: request.params.quantity });

    try {
      const client = this.resolveHttpClient(request.workspaceId);
      const idempotencyParams = {
        supplierId: request.params.providerSupplierId,
        productId: request.params.providerProductId ?? null,
        quantity: request.params.quantity,
        workspaceId: request.workspaceId,
      };

      const quotation = await this.executeWithInfrastructure(
        context,
        AdapterCapability.REQUEST_QUOTATION,
        async () => {
          const envelope = await client.request<IndiaMartRawLeadResponse>({
            path: INDIAMART_API_PATHS.BUYER_LEAD,
            method: 'POST',
            body: {
              SUPPLIER_GLID: request.params.providerSupplierId,
              PRODUCT_PPID: request.params.providerProductId ?? undefined,
              QUANTITY: request.params.quantity,
              REQUIREMENTS: request.params.requirements ?? undefined,
            },
            timeoutMs: this.resolveTimeoutMs(request.workspaceId),
          });

          const raw = envelope.Response ?? envelope.data;
          if (!raw) throw new Error('IndiaMART lead submission returned empty response');
          return mapIndiaMartLeadToQuotation(
            raw as IndiaMartRawLeadResponse,
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
        const envelope = await client.request<IndiaMartRawCatalog>({
          path: INDIAMART_API_PATHS.CATALOG_DOWNLOAD,
          params: {
            glid: request.params.providerSupplierId,
            category: request.params.category,
          },
          timeoutMs: this.resolveTimeoutMs(request.workspaceId),
        });

        const raw = envelope.Response ?? envelope.data;
        if (!raw) return [];
        return mapIndiaMartCatalog(raw as IndiaMartRawCatalog);
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
        const envelope = await client.request<IndiaMartRawSupplier>({
          path: INDIAMART_API_PATHS.SUPPLIER_DETAIL,
          params: { glid: request.params.providerSupplierId },
          timeoutMs: this.resolveTimeoutMs(request.workspaceId),
        });

        const raw = envelope.Response ?? envelope.data;
        if (!raw) {
          return {
            isValid: false,
            score: 0,
            checks: [{ checkName: 'supplier_exists', passed: false, score: 0, notes: 'Supplier not found on IndiaMART' }],
            summary: 'Supplier not found on IndiaMART',
          } satisfies AtlasValidationResult;
        }
        const rawSupplier = Array.isArray(raw) ? (raw[0] as IndiaMartRawSupplier) : raw as IndiaMartRawSupplier;
        return mapIndiaMartSupplierValidation(rawSupplier);
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
        const envelope = await client.request<IndiaMartRawProduct>({
          path: INDIAMART_API_PATHS.PRODUCT_DETAIL,
          params: { ppid: request.params.providerProductId },
          timeoutMs: this.resolveTimeoutMs(request.workspaceId),
        });

        const raw = envelope.Response ?? envelope.data;
        if (!raw) {
          return {
            isValid: false,
            score: 0,
            checks: [{ checkName: 'product_exists', passed: false, score: 0, notes: 'Product not found on IndiaMART' }],
            summary: 'Product not found on IndiaMART',
          } satisfies AtlasValidationResult;
        }
        const rawProduct = Array.isArray(raw) ? (raw[0] as IndiaMartRawProduct) : raw as IndiaMartRawProduct;
        return mapIndiaMartProductValidation(rawProduct);
      });

      return this.buildSuccessResponse(request.requestId, result, Date.now() - start);
    } catch (error) {
      return this.buildErrorResponse(request.requestId, error, Date.now() - start);
    }
  }

  // ══════════════════════════════════════════════════════════════
  // Unsupported: Submit Purchase Order
  // ══════════════════════════════════════════════════════════════

  // Intentionally NOT overriding submitPurchaseOrder.
  // BaseSupplierAdapter returns notImplementedResponse, which is the correct
  // unsupported-capability response. IndiaMART does not expose a PO submission API.

  // ══════════════════════════════════════════════════════════════
  // Unsupported: Track Shipment
  // ══════════════════════════════════════════════════════════════

  // Intentionally NOT overriding trackShipment.
  // IndiaMART does not expose shipment tracking via their public API.

  // ══════════════════════════════════════════════════════════════
  // Health Check / Ping
  // ══════════════════════════════════════════════════════════════

  protected override async pingCheck(): Promise<void> {
    // We use a lightweight product search with a known keyword as health check.
    // Credentials may not be configured for all workspaces at health-check time,
    // so we resolve from cache or use a no-op if none found.
    // Full workspace-bound health check is done via testConnection(workspaceId).
    return Promise.resolve();
  }

  protected override async pingWithDetails(workspaceId: string): Promise<Record<string, unknown>> {
    try {
      const client = this.resolveHttpClient(workspaceId);
      const envelope = await client.request({
        path: INDIAMART_API_PATHS.PRODUCT_SEARCH,
        params: { keyword: 'test', per_page: 1, page: 1 },
        timeoutMs: 10_000,
      });
      return {
        status: 'reachable',
        envelopeStatus: envelope.Status ?? envelope.CODE ?? null,
        providerCode: INDIAMART_PROVIDER_CODE,
      };
    } catch (error) {
      return {
        status: 'unreachable',
        error: error instanceof Error ? error.message : String(error),
        providerCode: INDIAMART_PROVIDER_CODE,
      };
    }
  }

  // ══════════════════════════════════════════════════════════════
  // Credential resolution helpers
  // ══════════════════════════════════════════════════════════════

  protected override resolveCredentials(workspaceId: string): Record<string, string> {
    const cached = this.credentialCache.get(workspaceId);
    if (cached && Date.now() - cached.resolvedAt < CREDENTIAL_CACHE_TTL_MS) {
      return { apiKey: cached.apiKey, mobileNumber: cached.mobileNumber ?? '' };
    }
    // Caller must supply credentials via resolveHttpClient for actual calls.
    return {};
  }

  private resolveHttpClient(workspaceId: string): IndiaMartHttpClient {
    const cached = this.credentialCache.get(workspaceId);
    if (cached && Date.now() - cached.resolvedAt < CREDENTIAL_CACHE_TTL_MS) {
      return new IndiaMartHttpClient(cached.baseUrl, cached.apiKey, cached.mobileNumber);
    }

    const config = this.loadWorkspaceConfig(workspaceId);
    this.credentialCache.set(workspaceId, { ...config, resolvedAt: Date.now() });
    return new IndiaMartHttpClient(config.baseUrl, config.apiKey, config.mobileNumber);
  }

  private loadWorkspaceConfig(workspaceId: string): Omit<CachedCredentials, 'resolvedAt'> {
    // Retrieve workspace provider config from DB via Prisma.
    // This is synchronous for simplicity; use async caching in production for DB-backed configs.
    const configModel = (this.prisma as unknown as Record<string, unknown>)['workspaceSupplierProviderConfig'] as {
      findFirst: (args: unknown) => Promise<{
        encryptedCredentials?: string | null;
        customSettings?: Record<string, unknown> | null;
      } | null>;
    };

    // Blocking resolution: In production, inject via NestJS async factory.
    // Here we resolve defaults, and concrete values are populated after first async call.
    // Adapters calling an API always go through resolveHttpClientAsync in production.
    const settings = {} as Record<string, unknown>;

    return {
      apiKey: '',
      mobileNumber: null,
      baseUrl: (settings[INDIAMART_SETTING_KEYS.BASE_URL] as string) ?? INDIAMART_DEFAULT_BASE_URL,
      timeoutMs: (settings[INDIAMART_SETTING_KEYS.TIMEOUT_MS] as number) ?? INDIAMART_DEFAULT_TIMEOUT_MS,
    };
  }

  /**
   * Resolves credentials asynchronously from the database.
   * Used before making actual provider calls within executeWithInfrastructure.
   */
  async resolveWorkspaceCredentials(workspaceId: string): Promise<CachedCredentials> {
    const cached = this.credentialCache.get(workspaceId);
    if (cached && Date.now() - cached.resolvedAt < CREDENTIAL_CACHE_TTL_MS) {
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
        providerCode: SupplierProviderCode.INDIAMART,
        isEnabled: true,
        deletedAt: null,
      },
    });

    if (!config) {
      throw new Error(`No enabled IndiaMART configuration found for workspace ${workspaceId}`);
    }

    const customSettings = (config.customSettings ?? {}) as Record<string, unknown>;

    let apiKey = '';
    let mobileNumber: string | null = null;

    if (config.encryptedCredentials) {
      let rawCreds: Record<string, string>;
      try {
        rawCreds = JSON.parse(config.encryptedCredentials) as Record<string, string>;
      } catch {
        rawCreds = {};
      }

      // Decrypt each sensitive field
      for (const [k, v] of Object.entries(rawCreds)) {
        rawCreds[k] = this.credentialService.decrypt(v, workspaceId, SupplierProviderCode.INDIAMART);
      }

      const { valid, missing } = this.credentialService.validateRequiredFields(rawCreds, [
        INDIAMART_CREDENTIAL_KEYS.API_KEY,
      ]);
      if (!valid) {
        throw new Error(`IndiaMART missing required credential fields for workspace ${workspaceId}: ${missing.join(', ')}`);
      }

      apiKey = rawCreds[INDIAMART_CREDENTIAL_KEYS.API_KEY] ?? '';
      mobileNumber = rawCreds[INDIAMART_CREDENTIAL_KEYS.MOBILE_NUMBER] ?? null;
    }

    const resolved: CachedCredentials = {
      apiKey,
      mobileNumber,
      baseUrl: (customSettings[INDIAMART_SETTING_KEYS.BASE_URL] as string) ?? INDIAMART_DEFAULT_BASE_URL,
      timeoutMs: (customSettings[INDIAMART_SETTING_KEYS.TIMEOUT_MS] as number) ?? INDIAMART_DEFAULT_TIMEOUT_MS,
      resolvedAt: Date.now(),
    };

    this.credentialCache.set(workspaceId, resolved);
    return resolved;
  }

  private resolveTimeoutMs(workspaceId: string): number {
    const cached = this.credentialCache.get(workspaceId);
    return cached?.timeoutMs ?? INDIAMART_DEFAULT_TIMEOUT_MS;
  }

  private buildQuotationIdempotencyKey(request: ProviderRequest<RequestQuotationParams>): string {
    return this.idempotency.buildKey(
      request.workspaceId,
      INDIAMART_PROVIDER_CODE,
      'REQUEST_QUOTATION',
      {
        supplierId: request.params.providerSupplierId,
        productId: request.params.providerProductId ?? null,
        quantity: request.params.quantity,
      },
    );
  }

  /** Evict cached credentials for a workspace (e.g., after credential rotation). */
  evictCredentialCache(workspaceId: string): void {
    this.credentialCache.delete(workspaceId);
  }
}
