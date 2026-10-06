import { ProviderErrorNormalizer } from '../errors/provider-error-normalizer';
import { SupplierProviderCredentialService } from '../credentials/supplier-provider-credential.service';
import { AdapterCapabilityValidator } from '../adapters/adapter-capability.validator';
import { AdapterIdempotencyService } from '../adapters/adapter-idempotency.service';
import { AdapterRateLimitHandler } from '../adapters/adapter-rate-limit.handler';
import { AdapterHealthChecker } from '../adapters/adapter-health.checker';
import { AdapterMetricsRecorder } from '../adapters/adapter-metrics.recorder';
import { AdapterAuditLogger } from '../adapters/adapter-audit.logger';
import { TradeIndiaAdapter } from '../adapters/providers/tradeindia/tradeindia.adapter';
import { SupplierProviderCode, ProviderCapability, ProviderErrorCode } from '../interfaces';
import { AdapterCapability, IntegrationStrategy } from '../adapters/adapter.types';

// ── Helpers ───────────────────────────────────────────────────

function makeAdapter(prismaOverride?: Record<string, unknown>): TradeIndiaAdapter {
  const metricsRecorder = new AdapterMetricsRecorder();
  return new TradeIndiaAdapter(
    new ProviderErrorNormalizer(),
    new SupplierProviderCredentialService(),
    new AdapterCapabilityValidator(),
    new AdapterIdempotencyService(),
    new AdapterRateLimitHandler(),
    new AdapterHealthChecker(metricsRecorder),
    metricsRecorder,
    new AdapterAuditLogger(),
    (prismaOverride ?? makePrismaMock()) as never,
  );
}

function makePrismaMock(config: Record<string, unknown> | null = null) {
  return {
    workspaceSupplierProviderConfig: {
      findFirst: jest.fn().mockResolvedValue(
        config ?? { encryptedCredentials: null, customSettings: null, isEnabled: true },
      ),
    },
  };
}

function makeClient(requestImpl: jest.Mock) {
  return { request: requestImpl };
}

// ── Registration & Metadata ───────────────────────────────────

describe('TradeIndiaAdapter – registration & metadata', () => {
  it('has correct provider code', () => {
    const a = makeAdapter();
    expect(a.metadata.code).toBe(SupplierProviderCode.TRADEINDIA);
    expect(a.adapterMetadata.providerCode).toBe('TRADEINDIA');
  });

  it('does NOT declare SUBMIT_PURCHASE_ORDER', () => {
    expect(makeAdapter().metadata.capabilities).not.toContain(ProviderCapability.SUBMIT_PURCHASE_ORDER);
  });

  it('does NOT declare TRACK_SHIPMENT', () => {
    expect(makeAdapter().metadata.capabilities).not.toContain(ProviderCapability.TRACK_SHIPMENT);
  });

  it('declares expected capabilities', () => {
    const caps = makeAdapter().metadata.capabilities;
    [
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
    ].forEach((c) => expect(caps).toContain(c));
  });

  it('declares expected integration strategies', () => {
    const strategies = makeAdapter().adapterMetadata.integrationStrategies;
    [
      IntegrationStrategy.REST_API,
      IntegrationStrategy.EMAIL_RFQ,
      IntegrationStrategy.FILE_IMPORT,
      IntegrationStrategy.FILE_EXPORT,
      IntegrationStrategy.MANUAL_WORKFLOW,
    ].forEach((s) => expect(strategies).toContain(s));
  });

  it('supports IN as primary country', () => {
    expect(makeAdapter().adapterMetadata.supportedCountries).toContain('IN');
  });

  it('supports INR and USD currencies', () => {
    const curr = makeAdapter().adapterMetadata.supportedCurrencies;
    expect(curr).toContain('INR');
    expect(curr).toContain('USD');
  });

  it('requires credentials', () => {
    expect(makeAdapter().metadata.requiresCredentials).toBe(true);
  });
});

// ── Credential Resolution ─────────────────────────────────────

describe('TradeIndiaAdapter – credential resolution', () => {
  it('throws when no workspace config found', async () => {
    const prisma = makePrismaMock(null);
    (prisma.workspaceSupplierProviderConfig.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(makeAdapter(prisma).resolveWorkspaceCredentials('ws-missing')).rejects.toThrow(
      /No enabled TradeIndia configuration/,
    );
  });

  it('throws when required apiKey field is missing', async () => {
    const credService = new SupplierProviderCredentialService();
    const encryptedCreds = JSON.stringify({
      userId: credService.encrypt('123', 'ws1', SupplierProviderCode.TRADEINDIA),
      // apiKey missing
    });
    const prisma = makePrismaMock({ encryptedCredentials: encryptedCreds, isEnabled: true });
    await expect(makeAdapter(prisma).resolveWorkspaceCredentials('ws1')).rejects.toThrow(
      /missing required credential fields/,
    );
  });

  it('resolves apiKey from encrypted credentials', async () => {
    const credService = new SupplierProviderCredentialService();
    const encryptedCreds = JSON.stringify({
      apiKey: credService.encrypt('MY_API_KEY', 'ws1', SupplierProviderCode.TRADEINDIA),
    });
    const prisma = makePrismaMock({ encryptedCredentials: encryptedCreds, isEnabled: true });
    const creds = await makeAdapter(prisma).resolveWorkspaceCredentials('ws1');
    expect(creds.apiKey).toBe('MY_API_KEY');
  });

  it('evictCredentialCache is idempotent', () => {
    const a = makeAdapter();
    a.evictCredentialCache('ws1');
    a.evictCredentialCache('ws1');
  });
});

// ── Search Products ───────────────────────────────────────────

describe('TradeIndiaAdapter – searchProducts', () => {
  it('maps products from DATA array', async () => {
    const adapter = makeAdapter();
    jest.spyOn(adapter as never, 'resolveHttpClient').mockReturnValue(
      makeClient(jest.fn().mockResolvedValue({
        STATUS: 'success',
        DATA: [
          { PRODUCT_ID: 'P1', PRODUCT_NAME: 'Iron Pipe', PRICE: '50', CURRENCY: 'INR', SELLER_ID: 'S1' },
        ],
      })) as never,
    );
    const resp = await adapter.searchProducts({
      requestId: 'r1',
      workspaceId: 'ws1',
      providerCode: SupplierProviderCode.TRADEINDIA,
      params: { keyword: 'iron' },
    });
    expect(resp.success).toBe(true);
    expect(resp.data).toHaveLength(1);
    expect(resp.data![0]!.providerProductId).toBe('P1');
  });

  it('returns error response on network failure', async () => {
    const adapter = makeAdapter();
    jest.spyOn(adapter as never, 'resolveHttpClient').mockReturnValue(
      makeClient(jest.fn().mockRejectedValue(new Error('econnrefused'))) as never,
    );
    const resp = await adapter.searchProducts({
      requestId: 'r2',
      workspaceId: 'ws1',
      providerCode: SupplierProviderCode.TRADEINDIA,
      params: { keyword: 'iron' },
    });
    expect(resp.success).toBe(false);
    expect(resp.error!.code).toBe(ProviderErrorCode.NETWORK_ERROR);
    expect(resp.error!.retryable).toBe(true);
  });

  it('maps products from lowercase data key', async () => {
    const adapter = makeAdapter();
    jest.spyOn(adapter as never, 'resolveHttpClient').mockReturnValue(
      makeClient(jest.fn().mockResolvedValue({
        status: 'success',
        data: [{ product_id: 'P2', product_name: 'Steel Rod', price: '80', currency: 'INR' }],
      })) as never,
    );
    const resp = await adapter.searchProducts({
      requestId: 'r3',
      workspaceId: 'ws1',
      providerCode: SupplierProviderCode.TRADEINDIA,
      params: { keyword: 'steel' },
    });
    expect(resp.success).toBe(true);
    expect(resp.data![0]!.name).toBe('Steel Rod');
  });
});

// ── Get Supplier Details ──────────────────────────────────────

describe('TradeIndiaAdapter – getSupplierDetails', () => {
  it('returns normalized supplier on success', async () => {
    const adapter = makeAdapter();
    jest.spyOn(adapter as never, 'resolveHttpClient').mockReturnValue(
      makeClient(jest.fn().mockResolvedValue({
        STATUS: 'success',
        DATA: { SELLER_ID: 'S100', COMPANY_NAME: 'Verified Metals', IS_VERIFIED: true, COUNTRY: 'IN' },
      })) as never,
    );
    const resp = await adapter.getSupplierDetails({
      requestId: 'r4',
      workspaceId: 'ws1',
      providerCode: SupplierProviderCode.TRADEINDIA,
      params: { providerSupplierId: 'S100' },
    });
    expect(resp.success).toBe(true);
    expect(resp.data!.providerSupplierId).toBe('S100');
    expect(resp.data!.isVerified).toBe(true);
  });

  it('returns error when supplier not found', async () => {
    const adapter = makeAdapter();
    jest.spyOn(adapter as never, 'resolveHttpClient').mockReturnValue(
      makeClient(jest.fn().mockResolvedValue({ STATUS: 'success', DATA: null })) as never,
    );
    const resp = await adapter.getSupplierDetails({
      requestId: 'r5',
      workspaceId: 'ws1',
      providerCode: SupplierProviderCode.TRADEINDIA,
      params: { providerSupplierId: 'MISSING' },
    });
    expect(resp.success).toBe(false);
  });
});

// ── Request Quotation / Idempotency ───────────────────────────

describe('TradeIndiaAdapter – requestQuotation', () => {
  it('maps RFQ response to quotation', async () => {
    const adapter = makeAdapter();
    jest.spyOn(adapter as never, 'resolveHttpClient').mockReturnValue(
      makeClient(jest.fn().mockResolvedValue({
        STATUS: 'success',
        DATA: {
          RFQ_ID: 'RFQ001',
          UNIT_PRICE: '60',
          QUANTITY: 200,
          CURRENCY: 'INR',
          LEAD_TIME: '7',
          SELLER_ID: 'S1',
        },
      })) as never,
    );
    const resp = await adapter.requestQuotation({
      requestId: 'r6',
      workspaceId: 'ws1',
      providerCode: SupplierProviderCode.TRADEINDIA,
      params: { providerSupplierId: 'S1', quantity: 200 },
    });
    expect(resp.success).toBe(true);
    expect(resp.data!.providerQuotationId).toBe('RFQ001');
    expect(resp.data!.totalPrice).toBe(12_000);
  });

  it('prevents duplicate in-flight RFQ', async () => {
    const adapter = makeAdapter();
    jest.spyOn(adapter as never, 'resolveHttpClient').mockReturnValue(
      makeClient(jest.fn().mockImplementation(() =>
        new Promise((res) => setTimeout(() => res({
          STATUS: 'success',
          DATA: { RFQ_ID: 'R1', UNIT_PRICE: '0', QUANTITY: 1, CURRENCY: 'INR' },
        }), 100)),
      )) as never,
    );
    const req = {
      requestId: 'r7',
      workspaceId: 'ws-idem',
      providerCode: SupplierProviderCode.TRADEINDIA,
      params: { providerSupplierId: 'S2', quantity: 5 },
    };
    const first = adapter.requestQuotation(req);
    await expect(adapter.requestQuotation(req)).rejects.toThrow(/Duplicate request in-flight/);
    await first;
  });
});

// ── Validate Supplier ─────────────────────────────────────────

describe('TradeIndiaAdapter – validateSupplier', () => {
  it('returns valid result for premium verified supplier', async () => {
    const adapter = makeAdapter();
    jest.spyOn(adapter as never, 'resolveHttpClient').mockReturnValue(
      makeClient(jest.fn().mockResolvedValue({
        STATUS: 'success',
        DATA: {
          SELLER_ID: 'S1',
          COMPANY_NAME: 'Premium Co',
          IS_VERIFIED: true,
          IS_PREMIUM: true,
          EMAIL: 'test@co.com',
          MAIN_PRODUCTS: 'Steel',
        },
      })) as never,
    );
    const resp = await adapter.validateSupplier({
      requestId: 'r8',
      workspaceId: 'ws1',
      providerCode: SupplierProviderCode.TRADEINDIA,
      params: { providerSupplierId: 'S1' },
    });
    expect(resp.success).toBe(true);
    expect(resp.data!.isValid).toBe(true);
    expect(resp.data!.score).toBeGreaterThanOrEqual(50);
  });

  it('returns invalid when supplier not found', async () => {
    const adapter = makeAdapter();
    jest.spyOn(adapter as never, 'resolveHttpClient').mockReturnValue(
      makeClient(jest.fn().mockResolvedValue({ STATUS: 'success', DATA: null })) as never,
    );
    const resp = await adapter.validateSupplier({
      requestId: 'r9',
      workspaceId: 'ws1',
      providerCode: SupplierProviderCode.TRADEINDIA,
      params: { providerSupplierId: 'MISSING' },
    });
    expect(resp.success).toBe(true);
    expect(resp.data!.isValid).toBe(false);
  });
});

// ── Unsupported Capabilities ──────────────────────────────────

describe('TradeIndiaAdapter – unsupported capabilities', () => {
  it('supportsCapability returns false for SUBMIT_PURCHASE_ORDER', () => {
    expect(makeAdapter().supportsCapability(ProviderCapability.SUBMIT_PURCHASE_ORDER)).toBe(false);
  });

  it('supportsCapability returns false for TRACK_SHIPMENT', () => {
    expect(makeAdapter().supportsCapability(ProviderCapability.TRACK_SHIPMENT)).toBe(false);
  });

  it('supportsAdapterCapability returns false for SUBMIT_PURCHASE_ORDER', () => {
    expect(makeAdapter().supportsAdapterCapability(AdapterCapability.SUBMIT_PURCHASE_ORDER)).toBe(false);
  });
});

// ── Error Normalization ───────────────────────────────────────

describe('TradeIndiaAdapter – error normalization', () => {
  it('normalizes auth error as non-retryable', async () => {
    const adapter = makeAdapter();
    const { TradeIndiaHttpError } = await import('../adapters/providers/tradeindia/tradeindia.http-client');
    jest.spyOn(adapter as never, 'resolveHttpClient').mockReturnValue(
      makeClient(jest.fn().mockRejectedValue(
        new TradeIndiaHttpError(ProviderErrorCode.AUTH_FAILED, 'Unauthorized', 401),
      )) as never,
    );
    const resp = await adapter.searchProducts({
      requestId: 'r10',
      workspaceId: 'ws1',
      providerCode: SupplierProviderCode.TRADEINDIA,
      params: { keyword: 'test' },
    });
    expect(resp.success).toBe(false);
    expect(resp.error!.retryable).toBe(false);
  });

  it('normalizes rate limit error as retryable', async () => {
    const adapter = makeAdapter();
    const { TradeIndiaHttpError } = await import('../adapters/providers/tradeindia/tradeindia.http-client');
    jest.spyOn(adapter as never, 'resolveHttpClient').mockReturnValue(
      makeClient(jest.fn().mockRejectedValue(
        new TradeIndiaHttpError(ProviderErrorCode.RATE_LIMITED, 'Too many requests', 429),
      )) as never,
    );
    const resp = await adapter.searchProducts({
      requestId: 'r11',
      workspaceId: 'ws1',
      providerCode: SupplierProviderCode.TRADEINDIA,
      params: { keyword: 'test' },
    });
    expect(resp.success).toBe(false);
    expect(resp.error!.retryable).toBe(true);
  });
});

// ── Pagination ────────────────────────────────────────────────

describe('TradeIndiaAdapter – pagination', () => {
  it('passes page and per_page to HTTP client', async () => {
    const adapter = makeAdapter();
    const mockRequest = jest.fn().mockResolvedValue({ STATUS: 'success', DATA: [] });
    jest.spyOn(adapter as never, 'resolveHttpClient').mockReturnValue(makeClient(mockRequest) as never);

    await adapter.searchProducts({
      requestId: 'r12',
      workspaceId: 'ws1',
      providerCode: SupplierProviderCode.TRADEINDIA,
      params: { keyword: 'steel' },
      pagination: { page: 3, limit: 30, offset: 60 },
    });
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({ params: expect.objectContaining({ page: 3, per_page: 30 }) }),
    );
  });

  it('caps per_page at 100', async () => {
    const adapter = makeAdapter();
    const mockRequest = jest.fn().mockResolvedValue({ STATUS: 'success', DATA: [] });
    jest.spyOn(adapter as never, 'resolveHttpClient').mockReturnValue(makeClient(mockRequest) as never);

    await adapter.searchProducts({
      requestId: 'r13',
      workspaceId: 'ws1',
      providerCode: SupplierProviderCode.TRADEINDIA,
      params: { keyword: 'steel' },
      pagination: { page: 1, limit: 9999, offset: 0 },
    });
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({ params: expect.objectContaining({ per_page: 100 }) }),
    );
  });
});

// ── Retry Behavior ────────────────────────────────────────────

describe('TradeIndiaAdapter – retry', () => {
  it('retries on network error and eventually succeeds', async () => {
    const adapter = makeAdapter();
    let attempts = 0;
    jest.spyOn(adapter as never, 'resolveHttpClient').mockReturnValue(
      makeClient(jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) throw new Error('econnrefused');
        return Promise.resolve({ STATUS: 'success', DATA: [] });
      })) as never,
    );
    const resp = await adapter.searchProducts({
      requestId: 'r14',
      workspaceId: 'ws1',
      providerCode: SupplierProviderCode.TRADEINDIA,
      params: { keyword: 'steel' },
    });
    expect(resp.success).toBe(true);
    expect(attempts).toBe(3);
  });
});

// ── Rate Limit ────────────────────────────────────────────────

describe('TradeIndiaAdapter – rate limit', () => {
  it('throws when per-minute limit exceeded', async () => {
    const rateLimitHandler = new AdapterRateLimitHandler();
    for (let i = 0; i < 60; i++) {
      rateLimitHandler.checkAndRecord('TRADEINDIA', 'ws-rl', 60, 0);
    }
    const adapter = makeAdapter();
    (adapter as never as { rateLimitHandler: AdapterRateLimitHandler })['rateLimitHandler'] = rateLimitHandler;
    jest.spyOn(adapter as never, 'resolveHttpClient').mockReturnValue(
      makeClient(jest.fn().mockResolvedValue({ STATUS: 'success', DATA: [] })) as never,
    );
    await expect(
      adapter.searchProducts({
        requestId: 'r-rl',
        workspaceId: 'ws-rl',
        providerCode: SupplierProviderCode.TRADEINDIA,
        params: { keyword: 'test' },
      }),
    ).rejects.toThrow(/rate limit/i);
  });
});
