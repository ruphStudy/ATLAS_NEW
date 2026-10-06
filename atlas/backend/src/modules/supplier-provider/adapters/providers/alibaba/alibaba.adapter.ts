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
  AlibabaRawCatalog,
  AlibabaRawOrderResponse,
  AlibabaRawProduct,
  AlibabaRawRfqResponse,
  AlibabaRawShipmentTracking,
  AlibabaRawSupplier,
} from './alibaba.types';
import { AlibabaHttpClient } from './alibaba.http-client';
import {
  mapAlibabaCatalog,
  mapAlibabaOrderResponse,
  mapAlibabaProduct,
  mapAlibabaProductValidation,
  mapAlibabaRfqToQuotation,
  mapAlibabaShipmentTracking,
  mapAlibabaSupplier,
  mapAlibabaSupplierValidation,
} from './alibaba.mappers';
import {
  ALIBABA_ADAPTER_VERSION,
  ALIBABA_API_METHODS,
  ALIBABA_CREDENTIAL_CACHE_TTL_MS,
  ALIBABA_CREDENTIAL_KEYS,
  ALIBABA_DEFAULT_BASE_URL,
  ALIBABA_DEFAULT_MAX_RETRIES,
  ALIBABA_DEFAULT_PAGE_SIZE,
  ALIBABA_DEFAULT_TIMEOUT_MS,
  ALIBABA_DESCRIPTION,
  ALIBABA_DISPLAY_NAME,
  ALIBABA_MAX_PAGE_SIZE,
  ALIBABA_PROVIDER_CODE,
  ALIBABA_RATE_LIMIT_PER_MINUTE,
  ALIBABA_SETTING_KEYS,
  ALIBABA_SUPPORTED_COUNTRIES,
  ALIBABA_SUPPORTED_CURRENCIES,
  ALIBABA_SUPPORTED_REGIONS,
  ALIBABA_WEBSITE,
} from './alibaba.constants';

// ── Capability sets ───────────────────────────────────────────

const ALIBABA_PROVIDER_CAPABILITIES: ProviderCapability[] = [
  ProviderCapability.SEARCH_SUPPLIERS,
  ProviderCapability.SEARCH_PRODUCTS,
  ProviderCapability.GET_SUPPLIER_DETAILS,
  ProviderCapability.GET_PRODUCT_DETAILS,
  ProviderCapability.REQUEST_QUOTATION,
  ProviderCapability.DOWNLOAD_CATALOG,
  ProviderCapability.VALIDATE_SUPPLIER,
  ProviderCapability.VALIDATE_PRODUCT,
  ProviderCapability.SUBMIT_PURCHASE_ORDER,
  ProviderCapability.TRACK_SHIPMENT,
  ProviderCapability.HEALTH_CHECK,
  ProviderCapability.TEST_CONNECTION,
];

const ALIBABA_ADAPTER_CAPABILITIES: AdapterCapability[] = [
  AdapterCapability.SEARCH_SUPPLIERS,
  AdapterCapability.SEARCH_PRODUCTS,
  AdapterCapability.GET_SUPPLIER_DETAILS,
  AdapterCapability.GET_PRODUCT_DETAILS,
  AdapterCapability.REQUEST_QUOTATION,
  AdapterCapability.DOWNLOAD_CATALOG,
  AdapterCapability.VALIDATE_SUPPLIER,
  AdapterCapability.VALIDATE_PRODUCT,
  AdapterCapability.SUBMIT_PURCHASE_ORDER,
  AdapterCapability.TRACK_SHIPMENT,
  AdapterCapability.HEALTH_CHECK,
  AdapterCapability.TEST_CONNECTION,
];

const ALIBABA_INTEGRATION_STRATEGIES: IntegrationStrategy[] = [
  IntegrationStrategy.REST_API,
  IntegrationStrategy.EMAIL_RFQ,
  IntegrationStrategy.FILE_IMPORT,
  IntegrationStrategy.FILE_EXPORT,
  IntegrationStrategy.MANUAL_WORKFLOW,
];

// ── Credential Cache ──────────────────────────────────────────

interface CachedCredentials {
  appKey: string;
  appSecret: string;
  accessToken: string;
  refreshToken: string | null;
  baseUrl: string;
  timeoutMs: number;
  resolvedAt: number;
}

// ─────────────────────────────────────────────────────────────

@Injectable()
export class AlibabaAdapter extends BaseSupplierAdapter {
  protected readonly logger = new Logger(AlibabaAdapter.name);

  readonly metadata: ProviderMetadata = {
    code: SupplierProviderCode.ALIBABA,
    displayName: ALIBABA_DISPLAY_NAME,
    description: ALIBABA_DESCRIPTION,
    version: ALIBABA_ADAPTER_VERSION as ProviderVersion,
    website: ALIBABA_WEBSITE,
    supportedCountries: ALIBABA_SUPPORTED_COUNTRIES,
    capabilities: ALIBABA_PROVIDER_CAPABILITIES,
    rateLimitPerMinute: ALIBABA_RATE_LIMIT_PER_MINUTE,
    timeoutMs: ALIBABA_DEFAULT_TIMEOUT_MS,
    maxRetries: ALIBABA_DEFAULT_MAX_RETRIES,
    requiresCredentials: true,
    credentialFields: [
      { key: ALIBABA_CREDENTIAL_KEYS.APP_KEY, label: 'App Key', required: true, sensitive: false },
      { key: ALIBABA_CREDENTIAL_KEYS.APP_SECRET, label: 'App Secret', required: true, sensitive: true },
      { key: ALIBABA_CREDENTIAL_KEYS.ACCESS_TOKEN, label: 'Access Token', required: true, sensitive: true },
      { key: ALIBABA_CREDENTIAL_KEYS.REFRESH_TOKEN, label: 'Refresh Token', required: false, sensitive: true },
    ],
  };

  readonly adapterMetadata: AdapterMetadata = {
    providerCode: ALIBABA_PROVIDER_CODE,
    displayName: ALIBABA_DISPLAY_NAME,
    description: ALIBABA_DESCRIPTION,
    version: ALIBABA_ADAPTER_VERSION,
    supportedRegions: ALIBABA_SUPPORTED_REGIONS,
    supportedCountries: ALIBABA_SUPPORTED_COUNTRIES,
    supportedCurrencies: ALIBABA_SUPPORTED_CURRENCIES,
    capabilities: ALIBABA_ADAPTER_CAPABILITIES,
    integrationStrategies: ALIBABA_INTEGRATION_STRATEGIES,
    rateLimitPerMinute: ALIBABA_RATE_LIMIT_PER_MINUTE,
    timeoutMs: ALIBABA_DEFAULT_TIMEOUT_MS,
    maxRetries: ALIBABA_DEFAULT_MAX_RETRIES,
    requiresCredentials: true,
    credentialFields: [
      { key: ALIBABA_CREDENTIAL_KEYS.APP_KEY, label: 'App Key', required: true, sensitive: false },
      { key: ALIBABA_CREDENTIAL_KEYS.APP_SECRET, label: 'App Secret', required: true, sensitive: true },
      { key: ALIBABA_CREDENTIAL_KEYS.ACCESS_TOKEN, label: 'Access Token', required: true, sensitive: true },
      { key: ALIBABA_CREDENTIAL_KEYS.REFRESH_TOKEN, label: 'Refresh Token', required: false, sensitive: true },
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

    const client = await this.resolveHttpClient(request.workspaceId);
    const page = request.pagination?.page ?? 1;
    const pageSize = Math.min(request.pagination?.limit ?? ALIBABA_DEFAULT_PAGE_SIZE, ALIBABA_MAX_PAGE_SIZE);

    const result = await this.executeWithInfrastructure(context, AdapterCapability.SEARCH_SUPPLIERS, async () => {
      const envelope = await client.request<AlibabaRawSupplier[]>({
        method: ALIBABA_API_METHODS.SUPPLIER_SEARCH,
        params: {
          keywords: request.params.keyword,
          country_code: request.params.country,
          category_id: request.params.category,
          page_no: page,
          page_size: pageSize,
        },
        timeoutMs: this.resolveTimeoutMs(request.workspaceId),
      });

      const inner = envelope.result;
      const list = inner?.result_list ?? (inner?.result ? [inner.result] : []);
      return Array.isArray(list) ? list : [];
    });

    for (const raw of result) {
      yield mapAlibabaSupplier(raw as AlibabaRawSupplier);
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
      const client = await this.resolveHttpClient(request.workspaceId);
      const page = request.pagination?.page ?? 1;
      const pageSize = Math.min(request.pagination?.limit ?? ALIBABA_DEFAULT_PAGE_SIZE, ALIBABA_MAX_PAGE_SIZE);

      const products = await this.executeWithInfrastructure(context, AdapterCapability.SEARCH_PRODUCTS, async () => {
        const envelope = await client.request<AlibabaRawProduct[]>({
          method: ALIBABA_API_METHODS.PRODUCT_SEARCH,
          params: {
            keywords: request.params.keyword,
            category_id: request.params.category,
            country_code: request.params.country,
            supplier_member_id: request.params.supplierId,
            page_no: page,
            page_size: pageSize,
          },
          timeoutMs: this.resolveTimeoutMs(request.workspaceId),
        });

        const inner = envelope.result;
        const list = inner?.result_list ?? (inner?.result ? [inner.result] : []);
        return (Array.isArray(list) ? list : []).map((r) => mapAlibabaProduct(r as AlibabaRawProduct));
      });

      return this.buildSuccessResponse(request.requestId, products, Date.now() - start, products.length, page, pageSize);
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
      const client = await this.resolveHttpClient(request.workspaceId);

      const supplier = await this.executeWithInfrastructure(context, AdapterCapability.GET_SUPPLIER_DETAILS, async () => {
        const envelope = await client.request<AlibabaRawSupplier>({
          method: ALIBABA_API_METHODS.SUPPLIER_DETAIL,
          params: { member_id: request.params.providerSupplierId },
          timeoutMs: this.resolveTimeoutMs(request.workspaceId),
        });

        const raw = envelope.result?.result;
        if (!raw) throw { status: 404, message: 'Supplier not found on Alibaba' };
        return mapAlibabaSupplier(raw as AlibabaRawSupplier);
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
      const client = await this.resolveHttpClient(request.workspaceId);

      const product = await this.executeWithInfrastructure(context, AdapterCapability.GET_PRODUCT_DETAILS, async () => {
        const envelope = await client.request<AlibabaRawProduct>({
          method: ALIBABA_API_METHODS.PRODUCT_DETAIL,
          params: { product_id: request.params.providerProductId },
          timeoutMs: this.resolveTimeoutMs(request.workspaceId),
        });

        const raw = envelope.result?.result;
        if (!raw) throw { status: 404, message: 'Product not found on Alibaba' };
        return mapAlibabaProduct(raw as AlibabaRawProduct);
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
      { idempotencyKey: this.idempotency.buildKey(request.workspaceId, ALIBABA_PROVIDER_CODE, 'REQUEST_QUOTATION', idempotencyParams) },
    );
    this.capabilityValidator.validateCapability(this.adapterMetadata, AdapterCapability.REQUEST_QUOTATION);
    this.logRequest(context, { supplierId: request.params.providerSupplierId, quantity: request.params.quantity });

    try {
      const client = await this.resolveHttpClient(request.workspaceId);

      const quotation = await this.executeWithInfrastructure(
        context,
        AdapterCapability.REQUEST_QUOTATION,
        async () => {
          const envelope = await client.request<AlibabaRawRfqResponse>({
            method: ALIBABA_API_METHODS.RFQ_CREATE,
            params: {
              supplier_member_id: request.params.providerSupplierId,
              product_id: request.params.providerProductId ?? undefined,
              quantity: request.params.quantity,
              message: request.params.requirements ?? undefined,
            },
            timeoutMs: this.resolveTimeoutMs(request.workspaceId),
          });

          const raw = envelope.result?.result;
          if (!raw) throw new Error('Alibaba RFQ submission returned empty response');
          return mapAlibabaRfqToQuotation(raw as AlibabaRawRfqResponse, request.params.providerSupplierId);
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
      const client = await this.resolveHttpClient(request.workspaceId);

      const products = await this.executeWithInfrastructure(context, AdapterCapability.DOWNLOAD_CATALOG, async () => {
        const envelope = await client.request<AlibabaRawCatalog>({
          method: ALIBABA_API_METHODS.PRODUCT_SEARCH,
          params: {
            supplier_member_id: request.params.providerSupplierId,
            category_id: request.params.category,
            page_no: 1,
            page_size: ALIBABA_MAX_PAGE_SIZE,
          },
          timeoutMs: this.resolveTimeoutMs(request.workspaceId),
        });

        const inner = envelope.result;
        const list = inner?.result_list ?? (inner?.result ? [inner.result] : []);
        const catalogRaw: AlibabaRawCatalog = {
          supplier_member_id: request.params.providerSupplierId,
          products: Array.isArray(list) ? (list as AlibabaRawProduct[]) : [],
          total_count: inner?.total_count ?? null,
        };
        return mapAlibabaCatalog(catalogRaw);
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
      const client = await this.resolveHttpClient(request.workspaceId);

      const result = await this.executeWithInfrastructure(context, AdapterCapability.VALIDATE_SUPPLIER, async () => {
        const envelope = await client.request<AlibabaRawSupplier>({
          method: ALIBABA_API_METHODS.SUPPLIER_DETAIL,
          params: { member_id: request.params.providerSupplierId },
          timeoutMs: this.resolveTimeoutMs(request.workspaceId),
        });

        const raw = envelope.result?.result;
        if (!raw) {
          return {
            isValid: false,
            score: 0,
            checks: [{ checkName: 'supplier_exists', passed: false, score: 0, notes: 'Supplier not found on Alibaba' }],
            summary: 'Supplier not found on Alibaba',
          } satisfies AtlasValidationResult;
        }
        return mapAlibabaSupplierValidation(raw as AlibabaRawSupplier);
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
      const client = await this.resolveHttpClient(request.workspaceId);

      const result = await this.executeWithInfrastructure(context, AdapterCapability.VALIDATE_PRODUCT, async () => {
        const envelope = await client.request<AlibabaRawProduct>({
          method: ALIBABA_API_METHODS.PRODUCT_DETAIL,
          params: { product_id: request.params.providerProductId },
          timeoutMs: this.resolveTimeoutMs(request.workspaceId),
        });

        const raw = envelope.result?.result;
        if (!raw) {
          return {
            isValid: false,
            score: 0,
            checks: [{ checkName: 'product_exists', passed: false, score: 0, notes: 'Product not found on Alibaba' }],
            summary: 'Product not found on Alibaba',
          } satisfies AtlasValidationResult;
        }
        return mapAlibabaProductValidation(raw as AlibabaRawProduct);
      });

      return this.buildSuccessResponse(request.requestId, result, Date.now() - start);
    } catch (error) {
      return this.buildErrorResponse(request.requestId, error, Date.now() - start);
    }
  }

  // ══════════════════════════════════════════════════════════════
  // Submit Purchase Order
  // ══════════════════════════════════════════════════════════════

  async submitPurchaseOrder(
    workspaceId: string,
    supplierId: string,
    productId: string,
    quantity: number,
    requirements?: string,
  ): Promise<ProviderResponse<{ providerOrderId: string; tradeOrderId: string | null }>> {
    const start = Date.now();
    const requestId = uuidv4();
    const idempotencyParams = { workspaceId, supplierId, productId, quantity };
    const context = this.buildRequestContext(
      workspaceId,
      AdapterCapability.SUBMIT_PURCHASE_ORDER,
      { idempotencyKey: this.idempotency.buildKey(workspaceId, ALIBABA_PROVIDER_CODE, 'SUBMIT_PURCHASE_ORDER', idempotencyParams) },
    );
    this.capabilityValidator.validateCapability(this.adapterMetadata, AdapterCapability.SUBMIT_PURCHASE_ORDER);

    try {
      const client = await this.resolveHttpClient(workspaceId);

      const orderRef = await this.executeWithInfrastructure(
        context,
        AdapterCapability.SUBMIT_PURCHASE_ORDER,
        async () => {
          const envelope = await client.request<AlibabaRawOrderResponse>({
            method: ALIBABA_API_METHODS.ORDER_CREATE,
            params: {
              supplier_member_id: supplierId,
              product_id: productId,
              quantity,
              message: requirements ?? undefined,
            },
            timeoutMs: this.resolveTimeoutMs(workspaceId),
          });

          const raw = envelope.result?.result;
          if (!raw) throw new Error('Alibaba order creation returned empty response');
          const mapped = mapAlibabaOrderResponse(raw as AlibabaRawOrderResponse);
          return { providerOrderId: mapped.providerOrderId, tradeOrderId: mapped.tradeOrderId };
        },
        { isWriteOperation: true, idempotencyParams },
      );

      return this.buildSuccessResponse(requestId, orderRef, Date.now() - start);
    } catch (error) {
      return this.buildErrorResponse(requestId, error, Date.now() - start);
    }
  }

  // ══════════════════════════════════════════════════════════════
  // Track Shipment
  // ══════════════════════════════════════════════════════════════

  async trackShipment(
    workspaceId: string,
    logisticsNo: string,
  ): Promise<ProviderResponse<ReturnType<typeof mapAlibabaShipmentTracking>>> {
    const start = Date.now();
    const requestId = uuidv4();
    const context = this.buildRequestContext(workspaceId, AdapterCapability.TRACK_SHIPMENT);
    this.capabilityValidator.validateCapability(this.adapterMetadata, AdapterCapability.TRACK_SHIPMENT);

    try {
      const client = await this.resolveHttpClient(workspaceId);

      const tracking = await this.executeWithInfrastructure(context, AdapterCapability.TRACK_SHIPMENT, async () => {
        const envelope = await client.request<AlibabaRawShipmentTracking>({
          method: ALIBABA_API_METHODS.LOGISTICS_TRACKING,
          params: { logistics_no: logisticsNo },
          timeoutMs: this.resolveTimeoutMs(workspaceId),
        });

        const raw = envelope.result?.result;
        if (!raw) throw { status: 404, message: 'Shipment tracking not found on Alibaba' };
        return mapAlibabaShipmentTracking(raw as AlibabaRawShipmentTracking);
      });

      return this.buildSuccessResponse(requestId, tracking, Date.now() - start);
    } catch (error) {
      return this.buildErrorResponse(requestId, error, Date.now() - start);
    }
  }

  // ══════════════════════════════════════════════════════════════
  // Token Refresh
  // ══════════════════════════════════════════════════════════════

  /**
   * Refreshes the Alibaba access token for a workspace.
   * Evicts the credential cache so the next request resolves fresh tokens.
   */
  async refreshTokenForWorkspace(workspaceId: string): Promise<void> {
    const client = await this.resolveHttpClient(workspaceId);
    const result = await client.refreshAccessToken();

    // Update the DB-persisted token (workspace responsibility via SupplierProviderCredentialService)
    // Here we only evict cache to force re-resolution on next call.
    this.credentialCache.delete(workspaceId);
    this.logger.log(`[ALIBABA] Access token refreshed for workspace ${workspaceId}`);
  }

  // ══════════════════════════════════════════════════════════════
  // Health / Ping
  // ══════════════════════════════════════════════════════════════

  protected override async pingCheck(): Promise<void> {
    return Promise.resolve();
  }

  protected override async pingWithDetails(workspaceId: string): Promise<Record<string, unknown>> {
    try {
      const client = await this.resolveHttpClient(workspaceId);
      const envelope = await client.request({
        method: ALIBABA_API_METHODS.PRODUCT_SEARCH,
        params: { keywords: 'test', page_no: 1, page_size: 1 },
        timeoutMs: 10_000,
      });
      return {
        status: 'reachable',
        hasError: !!envelope.error_response,
        providerCode: ALIBABA_PROVIDER_CODE,
      };
    } catch (error) {
      return {
        status: 'unreachable',
        error: error instanceof Error ? error.message : String(error),
        providerCode: ALIBABA_PROVIDER_CODE,
      };
    }
  }

  // ══════════════════════════════════════════════════════════════
  // Credential resolution
  // ══════════════════════════════════════════════════════════════

  async resolveWorkspaceCredentials(workspaceId: string): Promise<CachedCredentials> {
    const cached = this.credentialCache.get(workspaceId);
    if (cached && Date.now() - cached.resolvedAt < ALIBABA_CREDENTIAL_CACHE_TTL_MS) {
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
        providerCode: SupplierProviderCode.ALIBABA,
        isEnabled: true,
        deletedAt: null,
      },
    });

    if (!config) {
      throw new Error(`No enabled Alibaba configuration found for workspace ${workspaceId}`);
    }

    const customSettings = (config.customSettings ?? {}) as Record<string, unknown>;

    let appKey = '';
    let appSecret = '';
    let accessToken = '';
    let refreshToken: string | null = null;

    if (config.encryptedCredentials) {
      let rawCreds: Record<string, string>;
      try {
        rawCreds = JSON.parse(config.encryptedCredentials) as Record<string, string>;
      } catch {
        rawCreds = {};
      }

      for (const [k, v] of Object.entries(rawCreds)) {
        rawCreds[k] = this.credentialService.decrypt(v, workspaceId, SupplierProviderCode.ALIBABA);
      }

      const { valid, missing } = this.credentialService.validateRequiredFields(rawCreds, [
        ALIBABA_CREDENTIAL_KEYS.APP_KEY,
        ALIBABA_CREDENTIAL_KEYS.APP_SECRET,
        ALIBABA_CREDENTIAL_KEYS.ACCESS_TOKEN,
      ]);
      if (!valid) {
        throw new Error(`Alibaba missing required credential fields for workspace ${workspaceId}: ${missing.join(', ')}`);
      }

      appKey = rawCreds[ALIBABA_CREDENTIAL_KEYS.APP_KEY] ?? '';
      appSecret = rawCreds[ALIBABA_CREDENTIAL_KEYS.APP_SECRET] ?? '';
      accessToken = rawCreds[ALIBABA_CREDENTIAL_KEYS.ACCESS_TOKEN] ?? '';
      refreshToken = rawCreds[ALIBABA_CREDENTIAL_KEYS.REFRESH_TOKEN] ?? null;
    }

    const resolved: CachedCredentials = {
      appKey,
      appSecret,
      accessToken,
      refreshToken,
      baseUrl: (customSettings[ALIBABA_SETTING_KEYS.BASE_URL] as string) ?? ALIBABA_DEFAULT_BASE_URL,
      timeoutMs: (customSettings[ALIBABA_SETTING_KEYS.TIMEOUT_MS] as number) ?? ALIBABA_DEFAULT_TIMEOUT_MS,
      resolvedAt: Date.now(),
    };

    this.credentialCache.set(workspaceId, resolved);
    return resolved;
  }

  evictCredentialCache(workspaceId: string): void {
    this.credentialCache.delete(workspaceId);
  }

  private async resolveHttpClient(workspaceId: string): Promise<AlibabaHttpClient> {
    const creds = await this.resolveWorkspaceCredentials(workspaceId);
    return new AlibabaHttpClient(
      creds.baseUrl,
      creds.appKey,
      creds.appSecret,
      creds.accessToken,
      creds.refreshToken,
    );
  }

  private resolveTimeoutMs(workspaceId: string): number {
    const cached = this.credentialCache.get(workspaceId);
    return cached?.timeoutMs ?? ALIBABA_DEFAULT_TIMEOUT_MS;
  }
}
